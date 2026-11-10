DROP VIEW IF EXISTS v_device_current_status;
CREATE VIEW v_device_current_status AS
SELECT d.device_id, d.device_code, d.device_name, d.company_id,
       pos.last_x, pos.last_y, pos.last_yaw, bat.battery_percent,
       st.robot_mode, st.robot_activity,
       GREATEST(COALESCE(st.recorded_at,'1970-01-01'::timestamptz),
                COALESCE(bat.recorded_at,'1970-01-01'::timestamptz)) AS status_updated_at
FROM m_device d
LEFT JOIN LATERAL (SELECT x AS last_x,y AS last_y,yaw AS last_yaw,recorded_at FROM h_position WHERE device_id=d.device_id ORDER BY recorded_at DESC LIMIT 1) pos ON true
LEFT JOIN LATERAL (SELECT battery_percent,recorded_at FROM h_battery WHERE device_id=d.device_id ORDER BY recorded_at DESC LIMIT 1) bat ON true
LEFT JOIN LATERAL (SELECT robot_mode,robot_activity,recorded_at FROM h_state WHERE device_id=d.device_id ORDER BY recorded_at DESC LIMIT 1) st ON true;
GRANT SELECT ON v_device_current_status TO tifa;