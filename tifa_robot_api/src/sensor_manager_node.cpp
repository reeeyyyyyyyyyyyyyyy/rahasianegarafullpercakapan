#include "tifa_robot_api/sensor_manager_node.hpp"

#include <nlohmann/json.hpp>
#include <tf2/utils.h>
#include <tf2_geometry_msgs/tf2_geometry_msgs.hpp>

#include <fcntl.h>
#include <unistd.h>
#include <sys/types.h>
#include <sys/stat.h>
#include <fstream>
#include <termios.h>
#include <errno.h>
#include <sys/ioctl.h>

using json = nlohmann::json;

namespace tifa_robot_api
{

SensorManagerNode::SensorManagerNode(const rclcpp::NodeOptions & options)
: Node("sensor_manager_node", options),
  battery_running_(true)
{
  robot_id_ = this->declare_parameter<std::string>("robot_id", "TFRB1");
  ui_id_    = this->declare_parameter<std::string>("ui_id", "TFUI1");

  battery_device_ = this->declare_parameter<std::string>(
    "battery_device", "/dev/battery_monitor");

  // ===== PUBLISHERS (DIPISAH) =====
  battery_pub_ = this->create_publisher<std_msgs::msg::String>(
    "tifa/sensor/battery", 10);

  // ===== BATTERY THREAD =====
  battery_thread_ = std::thread(&SensorManagerNode::batteryReadLoop, this);

  RCLCPP_INFO(this->get_logger(), "SensorManagerNode started");
}

SensorManagerNode::~SensorManagerNode()
{
  battery_running_ = false;
  if (battery_thread_.joinable()) {
    battery_thread_.join();
  }
}

/* ================= BATTERY SERIAL ================= */

void SensorManagerNode::batteryReadLoop()
{
  // ── WAIT UNTIL DEVICE EXISTS ──────────────────────────────
  auto waitForDevice = [&]() -> bool {
    int attempts = 0;
    while (battery_running_) {
      if (access(battery_device_.c_str(), F_OK) == 0) {
        std::this_thread::sleep_for(std::chrono::milliseconds(1500)); // CDC settle
        return true;
      }
      if (attempts % 10 == 0) {
        RCLCPP_WARN(this->get_logger(),
          "Waiting for battery device: %s", battery_device_.c_str());
      }
      attempts++;
      std::this_thread::sleep_for(std::chrono::milliseconds(500));
    }
    return false;
  };

  // ── OPEN WITH PROPER TERMIOS ───────────────────────────────
  auto openDevice = [&]() -> int {
    int fd = open(battery_device_.c_str(), O_RDWR | O_NOCTTY | O_NDELAY);
    if (fd < 0) return -1;

    struct termios tty;
    memset(&tty, 0, sizeof(tty));
    if (tcgetattr(fd, &tty) != 0) {
      close(fd);
      return -1;
    }

    // Baud rate — sesuaikan dengan firmware ESP32
    cfsetispeed(&tty, B115200);
    cfsetospeed(&tty, B115200);

    // 8N1, no flow control
    tty.c_cflag &= ~PARENB;
    tty.c_cflag &= ~CSTOPB;
    tty.c_cflag &= ~CSIZE;
    tty.c_cflag |= CS8;
    tty.c_cflag &= ~CRTSCTS;
    tty.c_cflag |= CREAD | CLOCAL;

    // Raw mode
    tty.c_lflag &= ~(ICANON | ECHO | ECHOE | ISIG);
    tty.c_iflag &= ~(IXON | IXOFF | IXANY);
    tty.c_iflag &= ~(IGNBRK | BRKINT | PARMRK | ISTRIP | INLCR | IGNCR | ICRNL);
    tty.c_oflag &= ~OPOST;

    // Blocking read, timeout 1 detik
    tty.c_cc[VMIN]  = 0;
    tty.c_cc[VTIME] = 10; // 1 second

    tcsetattr(fd, TCSANOW, &tty);

    // ── RESET ESP32C3 VIA DTR/RTS (USB-Serial-JTAG) ─────────
    // DTR harus 0 selama reset supaya chip tidak latch download
    // mode internal; GPIO9 (pull-up eksternal) mengamankan strap.
    int lines = TIOCM_DTR | TIOCM_RTS;
    ioctl(fd, TIOCMBIC, &lines);                          // DTR=0, RTS=0 (idle)
    std::this_thread::sleep_for(std::chrono::milliseconds(100));
    int rts = TIOCM_RTS;
    ioctl(fd, TIOCMBIS, &rts);                            // RTS=1, DTR=0 → tahan reset
    std::this_thread::sleep_for(std::chrono::milliseconds(100));
    ioctl(fd, TIOCMBIC, &rts);                            // lepas reset → boot dari flash
    std::this_thread::sleep_for(std::chrono::milliseconds(1500)); // tunggu sketch mulai

    tcflush(fd, TCIFLUSH); // buang buffer lama + boot log
    return fd;
  };

  // ── MAIN LOOP WITH AUTO-RECONNECT ─────────────────────────
  while (battery_running_) {

    if (!waitForDevice()) break;

    int fd = openDevice();
    if (fd < 0) {
      RCLCPP_ERROR(this->get_logger(),
        "Failed to open %s, retry in 3s...", battery_device_.c_str());
      std::this_thread::sleep_for(std::chrono::seconds(3));
      continue;
    }

    RCLCPP_INFO(this->get_logger(), "Battery device opened: %s", battery_device_.c_str());

    std::string buffer;
    int brace_count = 0;
    bool collecting = false;
    char ch;

    // ── READ LOOP ────────────────────────────────────────────
    while (battery_running_) {
      int n = read(fd, &ch, 1);

      if (n < 0) {
        if (errno == EAGAIN || errno == EWOULDBLOCK) {
          std::this_thread::sleep_for(std::chrono::milliseconds(5));
          continue;
        }
        // Error serius — device disconnect
        RCLCPP_WARN(this->get_logger(), "Battery read error, reconnecting...");
        break;
      }

      if (n == 0) {
        // EOF — device dicabut
        RCLCPP_WARN(this->get_logger(), "Battery device disconnected, reconnecting...");
        break;
      }

      // ── JSON parsing (sama seperti sebelumnya) ──
      if (ch == '{') {
        if (!collecting) {
          buffer.clear();
          collecting = true;
          brace_count = 0;
        }
        brace_count++;
      }
      if (collecting) buffer += ch;
      if (ch == '}') {
        brace_count--;
        if (collecting && brace_count == 0) {
          handleBatteryJson(buffer);
          buffer.clear();
          collecting = false;
        }
      }
      if (buffer.size() > 2048) {
        buffer.clear();
        collecting = false;
        brace_count = 0;
      }
    }

    close(fd);
    fd = -1;
    buffer.clear();
    collecting = false;

    // Tunggu sebentar sebelum reconnect
    if (battery_running_) {
      std::this_thread::sleep_for(std::chrono::seconds(2));
    }
  }
}

void SensorManagerNode::handleBatteryJson(const std::string & raw)
{
  if (raw.empty()) return;

  try {
    json j = json::parse(raw);

    // validasi minimal
    if (!j.contains("code") || j["code"] != "BATTERY") {
      return;
    }

    // enforce identity dari ROS
    j["data"]["robot_id"] = robot_id_;
    j["data"]["ui_id"]    = ui_id_;

    std_msgs::msg::String msg;
    msg.data = j.dump();
    battery_pub_->publish(msg); 

  } catch (const std::exception & e) {
    RCLCPP_WARN(this->get_logger(),
      "Battery JSON invalid: %s", raw.c_str());
  }
}


} // namespace tifa_robot_api

int main(int argc, char ** argv)
{
  rclcpp::init(argc, argv);
  auto node = std::make_shared<tifa_robot_api::SensorManagerNode>();
  rclcpp::spin(node);
  rclcpp::shutdown();
  return 0;
}
