# TỔNG QUAN DỰ ÁN: CHÁNH ĐIỆN TỊNH TÂM
## Master Project Index — TikTok Interactive Livestreaming Platform

---

## 1. TỔNG QUAN DỰ ÁN (PROJECT OVERVIEW)

- **Tên dự án**: Chánh Điện Tịnh Tâm (TikTok Interactive Live — Virtual Meditation Hall)
- **Mục tiêu**: Xây dựng nền tảng livestream tương tác thời gian thực phản chiếu hành vi của khán giả trên TikTok LIVE (bình luận, thả tim, cúng dường quà tặng) lên không gian chánh điện tâm linh 2.5D trang nghiêm, tôn kính.
- **Nền tảng vận hành**: Node.js (v20+ LTS) Backend + OBS Studio / TikTok LIVE Studio Browser Source (1080×1920 9:16 Vertical CEF) + React/Tailwind Admin Control Dashboard.
- **Mã nguồn tham chiếu**: `kentjuno/chanh-dien-online` (đã được tái cấu trúc, chuẩn hóa kiến trúc 4 tầng, tối ưu hóa bộ nhớ và loại bỏ hoàn toàn mã ẩn watermark).

---

## 2. TÓM TẮT KIẾN TRÚC HỆ THỐNG (ARCHITECTURE SUMMARY)

