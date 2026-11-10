INSERT INTO m_company (company_id, company_code, company_name) VALUES (1,'TIFA','TIFA') ON CONFLICT DO NOTHING;
INSERT INTO m_role (role_id, role_code, role_name) VALUES (1,'admin','Administrator') ON CONFLICT DO NOTHING;
INSERT INTO t_user (user_id, username, email, password_hash, is_active, company_id, display_name)
VALUES (1,'tifaadmin','tifaadmin@tifa.com','$2b$10$iJpNiAHZhK9RBssCSA3lvuqgpDPkh5KQ4hBQ3G.zlMofswRJfheGG',TRUE,1,'TIFA Admin') ON CONFLICT (user_id) DO NOTHING;
INSERT INTO t_user_role (user_id, role_id) VALUES (1,1) ON CONFLICT DO NOTHING;
INSERT INTO m_device (device_id, device_code, device_name, company_id) VALUES (1,'TFRB1','Robot TIFA 1',1) ON CONFLICT (device_id) DO NOTHING;
INSERT INTO m_device (device_code, device_name, company_id)
SELECT v.code, v.name, 1 FROM (VALUES ('TFRB2','TFRB2'),('TFUI2','TFUI2'),('TFRB5','Robot TIFA 5'),('TFUI5','TFUI5'),('TFRB10','Robot TIFA 10'),('TFUI10','TFUI10')) AS v(code,name)
WHERE NOT EXISTS (SELECT 1 FROM m_device x WHERE x.device_code = v.code);
SELECT setval(pg_get_serial_sequence('t_user','user_id'), COALESCE((SELECT MAX(user_id) FROM t_user),1));
SELECT setval(pg_get_serial_sequence('m_role','role_id'), COALESCE((SELECT MAX(role_id) FROM m_role),1));
SELECT setval(pg_get_serial_sequence('m_device','device_id'), COALESCE((SELECT MAX(device_id) FROM m_device),1));
SELECT setval(pg_get_serial_sequence('m_company','company_id'), COALESCE((SELECT MAX(company_id) FROM m_company),1));
