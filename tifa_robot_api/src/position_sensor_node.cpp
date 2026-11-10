#include "tifa_robot_api/position_sensor_node.hpp"

#include <chrono>

#include <nlohmann/json.hpp>
#include <tf2/exceptions.h>
#include <tf2/utils.h>
#include <tf2_geometry_msgs/tf2_geometry_msgs.hpp>

using json = nlohmann::json;

namespace tifa_robot_api
{

PositionSensorNode::PositionSensorNode(const rclcpp::NodeOptions & options)
: Node("position_sensor_node", options)
{
  robot_id_   = this->declare_parameter<std::string>("robot_id", "TFRB1");
  ui_id_      = this->declare_parameter<std::string>("ui_id", "TFUI1");
  map_frame_  = this->declare_parameter<std::string>("map_frame", "map");
  base_frame_ = this->declare_parameter<std::string>("base_frame", "base_footprint");
  const double rate_hz = this->declare_parameter<double>("rate_hz", 10.0);

  tf_buffer_ = std::make_shared<tf2_ros::Buffer>(this->get_clock());
  tf_listener_ = std::make_shared<tf2_ros::TransformListener>(*tf_buffer_);

  position_pub_ = this->create_publisher<std_msgs::msg::String>(
    "tifa/sensor/position", 20);

  timer_ = this->create_wall_timer(
    std::chrono::duration<double>(1.0 / rate_hz),
    std::bind(&PositionSensorNode::onTimer, this));

  RCLCPP_INFO(this->get_logger(),
    "PositionSensorNode started: %s -> %s @ %.1f Hz",
    map_frame_.c_str(), base_frame_.c_str(), rate_hz);
}

void PositionSensorNode::onTimer()
{
  geometry_msgs::msg::TransformStamped tf;
  try {
    tf = tf_buffer_->lookupTransform(map_frame_, base_frame_, tf2::TimePointZero);
  } catch (const tf2::TransformException & e) {
    // Belum ada frame map (SLAM/AMCL belum siap): jangan publish posisi palsu
    if (tf_ok_) {
      RCLCPP_WARN(this->get_logger(), "TF %s -> %s hilang: %s",
        map_frame_.c_str(), base_frame_.c_str(), e.what());
      tf_ok_ = false;
    } else {
      RCLCPP_WARN_THROTTLE(this->get_logger(), *this->get_clock(), 10000,
        "Menunggu TF %s -> %s: %s", map_frame_.c_str(), base_frame_.c_str(), e.what());
    }
    return;
  }
  if (!tf_ok_) {
    RCLCPP_INFO(this->get_logger(), "TF %s -> %s tersedia", map_frame_.c_str(), base_frame_.c_str());
    tf_ok_ = true;
  }

  json j;
  j["code"] = "POSITION";
  j["data"] = {
    {"robot_id", robot_id_},
    {"ui_id", ui_id_},
    {"x", tf.transform.translation.x},
    {"y", tf.transform.translation.y},
    {"yaw", tf2::getYaw(tf.transform.rotation)},
    {"frame", map_frame_}
  };

  std_msgs::msg::String out;
  out.data = j.dump();
  position_pub_->publish(out);
}

} // namespace tifa_robot_api

int main(int argc, char ** argv)
{
  rclcpp::init(argc, argv);
  rclcpp::spin(std::make_shared<tifa_robot_api::PositionSensorNode>());
  rclcpp::shutdown();
  return 0;
}
