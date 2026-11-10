-- mig-lokal-v2.sql : patch skema lokal supaya halaman /robots/[id], kelola peta, logs, dan audit jalan.
-- DB baru: jalankan init-lokal.sql dulu, lalu file ini.
-- Sumber kolom: lib/api/deviceStatus.ts, maps.ts, battery.ts, auditLogger.ts, app/api/logs, app/api/goals.

-- 1. raw_payload & metadata harus JSONB (operator -> gagal di TEXT: "text -> unknown")
ALTER TABLE h_battery    ALTER COLUMN raw_payload TYPE JSONB USING NULLIF(raw_payload,'')::jsonb;
ALTER TABLE h_state      ALTER COLUMN raw_payload TYPE JSONB USING NULLIF(raw_payload,'')::jsonb;
ALTER TABLE h_position   ALTER COLUMN raw_payload TYPE JSONB USING NULLIF(raw_payload,'')::jsonb;
ALTER TABLE h_expression ALTER COLUMN raw_payload TYPE JSONB USING NULLIF(raw_payload,'')::jsonb;
ALTER TABLE m_goal       ALTER COLUMN metadata    TYPE JSONB USING NULLIF(metadata,'')::jsonb;

-- 2. Kolom yang dipakai kode web tapi tidak ada di entitas JPA
ALTER TABLE m_map ADD COLUMN IF NOT EXISTS company_id BIGINT;  -- filter peta per perusahaan (lib/api/maps.ts)

ALTER TABLE h_connection_log ADD COLUMN IF NOT EXISTS remote_addr TEXT;      -- app/api/logs
ALTER TABLE h_connection_log ADD COLUMN IF NOT EXISTS local_addr TEXT;
ALTER TABLE h_connection_log ADD COLUMN IF NOT EXISTS connected_at TIMESTAMPTZ;    -- online detection
ALTER TABLE h_connection_log ADD COLUMN IF NOT EXISTS disconnected_at TIMESTAMPTZ;

-- 3. h_audit_log (lib/api/auditLogger.ts)
CREATE TABLE IF NOT EXISTS h_audit_log (
    h_audit_log_id BIGSERIAL PRIMARY KEY,
    user_id BIGINT, user_email TEXT, company_id BIGINT,
    action TEXT, resource_type TEXT, resource_id TEXT,
    details JSONB, ip_address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. View status terkini per device (dipakai /api/device-status, /robots, /robots/[id])
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
