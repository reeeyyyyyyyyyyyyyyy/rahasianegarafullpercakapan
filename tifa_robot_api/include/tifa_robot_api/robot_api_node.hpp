#pragma once

#include <string>
#include <memory>
#include <queue>
#include <mutex>
#include <vector>
#include <atomic>

#include "rclcpp/rclcpp.hpp"
#include "std_msgs/msg/string.hpp"
#include "geometry_msgs/msg/pose_stamped.hpp"
#include "geometry_msgs/msg/twist_stamped.hpp"

#include "tifa_robot_api/state_machine.hpp"
#include <nlohmann/json.hpp>
using json = nlohmann::json;

// Nav2 action
#include "rclcpp_action/rclcpp_action.hpp"
#include "nav2_msgs/action/navigate_to_pose.hpp"
#include "slam_toolbox/srv/save_map.hpp"

// mapping action
#include "nav_msgs/srv/load_map.hpp"
#include <unordered_map>

namespace tifa_robot_api
{

struct GoalItem {
  int sequence;
  geometry_msgs::msg::PoseStamped pose;
};

struct FlaggedCoordinate {
  int flag_id;
  double x;
  double y;
  double yaw;
  rclcpp::Time timestamp;
  std::string label;
};

class RobotApiNode : public rclcpp::Node
{
public:
  explicit RobotApiNode(const rclcpp::NodeOptions & options = rclcpp::NodeOptions());

private:
  void resetToIdle(const std::string & reason, int delay_ms = 1000);
  rclcpp::TimerBase::SharedPtr idle_reset_timer_;
  std::atomic<bool> is_resetting_{false};
  // Map selection
  void writeSelectedMapConfig(const std::string & yaml_path);
  
  // Timer untuk map load retry / restart delay  
  rclcpp::TimerBase::SharedPtr map_load_retry_timer_;
  // ====================================================================
  // HOME BASE & POSITIONING
  // ====================================================================
  geometry_msgs::msg::PoseStamped home_base_pose_;
  bool has_home_base_ = false;
  std::string uploaded_by_{};

  static constexpr size_t MAX_QUEUE_SIZE = 100;
  std::string upload_server_url_;

  static constexpr int MAX_SEQUENCE = 10000;
  static constexpr int MIN_SEQUENCE = -1;  // -1 for home base
  
  bool isValidSequence(int sequence);

  std::string map_name_{};  // ✅ Initialize with {}
  std::string category_name_{};  // ✅ Initialize
  std::string category_type_{};  // ✅ Initialize
  std::string map_base_path_{};  // ✅ Initialize

  // Map file paths
  std::string map_path_pgm{};  // ✅ Initialize
  std::string map_path_yaml{};  // ✅ Initialize

  // Category ID (generated from timestamp + sequence)
  long long category_id = 0;  // ✅ Initialize to 0

  // Flagged coordinates during mapping
  std::vector<FlaggedCoordinate> flagged_coordinates_;
  std::mutex flags_mutex_;
  std::atomic<int> flag_counter_{0};

  // Helper to generate unique map IDs
  long long generateMapId();
  std::optional<GoalItem> paused_goal_;
  std::string sanitizeMapName(const std::string & raw_name);
  double getJsonDouble(const json & obj, 
                    const std::vector<std::string> & keys,
                    double default_value = 0.0);

  // Callback dari WS bridge
  void wsInCallback(const std_msgs::msg::String::SharedPtr msg);
  void cacheLastPose(const std_msgs::msg::String::SharedPtr msg);
  json last_position_json_;
  bool has_last_position_ = false;
  rclcpp::Time last_position_time_{0, 0, RCL_ROS_TIME};   // untuk menolak flag dengan posisi basi
  double flag_pose_max_age_sec_{2.0};

  // ====================================================================
  // HANDLER SPESIFIK
  // ====================================================================
  void handleOp(const std::string & robot_id, const std::string & raw_json);
  void handleMove(const std::string & robot_id, const std::string & raw_json);
  void handleMode(const std::string & robot_id, const std::string & raw_json);
  void handleINT(const std::string & robot_id, const std::string & raw_json);
  void handleICL(const std::string & robot_id, const std::string & raw_json);
  void handleICM(const std::string & robot_id, const std::string & raw_json);
  void handlePickUp(const std::string & raw_json);
  void sendExpression(const std::string & message);
  void handleRobotStuckInternal(int sequence, const geometry_msgs::msg::PoseStamped & pose);
  void handleTeleop(const std::string & raw_json);

