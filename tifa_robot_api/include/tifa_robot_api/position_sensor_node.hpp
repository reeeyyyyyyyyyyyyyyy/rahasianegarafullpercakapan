#pragma once

#include <memory>
#include <string>

#include <rclcpp/rclcpp.hpp>
#include <std_msgs/msg/string.hpp>
#include <tf2_ros/buffer.h>
#include <tf2_ros/transform_listener.h>

namespace tifa_robot_api
{

// Publish posisi robot di frame peta (default map → base_footprint, dari TF slam_toolbox
// atau AMCL) sebagai JSON POSITION ke tifa/sensor/position. Dipakai robot_api untuk
// MAPPING_FLAG, jadi koordinat flag sejajar dengan peta yang disimpan.
class PositionSensorNode : public rclcpp::Node
{
public:
  explicit PositionSensorNode(const rclcpp::NodeOptions & options = rclcpp::NodeOptions());

private:
  void onTimer();

  std::shared_ptr<tf2_ros::Buffer> tf_buffer_;
  std::shared_ptr<tf2_ros::TransformListener> tf_listener_;
  rclcpp::Publisher<std_msgs::msg::String>::SharedPtr position_pub_;
  rclcpp::TimerBase::SharedPtr timer_;

  std::string robot_id_;
  std::string ui_id_;
  std::string map_frame_;
  std::string base_frame_;
  bool tf_ok_{false};
};

} // namespace tifa_robot_api
