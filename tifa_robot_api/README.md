# tifa_robot_api

Package ROS 2 otak perintah/kontrol untuk robot pengantar makanan Tifa.

## Arsitektur

![Tifa System Architecture](Untitled%20diagram-2026-08-05-103740.png)

![Node](pill.png) Node | ![Topic](rectangle.png) Topic | ![Service](Parallelogram.png) Service | ![Action](Hexagon.png) Action | ![Hardware](Cylinder.png) Hardware

## Node & Fungsi

![State Machine](state%20machine.png)

### robot_api_node (Main)

Node pusat. Menerima perintah JSON dari UI via WebSocket, menerjemahkan menjadi aksi Nav2/SLAM.

| Interface | Nama | Fungsi |
|-----------|------|--------|
| Subscribe | `tifa/ws_in` | Menerima perintah JSON dari UI |
| Subscribe | `tifa/sensor/position` | Posisi robot di frame peta dari `position_sensor_node` (untuk MAPPING_FLAG) |
| Publish | `tifa/ws_out` | Mengirim respons/ event ke UI |
| Publish | `/diff_cont` | Mengontrol kecepatan motor (teleop) |
| Action Client | `navigate_to_pose` | Mengirim tujuan navigasi ke Nav2 |
| Service Client | `/map_server/load_map` | Memuat peta baru |
| Service Client | `slam_toolbox/save_map` | Menyimpan peta SLAM |

| Parameter | Default | Fungsi |
|---|---|---|
| `robot_id` / `ui_id` | `TFRB1` / `TFUI1` | Identitas di JSON (service mengisi dari `deploy/tifa.env`) |
| `map_base_path` | `~/tifa_maps` | Folder peta hasil mapping + file flag |
| `upload_server_url` | `https://tifa-be.forgixrobotic.com/api/maps/upload/full` | Endpoint upload peta + flag |
| `uploaded_by` | `"1"` | Field `uploadedBy` saat upload |
| `flag_pose_max_age_sec` | `2.0` | MAPPING_FLAG ditolak (`POSITION_STALE`) bila posisi peta terakhir lebih tua dari ini |

