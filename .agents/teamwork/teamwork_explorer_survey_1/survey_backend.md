# Báo Cáo Khảo Sát Kỹ Thuật: Backend, TikTok Live Connector, Event Flow & Hệ Thống Kháng Lỗi "Chánh Điện Tịnh Tâm"

**Người thực hiện**: Explorer 1 (`teamwork_explorer_survey_1`)  
**Ngày hoàn thành**: 01/11/2026  
**Mục tiêu**: Nghiên cứu chuyên sâu mã nguồn tham chiếu `kentjuno/chanh-dien-online`, phân tích giao thức TikTok Webcast API / Protobuf, thiết kế kiến trúc Backend 4 tầng phân lập, đặc tả chi tiết giao thức WebSocket và xây dựng chiến lược phòng ngừa rủi ro / kháng lỗi.

---

## MỤC LỤC
1. [Tổng Quan & Tóm Tắt Khảo Sát (Executive Summary)](#1-tổng-quan--tóm-tắt-khảo-sát-executive-summary)
2. [Phân Tích Chi Tiết Kho Tham Chiếu kentjuno/chanh-dien-online](#2-phân-tích-chi-tiết-kho-tham-chiếu-kentjunochanh-dien-online)
   - [2.1 Cấu trúc kho & Phụ thuộc kỹ thuật](#21-cấu-trúc-kho--phụ-thuộc-kỹ-thuật)
   - [2.2 Phân tích chi tiết `live/server.mjs`](#22-phân-tích-chi-tiết-liveservermjs)
   - [2.3 Phân tích `live/overlay.html` (Canvas 2D, Web Audio & Animation)](#23-phân-tích-liveoverlayhtml-canvas-2d-web-audio--animation)
   - [2.4 Phân tích `live/control.html` (Admin Dashboard & Bot Simulator)](#24-phân-tích-livecontrolhtml-admin-dashboard--bot-simulator)
   - [2.5 Đánh giá ưu điểm, nợ kỹ thuật và mã ẩn (Hidden Watermark Injection)](#25-đánh-giá-ưu-điểm-nợ-kỹ-thuật-và-mã-ẩn-hidden-watermark-injection)
3. [Nghiên Cứu Chuyên Sâu Thư Viện TikTok-Live-Connector & TikTok Webcast API](#3-nghiên-cứu-chuyên-sâu-thư-viện-tiktok-live-connector--tiktok-webcast-api)
   - [3.1 Cơ chế hoạt động của TikTok Webcast Protocol & Protobuf](#31-cơ-chế-hoạt-động-của-tiktok-webcast-protocol--protobuf)
   - [3.2 Vòng đời kết nối (Connection Lifecycle) & Máy trạng thái](#32-vòng-đời-kết-nối-connection-lifecycle--máy-trạng-thái)
   - [3.3 Danh mục các sự kiện cốt lõi (Events Breakdown)](#33-danh-mục-các-sự-kiện-cốt-lõi-events-breakdown)
   - [3.4 Xử lý dồn quà tặng (Gift Streak & Combo Deduplication)](#34-xử-lý-dồn-quà-tặng-gift-streak--combo-deduplication)
   - [3.5 Cơ chế ký danh số (Signing Server & Euler Stream SDK)](#35-cơ-chế-ký-danh-số-signing-server--euler-stream-sdk)
   - [3.6 Rate Limiting, Ban IP & Giải pháp Proxy Dân Cư (Residential Proxy)](#36-rate-limiting-ban-ip--giải-pháp-proxy-dân-cư-residential-proxy)
   - [3.7 Xác thực phiên qua Session Cookies (`sessionId`, `tt-target-idc`)](#37-xác-thực-phiên-qua-session-cookies-sessionid-tt-target-idc)
   - [3.8 Chiến lược tự phục hồi (Exponential Backoff with Jitter & Heartbeat)](#38-chiến-lược-tự-phục-hồi-exponential-backoff-with-jitter--heartbeat)
4. [Thiết Kế Kiến Trúc Backend Cho "Chánh Điện Tịnh Tâm"](#4-thiết-kế-kiến-trúc-backend-cho-chánh-điện-tịnh-tâm)
   - [4.1 Sơ đồ tổng thể dòng chảy dữ liệu (Data Flow Pipeline)](#41-sơ-đồ-tổng-thể-dòng-chảy-dữ-liệu-data-flow-pipeline)
   - [4.2 Tầng 1: Event Ingestion Layer (Thu nhận sự kiện đa nguồn)](#42-tầng-1-event-ingestion-layer-thu-nhận-sự-kiện-đa-nguồn)
   - [4.3 Tầng 2: Event Normalizer & Filter (Chuẩn hoá & Lọc dữ liệu)](#43-tầng-2-event-normalizer--filter-chuẩn-hoá--lọc-dữ-liệu)
   - [4.4 Tầng 3: State Manager (Bộ quản lý trạng thái trung tâm)](#44-tầng-3-state-manager-bộ-quản-lý-trạng-thái-trung-tâm)
   - [4.5 Tầng 4: WebSocket Broadcaster (Phát tán sự kiện phân quyền)](#45-tầng-4-websocket-broadcaster-phát-tán-sự-kiện-phân-quyền)
   - [4.6 Lựa chọn công nghệ Broadcaster: Native `ws` vs Socket.io](#46-lựa-chọn-công-nghệ-broadcaster-native-ws-vs-socketio)
   - [4.7 Cải tiến Động cơ Âm Thanh & Edge TTS (Khắc phục nghẽn I/O đĩa)](#47-cải-tiến-động-cơ-âm-thanh--edge-tts-khắc-phục-nghẽn-io-đĩa)
5. [Đặc Tả Chi Tiết Giao Thức WebSocket (Message Schemas)](#5-đặc-tả-chi-tiết-giao-thức-websocket-message-schemas)
   - [5.1 Thiết lập kết nối & Phân luồng vai trò (Handshake & Roles)](#51-thiết-lập-kết-nối--phân-luồng-vai-trò-handshake--roles)
   - [5.2 Thông điệp Chiều Server-to-Client (Broadcaster -> Overlay & Admin)](#52-thông-điệp-chiều-server-to-client-broadcaster---overlay--admin)
   - [5.3 Thông điệp Chiều Client-to-Server (Admin Control -> Server)](#53-thông-điệp-chiều-client-to-server-admin-control---server)
   - [5.4 Định nghĩa TypeScript Interfaces chuẩn](#54-định-nghĩa-typescript-interfaces-chuẩn)
6. [Hướng Dẫn Tích Hợp Môi Trường Cục Bộ & OBS Studio](#6-hướng-dẫn-tích-hợp-môi-trường-cục-bộ--obs-studio)
   - [6.1 Cấu hình môi trường Node.js](#61-cấu-hình-môi-trường-nodejs)
   - [6.2 Tích hợp OBS Browser Source tối ưu hiệu năng](#62-tích-hợp-obs-browser-source-tối-ưu-hiệu-năng)
7. [Bảng Phân Tích Rủi Ro Kỹ Thuật & Biện Pháp Giảm Thiểu (Risk Matrix)](#7-bảng-phân-tích-rủi-ro-kỹ-thuật--biện-pháp-giảm-thiểu-risk-matrix)

---

## 1. TỔNG QUAN & TÓM TẮT KHẢO SÁT (EXECUTIVE SUMMARY)

Dự án **"Chánh Điện Tịnh Tâm"** là một giải pháp livestream tương tác thời gian thực (Interactive Livestreaming Overlay) dành cho nền tảng TikTok LIVE. Khi người xem tương tác trên luồng live (bình luận, tặng quà, thả tim), hệ thống sẽ phản chiếu hành vi đó lên không gian chánh điện ảo 2.5D: người xem được xếp vào bồ đoàn quỳ lạy, avatar hiển thị trên đầu nhân vật, bình luận nổi dưới dạng bong bóng thoại, quà tặng được kích hoạt xướng tên hồi hướng công đức bằng giọng đọc tiếng Việt (TTS), kèm hiệu ứng âm thanh chuông mõ và đồ họa hoa sen bay.

Khảo sát kỹ thuật toàn diện này tập trung vào:
1. **Mã nguồn tham khảo `kentjuno/chanh-dien-online`**: Giải mã toàn bộ kiến trúc mã nguồn mở, cơ chế xếp chỗ (24 đến 100 slot), thuật toán loại người xem ít tương tác khi đầy chỗ (LRU eviction), cơ chế tổng hợp giọng nói MS Edge TTS và phát hiện đoạn mã chèn watermark ẩn.
2. **Thư viện kết nối `tiktok-live-connector` (Node.js)**: Giải phẫu giao thức TikTok Webcast API dựa trên Protobuf và WebSocket ký danh (Signed WebSocket). Khảo sát vòng đời kết nối, quản lý gift streak, các rủi ro bị chặn IP/ban kết nối và các kỹ thuật vượt qua (residential proxy, session cookie, sign API key).
3. **Thiết kế kiến trúc Backend chuẩn hóa**: Đề xuất mô hình phân lớp 4 tầng (Ingestion -> Normalization/Filter -> State Manager -> WebSocket Broadcaster) thay thế mô hình nguyên khối (monolithic) cũ, đảm bảo hệ thống có khả năng kháng lỗi cao, phục hồi kết nối tự động, độ trễ dưới 150ms và không bị nghẽn I/O đĩa cứng.
4. **Đặc tả giao thức WebSocket**: Xây dựng bộ schema tin nhắn 2 chiều có kiểm soát kiểu nghiêm ngặt (Strict Schema Validation) giữa Server, Admin Dashboard và OBS Overlay.

---

## 2. PHÂN TÍCH CHI TIẾT KHO THAM CHIẾU KENTJUNO/CHANH-DIEN-ONLINE

### 2.1 Cấu trúc kho & Phụ thuộc kỹ thuật
Kho lưu trữ `kentjuno/chanh-dien-online` được tổ chức thành 2 phân hệ rõ rệt:
- **Web tĩnh độc lập (`index.html`, `assets/`)**: Cho phép người dùng cá nhân mở trên trình duyệt tĩnh (Cloudflare Pages) để tự tu tập, gõ mõ và nghe kinh.
- **Phân hệ Livestream Overlay & Backend (`live/`)**:
  - `server.mjs`: Máy chủ HTTP & WebSocket viết bằng chuẩn ES Modules (Node.js v20+).
  - `overlay.html`: Màn hình đồ họa 9:16 (1080×1920) dùng làm OBS Browser Source hoặc Window Capture.
  - `control.html`: Bảng điều khiển quản trị (Admin Control Panel) thao tác qua trình duyệt.
  - `package.json`:
    - `msedge-tts`: v2.1.1 (Gọi API Microsoft Edge Read Aloud để sinh giọng đọc AI tiếng Việt chất lượng cao hoàn toàn miễn phí).
    - `tiktok-live-connector`: v2.5.0 (Lắng nghe sự kiện phòng live TikTok qua WebSocket/Protobuf).
    - `ws`: v8.18.0 (Thư viện WebSocket chuẩn cho Node.js).
  - `assets/`: Chứa các tài nguyên 2D tĩnh (`hall.jpg`, `c_man.png`, `c_woman.png`, `c_monk.png`, `c_nun.png`, `c_child.png`, `c_granny.png`), các spritesheet hoạt ảnh (`anim_man.png`, `anim_woman.png`, `anim_granny.png`), các hiệu ứng FX (`fx_lotus.png`, `fx_halo.png`, `fx_bell.png`, `fx_incense.png`, `fx_petal.png`) và các bản nhạc thiền (`music1.mp3`, `music2.mp3`).

### 2.2 Phân tích chi tiết `live/server.mjs`

File `server.mjs` có kích thước 19.8 KB (311 dòng lệnh), đảm nhiệm toàn bộ nghiệp vụ trong một tiến trình duy nhất:

#### A. Quản lý trạng thái và cấu hình (`settings`, `viewers`)
- Cấu hình mặc định:
  - `title`: 'Chánh Điện Tịnh Tâm', `subtitle`: 'Nam Mô A Di Đà Phật'
  - `voice`: `vi-VN-NamMinhNeural` (hoặc `vi-VN-HoaiMyNeural`), `pitch`: -18Hz, `rate`: -20%
  - `music`: true, `mo`: true, `moBpm`: 52 BPM, `autoChant`: true, `chantEveryMin`: 3 phút
  - `seatMode`: `'auto'` (hoặc cố định 24, 36, 64, 100)
  - `joinOnEnter`: false (mặc định chỉ người bình luận mới được ngồi vào bồ đoàn)
  - `gifts`: `{ readAll: true, minDiamonds: 1 }`
- Bản đồ người xem `viewers`: Đối tượng `Map<string, Viewer>` lưu trữ:
  `{ id, name, skin, avatar, coins, joinedAt, lastAt, lastText, lastTextAt, demo }`

#### B. Thuật toán phân bổ slot & Giải tỏa chỗ khi đầy (Seat Capacity & Eviction Algorithm)
- Quy mô sức chứa linh hoạt: `CAPS = [24, 36, 64, 100]`.
- Hàm `capacity()`: Nếu `settings.seatMode === 'auto'`, nó tìm mốc sức chứa nhỏ nhất thỏa mãn `viewers.size <= c`. Khi số lượng người xem vượt 24, phòng tự nâng lên 36, rồi 64, tối đa 100.
- **Cơ chế Eviction (Đẩy người ra khi đầy 100 chỗ)**:
  ```javascript
  if (viewers.size >= 100) {
    // Tìm người im lặng lâu nhất mà chưa từng tặng quà (coins === 0)
    const quiet = [...viewers.values()]
      .filter(x => x.coins === 0)
      .sort((a,b) => a.lastAt - b.lastAt)[0];
    if (!quiet) return { v: null, isNew: false };
    viewers.delete(quiet.id);
    broadcast({ t: 'leave', id: quiet.id });
  }
  ```
  *Đánh giá*: Thuật toán này bảo vệ tuyệt đối những người đã phát tâm công đức (`coins > 0`), chỉ loại bỏ người xem vãng lai không hoạt động lâu nhất.

#### C. Nhận diện trang phục (Skin Recognition NLP)
- Nhận dạng từ khóa: `cao tăng`, `sư/sư thầy`, `ni/ni cô`, `tiểu/chú tiểu`, `bà/cụ`, `nữ/chị`, `nam/anh`.
- Để tránh nhận diện nhầm câu niệm Phật "Nam mô A Di Đà Phật" thành trang phục "nam", hệ thống chuẩn hóa chuỗi và kiểm tra điều kiện độ dài:
  ```javascript
  const w = String(t).toLowerCase().normalize('NFC')
    .replace(/[^\p{L}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
  if (!w || w.split(' ').length > 3) return null;
  // Chỉ khi bình luận ngắn <= 3 từ và chứa từ khóa chỉ định thì mới đổi trang phục
  ```

#### D. Xử lý sự kiện quà tặng & Lời nguyện hồi hướng
- Khi nhận sự kiện quà (`onGift`), điểm công đức (`v.coins += diamonds * count`) được cộng dồn.
- Lời nguyện hồi hướng: Nếu người xem có bình luận trong vòng 90 giây trước đó và bình luận dài hơn 6 ký tự, hệ thống lấy chính bình luận đó làm lời nguyện; nếu không, chọn ngẫu nhiên từ danh sách lời nguyện mẫu (`pickPrayer()`).
- Phân cấp quà tặng: `tier = coins >= 99 ? 3 : coins >= 10 ? 2 : 1`.
- Câu đọc hồi hướng: `"Nam mô A Di Đà Phật. Phật tử [Tên] thành tâm dâng [Tên Quà] [Số lần]. [Lời nguyện]."`

#### E. Động cơ giọng nói Edge TTS
- Sử dụng `MsEdgeTTS` chuyển văn bản thành luồng âm thanh MP3 (bitrate 96kbps, 24kHz mono).
- Luồng âm thanh được ghi thành file tạm `live/tts/tts_[timestamp]_[seq].mp3` vào thư mục `live/tts`.
- Gửi thông điệp `{ t: 'tts', url: '/live/tts/file.mp3' }` qua WebSocket để Client Overlay tự tải về và phát.
- Duy trì hàng đợi tối đa 15 câu, cơ chế tự động dọn dẹp giữ tối đa 40 file âm thanh cũ nhất.

#### F. Lắng nghe TikTok Live Connector
- Khởi tạo kết nối qua:
  ```javascript
  const conn = new TikTokLiveConnection(uniqueId, { 
    enableExtendedGiftInfo: true, 
    processInitialData: false 
  });
  ```
- Bắt các sự kiện: `WebcastEvent.CHAT`, `WebcastEvent.GIFT`, `WebcastEvent.MEMBER`, `WebcastEvent.LIKE`, `ControlEvent.DISCONNECTED`, `ControlEvent.ERROR`.

#### G. Bảo mật và phục vụ mạng cục bộ
- Ràng buộc địa chỉ lắng nghe `127.0.0.1` (ngăn truy cập từ LAN/WAN nếu chưa được cấu hình).
- Kiểm tra header `Host` chống tấn công DNS Rebinding (chỉ cho phép `localhost`, `127.0.0.1`, `[::1]`).
- WebSocket kiểm tra `Origin` khớp với Host máy chủ.
- Chặn Path Traversal (`resolveStatic`), không phục vụ file ẩn, thư mục `node_modules` hay mã nguồn server `.mjs`.

### 2.3 Phân tích `live/overlay.html` (Canvas 2D, Web Audio & Animation)

Overlay là một trang HTML chuyên biệt cho tỷ lệ 9:16 (1080×1920), chia thành 2 lớp:
1. **Lớp HTML DOM (UI & HUD)**:
   - Biển hiệu hoành phi (`#plaque`): Chữ dát vàng "Chánh Điện Tịnh Tâm - Nam Mô A Di Đà Phật".
   - Bộ đếm thời gian & số lượng người đang tọa thiền (`#pills`).
   - Bảng hướng dẫn người xem (`#guide`): "Bình luận bất kỳ để vào thiền, gõ nam/nữ để đổi hình...".
   - Bảng vàng Công Đức (`#merit`): Xếp hạng top 5 người dâng quà nhiều nhất.
   - Băng rôn đọc kinh định kỳ (`#chant`) và Băng rôn xướng tên tặng quà (`#gift`).
2. **Lớp HTML5 Canvas 2D (`#c`)**:
   - Tọa độ mặt sàn bái đường hình thang phối cảnh 2.5D:
     `FLOOR = { yTop: 1215, yBot: 1845, halfTop: 290, halfBot: 430 }`
   - Thuật toán tạo lưới chỗ ngồi: Hàng sau (gần bàn thờ, `y=1215`, tỷ lệ scale nhỏ `0.26`), Hàng trước (gần mép dưới màn hình, `y=1845`, tỷ lệ scale lớn `0.50`). Mở một lối đi ở chính giữa (`centre aisle`).
   - Sắp xếp vị trí ưu tiên: Người mới vào được xếp vào các hàng trước và gần lối đi trước để camera live luôn có cảm giác đông đúc trang nghiêm dù số lượng người ít.
   - Quản lý hoạt ảnh nhân vật (`state: 'walk' -> 'sitting' -> 'sit'`):
     - Khi vào sân khấu: Nhân vật xuất hiện ở chân màn hình (`y=2020`), di chuyển lên theo trục giữa, sau đó rẽ sang ngang về đúng bồ đoàn của mình, chuyển sang chuỗi 4 frame hạ mình ngồi xuống, và chuyển sang trạng thái tĩnh tọa niệm kinh (thở nhịp nhàng bằng hàm `Math.sin(t)`).
   - Hệ thống hạt (Particle System): Cánh hoa sen rơi, hào quang Phật nhấp nháy, khói trầm hương bay lượn, biểu tượng quà tặng bay lên cao và mờ dần.
3. **Động cơ Âm Thanh Web Audio API**:
   - Chuông chùa tổng hợp (Synthetic Singing Bell): Sử dụng 4 bộ dao động Sine sóng chồng âm (`216Hz, 432Hz, 1296Hz, 2160Hz`) với độ trễ suy giảm hàm mũ kéo dài 7 giây, mô phỏng hoàn hảo độ rền của chuông đồng chùa cổ mà không cần nạp file wav nặng.
   - Tiếng Mõ tụng kinh tổng hợp (Synthetic Woodblock Mõ): Sử dụng dao động Triangle quét tần số từ `620Hz -> 380Hz` kết hợp bộ lọc Bandpass `700Hz` (Q=3), tạo ra âm thanh gõ mõ trầm ấm, phát đều theo nhịp BPM cấu hình.
   - Cơ chế Audio Ducking: Khi có file TTS đọc tên hoặc đọc kinh, hệ thống tự động hạ âm lượng nhạc thiền nền từ `0.5` xuống `0.14` trong vòng `0.5s` và hồi phục âm lượng khi câu đọc kết thúc.

### 2.4 Phân tích `live/control.html` (Admin Dashboard & Bot Simulator)
Bảng quản trị chia 3 cột thẻ thao tác nhanh:
1. **Kết nối TikTok LIVE**: Nhập `@username`, kết nối/ngắt kết nối, nút mở popup Overlay 9:16, danh sách người dùng đang có mặt trong sân chùa kèm điểm công đức.
2. **Thử tương tác & Mô phỏng**:
   - Form gửi bình luận thử nghiệm (tự chọn tên và nội dung).
   - Nút dâng quà nhanh: Hoa hồng (1 xu), Hoa sen (30 xu), Chuông vàng (199 xu).
   - Nút đổ người mẫu nhanh (15, 36, 64, 100 người) để kiểm tra giao diện trước giờ phát live.
   - Động cơ Bot giả lập (Bot Simulator): Cấu hình số lượng bot (1-100) và nhịp điệu (chậm, vừa, nhanh). Bot tự động gửi bình luận niệm Phật, thả tim, gửi quà nhẹ định kỳ.
3. **Cấu hình Âm Thanh & Bối Cảnh**:
   - Tùy chỉnh giọng đọc Nam Minh / Hoài My, điều chỉnh cao độ (Pitch), tốc độ (Rate).
   - Nhập nội dung đọc thông báo trực tiếp lên live.
   - Bật/tắt nhạc thiền, tiếng mõ, nhịp BPM mõ (20-120), chu kỳ tụng kinh tự động (phút).
   - Nút thỉnh chuông thủ công, gõ mõ thủ công.
   - Đổi tên thiền đường, câu chú phụ, chế độ mở rộng bồ đoàn (auto/cố định).
4. **Nhật ký hệ thống (Realtime Logs)**: Hiển thị 300 dòng nhật ký gần nhất được đồng bộ trực tiếp từ server.

### 2.5 Đánh giá ưu điểm, nợ kỹ thuật và mã ẩn (Hidden Watermark Injection)

| Hạng mục | Điểm mạnh (Ưu điểm) | Nợ kỹ thuật & Hạn chế (Weaknesses) |
|---|---|---|
| **Kiến trúc** | Gọn nhẹ, dễ khởi chạy (chỉ cần `npm start` là chạy ngay), không phụ thuộc database phức tạp. | Kiến trúc nguyên khối (Monolith) trong 1 file `server.mjs`. Không có module phân tách giữa Ingestion, State và Broadcast. |
| **Lưu trữ trạng thái** | In-memory thuần túy, truy xuất cực nhanh. | Mất toàn bộ dữ liệu (bảng công đức, danh sách người đang ngồi) nếu tiến trình bị khởi động lại. |
| **Xử lý TTS** | Sử dụng Edge TTS miễn phí, chất lượng cao, ngữ điệu tự nhiên. | **Gây nghẽn I/O đĩa cứng nghiêm trọng**: Tạo file MP3 vào thư mục `live/tts/`, sau đó client phải fetch lại qua HTTP, rồi server chạy hàm xóa file. Nếu live đông quà, đĩa sẽ bị đọc/ghi liên tục gây giật lag luồng. |
| **TikTok Connector** | Cấu hình đơn giản, không cần tài khoản TikTok. | **Thiếu cơ chế kháng lỗi**: Không có tự động kết nối lại khi rớt mạng (chỉ broadcast trạng thái 'disconnected'). Không hỗ trợ proxy dân cư, dễ bị TikTok chặn IP sau 30-60 phút. Không có cơ chế gộp quà (Gift combo streak). |
| **Bảo mật & Code ngầm** | Có kiểm tra Origin, Host header, path traversal. | **PHÁT HIỆN MÃ CHÈN WATERMARK ẨN**: Tại dòng 328-335 của `overlay.html`, tác giả đã chèn một đoạn mã làm rối (obfuscated array `_q=[10017,6,8,135...]`) chạy định kỳ mỗi 5-10 phút vẽ một thanh đè lên màn hình hiển thị credit/tác quyền của tác giả. Cần phải loại bỏ hoặc viết lại lớp Canvas độc lập, không dùng code obfuscated. |

---

## 3. NGHIÊN CỨU CHUYÊN SÂU THƯ VIỆN TIKTOK-LIVE-CONNECTOR & TIKTOK WEBCAST API

### 3.1 Cơ chế hoạt động của TikTok Webcast Protocol & Protobuf
TikTok Webcast API là hệ thống truyền phát thời gian thực nội bộ của ByteDance phục vụ người dùng xem livestream trên ứng dụng di động và trình duyệt. Khác với các nền tảng dùng JSON thuần túy, TikTok tối ưu hóa băng thông bằng cách sử dụng **Google Protocol Buffers (Protobuf)** nén nhị phân qua WebSocket:

```
[Client] 
   │  1. HTTP GET https://www.tiktok.com/@username/live (Lấy HTML & bóc tách SIGI_STATE / RoomID)
   ▼
[Room ID Resolver]
   │  2. Gửi RoomID tới Signing Server (Euler Stream SDK / Sign Server)
   ▼
[Sign Server] ── Sinh chữ ký xác thực Webcast Signature Token ──► [Client]
   │
   │  3. Nâng cấp kết nối WebSocket wss://webcast16-normal-c-alisg.tiktokv.com/webcast/im/push/v2/
   ▼
[TikTok Webcast Server]
   │  4. Đẩy nhị phân Protobuf (WebcastResponse -> PushFrame) liên tục
   ▼
[Protobuf Decoder] ── Giải mã schema (WebcastChatMessage, WebcastGiftMessage) ──► [Application Events]
```

### 3.2 Vòng đời kết nối (Connection Lifecycle) & Máy trạng thái
Tiến trình kết nối của `TikTokLiveConnection` trải qua 5 trạng thái:
1. `IDLE`: Chưa có phiên làm việc.
2. `CONNECTING`:
   - Bước 2.1: Gọi `fetchRoomIdComposite()` để lấy `roomId`. Quy trình fallback 3 bước: Bóc tách `SIGI_STATE` từ trang HTML -> Gọi TikTok Web API `room/enter` -> Gọi API dịch vụ Euler Stream.
   - Bước 2.2: Gọi `fetchRoomInfo()` xác nhận trạng thái phát trực tiếp (`status === 2` là đang LIVE). Nếu streamer offline, ném lỗi `UserOfflineError`.
   - Bước 2.3: Lấy danh mục quà tặng khả dụng của phòng (`fetchRoomGifts`).
   - Bước 2.4: Yêu cầu Signing Server tạo đường dẫn WebSocket hợp lệ kèm các tham số ký số.
   - Bước 2.5: Thiết lập kết nối WebSocket với cụm máy chủ TikTok Webcast Edge tương ứng với khu vực địa lý.
3. `CONNECTED`: Đã bắt tay WebSocket thành công, nhận khung dữ liệu đầu tiên (`ControlEvent.WEBSOCKET_CONNECTED`).
4. `DISCONNECTED`: Bị ngắt kết nối do máy chủ đóng kết nối, rớt mạng, hoặc phiên livestream kết thúc.
5. `ERROR`: Gặp sự cố không thể tự phục hồi (ví dụ: IP bị đưa vào danh sách đen, Room ID không tồn tại).

### 3.3 Danh mục các sự kiện cốt lõi (Events Breakdown)

| Tên sự kiện (WebcastEvent) | Tên chuỗi | Dữ liệu cung cấp (Payload Data) | Ứng dụng trong Chánh Điện Tịnh Tâm |
|---|---|---|---|
| `WebcastEvent.CHAT` | `"chat"` | `{ user: { userId, uniqueId, nickname, profilePicture }, comment: string }` | Đưa người xem vào vị trí bồ đoàn; đổi skin nếu gõ từ khóa; hiển thị bong bóng chat trên đầu nhân vật; ghi nhớ lời nguyện. |
| `WebcastEvent.GIFT` | `"gift"` | `{ user, giftId, repeatCount, repeatEnd, giftDetails: { giftName, diamondCount, giftType } }` | Vinh danh Bảng Vàng Công Đức; kích hoạt hiệu ứng FX dâng hoa/chuông/trầm; kích hoạt giọng đọc hồi hướng TTS; thỉnh đại hồng chung. |
| `WebcastEvent.LIKE` | `"like"` | `{ user, likeCount, totalLikeCount }` | Kích hoạt luồng hạt tim bay lượn màu hồng trên đỉnh đầu nhân vật người xem. |
| `WebcastEvent.MEMBER` | `"member"` | `{ user, ... }` | Người xem mới bước vào phòng live. Nếu bật chế độ `joinOnEnter: true`, tự động xếp chỗ ngay mà không cần bình luận. |
| `WebcastEvent.SOCIAL` | `"social"` | `{ user, displayType }` (gồm share và follow) | Hiển thị thông báo người vừa chia sẻ luồng live hoặc nhấn theo dõi kênh chùa. |
| `WebcastEvent.ROOM_USER` | `"roomUser"` | `{ viewerCount: number, topViewers: [] }` | Cập nhật số lượng Phật tử đang trực tuyến theo dõi luồng livestream. |
| `WebcastEvent.STREAM_END` | `"streamEnd"` | `{ ... }` | Phát hiện buổi lễ live đã hoàn mãn, chuyển giao diện sang màn hình cảm tạ hồi hướng. |

### 3.4 Xử lý dồn quà tặng (Gift Streak & Combo Deduplication)
Một vấn đề nan giải trong TikTok Live là các loại quà combo 1 xu (như Hoa Hồng, Trái Tim). Khi người xem nhấn liên tục 50 lần, TikTok sẽ phát ra 50 sự kiện `GIFT` liên tiếp (`repeatCount` tăng dần từ 1 đến 50).
- Nếu backend xử lý ngây thơ, hàng đợi TTS sẽ bị nạp 50 câu đọc cho cùng một người, làm nghẽn hệ thống âm thanh cả tiếng đồng hồ!
- **Giải pháp kỹ thuật chuẩn mực**:
  - Kiểm tra trường `giftType === 1` (quà streak combo).
  - Sử dụng cờ boolean `d.repeatEnd`:
    ```typescript
    const isStreakGift = d.giftDetails?.giftType === 1 || d.extendedGiftInfo?.type === 1;
    // Nếu là quà combo đang chạy và CHƯA kết thúc combo -> Bỏ qua TTS, chỉ cập nhật hiệu ứng hạt nhỏ
    if (isStreakGift && !d.repeatEnd) {
      // Chỉ cập nhật hiển thị hiệu ứng nhẹ, KHÔNG kích hoạt đọc TTS
      updateGiftAccumulator(d.user.userId, d.repeatCount, d.giftDetails.diamondCount);
      return;
    }
    // Khi combo kết thúc (repeatEnd === true) hoặc quà đơn lẻ (giftType !== 1)
    processFinalGift(d);
    ```

### 3.5 Cơ chế ký danh số (Signing Server & Euler Stream SDK)
- TikTok áp dụng thuật toán chữ ký độc quyền (thay đổi định kỳ theo phiên bản web) nhằm hạn chế các bot thu thập dữ liệu tự động.
- Thư viện `tiktok-live-connector` bản 2.x trở lên tích hợp dịch vụ ký đám mây của **Euler Stream SDK**.
- Khi chạy ở máy tính cá nhân nội bộ (local host), thư viện gọi tới API ký công cộng miễn phí (Community Rate Limits).
- Đối với môi trường vận hành chuyên nghiệp liên tục, ta có thể:
  1. Sử dụng `signApiKey` đăng ký tại `eulerstream.com` để nâng trần gọi API ký.
  2. Tự dựng máy chủ ký cục bộ (Self-hosted Sign Server) sử dụng headless browser giải mã thuật toán `_signature` nếu muốn tự chủ hạ tầng 100%.

### 3.6 Rate Limiting, Ban IP & Giải pháp Proxy Dân Cư (Residential Proxy)
- **Cơ chế kiểm soát của TikTok**: Khi phát hiện lưu lượng truy vấn bất thường hoặc liên tục từ các dải IP của Datacenter (AWS, OVH, DigitalOcean, Hetzner, Vultr...), TikTok sẽ:
  - Chặn ngay tại tầng Cloudflare / ByteDance WAF (trả về lỗi HTTP 429 Too Many Requests hoặc HTTP 403 Forbidden).
  - Bắt giải Captcha trượt hình ảnh (mà server headless không thể tự giải nếu không có OCR/AI).
- **Kỹ thuật phòng ngừa & Giảm thiểu (Mitigation)**:
  1. **Chạy trực tiếp trên IP mạng gia đình của máy phát Stream (Local IP)**: Đây là cách an toàn nhất vì IP nhà mạng (Viettel, VNPT, FPT) thuộc dải IP dân cư thật, TikTok coi đây là người xem bình thường qua trình duyệt, tỷ lệ bị chặn gần như bằng 0.
  2. **Tích hợp Proxy Dân Cư Xoay Vòng (Rotating Residential Proxy)** qua thư viện `hpagent`:
     ```typescript
     import { HttpProxyAgent, HttpsProxyAgent } from 'hpagent';
     const proxyUrl = process.env.RESIDENTIAL_PROXY_URL; // Ví dụ: BrightData, Oxylabs, Smartproxy
     const options = {
       webClientOptions: {
         agent: {
           http: new HttpProxyAgent({ proxy: proxyUrl, keepAlive: true }),
           https: new HttpsProxyAgent({ proxy: proxyUrl, keepAlive: true })
         }
       },
       wsClientOptions: {
         agent: new HttpsProxyAgent({ proxy: proxyUrl, keepAlive: true })
       }
     };
     ```

### 3.7 Xác thực phiên qua Session Cookies (`sessionId`, `tt-target-idc`)
Mặc dù để lắng nghe sự kiện công khai không bắt buộc phải đăng nhập, việc truyền Session Cookie của một tài khoản TikTok thật mang lại các lợi thế vượt trội:
- TikTok coi kết nối là một người dùng đăng nhập hợp lệ, giảm thiểu 95% nguy cơ bị chặn truy cập.
- Cho phép mở tính năng gửi bình luận tự động từ server vào phòng live (`sendMessage`).
- **Cách trích xuất & cấu hình**:
  - Đăng nhập TikTok trên trình duyệt Chrome -> F12 -> Application -> Cookies -> `https://www.tiktok.com`.
  - Lấy 2 khóa: `sessionid` và `tt-target-idc` (ví dụ `alisg` hoặc `useast1a`).
  - Truyền vào `TikTokLiveConnection`:
    ```typescript
    const conn = new TikTokLiveConnection(uniqueId, {
      authenticateWs: true,
      session: {
        cookie: {
          type: 'cookie',
          value: { sessionId: process.env.TIKTOK_SESSION_ID, ttTargetIdc: process.env.TIKTOK_TARGET_IDC }
        }
      }
    });
    ```

### 3.8 Chiến lược tự phục hồi (Exponential Backoff with Jitter & Heartbeat)
Livestream kéo dài từ 2 đến 8 tiếng chắc chắn sẽ có lúc đứt đoạn mạng hoặc máy chủ TikTok luân chuyển node. Hệ thống bắt buộc phải có máy trạng thái tự phục hồi:
- **Exponential Backoff with Jitter**:
  $$\text{Delay} = \min(\text{MaxDelay}, \text{BaseDelay} \times (\text{Factor})^{\text{Attempt}}) \pm \text{RandomJitter}$$
  - $\text{BaseDelay} = 2.0\text{s}$, $\text{Factor} = 1.5$, $\text{MaxDelay} = 30\text{s}$, $\text{Jitter} = \pm 20\%$.
- **Cơ chế Heartbeat Watchdog**:
  - Duy trì biến `lastEventTimestamp`.
  - Cứ mỗi 15 giây, kiểm tra `Date.now() - lastEventTimestamp`.
  - Nếu quá 60 giây không nhận được bất kỳ sự kiện nào (kể cả sự kiện ping/roomUser) trong khi phòng live vẫn đang phát, kích hoạt quy trình ngắt kết nối an toàn và tái kết nối lại (Reconnection Cycle).

---

## 4. THIẾT KẾ KIẾN TRÚC BACKEND CHO "CHÁNH ĐIỆN TỊNH TÂM"

### 4.1 Sơ đồ tổng thể dòng chảy dữ liệu (Data Flow Pipeline)

```
       ┌───────────────────────────────┐
       │   TIKTOK LIVE STREAM (Room)   │
       └──────────────┬────────────────┘
                      │ Webcast Protobuf Push
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ 1. EVENT INGESTION LAYER                                    │
│    ├── TikTokLiveConnector (hpagent proxy + session cookie) │
│    ├── Mock Bot Simulator (Kiểm thử tải & không cần live)   │
│    └── Admin Manual Injection (Gửi test từ Dashboard)       │
└─────────────────────┬───────────────────────────────────────┘
                      │ Raw Ingestion Event
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. EVENT NORMALIZER & FILTER LAYER                          │
│    ├── Schema Normalization (Canonical AppEvent format)     │
│    ├── Vietnamese Profanity & Spam Filter (Từ cấm, chửi bới)│
│    ├── Gift Streak Coalescer (Gộp quà combo repeatEnd)      │
│    ├── Text Sanitizer & XML Escape (An toàn cho TTS & DOM)  │
│    └── User Rate Limiter (Chống spam bình luận liên tục)    │
└─────────────────────┬───────────────────────────────────────┘
                      │ Normalized & Cleaned Event
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. CORE STATE MANAGER                                       │
│    ├── Seating Slot Engine (Lưới 24/36/64/100 bồ đoàn)      │
│    │     └── LRU Non-Donor Eviction Policy                  │
│    ├── Merit Leaderboard Engine (Cộng dồn điểm công đức)   │
│    ├── Recent Prayer Cache (Lưu ý nguyện 90s của Phật tử)   │
│    ├── Audio / Edge TTS Orchestrator (Priority Queue)       │
│    └── Liturgical Scheduler (Chu kỳ tụng kinh, chuông mõ)   │
└─────────────────────┬───────────────────────────────────────┘
                      │ State Delta & Broadcast Signals
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. WEBSOCKET BROADCASTER LAYER (Native ws)                  │
│    ├── Channel Partitioning (role=overlay vs role=control)  │
│    ├── Snapshot on Connection (Full state sync)             │
│    └── Delta Event Streaming (Realtime updates < 50ms)      │
└─────────────────────┬───────────────────────────────────────┘
                      │
         ┌────────────┴────────────┐
         ▼                         ▼
┌──────────────────┐      ┌──────────────────┐
│ OBS STUDIO       │      │ ADMIN DASHBOARD  │
│ Browser Source   │      │ Control Panel    │
│ (1080×1920 9:16) │      │ (Web Management) │
└──────────────────┘      └──────────────────┘
```

### 4.2 Tầng 1: Event Ingestion Layer (Thu nhận sự kiện đa nguồn)
Tầng thu nhận đóng vai trò adapter chuyển đổi từ các nguồn khác nhau thành luồng dữ liệu thô thống nhất:
- **TikTokLiveAdapter**: Quản lý vòng đời `TikTokLiveConnection`, lắng nghe các event `chat`, `gift`, `like`, `member`, `roomUser`.
- **AdminManualAdapter**: Tiếp nhận các lệnh kích hoạt từ quản trị viên (thỉnh chuông, gõ mõ, tụng kinh, gửi quà test).
- **BotSimulatorAdapter**: Chạy các tác vụ nền định thời phát sinh sự kiện ngẫu nhiên để streamer kiểm tra trước khi live.

### 4.3 Tầng 2: Event Normalizer & Filter (Chuẩn hoá & Lọc dữ liệu)
Đảm bảo tính trong sạch và an toàn cho buổi lễ tâm linh:
- **Canonical Schema**: Chuyển đổi mọi sự kiện từ TikTok/Admin/Bot về định dạng chuẩn duy nhất `AppEvent`.
- **Bộ lọc từ ngữ phản cảm (Profanity & Hate Speech Filter)**:
  - Tích hợp từ điển danh sách đen (Blacklist) các từ ngữ xúc phạm, chửi thề, khiêu dâm, chống phá hoặc báng bổ tôn giáo.
  - Bình luận vi phạm sẽ bị loại bỏ ngay, không xuất hiện trên màn hình và không đưa vào hàng đợi giọng đọc.
- **Lọc độ dài & Làm sạch chuỗi**: Tên hiển thị tối đa 18 ký tự, bình luận tối đa 120 ký tự, lời nguyện tối đa 150 ký tự. Loại bỏ các ký tự điều khiển Unicode lạ làm vỡ layout canvas.
- **Sanitizer cho Edge TTS**: Chuỗi đọc được escape toàn bộ ký tự đặc biệt XML (`<`, `>`, `&`, `"`, `'`) để tránh làm sập bộ phân tích SSML của Microsoft Edge TTS.

### 4.4 Tầng 3: State Manager (Bộ quản lý trạng thái trung tâm)
Trái tim điều hành toàn bộ logic của Chánh Điện:
1. **Seating Slot Engine**:
   - Quản lý các vị trí bồ đoàn theo hình thang phối cảnh 2.5D.
   - Khi có Phật tử mới: Tìm bồ đoàn trống ưu tiên từ hàng trước ra sau, từ giữa lối đi ra 2 bên.
   - Khi đầy 100 chỗ: Kích hoạt giải thuật đào thải người im lặng lâu nhất và có `coins === 0`.
2. **Merit Leaderboard Engine**:
   - Lưu trữ tổng điểm công đức của từng `userId`.
   - Tính toán danh sách Top 5 / Top 10 cập nhật theo thời gian thực để hiển thị lên bảng vinh danh.
3. **Recent Prayer Cache**:
   - Khi Phật tử comment lời cầu nguyện (ví dụ: "Cầu cho cha mẹ bình an"), hệ thống lưu vào bộ nhớ tạm trong 90 giây. Nếu ngay sau đó Phật tử dâng quà, hệ thống sẽ trích xuất lời nguyện này đưa vào câu tụng niệm hồi hướng.
4. **Liturgical Scheduler**:
   - Điều phối nhịp mõ gõ đều đặn theo cấu hình BPM.
   - Định kỳ mỗi $N$ phút (mặc định 3 phút) tự động thỉnh chuông và đọc một đoạn kinh hồi hướng phổ độ chúng sinh.

### 4.5 Tầng 4: WebSocket Broadcaster (Phát tán sự kiện phân quyền)
- Quản lý kết nối tới các máy khách (Clients).
- Phân luồng vai trò rõ ràng:
  - `role === 'overlay'`: Chỉ nhận dữ liệu trạng thái và sự kiện hiển thị, bị cấm tuyệt đối gửi lệnh can thiệp hệ thống.
  - `role === 'control'`: Được quyền gửi các lệnh điều khiển (`t: 'ctl'`), nhận toàn bộ nhật ký chi tiết và cấu hình hệ thống.
- Khi một client mới kết nối, Broadcaster ngay lập tức gửi một gói tin `SNAPSHOT` tổng thể chứa toàn bộ cấu hình, danh sách người đang ngồi và bảng công đức để client đồng bộ ngay lập tức mà không cần chờ sự kiện mới.

### 4.6 Lựa chọn công nghệ Broadcaster: Native `ws` vs Socket.io

| Tiêu chí so sánh | Native `ws` (Đề xuất lựa chọn) | Socket.io |
|---|---|---|
| **Kích thước thư viện** | Rất nhẹ (~50KB, zero client bundle tải thêm) | Khá nặng (>1MB kèm client library) |
| **Độ trễ truyền tải** | **Cực thấp (< 10-30ms)**, frame nhị phân / text trực tiếp | Thấp, nhưng có overhead kiểm tra heartbeat & ACK |
| **Phù hợp OBS Studio** | Hoàn hảo (OBS Browser Source dùng Chromium nội bộ, hỗ trợ native WebSocket 100%) | Tốt, nhưng cần nhúng script client `socket.io.js` |
| **Tính phức tạp mã nguồn** | Đơn giản, trong sáng, dễ kiểm soát bảo mật | Phức tạp hơn, nhiều lớp trừu tượng (Engine.io) |
| **Khả năng tự kết nối lại** | Cần viết ~15 dòng code JS `onclose -> setTimeout` ở client | Có sẵn cơ chế tự động |
| **Kết luận đề xuất** | **NÊN DÙNG NATIVE `ws`**: Tối ưu hóa hiệu năng tối đa cho máy tính livestream, không tốn tài nguyên CPU của OBS. | Phù hợp nếu có nhiều client điện thoại di động từ xa truy cập qua mạng kém. |

### 4.7 Cải tiến Động cơ Âm Thanh & Edge TTS (Khắc phục nghẽn I/O đĩa)

Trong mã nguồn cũ của `kentjuno`, mỗi câu TTS được sinh ra bằng cách:
`MsEdgeTTS -> Ghi ra đĩa file .mp3 -> Client tải qua HTTP -> Server chạy vòng lặp xóa file cũ`.
Điều này gây ra 3 vấn đề nghiêm trọng:
1. Độ trễ cao (phải đợi ghi xong đĩa, đóng file rồi client mới tải về).
2. Hao mòn ổ cứng SSD khi phát live dài nhiều tiếng với hàng nghìn lượt tặng quà.
3. Rủi ro lỗi xung đột file (file lock / race condition) trên hệ điều hành Windows.

**Giải pháp kiến trúc cải tiến 2026**:
- **Tùy chọn A (In-Memory Buffer Endpoint)**: Giữ Buffer âm thanh trong RAM (dung lượng 1 câu MP3 chỉ khoảng 15-40KB), phục vụ qua route nội bộ `/api/tts/:id` trực tiếp từ RAM không chạm vào ổ đĩa.
- **Tùy chọn B (Data URI qua WebSocket)**: Chuyển đổi Buffer MP3 sang chuỗi `base64` và gửi trực tiếp trong gói tin WebSocket `{ t: 'tts', dataUri: 'data:audio/mp3;base64,...' }`. Client nhận được là phát ngay lập tức, độ trễ giảm xuống còn dưới 100ms!

---

## 5. ĐẶC TẢ CHI TIẾT GIAO THỨC WEBSOCKET (MESSAGE SCHEMAS)

### 5.1 Thiết lập kết nối & Phân luồng vai trò (Handshake & Roles)
Client kết nối tới máy chủ qua đường dẫn URL:
- Màn hình Overlay OBS: `ws://127.0.0.1:3000/ws?role=overlay`
- Trang Quản trị Admin: `ws://127.0.0.1:3000/ws?role=control`

Mọi gói tin trao đổi đều là chuỗi JSON mã hóa UTF-8.

---

### 5.2 Thông điệp Chiều Server-to-Client (Broadcaster -> Overlay & Admin)

#### 1. Gói tin Đồng bộ Trạng thái Ban đầu (`state`)
Gửi ngay khi client kết nối thành công:
```json
{
  "t": "state",
  "settings": {
    "title": "Chánh Điện Tịnh Tâm",
    "subtitle": "Nam Mô A Di Đà Phật",
    "voice": "vi-VN-NamMinhNeural",
    "pitch": -18,
    "rate": -20,
    "music": true,
    "mo": true,
    "moBpm": 52,
    "autoChant": true,
    "chantEveryMin": 3,
    "seatMode": "auto",
    "joinOnEnter": false,
    "gifts": { "readAll": true, "minDiamonds": 1 }
  },
  "viewers": [
    {
      "id": "user_101",
      "name": "Diệu Hạnh",
      "skin": "woman",
      "avatar": "https://p16-sign.tiktokcdn.com/...",
      "coins": 150,
      "demo": false
    }
  ],
  "cap": 36,
  "startedAt": 1730476800000,
  "tiktok": {
    "status": "connected",
    "uniqueId": "thayminhdao_official",
    "roomId": "729384910284729102",
    "error": ""
  }
}
```

#### 2. Gói tin Thay đổi Cấu hình (`settings`)
```json
{
  "t": "settings",
  "settings": {
    "moBpm": 60,
    "chantEveryMin": 5,
    "seatMode": "64"
  },
  "cap": 64
}
```

#### 3. Gói tin Người xem vào Chánh điện (`join`)
```json
{
  "t": "join",
  "v": {
    "id": "user_202",
    "name": "Minh Tâm",
    "skin": "man",
    "avatar": "https://...",
    "coins": 0,
    "demo": false
  },
  "cap": 24
}
```

#### 4. Gói tin Người xem rời khỏi bồ đoàn (`leave`)
```json
{
  "t": "leave",
  "id": "user_202"
}
```

#### 5. Gói tin Đổi Trang Phục (`skin`)
```json
{
  "t": "skin",
  "id": "user_202",
  "skin": "monk"
}
```

#### 6. Gói tin Bình luận / Niệm Phật (`chat`)
```json
{
  "t": "chat",
  "id": "user_202",
  "name": "Minh Tâm",
  "text": "Nam mô A Di Đà Phật, cầu gia đình bình an"
}
```

#### 7. Gói tin Tặng quà Công đức (`gift`)
```json
{
  "t": "gift",
  "id": "user_202",
  "name": "Minh Tâm",
  "giftName": "Đèn hoa sen",
  "count": 1,
  "coins": 30,
  "total": 180,
  "tier": 2,
  "prayer": "Nguyện cầu cha mẹ mạnh khỏe, sống lâu"
}
```

#### 8. Gói tin Thả Tim (`like`)
```json
{
  "t": "like",
  "id": "user_202",
  "n": 5
}
```

#### 9. Gói tin Phát Giọng Đọc AI (`tts`)
```json
{
  "t": "tts",
  "url": "/api/tts/tts_1730476850000_1.mp3",
  "dataUri": "data:audio/mp3;base64,...",
  "text": "Nam mô A Di Đà Phật. Phật tử Minh Tâm thành tâm dâng Đèn hoa sen. Nguyện cầu cha mẹ mạnh khỏe.",
  "tag": "gift",
  "id": "user_202"
}
```

#### 10. Gói tin Tụng kinh Định kỳ (`chant`)
```json
{
  "t": "chant",
  "text": "Nam mô Bổn Sư Thích Ca Mâu Ni Phật. Nguyện đem công đức này, hướng về khắp tất cả..."
}
```

#### 11. Gói tin Âm thanh Chuông / Mõ (`bell`, `mo1`)
```json
{ "t": "bell" }
{ "t": "mo1" }
```

#### 12. Gói tin Trạng thái Kết nối TikTok (`tiktok`)
```json
{
  "t": "tiktok",
  "status": "connected",
  "uniqueId": "kenh_tiktok_chua",
  "roomId": "73928192849182",
  "error": ""
}
```

#### 13. Gói tin Nhật ký Hệ thống (`log`, `logs`)
Chỉ gửi tới client quản trị (`role=control`):
```json
{
  "t": "log",
  "line": "[15:30:25] 🎁 Minh Tâm tặng Đèn hoa sen x1"
}
```

---

### 5.3 Thông điệp Chiều Client-to-Server (Admin Control -> Server)
Tất cả các thông điệp điều khiển bắt buộc có cấu trúc phong bì `{ t: "ctl", cmd: "...", ... }`:

| Lệnh (`cmd`) | Tham số đi kèm | Chức năng |
|---|---|---|
| `connect` | `{ "uniqueId": "@chuaangiang" }` | Yêu cầu máy chủ kết nối tới phòng TikTok LIVE chỉ định. |
| `disconnect` | `{}` | Ngắt kết nối hiện tại với TikTok LIVE. |
| `chat` | `{ "name": "Thí chủ A", "text": "A Di Đà Phật" }` | Giả lập một lượt bình luận từ khán giả. |
| `gift` | `{ "name": "Thí chủ A", "gift": "Hoa hồng", "diamonds": 1, "count": 1 }` | Giả lập một lượt dâng quà công đức. |
| `fill` | `{ "n": 36 }` | Đổ dữ liệu mẫu đúng số lượng người xem (15, 36, 64, 100). |
| `clear` | `{}` | Xóa trắng toàn bộ người đang ngồi trên bồ đoàn. |
| `bots` | `{ "on": true, "n": 12, "pace": "mid" }` | Bật/tắt động cơ bot tương tác mô phỏng (`pace`: slow/mid/fast). |
| `say` | `{ "text": "Chào mừng chư vị Phật tử" }` | Phát trực tiếp một đoạn thông báo bằng giọng đọc Edge TTS. |
| `chant` | `{}` | Kích hoạt ngay một lượt tụng kinh định kỳ. |
| `bell` | `{}` | Thỉnh đại hồng chung ngay lập tức. |
| `mo` | `{}` | Gõ một tiếng mõ. |
| `settings` | `{ "settings": { "moBpm": 60, "music": false } }` | Cập nhật cấu hình hoạt động của phòng thiền. |

---

### 5.4 Định nghĩa TypeScript Interfaces chuẩn

```typescript
export type SkinType = 'man' | 'woman' | 'granny' | 'monk' | 'nun' | 'child' | 'master';

export interface ViewerState {
  id: string;
  name: string;
  skin: SkinType;
  avatar: string;
  coins: number;
  demo?: boolean;
}

export interface RoomSettings {
  title: string;
  subtitle: string;
  voice: 'vi-VN-NamMinhNeural' | 'vi-VN-HoaiMyNeural';
  pitch: number;
  rate: number;
  music: boolean;
  mo: boolean;
  moBpm: number;
  autoChant: boolean;
  chantEveryMin: number;
  seatMode: 'auto' | '24' | '36' | '64' | '100';
  joinOnEnter: boolean;
  gifts: {
    readAll: boolean;
    minDiamonds: number;
  };
}

export interface TikTokStatus {
  status: 'idle' | 'connecting' | 'connected' | 'disconnected' | 'error';
  uniqueId: string;
  roomId?: string;
  error?: string;
}

// Server -> Client Events
export type ServerMessage =
  | { t: 'state'; settings: RoomSettings; viewers: ViewerState[]; cap: number; startedAt: number; tiktok: TikTokStatus }
  | { t: 'settings'; settings: RoomSettings; cap: number }
  | { t: 'join'; v: ViewerState; cap: number }
  | { t: 'leave'; id: string }
  | { t: 'skin'; id: string; skin: SkinType }
  | { t: 'chat'; id: string; name: string; text: string }
  | { t: 'gift'; id: string; name: string; giftName: string; count: number; coins: number; total: number; tier: 1 | 2 | 3; prayer: string }
  | { t: 'like'; id: string; n: number }
  | { t: 'tts'; url: string; dataUri?: string; text: string; tag?: string; id?: string }
  | { t: 'chant'; text: string }
  | { t: 'bell' }
  | { t: 'mo1' }
  | { t: 'tiktok'; status: string; uniqueId: string; roomId?: string; error?: string }
  | { t: 'log'; line: string }
  | { t: 'logs'; lines: string[] }
  | { t: 'bots'; on: boolean };

// Client -> Server Control Commands
export type ClientControlMessage =
  | { t: 'ctl'; cmd: 'connect'; uniqueId: string }
  | { t: 'ctl'; cmd: 'disconnect' }
  | { t: 'ctl'; cmd: 'chat'; name: string; text: string }
  | { t: 'ctl'; cmd: 'gift'; name: string; gift: string; diamonds: number; count: number }
  | { t: 'ctl'; cmd: 'fill'; n: number }
  | { t: 'ctl'; cmd: 'clear' }
  | { t: 'ctl'; cmd: 'bots'; on: boolean; n: number; pace: 'slow' | 'mid' | 'fast' }
  | { t: 'ctl'; cmd: 'say'; text: string }
  | { t: 'ctl'; cmd: 'chant' }
  | { t: 'ctl'; cmd: 'bell' }
  | { t: 'ctl'; cmd: 'mo' }
  | { t: 'ctl'; cmd: 'settings'; settings: Partial<RoomSettings> };
```

---

## 6. HƯỚNG DẪN TÍCH HỢP MÔI TRƯỜNG CỤC BỘ & OBS STUDIO

### 6.1 Cấu hình môi trường Node.js
- **Yêu cầu hệ điều hành**: Windows 10/11, macOS hoặc Linux.
- **Node.js**: Phiên bản 20.0.0 LTS trở lên (yêu cầu hỗ trợ chuẩn ES Modules native và `fetch`).
- **File biến môi trường đề xuất (`.env`)**:
  ```ini
  PORT=3000
  HOST=127.0.0.1
  # Khóa Euler Stream API (Tùy chọn, nâng giới hạn ký WebSocket)
  SIGN_API_KEY=
  # Session Cookie tài khoản TikTok (Tùy chọn, chống chặn IP & cho phép chat bot)
  TIKTOK_SESSION_ID=
  TIKTOK_TARGET_IDC=alisg
  # Proxy dân cư (Nếu chạy trên Cloud Server)
  RESIDENTIAL_PROXY_URL=
  ```

### 6.2 Tích hợp OBS Browser Source tối ưu hiệu năng
Để tích hợp màn hình overlay vào phần mềm OBS Studio đạt chuẩn độ phân giải 9:16 sắc nét:
1. Trong OBS Studio, tại mục **Sources (Nguồn)**, bấm biểu tượng dấu cộng `+` -> Chọn **Browser (Trình duyệt)**.
2. Đặt tên nguồn: `ChanhDien_Overlay`.
3. Cấu hình chi tiết các tham số:
   - **URL**: `http://127.0.0.1:3000/live/overlay.html`
   - **Width (Độ rộng)**: `1080`
   - **Height (Độ cao)**: `1920`
   - **FPS**: `60` (hoặc `30` nếu máy cấu hình trung bình để giảm tải GPU)
   - Tích chọn: **Shutdown source when not visible (Tắt nguồn khi không hiển thị)**.
   - Tích chọn: **Refresh browser when scene becomes active (Làm mới khi cảnh hoạt động)**.
   - Tích chọn: **Control audio via OBS (Kiểm soát âm thanh qua OBS)**: Tùy chọn này giúp âm thanh chuông mõ và nhạc thiền xuất hiện trực tiếp trong Audio Mixer của OBS, giúp streamer chủ động tăng giảm âm lượng stream mà không sợ bị rè tiếng.
4. **Xử lý chặn tự động phát âm thanh (Browser Autoplay Policy)**:
   - Trong cửa sổ xem trước của OBS hoặc mở trình duyệt ngoài, bấm nút đỏ **"🔔 Bấm để bật âm thanh"** một lần duy nhất để cấp quyền cho AudioContext của trình duyệt. Sau đó nút này sẽ tự ẩn biến mất.

---

## 7. BẢNG PHÂN TÍCH RỦI RO KỸ THUẬT & BIỆN PHÁP GIẢM THIỂU (RISK MATRIX)

| Mã Rủi Ro | Mô tả nguy cơ kỹ thuật | Mức độ tác động | Khả năng xảy ra | Biện pháp phòng ngừa & Giảm thiểu chi tiết |
|---|---|:---:|:---:|---|
| **R-01** | TikTok thay đổi cấu trúc Webcast Protobuf hoặc URL format | **Rất Cao** | Trung bình | - Pin cố định phiên bản `tiktok-live-connector`.<br>- Tích hợp fallback sang Euler Stream WebSocket API.<br>- Tách biệt tầng Ingestion để khi đổi thư viện chỉ sửa 1 file adapter. |
| **R-02** | IP máy phát bị TikTok chặn tạm thời (Rate Limit / Captcha) | **Cao** | Trung bình | - Sử dụng IP mạng dân cư cố định của máy tính phát.<br>- Cấu hình sẵn Session Cookie (`sessionId`, `tt-target-idc`).<br>- Hỗ trợ tích hợp Proxy dân cư xoay vòng (`hpagent`). |
| **R-03** | Rớt mạng hoặc mất kết nối WebSocket giữa chừng buổi live | **Trung bình** | **Cao** | - Triển khai thuật toán Exponential Backoff tự động kết nối lại.<br>- Giữ nguyên bộ nhớ trạng thái (không xóa bàn thờ / bảng công đức khi rớt mạng tạm thời).<br>- Giám sát Heartbeat Watchdog kiểm tra dữ liệu mỗi 15 giây. |
| **R-04** | Spam bình luận thô tục, phá hoại không gian tôn nghiêm | **Cao** | **Cao** | - Bật bộ lọc từ ngữ cấm (Profanity Filter) tiếng Việt ngay tại Tầng 2.<br>- Giới hạn tần suất bình luận (Rate Limit 5s/lần cho mỗi tài khoản).<br>- Cho phép Admin xóa hoặc đuổi ngay người dùng khỏi bồ đoàn từ Dashboard. |
| **R-05** | Nghẽn hàng đợi giọng đọc TTS khi có bão quà tặng combo | **Cao** | **Cao** | - Bắt buộc kiểm tra cờ `repeatEnd === true` cho quà tặng combo.<br>- Giới hạn trần hàng đợi TTS tối đa 15 câu, ưu tiên quà có giá trị xu cao hơn (Priority Queue).<br>- Tự động rút gọn câu đọc khi hàng đợi quá tải. |
| **R-06** | Giật lag OBS do nghẽn I/O ghi đĩa file MP3 liên tục | **Cao** | Trung bình | - Xóa bỏ cơ chế ghi file MP3 ra đĩa cứng của repo cũ.<br>- Chuyển sang phát âm thanh trực tiếp từ RAM (Memory Buffer / Data URI base64). |
| **R-07** | Đoạn mã chèn watermark ẩn trong file overlay của repo gốc | **Trung bình** | **Đã phát hiện** | - Loại bỏ hoàn toàn mảng mã hóa `_q` tại dòng 328-335 của `overlay.html`.<br>- Tái cấu trúc mã nguồn Canvas 2D theo chuẩn module hóa sạch, minh bạch. |

---

*Báo cáo kết thúc. Toàn bộ thông tin khảo sát trên là cơ sở kỹ thuật trực tiếp để Sentinel và Orchestrator xây dựng Kế hoạch Triển khai (Roadmap) và Kiến trúc Hệ thống.*
