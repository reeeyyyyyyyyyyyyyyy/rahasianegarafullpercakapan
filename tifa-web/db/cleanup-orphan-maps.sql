-- Cleanup row m_map yatim (tanpa file) hasil insert lama route MAPPING_SAVE.
-- Jalankan manual: cek hasil SELECT dulu, baru COMMIT. Bila ragu → ROLLBACK.
-- Referensi: docs/api-contracts/robot-ws-tifa.md §5a, keputusan 2026-11-10.
BEGIN;

-- 1. Kandidat: file_group_id NULL, tanpa versi ber-file, tidak sedang aktif
CREATE TEMP TABLE orphan_maps AS
SELECT m.map_id, m.map_name, m.created_at
FROM m_map m
WHERE m.file_group_id IS NULL
  AND NOT EXISTS (SELECT 1 FROM m_map_version v WHERE v.map_id = m.map_id AND v.gfile_group_id IS NOT NULL)
  AND NOT EXISTS (SELECT 1 FROM m_device d WHERE d.active_map_id = m.map_id)
  AND NOT EXISTS (SELECT 1 FROM t_robot_command c WHERE c.map_id = m.map_id);

SELECT * FROM orphan_maps ORDER BY map_id;  -- ← REVIEW dulu

-- 2. Hapus referensi & row (goal yatim-attach dari blok lama ikut terhapus)
DELETE FROM m_goal        WHERE map_id IN (SELECT map_id FROM orphan_maps);
DELETE FROM m_map_version WHERE map_id IN (SELECT map_id FROM orphan_maps);
DELETE FROM m_map         WHERE map_id IN (SELECT map_id FROM orphan_maps);

-- COMMIT;   -- uncomment setelah SELECT di atas direview
ROLLBACK;    -- default aman