**Fungsi utama:**
- **MOVE** → Kirim satu tujuan navigasi ke Nav2
- **OP** → Kirim multiple tujuan berurutan (tray tasks)
- **INTERRUPT** → Jeda navigasi, simpan posisi
- **INTERRUPT_CANCEL** → Lanjutkan dari posisi jeda
- **INTERRUPT_CONFIRM** → Batalkan dan pulang ke home base
- **PICKUP_CONFIRM** → Konfirmasi pengambilan, lanjut ke tujuan berikutnya
- **TELEOP** → Kontrol kecepatan langsung. Log INFO hanya `TELEOP start` / `TELEOP stop (durasi, jumlah pesan)`; payload per pesan (±10/detik) ada di level DEBUG (`TIFA_DEBUG=true`)
- **MODE** → Set state machine manual
- **MAPPING_START/STOP** → Beralih mode navigasi ↔ SLAM. Kirim ACK (`STARTED`/`STOPPED`) dulu, 1 detik kemudian `sudo systemctl --no-block start tifa-mapping.service` / `tifa.service`; service lama dihentikan systemd lewat `Conflicts=`. Koneksi WS app putus beberapa detik karena node ini dan `ws_bridge` ikut restart. Ditolak (`REJECTED` + `SYSTEM_ERROR`) bila robot dijalankan manual dari terminal (tidak ada `INVOCATION_ID` systemd)
- **MAPPING_SAVE** → Simpan peta ke file, simpan flag ke `<map>.flags.json`, upload peta + flag (`destinations`) ke server. ACK `SAVED` hanya bila server menerima (HTTP 200/201); bila gagal ACK `UPLOAD_FAILED` + `ERROR` `UPLOAD_ERROR` berisi detail
- **MAPPING_FLAG** → Tandai posisi robot saat ini di **frame peta** (lihat [Protokol MAPPING_FLAG](#protokol-mapping_flag))
- **MAP_DATA** → Terima peta dari server (base64 zip)
- **MAP_SELECTED** → Ganti peta aktif

### sensor_manager_node

Membaca data baterai ESP32-C3 via serial `/dev/battery_monitor` (115200 baud). Auto-reconnect jika koneksi putus.

### position_sensor_node

Posisi robot **di frame peta**: membaca TF `map → base_footprint` (dipublish slam_toolbox saat
mapping) lalu mengirim JSON ke `tifa/sensor/position`. Dijalankan oleh `manual_mapping.launch.py`
(mode mapping).

| Interface | Nama | Fungsi |
|---|---|---|
| TF listener | `/tf`, `/tf_static` | Lookup `map_frame → base_frame` (transform terbaru) |
| Publish | `tifa/sensor/position` | JSON `POSITION`, 10 Hz |

| Parameter | Default | Fungsi |
|---|---|---|
| `map_frame` | `map` | Frame peta |
| `base_frame` | `base_footprint` | Frame robot (sama dengan `base_frame` slam_toolbox) |
| `rate_hz` | `10.0` | Frekuensi publish |
| `robot_id` / `ui_id` | `TFRB1` / `TFUI1` | Identitas di JSON (launch mapping mengisi dari env) |

```json
{"code":"POSITION","data":{"robot_id":"TFRB10","ui_id":"TFUI10","x":1.5,"y":-2.25,"yaw":0.785,"frame":"map"}}
```

- Selama frame `map` belum ada (SLAM belum siap) node **tidak publish apa pun** dan menulis
  `Menunggu TF map -> base_footprint` (maksimal tiap 10 s). Saat TF muncul/hilang ditulis satu baris
  `TF ... tersedia` / `TF ... hilang`.
- Field `frame` dipakai robot_api untuk memastikan posisi flag memang di frame peta.

> **Perubahan 2026-11-05:** sebelumnya node ini membaca `/diff_cont/odom` (odometri roda, frame
> `odom`). Koordinat flag jadi bergeser sebesar drift roda terhadap peta SLAM yang disimpan
> (contoh sesi 5 Nov: 5 flag dari odometri roda). Sekarang dari TF `map`.

> **Belum:** di mode navigasi node ini tidak dijalankan, sehingga `sendLastPoseOnce()` (posisi yang
> dikirim saat goal sukses) tidak punya data. Bisa diperbaiki dengan menjalankan node yang sama di
> `launch_robot.launch.py` (TF `map` di mode navigasi datang dari AMCL).

### Protokol MAPPING_FLAG

```text
web → robot   {"code":"MAPPING_FLAG","data":{"robot_id":"TFRB10","status":true,"goal_name":"meja 1"}}

robot → web   diterima:
  {"code":"ACK","data":{"command_id":"MAPPING_FLAG","status":"FLAGGED",
   "flag_id":1,"label":"meja 1","x":1.5,"y":-2.25,"yaw":0.785,"frame":"map", ...}}

robot → web   ditolak:
  {"code":"ACK","data":{"command_id":"MAPPING_FLAG","status":"REJECTED","reason":"NO_POSITION", ...}}
```

| `reason` (REJECTED) | Arti |
|---|---|
| `STATUS_FALSE` | `data.status` bernilai `false` |
| `NO_POSITION` | belum ada posisi dari `position_sensor_node` (SLAM belum siap) |
| `POSITION_NOT_MAP_FRAME` | posisi bukan frame `map` (node posisi versi lama) |
| `POSITION_STALE` | posisi terakhir lebih tua dari `flag_pose_max_age_sec` (default 2 s) |

Field tambahan di ACK (`flag_id`, `label`, `x`, `y`, `yaw`, `frame`, `reason`) bersifat tambahan:
klien lama yang hanya membaca `status` tetap berjalan.

Alur di robot (`flagCoordinate()`):

1. `data.status` harus `true`, kalau tidak → `REJECTED` / `STATUS_FALSE`.
2. Ambil posisi terakhir dari `tifa/sensor/position`. Wajib ada, `frame == "map"`, dan umurnya
   ≤ `flag_pose_max_age_sec`. Kalau tidak → `REJECTED` dengan `reason` di bawah. **Tidak ada lagi
   fallback diam-diam ke posisi home base.**
3. Label: `data.goal_name` → `data.label` → `FLAG_<id>`.
4. Flag disimpan di memori, lalu seluruh flag sesi ditulis ke `~/tifa_maps/flags_pending.json`.
5. ACK `FLAGGED` berisi koordinat flag, supaya web bisa langsung menampilkan titiknya.
6. Flag dikirim ke backend nanti, bersama peta, saat `MAPPING_SAVE`.

Flag juga ditulis ke disk supaya tidak hilang bila upload gagal atau robot_api restart:

| File | Kapan |
|---|---|
| `~/tifa_maps/flags_pending.json` | ditimpa setiap flag baru selama sesi mapping |
| `~/tifa_maps/<map_name>.flags.json` | saat `MAPPING_SAVE`, sebelum upload; berisi semua flag + home base |

Isi file (ditulis atomik: `.tmp` lalu rename):

```json
{
  "map_name": "20261105_TELCOFF",
  "frame": "map",
  "robot_id": "TFRB10",
  "saved_at": 1793881802.86,
  "flags": [
    {"flag_id": 1, "label": "meja 1", "x": 1.5, "y": -2.25, "yaw": 0.785, "stamp": 1793881802.86}
  ],
  "home_base": {"x": 0.0, "y": 0.0, "yaw": 0.0}
}
```

Flag di memori hilang bila robot_api restart (mis. pindah mode). Saat ini file **tidak** dibaca ulang
otomatis: peta SLAM baru punya frame `map` sendiri, jadi flag sesi lama tidak berlaku untuk peta baru.
File dipakai untuk cadangan / upload ulang manual.

### Protokol MAPPING_SAVE

```text
web → robot   {"code":"MAPPING_SAVE","data":{"robot_id":"TFRB10","status":true,"map_name":"20261105_TELCOFF",
               "category":"TELCOFF","category_type":"..."}}

robot:  slam_toolbox/save_map → tunggu ~/tifa_maps/<map_name>.pgm + .yaml valid
        → tulis <map_name>.flags.json → upload multipart ke upload_server_url

robot → web   sukses (HTTP 200/201):   ACK MAPPING_SAVE status "SAVED"          (flag di memori dikosongkan)
robot → web   gagal:                    ERROR "UPLOAD_ERROR" (detail HTTP/CURL)
                                        + ACK MAPPING_SAVE status "UPLOAD_FAILED" (flag tetap di memori + file)
```

Field multipart upload: `mapName`, `uploadedBy`, `pgmFile`, `yamlFile`, `categories` (JSON),
`destinations` (JSON: tiap flag sebagai `{destination_id, category_id, destination_name, destination_code:"FLAG_<id>", x, y, yaw, zone, is_home:0}`
ditambah `HOME_BASE` dengan `is_home:1`).

> **Perubahan 2026-11-05:** sebelumnya ACK `SAVED` dikirim walaupun upload gagal, sehingga web
> menganggap peta tersimpan di server.

> **Urutan dari web:** kirim `MAPPING_STOP` setelah menerima ACK `SAVED` / `UPLOAD_FAILED`. Pada sesi
> 5 Nov `MAPPING_STOP` datang 2 detik setelah `MAPPING_SAVE`, robot_api dimatikan (SIGINT → SIGTERM)
> di tengah upload dan flag di memori hilang.

### slam_supervisor_node

Memantau `/map` dari SLAM Toolbox. Mendeteksi pemetaan selesai jika:
1. Cakupan stabil (< 1% perubahan dalam 30 detik)
2. Frontier habis (< 10% dari area yang diketahui)

## Cara Menggunakan

### 1. Build

```bash
cd ~/tifa_ws
colcon build --packages-select tifa_robot_api
source install/setup.bash
```

### 2. Jalankan

```bash
# Mode navigasi (default)
ros2 launch tifa_robot_api robot_api.launch.py

# Dengan custom ID
ros2 launch tifa_robot_api robot_api.launch.py robot_id:=TFRB1 ui_id:=TFUI1
```

### 3. Kirim Perintah via ROS CLI

```bash
# Kirim MOVE
ros2 topic pub --once /tifa/ws_in std_msgs/msg/String "data: '{\"code\":\"MOVE\",\"data\":{\"sequence\":1,\"dest\":{\"x\":1.0,\"y\":2.0,\"yaw\":0.0}}}'"

# Kirim TELEOP
ros2 topic pub --once /tifa/ws_in std_msgs/msg/String "data: '{\"code\":\"TELEOP\",\"data\":{\"linear\":{\"x\":0.3,\"y\":0.0,\"z\":0.0},\"angular\":{\"x\":0.0,\"y\":0.0,\"z\":0.5}}}'"

# Kirim INTERRUPT
ros2 topic pub --once /tifa/ws_in std_msgs/msg/String "data: '{\"code\":\"INTERRUPT\"}'"

# Kirim MAPPING_FLAG (mode mapping)
ros2 topic pub --once /tifa/ws_in std_msgs/msg/String "data: '{\"code\":\"MAPPING_FLAG\",\"data\":{\"robot_id\":\"TFRB10\",\"status\":true,\"goal_name\":\"meja 1\"}}'"

# Cek posisi peta yang dipakai flag
ros2 topic echo --once /tifa/sensor/position
ros2 run tf2_ros tf2_echo map base_footprint

# Cek status
ros2 topic echo /tifa/ws_out

# Flag tersimpan
cat ~/tifa_maps/flags_pending.json
```

### 4. Flow Normal

```
1. UI kirim MOVE → robot_api terima → set MOVING → kirim goal ke Nav2
2. Nav2 navigasi → robot bergerak
3. Tujuan tercapai → kirim GOAL_COMPLETE → set PAUSED
4. UI kirim PICKUP_CONFIRM → proses tujuan berikutnya atau pulang
```

### 5. Flow Mapping

```
1. UI kirim MAPPING_START → ACK STARTED → tifa-mapping.service jalan (SLAM)
2. position_sensor_node mulai publish begitu TF map → base_footprint ada
3. UI kirim MAPPING_FLAG di tiap titik → ACK FLAGGED + x,y,yaw (atau REJECTED + reason)
4. UI kirim MAPPING_SAVE → simpan peta + <map>.flags.json → upload → ACK SAVED / UPLOAD_FAILED
5. Setelah ACK MAPPING_SAVE diterima, UI kirim MAPPING_STOP → ACK STOPPED → tifa.service (navigasi)
```

## Troubleshooting

| Error | Kemungkinan Penyebab | Solusi |
|-------|---------------------|--------|
| `MOTOR_FAIL` | Robot bukan IDLE | Tunggu robot selesai/abort navigasi sebelumnya |
| `NAV_ABORTED` | Nav2 gagal navigasi | Auto-recovery aktif, robot akan reset ke IDLE |
| `QUEUE_FULL` | Antrian > 100 tujuan | Kurangi jumlah tujuan dalam OP |
| `SYSTEM_ERROR` | systemctl gagal, atau MAPPING_START/STOP saat robot jalan manual | Jalankan via service; cek `systemctl status tifa.service tifa-mapping.service` dan `/etc/sudoers.d/tifa` (`deploy/install.sh`) |
| `SLAM_ERROR` | SLAM toolbox tidak jalan | Pastikan mode mapping aktif |
| `UPLOAD_ERROR` | Server tidak terjangkau / menolak | Cek koneksi internet dan URL server. `HTTP 403` dengan body kosong dari Cloudflare untuk semua path backend (5 Nov) = jaringan/IP diblok di sisi server, bukan masalah token |
| ACK `MAPPING_SAVE` `UPLOAD_FAILED` | Upload gagal (lihat `ERROR` sebelumnya) | Peta + `<map>.flags.json` tetap ada di `~/tifa_maps`; perbaiki koneksi lalu upload ulang |
| MAPPING_FLAG `REJECTED` / `NO_POSITION` | `position_sensor_node` belum publish (SLAM belum siap / TF `map` belum ada) | Tunggu SLAM aktif; cek `ros2 run tf2_ros tf2_echo map base_footprint` |
| MAPPING_FLAG `REJECTED` / `POSITION_STALE` | TF `map` berhenti (> 2 s) | Cek slam_toolbox di `launch.log`; cek `ros2 topic hz /tifa/sensor/position` |
| MAPPING_FLAG `REJECTED` / `POSITION_NOT_MAP_FRAME` | `position_sensor_node` versi lama (odom) | `git pull` + `colcon build` di robot |
| `MAP_FILE_MISSING` | File peta tidak ada | Simpan ulang peta atau cek path |
| `MAP_DATA_ERROR` | Payload base64 corrupt | Kirim ulang data peta |
| Robot tidak bergerak | Nav2 server tidak start | Cek: `ros2 action list | grep navigate` |
| Baterai tidak muncul | Serial ESP32 error | Cek device: `ls /dev/battery_monitor` |
| Posisi tidak update | TF `map → base_footprint` tidak ada | Cek: `ros2 run tf2_ros tf2_echo map base_footprint`; log `position_sensor_node` di `launch.log` |

**Cek logs:**
```bash
# Log lengkap run terakhir (launch dengan debug:=true untuk level DEBUG node ini)
grep tifa_robot_api ~/tifa_logs/latest/launch.log
journalctl -u tifa -f

# Standalone dengan level DEBUG
ros2 launch tifa_robot_api robot_api.launch.py tifa_log_level:=debug

# Cek semua topic aktif
ros2 topic list

# Cek action server
ros2 action list
```

## Dependensi Build

`rclcpp` `rclcpp_action` `nav2_msgs` `slam_toolbox` `geometry_msgs` `nav_msgs` `std_msgs` `tf2` `tf2_geometry_msgs` `tf2_ros` `nlohmann_json` `CURL` `libzip`

## Status Pengembangan

### Sudah Terimplementasi

| Status | Fitur |
|--------|-------|
| ✅ | Command router (16 kode perintah) |
| ✅ | State machine (IDLE, MOVING, PAUSED, INTERRUPTED, ERROR, MAPPING) |
| ✅ | Single goal navigation (MOVE) |
| ✅ | Multi-goal queue (OP) max 100 item |
| ✅ | Interrupt/resume protocol |
| ✅ | Auto-recovery pada Nav2 abort |
| ✅ | Battery monitoring via ESP32-C3 |
| ✅ | Position sensor (TF `map → base_footprint` → JSON) |
| ✅ | Mapping flag: koordinat frame peta, ACK berisi koordinat, tolak bila posisi tidak valid, disimpan ke file |
| ✅ | SLAM completion detection |
| ✅ | Map save/upload ke server (ACK `SAVED` hanya bila sukses, `UPLOAD_FAILED` bila gagal) |
| ✅ | Map receive dari server (base64 zip) |
| ✅ | Map switching |
| ✅ | Teleop control |
| ✅ | Goal markers visualization |

### Dead Code / Unused Functions

| Status | Fungsi | Lokasi | Penjelasan |
|--------|--------|--------|------------|
| ❌ | `writeSelectedMapConfig()` | robot_api_node.cpp:2458 | Menulis path peta ke file, tidak pernah dipanggil. Sekarang pakai shell script langsung. |
| ❌ | `publishChecking()` | diagnostic_node.cpp:334 | Terdefinisi tapi tidak dipanggil. `onEvalTimer()` panggil `publishInit()` sebagai gantinya. |
| ❌ | `buildInitJson()` / `buildErrorJson()` | diagnostic_node.cpp:289-322 | Seluruh body dikomentari. JSON dibuat inline di publishInit/Ready/Error. |
| ❌ | `BatterySensorNode` class | battery_sensor_node.hpp | Header orphan 33 baris, tidak ada .cpp. Fungsi sudah di `SensorManagerNode`. |
| ❌ | `odomCallback()` di sensor_manager_node | sensor_manager_node.hpp:27 | Dideklarasikan di header, tidak ada implementasi. Odom sekarang di position_sensor_node. |
| ❌ | `map_load_client_` | robot_api_node.cpp:84 | Service client dibuat tapi tidak pernah dipanggil. Map pakai shell script. |

### Unused Variables / Parameters

| Status | Variable | Lokasi | Penjelasan |
|--------|----------|--------|------------|
| ❌ | `roll` dan `pitch` | robot_api_node.cpp:1664 | Diekstrak tapi hanya `yaw` yang dipakai di JSON. |
| ❌ | `ready_publish_counter_` | diagnostic_node.hpp:38 | Dideklarasikan, tidak pernah dibaca/ditulis. |
| ❌ | `sensor_msgs` | CMakeLists.txt:18 | `find_package` tapi tidak ada kode yang pakai. |
| ❌ | `ws_uri_backup_` | ws_bridge | Default kosong `""`; fallback baru jalan bila parameter ini diisi. |
| ❌ | `robot_id_` di CloudUpload | cloud_upload.hpp:29 | Dideklarasikan, tidak pernah dipakai. |
| ❌ | `ui_id_` di CloudUpload | cloud_upload.hpp:30 | Dideklarasikan, tidak pernah dipakai. |
| ❌ | `battery_thread_` di WsServer | ws_server.hpp:32 | Dideklarasikan, tidak pernah di-start. Copy-paste artifact. |

### Config Tidak Aktif

| Status | Config | Penjelasan |
|--------|--------|------------|
| ❌ | `MPPI_params.yaml` (388 baris) | Ada tapi launch pakai DWB. MPPI tidak pernah di-load. |
| ❌ | `CHARGING` mode | Didefinisikan di state machine, tidak ada kode yang set mode ini. |
| ❌ | `MAPPING` mode | Tidak pernah di-set oleh robot_api_node. Mapping via systemctl. |

### UI Features Tanpa Backend

| Status | Fitur | Penjelasan |
|--------|-------|------------|
| ❌ | Screen brightness | Tidak ada kode ROS. Perlu subscriber atau hardware controller. |
| ❌ | Language change | Tidak ada i18n/localization. String hardcoded. |
| ❌ | WLAN settings swap | Tidak ada kode kelola WiFi. `tifa_ws_bridge` hanya reconnect ke broker. |
| ❌ | Volume slider | Tidak ada kontrol audio. Butuh integrasi speaker. |
| ❌ | Voice cruise / customize | Tidak ada kode voice command, STT, atau TTS. |
| ❌ | Speed option / slider | DWB hardcoded 0.35 m/s. Slider tidak terhubung ke Nav2. |
| ❌ | Dot matrix / face display | Tidak ada kode LED/dot matrix. Hanya `sendExpression()` ke UI. |
| ⚠️ | Mapping via external UI | Diperbaiki (ACK dulu + `systemctl --no-block`, sudoers di `deploy/sudoers/tifa`); belum diuji di robot. |

### Incomplete Features

| Status | Fitur | Penjelasan |
|--------|-------|------------|
| ❌ | Retry logic | Auto-recovery ke IDLE, tapi tidak ada retry otomatis. UI harus kirim ulang. |
| ❌ | Multi-robot coordination | Robot ID filtering ada, koordinasi antar robot belum. |
| ❌ | Dynamic obstacle override | Tidak ada override costmap via API. Handling di Nav2. |
| ❌ | Speed profile per map | Semua robot speed sama dari DWB_params.yaml. |
| ❌ | Patrol mode | Tidak ada mode patrol berulang. |
| ❌ | Remote diagnostics | Data sensor dikirim, tapi remote config/restart belum. |

### Security / Reliability

| Status | Issue | Lokasi | Penjelasan |
|--------|-------|--------|------------|
| ⚠️ | `std::system("sudo ...")` | robot_api_node.cpp:284,2439 | Panggilan shell root bypass ROS lifecycle. Path hardcoded. Dibatasi sudoers `deploy/sudoers/tifa`. |
| ⚠️ | Goal marker hardcoded | goal_marker_node.cpp:42-57 | Koordinat untuk 1 peta saja. Salah jika peta berubah. |

### Commented Out Code

| Status | Code | Lokasi | Penjelasan |
|--------|------|--------|------------|
| ❌ | `RCLCPP_INFO` logging | cloud_upload.cpp:41,56 | Debug logging dikomentari alih-alih pakai log level. |

### Rencana Pengembangan

| Fase | Fitur | Estimasi |
|------|-------|----------|
| v1.1 | Auto-retry dengan backoff | 2 minggu |
| v1.1 | Battery low auto-return | 1 minggu |
| v1.1 | Bersihkan dead code | 3 hari |
| v1.1 | Fix mapping via external UI | Kode selesai, uji di robot |
| v1.1 | `position_sensor_node` juga di mode navigasi (posisi untuk `sendLastPoseOnce`) | 1 hari |
| v1.1 | Upload ulang peta + flag dari `<map>.flags.json` setelah `UPLOAD_FAILED` | 2 hari |

## Riwayat Perubahan

| Tanggal | Perubahan |
|---|---|
| 2026-11-05 | MAPPING_FLAG: posisi dari TF `map → base_footprint` (bukan odometri roda); ACK `FLAGGED` berisi `flag_id, label, x, y, yaw, frame`; `REJECTED` + `reason` bila posisi tidak ada / basi / bukan frame `map` (fallback home base dihapus); flag ditulis ke `flags_pending.json` dan `<map>.flags.json`; parameter baru `flag_pose_max_age_sec` |
| 2026-11-05 | MAPPING_SAVE: ACK `SAVED` hanya bila upload HTTP 200/201, `UPLOAD_FAILED` bila gagal; `uploadMapToServer()` mengembalikan `bool` |
| 2026-11-05 | `position_sensor_node` ditulis ulang (TF listener, parameter `map_frame`/`base_frame`/`rate_hz`, field `frame`); `manual_mapping.launch.py` mengisi `robot_id`/`ui_id` |
| 2026-11-05 | TELEOP: log INFO hanya `TELEOP start` / `TELEOP stop`; payload per pesan ke DEBUG (PR #27) |
| 2026-11-05 | `sensor_manager_node` mendapat `robot_id`/`ui_id` dari launch (data baterai TFRB10, PR #25) |
