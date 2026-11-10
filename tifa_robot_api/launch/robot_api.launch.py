from launch import LaunchDescription
from launch.actions import DeclareLaunchArgument
from launch.substitutions import LaunchConfiguration , EnvironmentVariable
from launch_ros.actions import Node

def generate_launch_description():
    robot_id_arg = DeclareLaunchArgument(
        'robot_id',
        default_value='TFRB1',
        description='Robot ID handled by this API node'
    )

    ui_id_arg = DeclareLaunchArgument(
        'ui_id',
        default_value='TFRB1',
        description='UI ID handled by this API node'
    )
    
    map_path = DeclareLaunchArgument(
        'map_base_path',
        default_value=[EnvironmentVariable('HOME'), '/tifa_maps']
    )

    node = Node(
        package='tifa_robot_api',
        executable='robot_api_node',
        name='tifa_robot_api',
        output='screen',
        # tifa_log_level di-set debug oleh launch_robot/manual_mapping debug:=true
        ros_arguments=['--log-level', ['tifa_robot_api:=', LaunchConfiguration('tifa_log_level', default='info')]],
        parameters=[{
            'robot_id': LaunchConfiguration('robot_id'),
            'ui_id': LaunchConfiguration('ui_id'),
            'map_base_path':  LaunchConfiguration('map_base_path'),
        }]
    )

    return LaunchDescription([
        robot_id_arg,
        ui_id_arg,
        map_path,
        node
    ])
