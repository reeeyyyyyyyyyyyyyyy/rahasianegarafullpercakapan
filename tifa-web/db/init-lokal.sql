-- init-lokal.sql : skema minimal tifa untuk Postgres Docker lokal (pengujian build web)
-- Sumber kolom: entitas JPA tifa-be (t_role_permission, t_user_role, m_device, h_*, t_goal_*, dll.)
-- Tanpa foreign key / constraint ketat — hanya untuk dev lokal; ganti dengan pg_dump prod bila tersedia.

CREATE TABLE IF NOT EXISTS m_company (
    company_id BIGSERIAL PRIMARY KEY,
    company_code TEXT, company_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS m_role (
    role_id BIGSERIAL PRIMARY KEY,
    role_code TEXT, role_name TEXT
);

CREATE TABLE IF NOT EXISTS m_permission (
    permission_id BIGSERIAL PRIMARY KEY,
    permission_code TEXT, description TEXT
);

CREATE TABLE IF NOT EXISTS t_user (
    user_id BIGSERIAL PRIMARY KEY,
    username TEXT, display_name TEXT, email TEXT, password_hash TEXT,
    is_active BOOLEAN DEFAULT TRUE, company_id BIGINT,
    created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS t_user_role (
    user_role_id BIGSERIAL PRIMARY KEY,
    user_id BIGINT, role_id BIGINT
);

CREATE TABLE IF NOT EXISTS t_role_permission (
    role_permission_id BIGSERIAL PRIMARY KEY,
    role_id BIGINT, permission_id BIGINT
);

CREATE TABLE IF NOT EXISTS m_device (
    device_id BIGSERIAL PRIMARY KEY,
    device_code TEXT, device_name TEXT, robot_local_ip TEXT, robot_local_ssid TEXT,
    company_id BIGINT, active_map_id BIGINT,
    created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS m_device_network (
    network_id BIGSERIAL PRIMARY KEY, device_id BIGINT,
    ssid TEXT, ip_address TEXT, mac_address TEXT, access_info TEXT,
    last_seen TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS h_battery (
    h_battery_id BIGSERIAL PRIMARY KEY, device_id BIGINT,
    battery_percent NUMERIC, voltage NUMERIC,
    recorded_at TIMESTAMPTZ DEFAULT NOW(), raw_payload JSONB
);

CREATE TABLE IF NOT EXISTS h_state (
    h_state_id BIGSERIAL PRIMARY KEY, device_id BIGINT,
    robot_mode TEXT, robot_activity TEXT, is_emergency BOOLEAN DEFAULT FALSE,
    recorded_at TIMESTAMPTZ DEFAULT NOW(), raw_payload JSONB
);

CREATE TABLE IF NOT EXISTS h_position (
    h_position_id BIGSERIAL PRIMARY KEY, device_id BIGINT,
    x NUMERIC, y NUMERIC, yaw NUMERIC,
    recorded_at TIMESTAMPTZ DEFAULT NOW(), raw_payload JSONB
);

CREATE TABLE IF NOT EXISTS h_command_log (
    h_command_log_id BIGSERIAL PRIMARY KEY, device_id BIGINT,
    command_code TEXT, command_payload TEXT, status TEXT, status_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS h_ws_traffic (
    h_ws_traffic_id BIGSERIAL PRIMARY KEY, device_id BIGINT,
    direction TEXT, code TEXT, payload TEXT, remote_addr TEXT,
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS h_connection_log (
    h_connection_log_id BIGSERIAL PRIMARY KEY,
    connection_type TEXT, event_type TEXT, ip_address TEXT, user_agent TEXT, device_id BIGINT,
    remote_addr TEXT, local_addr TEXT,
    connected_at TIMESTAMPTZ, disconnected_at TIMESTAMPTZ,
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS h_expression (
    h_expression_id BIGSERIAL PRIMARY KEY, device_id BIGINT,
    expression_type TEXT, led_pattern TEXT, sound_file TEXT,
    recorded_at TIMESTAMPTZ DEFAULT NOW(), raw_payload JSONB
);

CREATE TABLE IF NOT EXISTS g_file_group (
    file_group_id BIGSERIAL PRIMARY KEY, group_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS g_file (
    g_file_id BIGSERIAL PRIMARY KEY, file_group_id BIGINT,
    file_name TEXT, file_path TEXT, file_type TEXT, file_size BIGINT,
    metadata TEXT, uploaded_by BIGINT, uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS m_goal (
    goal_id BIGSERIAL PRIMARY KEY, map_id BIGINT,
    goal_code TEXT, goal_name TEXT, goal_type TEXT,
    x NUMERIC, y NUMERIC, yaw NUMERIC, category_id BIGINT, zone TEXT,
    metadata JSONB, created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS m_goal_category (
    category_id BIGSERIAL PRIMARY KEY,
    category_name TEXT, category_type TEXT, color TEXT, sort_order BIGINT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE, created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS t_goal_queue (
    goal_queue_id BIGSERIAL PRIMARY KEY,
    queue_code TEXT, priority BIGINT DEFAULT 0, retry_count BIGINT DEFAULT 0, status TEXT,
    fail_reason TEXT, payload TEXT, map_id BIGINT, device_id BIGINT, requested_by BIGINT,
    created_at TIMESTAMPTZ DEFAULT NOW(), started_at TIMESTAMPTZ, finished_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS t_goal_queue_detail (
    goal_queue_detail_id BIGSERIAL PRIMARY KEY, goal_queue_id BIGINT, sequence_order BIGINT,
    goal_id BIGINT, dest_x NUMERIC, dest_y NUMERIC, dest_yaw NUMERIC,
    status TEXT, fail_reason TEXT, attempt_count BIGINT DEFAULT 0, tray_number BIGINT,
    created_at TIMESTAMPTZ DEFAULT NOW(), started_at TIMESTAMPTZ, finished_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS m_map (
    map_id BIGSERIAL PRIMARY KEY,
    map_name TEXT, description TEXT, map_floor TEXT, is_active BOOLEAN DEFAULT TRUE,
    company_id BIGINT, file_group_id BIGINT, created_by BIGINT,
    created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS m_map_version (
    map_version_id BIGSERIAL PRIMARY KEY, map_id BIGINT, version_number BIGINT,
    gfile_group_id BIGINT, created_by BIGINT, changelog TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS t_settings (
    setting_id BIGSERIAL PRIMARY KEY,
    setting_key TEXT, setting_value TEXT, description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS h_audit_log (
    h_audit_log_id BIGSERIAL PRIMARY KEY,
    user_id BIGINT, user_email TEXT, company_id BIGINT,
    action TEXT, resource_type TEXT, resource_id TEXT,
    details JSONB, ip_address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE VIEW v_device_current_status AS
SELECT
    d.device_id, d.device_code, d.device_name, d.company_id,
    pos.last_x, pos.last_y, pos.last_yaw,
    bat.battery_percent,
    st.robot_mode, st.robot_activity,
    GREATEST(
        COALESCE(st.recorded_at,  '1970-01-01'::timestamptz),
        COALESCE(bat.recorded_at, '1970-01-01'::timestamptz)
    ) AS status_updated_at
FROM m_device d
LEFT JOIN LATERAL (
    SELECT x AS last_x, y AS last_y, yaw AS last_yaw, recorded_at
    FROM h_position WHERE device_id = d.device_id
    ORDER BY recorded_at DESC LIMIT 1
) pos ON true
LEFT JOIN LATERAL (
    SELECT battery_percent, recorded_at
    FROM h_battery WHERE device_id = d.device_id
    ORDER BY recorded_at DESC LIMIT 1
) bat ON true
LEFT JOIN LATERAL (
    SELECT robot_mode, robot_activity, recorded_at
    FROM h_state WHERE device_id = d.device_id
    ORDER BY recorded_at DESC LIMIT 1
) st ON true;