  // ====================================================================
  // MAPPING STAGE HANDLERS
  // ====================================================================
  void navToMapping(const std::string & robot_id, const std::string & raw_json);
  void mapUpload(const std::string & robot_id, const std::string & raw_json);
  bool uploadMapToServer(const std::string & robot_id);   // true bila server menerima (HTTP 200/201)
  void saveFlagsToFile(const std::string & path);          // simpan flag + home base ke JSON
  void mappingToNav(const std::string & robot_id, const std::string & raw_json);
  void flagCoordinate(const std::string & robot_id, const std::string & raw_json);
  void switchServiceAfterAck(const std::string & robot_id,
                             const std::string & command_id,
                             const std::string & ack_status,
                             const std::string & target_service);
  rclcpp::TimerBase::SharedPtr service_switch_timer_;
  rclcpp::Client<nav_msgs::srv::LoadMap>::SharedPtr map_load_client_;
  std::unordered_map<int, std::string> map_registry_;
  std::mutex map_registry_mutex_;
  void handleMapData(const std::string & raw_json);
  void handleMapSelected(const std::string & raw_json);
  static std::vector<uint8_t> base64Decode(const std::string & encoded);
  std::string unzipMapBuffer(const std::vector<uint8_t> & zip_bytes, int map_id);
  std::unordered_map<int, std::string> pending_map_selected_;
  std::mutex pending_map_mutex_;



  // ====================================================================
  // HELPER MESSAGE / POSE
  // ====================================================================
  geometry_msgs::msg::PoseStamped buildPoseStamped(double x, double y, double yaw);
  void sendAck(const std::string & robot_id,
               const std::string & ref_code,
               const std::string & status,
               const json & extra = json::object());   // field tambahan di data
  void sendError(const std::string & message,
                 const std::string & err_code,
                 const std::string & prior);

  // ====================================================================
  // QUEUE / MULTI-GOAL HELPERS
  // ====================================================================
  void sendSingleNavGoal(int sequence, const geometry_msgs::msg::PoseStamped & pose);
  void enqueueGoal(int sequence, const geometry_msgs::msg::PoseStamped & pose);
  void processNextGoal();
  void sendLastPoseOnce();

  // ====================================================================
  // NAV2 ACTION HELPER
  // ====================================================================
  using NavigateToPose = nav2_msgs::action::NavigateToPose;
  using GoalHandleNavigate = rclcpp_action::ClientGoalHandle<NavigateToPose>;

  // ====================================================================
  // SUBS / PUBS
  // ====================================================================
  rclcpp::Subscription<std_msgs::msg::String>::SharedPtr ws_in_sub_;
  rclcpp::Subscription<std_msgs::msg::String>::SharedPtr read_sensor_odom_;
  rclcpp::Publisher<std_msgs::msg::String>::SharedPtr ws_out_pub_;
  rclcpp::Publisher<geometry_msgs::msg::TwistStamped>::SharedPtr diff_cont_pub;

  // Ringkasan teleop di log: satu baris saat mulai, satu saat berhenti
  bool teleop_active_ = false;
  int teleop_msg_count_ = 0;
  rclcpp::Time teleop_start_time_{0, 0, RCL_ROS_TIME};

  // ====================================================================
  // DEFAULT IDs & PARAMETERS
  // ====================================================================
  std::string default_robot_id_;
  std::string default_ui_id_;

  rclcpp::Client<slam_toolbox::srv::SaveMap>::SharedPtr slam_save_map_client_;

  std::string current_move_type_;   // "HOMEBASE" | "CHARGE"
  int current_move_sequence_ = -1;
  geometry_msgs::msg::PoseStamped last_sent_pose_;

  // ====================================================================
  // STATE MACHINE (internal only)
  // ====================================================================
  StateMachine sm_;

  // ====================================================================
  // PERSISTENT ACTION CLIENT
  // ====================================================================
  rclcpp_action::Client<NavigateToPose>::SharedPtr nav_client_;

  // ====================================================================
  // GOAL QUEUE & SYNCHRONIZATION
  // ====================================================================
  std::queue<GoalItem> goal_queue_;
  std::mutex queue_mutex_;
  bool goal_in_progress_;
  int op_sequence_counter_ = 0;

  // ====================================================================
  // RETRY TIMERS
  // ====================================================================
  rclcpp::TimerBase::SharedPtr retry_timer_;
  rclcpp::TimerBase::SharedPtr home_timer_;
  std::chrono::seconds retry_interval_{1};

  // ====================================================================
  // GOAL CONFIRMATION & STATUS
  // ====================================================================
  void sendGoalComplete(int sequence);
  void sendRobotStuck(int sequence,
                      const geometry_msgs::msg::PoseStamped & pose,
                      const std::string & reason);

  rclcpp::TimerBase::SharedPtr delay_timer_;
};

}  // namespace tifa_robot_api