Hệ thống được thiết kế theo **Mô hình Kiến trúc Phân tầng Độc lập (4-Tier Decoupled Architecture)**:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 1. EVENT INGESTION LAYER (Thu Nhận Sự Kiện Đa Nguồn)                        │
│    - TikTokLiveAdapter (Protobuf Push, EulerStream SDK, hpagent Proxy,      │
│      xác thực Session Cookie, Watchdog 15s & Exponential Backoff)           │
│    - MockBotSimulatorAdapter (1-100 bot tự động tương tác)                  │
│    - AdminManualAdapter (Bơm sự kiện kiểm thử từ Control Dashboard)         │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ Raw Events
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 2. EVENT NORMALIZER & MODERATION LAYER (Chuẩn Hóa & Kiểm Duyệt Nội Dung)    │
│    - Canonical Schema Normalizer (AppEvent thống nhất)                      │
│    - Vietnamese Profanity Blacklist Filter (Lọc từ cấm, teencode, báng bổ)   │
│    - Gift Streak Coalescer (Gộp quà combo repeatEnd & 1.5s timeout)         │
│    - Text Sanitizer & SSML XML Escaper (<, >, &, ", ')                      │
│    - Per-user Rate Limiting (chống flood chat)                              │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ Normalized Events
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 3. CORE STATE MANAGER (Bộ Quản Lý Trạng Thái Trung Tâm)                     │
│    - Seating Slot Engine (Lưới bồ đoàn 24/36/64/100, ưu tiên từ giữa ra vách)│
│    - Longest-Quiet Non-Donor Eviction Policy (Đào thải LRU coins === 0)      │
│    - VIP Slot Protection (Bảo vệ vĩnh viễn người cúng dường coins > 0)       │
│    - Merit Leaderboard Engine (Tích lũy điểm công đức, Top 5/10 realtime)   │
│    - 90-Second Prayer Cache (Ghi nhớ bình luận lời nguyện cho lễ dâng quà)  │
│    - Liturgical Scheduler (Nhịp mõ BPM metronome, thỉnh chuông, đọc kinh)   │
│    - Audio & TTS Orchestrator (Priority Queue 3 cấp)                        │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ State Deltas & Signals
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 4. WEBSOCKET BROADCASTER LAYER (Phát Tán Sự Kiện Phân Quyền)                │
│    - Native `ws` Server (RFC 6455, độ trễ < 20ms, zero overhead)            │
│    - Phân quyền kênh: role=overlay (chỉ đọc) vs role=control (toàn quyền)   │
│    - Snapshot on Connect (Đồng bộ toàn bộ trạng thái trong 50ms)            │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                      ┌────────────────┴────────────────┐
                      ▼                                 ▼
       ┌───────────────────────────────┐ ┌───────────────────────────────┐
       │ OBS BROWSER SOURCE OVERLAY    │ │ REACT ADMIN CONTROL DASHBOARD │
       │ - 1080×1920 (9:16) Canvas 2D  │ │ - Room Connection Hub         │
       │ - DOM HUD & Gold Plaque       │ │ - Interactive Slot Matrix     │
       │ - Web Audio API (48kHz WAV)   │ │ - Live Audio Mixing Console   │
       │ - MS Edge-TTS In-Memory Data  │ │ - Simulation Studio & Logs    │
       │ - Auto Audio Ducking (-14dB)  │ └───────────────────────────────┘
       └───────────────────────────────┘
```

---

## 3. DANH MỤC TÍNH NĂNG & PHÂN BỔ MỐC CÔNG VIỆC (FEATURE INVENTORY)

| # | Tính năng (Feature) | Mô tả chi tiết kỹ thuật | Mốc (Milestone) | Tài liệu đặc tả |
|---|---|---|:---:|---|
| **1** | **TikTok Live Ingestion & Resilience** | `tiktok-live-connector` v2.5+, EulerStream SDK signature, residential proxy qua `hpagent`, session cookie authentication, Exponential Backoff with Jitter ($2\text{s} \rightarrow 30\text{s}$), Watchdog Heartbeat 15 giây. | **M1** | `ARCHITECTURE.md` (§3.1)<br>`ROADMAP.md` (§2) |
| **2** | **Event Normalizer & Content Moderation** | Chuyển đổi chuẩn `CanonicalAppEvent`, bộ lọc từ cấm tiếng Việt (Blacklist regex), gộp quà combo qua cờ `repeatEnd`, làm sạch chuỗi và escape ký tự XML SSML. | **M1** | `ARCHITECTURE.md` (§3.2) |
| **3** | **Core State & Seating Engine** | Lưới bồ đoàn 24/36/64/100, điền ưu tiên từ giữa ra hai vách, thuật toán đào thải người không cúng dường khi đầy chỗ (`Longest-Quiet Non-Donor Eviction`), bảo vệ tuyệt đối Phật tử cúng dường (`coins > 0`) và slot VIP, Cache lời nguyện 90 giây, Bảng Vàng Công Đức. | **M1** | `ARCHITECTURE.md` (§3.3) |
| **4** | **WebSocket Protocol & Broadcaster** | Máy chủ native `ws`, phân tách luồng quyền hạn `role=overlay` (read-only) và `role=control` (full admin), cơ chế Snapshot On Connect, truyền dữ liệu độ trễ siêu thấp (< 20ms). | **M1, M2** | `WEBSOCKET_SPEC.md` |
| **5** | **OBS Hybrid Display Engine** | Khung hình 1080×1920 9:16 dọc, HTML5 Canvas 2D khóa cứng 60fps trong OBS CEF, kênh trong suốt `rgba(0,0,0,0)`, tải RAM < 120MB, DOM HUD cho hoành phi và bảng công đức. Toán học phối cảnh hình thang 2.5D ($y_{\text{top}}=1215, y_{\text{bot}}=1845$). | **M2** | `ARCHITECTURE.md` (§4)<br>`ROADMAP.md` (§2) |
| **6** | **Visual VFX & Avatar Animations** | Máy trạng thái 4 pha: `walk` $\rightarrow$ `sitting` $\rightarrow$ `sit` (thở nhịp nhàng) $\rightarrow$ `bowing` (lạy chầu nén cosin), nhận diện trang phục NLP, hạt khói nhang procedural, nến lập lòe, hào quang Phật, 3 tầng hiệu ứng quà tặng. Loại bỏ 100% mã ẩn watermark. | **M2** | `ARCHITECTURE.md` (§4.2, §4.3) |
| **7** | **Web Audio & Edge-TTS Pipeline** | Client-side Web Audio API trong OBS CEF, giải quyết triệt để autoplay policy, mẫu thu âm mộc 48kHz (pitch/velocity jitter), dao động điện tử dự phòng, parametric look-ahead audio ducking (-14dB), MS Edge-TTS (`vi-VN-NamMinhNeural` / `vi-VN-HoaiMyNeural`), In-memory Buffer stream qua WebSocket (0 nghẽn đĩa SSD), hàng đợi ưu tiên 3 cấp, MD5 audio cache. | **M3** | `ARCHITECTURE.md` (§6)<br>`ASSET_MANIFEST.md` |
| **8** | **React Admin Control Dashboard** | Thiết kế module hóa cắm-rút (Module Registry), Room Connection Hub, Ma trận bồ đoàn trực quan (Kick, Ghim VIP, Khóa, Đổi trang phục), Live Audio Mixer (nhịp mõ BPM metronome, thỉnh chuông, BGM fader), Simulation Studio (thử sự kiện, đổ 15-100 người mẫu, bot tự động). | **M2** | `ARCHITECTURE.md` (§5) |
| **9** | **Asset Manifest & Host Integration** | Danh mục tài nguyên chuẩn hóa, JSON Schema `manifest.json`, cơ chế tải động và dự phòng (Fallback Asset / Synthetic sound), Hướng dẫn 4 bước cho streamer tự thay chùa, tượng Phật, nhạc chuông mà không cần sửa code. | **M3** | `ASSET_MANIFEST.md`<br>`manifest.json` |
| **10** | **OBS Integration & Risk Playbook** | Hướng dẫn cấu hình OBS Studio chuẩn mực, cờ tăng tốc GPU, định tuyến Audio Mixer (`Control audio via OBS`), quy trình vận hành 6 bước hàng ngày, ma trận phòng ngừa 7 rủi ro kỹ thuật toàn diện. | **M4** | `ROADMAP.md` (§4, §5, §6) |

---

## 4. BẢNG TIẾN ĐỘ CÁC MỐC CÔNG VIỆC (MILESTONES STATUS)

| Mốc | Tên mốc công việc | Phạm vi & Trọng tâm kỹ thuật | Phụ thuộc | Trạng thái |
|:---:|---|---|:---:|:---:|
| **M1** | **Backend Architecture & Resilience** | Khởi tạo máy chủ Node.js, bộ điều hợp TikTokLiveConnector, EulerStream signature, proxy dân cư `hpagent`, session cookie, Watchdog 15s, Event Normalizer, bộ lọc từ cấm, gộp quà combo, State Manager, LRU eviction, Prayer Cache 90s, Liturgical Scheduler, native `ws` broadcaster. | Không | **HOÀN TẤT ĐẶC TẢ** (Ready for Coding) |
| **M2** | **Frontend Overlay & Admin Dashboard** | Canvas 2D hybrid engine 1080×1920 @ 60fps, toán học phối cảnh 2.5D, máy trạng thái nhân vật 4 pha, loại bỏ watermark ẩn, React Admin Dashboard module hóa cắm-rút, ma trận bồ đoàn trực quan, giao thức WebSocket đầy đủ. | M1 | **HOÀN TẤT ĐẶC TẢ** (Ready for Coding) |
| **M3** | **Audio, Edge-TTS & Asset Manifest** | Web Audio API trong OBS CEF, giải quyết autoplay, mẫu studio WAV 48kHz, dao động điện tử dự phòng, Audio Ducking (-14dB), MS Edge-TTS in-memory streaming, hàng đợi ưu tiên 3 cấp, MD5 cache, danh mục tài nguyên `manifest.json`, hướng dẫn 4 bước cho streamer. | M1, M2 | **HOÀN TẤT ĐẶC TẢ** (Ready for Coding) |
| **M4** | **Master Technical Deliverables** | Toàn bộ 5 tài liệu kỹ thuật cốt lõi: `ARCHITECTURE.md`, `WEBSOCKET_SPEC.md`, `ROADMAP.md`, `ASSET_MANIFEST.md`, `manifest.json` và `PROJECT.md` tại thư mục gốc. | M1, M2, M3 | **HOÀN THÀNH (100%)** |

---

## 5. HỢP ĐỒNG GIAO TIẾP GIAO THỨC (INTERFACE CONTRACTS)

### 5.1. Handshake Endpoint & Phân quyền URL
- **Màn hình Overlay OBS**: `ws://127.0.0.1:3000/ws?role=overlay` (Chỉ đọc, bảo vệ nghiêm ngặt).
- **Trang Quản trị Admin**: `ws://127.0.0.1:3000/ws?role=control` (Toàn quyền gửi lệnh `ctl`, nhận nhật ký).

### 5.2. Cấu trúc Phong Bì Thông Điệp (Message Envelopes)
- **Chiều Server $\rightarrow$ Client**: `{ "t": "<event_type>", ...payload }`
  - Danh mục sự kiện: `state`, `settings`, `join`, `leave`, `skin`, `chat`, `gift`, `like`, `tts`, `chant`, `bell`, `mo` (hỗ trợ bí danh `mo1`), `tiktok`, `log`, `logs`, `bots`.
- **Chiều Client $\rightarrow$ Server (Admin Control)**: `{ "t": "ctl", "cmd": "<command_name>", ...params }`
  - Danh mục lệnh: `connect`, `disconnect`, `chat`, `gift`, `fill`, `clear`, `bot`/`bots`, `skin`, `kick`, `slot`, `bell`, `mo`, `chant`, `tts`/`say`, `settings`, `title`.

Chi tiết toàn bộ schema và TypeScript interfaces: Xem tại `WEBSOCKET_SPEC.md`.

---

## 6. CẤU TRÚC THƯ MỤC DỰ ÁN (PROJECT DIRECTORY LAYOUT)

```text
c:\Users\tn018\Desktop\Person\media\tiktok\app-live/
│
├── ARCHITECTURE.md                  # Tài liệu phân tích kiến trúc hệ thống 4 tầng chi tiết (R1)
├── WEBSOCKET_SPEC.md                # Đặc tả giao thức WebSocket và toàn bộ schema thông điệp (R2)
├── ROADMAP.md                       # Kế hoạch triển khai 5 giai đoạn, cài đặt và tích hợp OBS (R2)
├── ASSET_MANIFEST.md                # Danh mục tài nguyên, chuẩn âm thanh và hướng dẫn 4 bước cho host (R3)
├── manifest.json                    # File kê khai tài nguyên máy đọc được (JSON Schema compliant)
├── PROJECT.md                       # Mục lục tổng quan dự án và theo dõi tiến độ
├── package.json                     # Cấu hình phụ thuộc Node.js & npm scripts
├── tsconfig.json                    # Cấu hình TypeScript
├── .env.example                     # Mẫu biến môi trường (Port, Proxy, TikTok Session, EulerStream)
│
├── src/                             # Mã nguồn Backend Node.js
│   ├── server.mjs                   # Entry point máy chủ HTTP & WebSocket
│   ├── ingestion/                   # Tầng 1: Thu nhận sự kiện đa nguồn
│   │   ├── TikTokLiveAdapter.mjs    # Kết nối TikTok Live, EulerStream, hpagent proxy
│   │   ├── MockBotSimulator.mjs     # Động cơ bot tự động tương tác
│   │   └── ReconnectionEngine.mjs   # Exponential backoff & Watchdog
│   ├── moderation/                  # Tầng 2: Chuẩn hóa & Kiểm duyệt nội dung
│   │   ├── EventNormalizer.mjs      # Chuẩn hóa về CanonicalAppEvent
│   │   ├── ProfanityFilter.mjs      # Bộ lọc danh sách đen tiếng Việt & teencode
│   │   └── GiftStreakCoalescer.mjs  # Gộp quà combo (repeatEnd logic)
│   ├── state/                       # Tầng 3: Quản lý trạng thái trung tâm
│   │   ├── StateManager.mjs         # Quản lý cấu hình & điều phối
│   │   ├── SeatingEngine.mjs        # Quản lý lưới bồ đoàn & thuật toán LRU eviction
│   │   ├── PrayerCache.mjs          # Bộ nhớ đệm lời nguyện 90 giây
│   │   ├── MeritLeaderboard.mjs     # Bảng vinh danh công đức Top 5/Top 10
│   │   └── LiturgicalScheduler.mjs  # Điều phối nhịp mõ BPM & chu kỳ tụng kinh
│   ├── audio/                       # Động cơ âm thanh & Edge-TTS Backend
│   │   ├── TtsEngine.mjs            # msedge-tts in-memory buffer streaming
│   │   └── AudioPriorityQueue.mjs   # Hàng đợi ưu tiên 3 cấp & MD5 caching
│   └── broadcaster/                 # Tầng 4: WebSocket Broadcaster
│       ├── Broadcaster.mjs          # Native ws server, role segregation
│       └── MessageSchemas.mjs       # Kiểm tra hợp lệ dữ liệu
│
├── public/                          # Màn hình Overlay OBS (HTML5 Canvas 2D + DOM HUD)
│   ├── overlay.html                 # Trang HTML Browser Source cho OBS Studio
│   ├── css/
│   │   └── overlay.css              # Phong cách hoành phi, bảng công đức, bong bóng thoại
│   └── js/
│       ├── OverlayApp.js            # Khởi tạo ứng dụng & WebSocket client
│       ├── CanvasFloorEngine.js     # Toán học phối cảnh 2.5D & vẽ tượng Phật, hào quang
│       ├── CharacterRenderer.js     # Hoạt ảnh nhân vật (walk, sit, bowing, skin NLP)
│       ├── ParticleSystem.js        # Khói nhang procedural, nến lập lòe, pháo hoa sen
│       └── WebAudioEngine.js        # Web Audio API, ducking, giải quyết autoplay
│
├── admin/                           # Bảng Quản Trị Admin (React + Vite + Tailwind CSS)
│   ├── index.html                   # HTML Shell
│   ├── src/
│   │   ├── App.tsx                  # Dashboard Shell
│   │   ├── core/                    # Registry, WebSocket client, Store (Zustand)
│   │   ├── modules/
│   │   │   ├── connection/          # Module 1: Live Connection Hub
│   │   │   ├── slot-matrix/         # Module 2: Interactive Floor Matrix
│   │   │   ├── audio-mixer/         # Module 3: Audio & TTS Mixing Console
│   │   │   ├── simulation/          # Module 4: Simulation Studio & Bot Controller
│   │   │   └── audit-log/           # Module 5: Realtime Event Logger
│   │   └── shared/                  # UI components (Button, Slider, Modal, Badge)
│   └── vite.config.ts
│
├── assets/                          # Bộ tài nguyên đồ họa & âm thanh theo chuẩn manifest.json
│   ├── asset-manifest.schema.json   # Lược đồ JSON Schema Draft 2020-12
│   ├── backgrounds/                 # Ảnh nền Chánh Điện 1080×1920 (hall.jpg, zen_garden.jpg)
│   ├── altar/                       # Tượng Phật & Bàn thờ PNG trong suốt (statue, censer, cushion)
│   ├── characters/                  # Ảnh tĩnh & Spritesheet hoạt ảnh (c_*.png, anim_*.png)
│   ├── fx/                          # Hiệu ứng hào quang, hoa sen, cánh sen (fx_halo, fx_lotus)
│   └── audio/
│       ├── sfx/                     # Tiếng mõ, chuông chùa, quà tặng WAV 48kHz (mo_*, bell_*)
│       └── bgm/                     # Nhạc thiền tĩnh tâm MP3 320kbps (music1.mp3, music2.mp3)
│
└── .agents/                         # Thư mục siêu dữ liệu của các tác tử hỗ trợ (metadata only)
    └── teamwork/
        └── worker_1/                # Không gian làm việc của Worker 1
```

---

## 7. CHỈ DẪN TRUY CẬP TÀI LIỆU CỐT LÕI (DOCUMENTATION INDEX)

1. **Phân tích Kiến trúc Kỹ thuật (R1)**: Đọc `c:\Users\tn018\Desktop\Person\media\tiktok\app-live\ARCHITECTURE.md`
2. **Đặc tả Giao thức WebSocket (R2)**: Đọc `c:\Users\tn018\Desktop\Person\media\tiktok\app-live\WEBSOCKET_SPEC.md`
3. **Kế hoạch Triển khai & Tích hợp OBS (R2)**: Đọc `c:\Users\tn018\Desktop\Person\media\tiktok\app-live\ROADMAP.md`
4. **Danh mục Tài nguyên & Cẩm nang Host (R3)**: Đọc `c:\Users\tn018\Desktop\Person\media\tiktok\app-live\ASSET_MANIFEST.md`
5. **Kê khai Tài nguyên Máy Đọc Được (R3)**: Đọc `c:\Users\tn018\Desktop\Person\media\tiktok\app-live\manifest.json`
