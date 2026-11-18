# KẾ HOẠCH TRIỂN KHAI KỸ THUẬT & HƯỚNG DẪN TÍCH HỢP OBS
## Technical Implementation Roadmap & OBS Integration Playbook

---

## 1. TỔNG QUAN LỘ TRÌNH KỸ THUẬT (ROADMAP OVERVIEW)

Lộ trình triển khai dự án **"Chánh Điện Tịnh Tâm"** được phân chia thành **5 giai đoạn kỹ thuật (Phases)** có tính kế thừa chặt chẽ. Mỗi giai đoạn đều xác định rõ ràng mục tiêu kỹ thuật, danh sách công việc cần làm, tiêu chí nghiệm thu độc lập (Acceptance Criteria), và phương pháp kiểm thử xác thực:

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│ GIAI ĐOẠN 1: CORE BACKEND & EVENT INGESTION ENGINE                                          │
│ - TikTokLiveConnector + EulerStream + hpagent Proxy + Session Auth + Watchdog Reconnect     │
│ - Canonical Event Normalizer + Bộ lọc từ ngữ tiếng Việt + Gộp quà combo (repeatEnd)        │
│ - Core State Manager: Lưới bồ đoàn 24-100, LRU non-donor eviction, Prayer Cache 90s         │
│ - WebSocket Broadcaster (Native `ws` server, phân luồng role=overlay vs role=control)       │
└──────────────────────────────────────────────┬──────────────────────────────────────────────┘
                                               │
                                               ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│ GIAI ĐOẠN 2: OVERLAY HYBRID RENDERING ENGINE & 2.5D CANVAS                                  │
│ - OBS CEF Hybrid Engine: Canvas 2D 1080×1920 @ 60fps + DOM/CSS HUD Layer                    │
│ - Toán học phối cảnh 2.5D sàn hình thang (yTop: 1215, yBot: 1845, lối đi giữa 15%)          │
│ - Máy trạng thái nhân vật: walk -> sitting -> sit (breathing) -> bowing (lạy chầu)          │
│ - Hệ thống hạt: Khói nhang procedural, nến lập lòe, hào quang Phật, 3 tầng hiệu ứng quà     │
│ - Loại bỏ 100% mã ẩn watermark obfuscated của repo tham khảo gốc                            │
└──────────────────────────────────────────────┬──────────────────────────────────────────────┘
                                               │
                                               ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│ GIAI ĐOẠN 3: AUDIO ENGINE & EDGE-TTS STREAMING PIPELINE                                     │
│ - Client-side Web Audio API trong OBS CEF, giải quyết triệt để autoplay policy               │
│ - Bộ âm thanh kép: Mẫu WAV 48kHz (pitch/velocity jitter) + Dao động điện tử dự phòng        │
│ - Audio Ducking tự động nhìn trước: Giảm -14dB nhạc nền khi phát TTS hoặc đại hồng chung    │
│ - MS Edge-TTS: In-memory Buffer -> Base64 Data URI WebSocket (xóa bỏ 100% nghẽn SSD)        │
│ - Hàng đợi ưu tiên 3 cấp độ (Priority Queue) + MD5 Audio Cache                              │
└──────────────────────────────────────────────┬──────────────────────────────────────────────┘
                                               │
                                               ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│ GIAI ĐOẠN 4: REACT ADMIN CONTROL DASHBOARD & SIMULATION STUDIO                              │
│ - Kiến trúc module hóa cắm-rút (Pluggable Modular Registry theo chuẩn react-web-dev)        │
│ - Live Connection Hub: Quản lý kết nối TikTok LIVE, hiển thị số liệu realtime               │
│ - Interactive Floor Matrix: Bản đồ bồ đoàn trực quan (Kick, Ghim VIP, Khóa, Đổi trang phục) │
│ - Live Audio Mixer: Điều chỉnh BGM, metronome nhịp mõ BPM, thỉnh chuông, kiểm soát TTS      │
│ - Simulation Studio: Thử tương tác đơn lẻ, đổ 15-100 người mẫu, chạy bot tự động            │
└──────────────────────────────────────────────┬──────────────────────────────────────────────┘
                                               │
                                               ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│ GIAI ĐOẠN 5: KIỂM THỬ ĐẦU-CUỐI, TỐI ƯU HÓA BỀN BỈ & TÍCH HỢP OBS STUDIO                     │
│ - Kiểm thử tải trọng: 100 bồ đoàn + bão quà combo 99 items liên tiếp                        │
│ - Đo kiểm rò rỉ bộ nhớ (Memory Leak Benchmark): Duy trì < 120MB trong 12 - 24 giờ           │
│ - Hướng dẫn cấu hình OBS Studio: Kích thước 1080×1920, cờ tăng tốc GPU, định tuyến âm thanh │
│ - Ma trận xử lý rủi ro kỹ thuật: Chống chặn IP, rớt mạng, vượt trần TTS, chống phá hoại     │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. CHI TIẾT 5 GIAI ĐOẠN TRIỂN KHAI (5-PHASE ENGINEERING ROADMAP)

### Giai Đoạn 1: Core Backend & Event Ingestion Engine

- **Mục tiêu**: Xây dựng máy chủ Node.js điều phối trung tâm với kiến trúc phân tách ranh giới rõ ràng, bảo đảm khả năng kháng lỗi cao, phục hồi kết nối tự động và quản lý trạng thái chánh điện ổn định.
- **Hạng mục công việc chi tiết**:
  1. *Khởi tạo cấu trúc dự án chuẩn ES Modules (Node.js 20+ LTS)*.
  2. *Triển khai `TikTokLiveAdapter`*:
     - Tích hợp `tiktok-live-connector` v2.5+.
     - Tích hợp EulerStream Signature API qua biến môi trường `SIGN_API_KEY`.
     - Hỗ trợ định tuyến mạng qua proxy dân cư xoay vòng bằng `hpagent` (`RESIDENTIAL_PROXY_URL`).
     - Tích hợp xác thực phiên người dùng thật qua cookie `sessionId` và `tt-target-idc`.
     - Triển khai thuật toán tự kết nối lại Exponential Backoff with Jitter ($T_{\text{base}}=2\text{s}, T_{\text{max}}=30\text{s}, \pm 20\%$) và Watchdog Heartbeat 15 giây.
  3. *Triển khai `MockBotSimulatorAdapter` & `AdminManualAdapter`*:
     - Xây dựng động cơ sinh bot tự động (1-100 bots) định kỳ niệm Phật, thả tim, gửi quà.
     - Xây dựng bộ điều hợp tiếp nhận sự kiện kích hoạt thủ công từ Admin.
  4. *Triển khai Tầng 2: Event Normalizer & Moderation*:
     - Chuyển đổi toàn bộ sự kiện về schema thống nhất `CanonicalAppEvent`.
     - Bộ lọc ngôn từ thô tục tiếng Việt (Blacklist Regex lọc từ cấm, teencode, báng bổ).
     - Bộ gộp chuỗi quà combo (`Gift Streak Coalescer`) dựa trên cờ `repeatEnd` và bộ đệm 1.5 giây.
     - Bộ làm sạch văn bản và escape ký tự XML SSML (`<`, `>`, `&`, `"`, `'`).
  5. *Triển khai Tầng 3: Core State Manager*:
     - Bộ quản lý bồ đoàn động 24, 36, 64, 100 chỗ với thuật toán ưu tiên từ giữa ra vách.
     - Thuật toán đào thải người không cúng dường khi đầy chỗ (`Longest-Quiet Non-Donor Eviction`) kết hợp xử lý bão hòa 100% donors (đào thải donor ít xu nhất và bất hoạt > 15 phút), bảo vệ tuyệt đối slot VIP.
     - Bộ nhớ đệm lời nguyện 90 giây (`Recent Prayer Cache`).
     - Bảng xếp hạng điểm công đức (Merit Leaderboard Top 5 / Top 10).
  6. *Triển khai Tầng 4: WebSocket Broadcaster (Native `ws`) & HTTP Server*:
     - Phân luồng quyền hạn `role=overlay` (chỉ đọc) và `role=control` (toàn quyền).
     - Gửi Snapshot trạng thái tổng thể ngay khi client vừa kết nối thành công.
     - Cung cấp định tuyến tĩnh HTTP hỗ trợ song song cả tiền tố gốc `/` và bí danh `/live/` (`app.use('/live', express.static(publicDir))` và `app.use('/', express.static(publicDir))`), đảm bảo tương thích tuyệt đối cho cả URL `http://127.0.0.1:3000/live/overlay.html` lẫn `http://127.0.0.1:3000/overlay.html`.
- **Tiêu chí nghiệm thu (Acceptance Criteria)**:
  - Máy chủ vượt qua bộ kiểm thử kết nối tự động khi ngắt mạng giả lập.
  - Các bình luận chứa từ tục tĩu bị loại bỏ hoàn toàn trước khi vào State Manager.
  - Quà combo 50 lần liên tiếp chỉ phát sinh đúng 1 thông điệp xướng tên cuối cùng.

---

### Giai Đoạn 2: Overlay Hybrid Rendering Engine & 2.5D Canvas

- **Mục tiêu**: Xây dựng màn hình hiển thị trực quan tỷ lệ 9:16 (1080×1920) tối ưu riêng cho OBS Browser Source CEF, khóa cứng 60fps, tải bộ nhớ dưới 120MB và tạo chiều sâu không gian trang nghiêm.
- **Hạng mục công việc chi tiết**:
  1. *Thiết lập cấu trúc đồ họa lai (Hybrid Display Architecture)*:
     - Lớp nền Canvas 2D toàn màn hình 1080×1920 trong suốt (`rgba(0, 0, 0, 0)`).
     - Lớp giao diện HUD bằng DOM/CSS cho Hoành phi, Bảng công đức, Bong bóng thoại.
  2. *Hiện thực toán học phối cảnh 2.5D sàn hình thang*:
     - Đỉnh trên sàn: $y_{\text{top}} = 1215$, bán rộng $\text{half}_{\text{top}} = 290$.
     - Đáy dưới sàn: $y_{\text{bot}} = 1845$, bán rộng $\text{half}_{\text{bot}} = 430$.
     - Ràng buộc số cột chẵn `cols % 2 === 0` (4, 6, 8, 10), mở lối đi chính giữa $\text{aisleRatio} = 0.15$ ($15\%$), lề sàn an toàn $\text{marginRatio} = 0.12$.
     - Dựng hình theo Painter's Algorithm ($Y$-sorted ascending) và điểm neo sprite `anchor point: (centerX, bottomY)` để loại bỏ triệt để lỗi đảo ngược chiều sâu không gian.
  3. *Máy trạng thái hoạt ảnh nhân vật (Avatar Animation State Machine)*:
     - 4 giai đoạn chuyển động: `walk` (bước lên từ $y=2020$) $\rightarrow$ `sitting` $\rightarrow$ `sit` (thở nhẹ theo hàm sin) $\rightarrow$ `bowing`.
     - **Quy chuẩn hoạt ảnh bái lạy (`bowing`)**: Mặc định trên Canvas 2D engine sử dụng thuật toán biến dạng hình học nén trục Y theo hàm cosin (Procedural Cosine Compression) trực tiếp trên Frame 7 (tọa thiền) với điểm neo chân `(centerX, bottomY)`: $y_{\text{scale}} = 1 - 0.45 \times (1 - \cos(\theta))$. Thuộc tính `bowingFrames: [4, 5, 6, 7]` được tài liệu hóa là dải khung hình dự phòng thay thế cho các engine render theo frame.
     - Đồng bộ quy chuẩn chiều cao nhân vật: Chiều cao chuẩn cơ sở 300px (chú tiểu `char_child` 260px và cao tăng `char_master` 320px theo tỷ lệ cơ thể).
     - Nhận diện trang phục thông minh qua NLP từ khóa ngắn (`nam`, `nữ`, `bà`, `chú tiểu`, `sư thầy`, `sư cô`, `cao tăng`) kết hợp bộ lọc loại trừ các câu tụng niệm thiêng liêng ("Nam mô Phật", "Phật bà", "A Di Đà Phật") và ranh giới từ độc lập.
     - Cơ chế Avatar LRU Cache (giới hạn tối đa 150 avatar gần nhất trong RAM).
  4. *Hệ thống hạt vật lý (Particle System) sử dụng Object Pooling*:
     - Khói nhang trầm lư đồng uốn lượn mềm mại bằng hạt procedural (0 KB ảnh ngoài).
     - Ngọn nến lung linh nhấp nháy bằng `globalCompositeOperation = 'lighter'`.
     - Vầng hào quang quang học hai vòng xung nhịp thở.
     - 3 tầng hiệu ứng vinh danh quà tặng: cánh sen bay, đài sen vàng tỏa sáng, mưa hoa sen lấp lánh toàn màn hình.
  5. *Rà soát mã nguồn & Loại bỏ Watermark ẩn*:
     - Loại bỏ hoàn toàn mảng mã hóa `_q` tại dòng 328-335 của `kentjuno/chanh-dien-online/live/overlay.html`.
     - Tái thiết kế mã nguồn sạch sẽ, không có bất kỳ logic can thiệp hay hiển thị ngầm nào.
- **Tiêu chí nghiệm thu**:
  - Tốc độ khung hình đo được trong OBS CEF duy trì ổn định 59.5 - 60.0 fps.
  - Không xuất hiện hiện tượng rác DOM hay rò rỉ RAM sau 2 giờ chạy liên tục.

---

### Giai Đoạn 3: Audio Engine & Edge-TTS Pipeline

- **Mục tiêu**: Xây dựng hệ sinh thái âm thanh sống động, trang nghiêm với độ trễ thấp, không phụ thuộc tương tác click chuột của người dùng và triệt tiêu hoàn toàn nghẽn I/O đĩa cứng.
- **Hạng mục công việc chi tiết**:
  1. *Khởi tạo Web Audio Engine trong OBS Browser Source*:
     - Khởi tạo `AudioContext` tại sample rate chuẩn 48.000 Hz.
     - Hàm tự động mở khóa trạng thái suspended sau 500ms dành riêng cho OBS CEF flag `--autoplay-policy=no-user-gesture-required`.
     - Xóa bỏ nút bấm thủ công `"Bấm để bật âm thanh"`.
  2. *Bộ phát âm thanh kép (Dual Sound Source)*:
     - Mẫu thu âm studio thực tế 48kHz / 24-bit PCM: Tiếng mõ đanh ấm, đại hồng chung vang ngân 11.2s, chuông gia trì trong trẻo.
     - Thuật toán chống hiệu ứng máy móc (Humanization): Luân phiên 3 biến thể gõ mõ (Round-Robin), ngẫu nhiên hóa cao độ $\pm 25\text{ cents}$ và dao động âm lượng $\pm 5\%$.
     - Bộ dao động điện tử dự phòng (Synthetic Fallback): 4 dao động sine chồng âm cho chuông và dao động tam giác quét tần số cho mõ.
  3. *Tự động giảm âm nền (Parametric Look-Ahead Audio Ducking)*:
     - Tự động hạ âm lượng nhạc thiền nền (BGM) từ 55% xuống 12% (giảm $-14\text{dB}$) trong 400ms khi bắt đầu đọc TTS hoặc thỉnh chuông lớn.
     - Tự động nâng âm lượng trở lại mức bình thường sau khi câu đọc kết thúc.
  4. *Động cơ giọng đọc Microsoft Edge-TTS In-Memory Streaming*:
     - Tích hợp `msedge-tts` với 2 giọng đọc chuẩn: `vi-VN-NamMinhNeural` (trang trọng, trầm ấm) và `vi-VN-HoaiMyNeural` (thanh tao, nhẹ nhàng).
     - Căn chỉnh cao độ trầm (`pitch: "-18Hz"`) và nhịp đọc khoan thai (`rate: "-20%"`).
     - **Giải pháp triệt tiêu nghẽn đĩa SSD**: Sinh Buffer âm thanh trong RAM, mã hóa Base64 Data URI và truyền thẳng qua WebSocket `{ t: 'tts', dataUri: '...' }`, không ghi/xóa file MP3 trên đĩa cứng.
     - Bộ nhớ đệm âm thanh MD5 Audio Caching cho các câu tụng kinh cố định.
  5. *Hàng đợi ưu tiên TTS (3-Tier Priority Queue)*:
     - Tier 1: Quà lớn $\ge 99$ xu (ưu tiên ngắt ngang).
     - Tier 2: Quà thường 1 - 98 xu (FIFO).
     - Tier 3: Tụng kinh tự động (hủy bỏ nếu có quà dồn dập).
     - Giới hạn trần an toàn tối đa 10 câu trong hàng đợi.
- **Tiêu chí nghiệm thu**:
  - Âm thanh và visual effect nổ đồng thời (độ trễ < 50ms).
  - Không phát sinh bất kỳ file ghi tạm thời nào trên ổ cứng trong suốt quá trình sinh giọng đọc.

---

### Giai Đoạn 4: React Admin Control Dashboard & Simulation Studio

- **Mục tiêu**: Xây dựng giao diện quản trị trung tâm chuẩn mực theo kiến trúc module hóa cắm-rút, giao diện nâu trầm thiền tịnh, bảo vệ mắt và dễ thao tác trên màn hình phụ hoặc tablet.
- **Hạng mục công việc chi tiết**:
  1. *Khởi tạo khung ứng dụng React + Vite + Tailwind CSS*:
     - Áp dụng các nguyên tắc chuẩn từ skill `react-web-development`: Module Registry, Store tách biệt (Zustand), UI components nguyên tử.
  2. *Xây dựng Phân hệ Kết nối Phòng Live (Module 1)*:
     - Nhập `@username`, kết nối/ngắt kết nối, hiển thị đèn báo trạng thái WebSocket và TikTok Live.
     - Hiển thị số lượng người xem, tổng lượt thả tim, thời lượng phát live.
     - Nút mở popup xem trước màn hình 9:16 (540×960 px).
  3. *Xây dựng Phân hệ Ma Trận Bồ Đoàn Trực Quan (Module 2)*:
     - Hiển thị mặt sàn 24/36/64/100 ô bồ đoàn với thông tin avatar, tên, số xu, loại trang phục.
     - Thao tác nhanh khi click vào slot: Kick người vi phạm, Ghim VIP slot, Khóa slot ban tổ chức, Ép đổi trang phục sang Sư thầy / Cụ bà / Chú tiểu.
     - Tùy chọn cấu hình chế độ mở rộng bồ đoàn (auto hoặc cố định).
  4. *Xây dựng Phân hệ Bộ Trộn Âm Thanh & Giọng Đọc (Module 3)*:
     - Thanh trượt âm lượng nhạc thiền nền BGM.
     - Điều khiển nhịp mõ: Bật/tắt gõ mõ tự động, thanh trượt 20-120 BPM, nút bấm gõ mõ thủ công.
     - Nút thỉnh chuông Đại Hồng Chung thủ công.
     - Tùy chỉnh giọng đọc Nam Minh / Hoài My, điều chỉnh cao độ, tốc độ, khung soạn thông báo khẩn cấp phát ngay lên sóng.
  5. *Xây dựng Phân hệ Studio Giả Lập & Tổng Duyệt (Module 4)*:
     - Form gửi chat thử, tặng quà mẫu (Hoa hồng, Sen vàng, Chuông đồng).
     - Nút đổ dữ liệu nhanh 15, 36, 64, 100 người xem mẫu.
     - Bảng điều khiển Bot tự động (tùy chọn 5-30 bot, tốc độ chậm/vừa/nhanh).
  6. *Xây dựng Phân hệ Nhật Ký Thời Gian Thực (Module 5)*:
     - Hiển thị 300 dòng log sự kiện mới nhất, phân loại màu sắc theo chat, quà, cảnh báo.
- **Tiêu chí nghiệm thu**:
  - Streamer có thể kiểm soát toàn bộ phòng live và kích hoạt mọi hiệu ứng chỉ bằng 1 cú nhấp chuột.
  - Giao diện đáp ứng mượt mà trên cả trình duyệt máy tính và máy tính bảng iPad.

---

### Giai Đoạn 5: Kiểm Thử Đầu-Cuối, Tối Ưu Hóa Bền Bỉ & Tích Hợp OBS Studio

- **Mục tiêu**: Đóng gói hoàn chỉnh giải pháp, thực hiện kiểm thử chịu tải khắc nghiệt, chuẩn hóa quy trình cài đặt và thiết lập OBS Studio đạt chuẩn phát sóng trực tiếp.
- **Hạng mục công việc chi tiết**:
  1. *Kiểm thử tải trọng và giông bão sự kiện (Stress Testing & Storm Simulation)*:
     - Giả lập 100 người ngồi kín bồ đoàn cùng lúc.
     - Bơm liên tục 50 bình luận/giây và bão quà combo 99 items để kiểm tra tính toàn vẹn của Event Normalizer và Hàng đợi TTS.
  2. *Đo kiểm rò rỉ bộ nhớ (Memory Leak Benchmarking)*:
     - Chạy thử nghiệm phòng live giả lập liên tục trong 12 giờ đến 24 giờ.
     - Theo dõi tiến trình `obs-browser-page.exe` và `node.exe`: Tiêu thụ RAM phải giữ ổn định dưới 120MB, đồ thị GC phẳng, không có hiện tượng tích lũy rác DOM.
  3. *Biên soạn tài liệu tích hợp OBS Studio chuẩn mực*:
     - Hướng dẫn cấu hình thông số Browser Source chi tiết (kích thước, cờ tăng tốc phần cứng, định tuyến mixer âm thanh).
     - Quy trình vận hành 6 bước hàng ngày dành cho streamer.
  4. *Xây dựng Ma Trận Giảm Thiểu Rủi Ro Kỹ Thuật Toàn Diện (Risk Mitigation Matrix)*.
- **Tiêu chí nghiệm thu**:
  - Hệ thống vận hành liên tục 12 giờ không bị văng tiến trình (zero crash).
  - OBS Browser Source khởi động và bắt đầu phát âm thanh/hình ảnh chuẩn xác ngay trong 1 giây đầu tiên.

---

## 3. HƯỚNG DẪN CẤU HÌNH MÔI TRƯỜNG PHÁT TRIỂN CỤC BỘ (LOCAL SETUP GUIDE)

### 3.1. Yêu Cầu Phần Cứng & Phần Mềm

- **Hệ điều hành**: Windows 10/11 64-bit (khuyến nghị cho streamer), macOS (Apple Silicon/Intel), hoặc Linux Ubuntu 22.04 LTS.
- **Node.js**: Phiên bản **v20.0.0 LTS** trở lên (bắt buộc hỗ trợ chuẩn ES Modules native, `fetch` API và Web Streams).
- **Trình quản lý gói**: `npm` v10+ (hoặc `pnpm` / `yarn`).
- **Phần mềm Livestream**: **OBS Studio** phiên bản **29.1** trở lên (khuyến nghị OBS 30.0+ với nhân Chromium 118+).

---

### 3.2. Cài Đặt Phụ Thuộc Mã Nguồn (Dependencies)

Trong thư mục dự án `c:\Users\tn018\Desktop\Person\media\tiktok\app-live`:

```bash
# Cài đặt các gói phụ thuộc Backend & Audio Engine
npm install tiktok-live-connector@^2.5.0 ws@^8.18.0 msedge-tts@^2.1.1 hpagent@^1.2.0

# Cài đặt các gói hỗ trợ phát triển (Linting, TypeScript & Tooling)
npm install --save-dev typescript @types/node @types/ws eslint
```

*Danh mục các gói thư viện cốt lõi:*
- `tiktok-live-connector`: Kết nối và giải mã Webcast Protobuf từ TikTok LIVE.
- `ws`: Máy chủ WebSocket thuần (RFC 6455) hiệu năng cao, siêu nhẹ.
- `msedge-tts`: Gọi dịch vụ tổng hợp giọng nói Microsoft Edge Read Aloud miễn phí chất lượng cao.
- `hpagent`: Hỗ trợ HTTP/HTTPS Keep-Alive Agent định tuyến qua Residential Proxy.

---

### 3.3. Cấu Hình Biến Môi Trường (`.env`)

Tạo file `.env` tại thư mục gốc của dự án:

```ini
# ==============================================================================
# CẤU HÌNH MÁY CHỦ CHÁNH ĐIỆN TỊNH TÂM
# ==============================================================================

# Cổng lắng nghe HTTP & WebSocket
PORT=3000
HOST=127.0.0.1

# ==============================================================================
# TIKTOK LIVE INGESTION & RESILIENCE
# ==============================================================================

# Khóa EulerStream API (Tùy chọn: giúp nâng hạn mức ký số khi live đông)
# Đăng ký miễn phí tại: https://eulerstream.com
SIGN_API_KEY=

# Cookie phiên tài khoản TikTok thật (Tùy chọn: chống chặn IP & cho phép chat bot)
# Cách lấy: Đăng nhập tiktok.com trên Chrome -> F12 -> Application -> Cookies -> sessionid
TIKTOK_SESSION_ID=
TIKTOK_TARGET_IDC=alisg

# Proxy Dân Cư Xoay Vòng (Bắt buộc nếu bạn chạy máy chủ trên Cloud VPS AWS/DigitalOcean)
# Định dạng: http://username:password@proxy-host:port
RESIDENTIAL_PROXY_URL=

# ==============================================================================
# AUDIO & TTS SETTINGS
# ==============================================================================

# Giọng đọc mặc định: vi-VN-NamMinhNeural hoặc vi-VN-HoaiMyNeural
DEFAULT_TTS_VOICE=vi-VN-NamMinhNeural
DEFAULT_TTS_PITCH=-18Hz
DEFAULT_TTS_RATE=-20%

# Thư mục lưu cache âm thanh tụng kinh cố định
AUDIO_CACHE_DIR=./cache/audio
```

---

### 3.4. Khởi Chạy Ứng Dụng

Thêm các script sau vào `package.json`:

```json
"scripts": {
  "start": "node src/server.mjs",
  "dev": "node --watch src/server.mjs",
  "build:admin": "vite build",
  "test": "node --test"
}
```

Khởi chạy máy chủ:
```bash
npm start
```
Khi khởi chạy thành công, máy chủ sẽ xuất ra thông báo:
```text
[ChanhDien] Server đang lắng nghe tại http://127.0.0.1:3000
[ChanhDien] WebSocket Broadcaster sẵn sàng tại ws://127.0.0.1:3000/ws
[ChanhDien] Màn hình Overlay: http://127.0.0.1:3000/live/overlay.html
[ChanhDien] Trang Quản Trị:   http://127.0.0.1:3000/live/control.html
```

---

## 4. HƯỚNG DẪN CẤU HÌNH OBS STUDIO CHUẨN MỰC (OBS INTEGRATION GUIDE)

Để hình ảnh Chánh Điện sắc nét 1080×1920, cử động mượt mà 60fps và âm thanh chuông mõ được kiểm soát chuyên nghiệp trong bộ trộn OBS Studio:

### 4.1. Thiết Lập Khung Hình Canvas Trong OBS
1. Mở phần mềm **OBS Studio**.
2. Vào **Settings (Cài đặt)** $\rightarrow$ Chọn mục **Video**:
   - **Base (Canvas) Resolution**: `1080x1920` (Tỷ lệ dọc 9:16 cho TikTok LIVE) hoặc `1920x1080` (nếu phát ngang).
   - **Output (Scaled) Resolution**: `1080x1920`.
   - **Downscale Filter**: `Lanczos (Sharpened scaling, 36 samples)`.
   - **Common FPS Values**: `60` (Khóa cứng 60 khung hình/giây).
3. Bấm **Apply** và **OK**.

---

### 4.2. Thêm & Cấu Hình Nguồn Browser Source

1. Trong khung **Scenes (Cảnh)**, tạo một cảnh mới đặt tên là: `Chánh Điện Tịnh Tâm LIVE`.
2. Trong khung **Sources (Nguồn)**, bấm dấu cộng `+` $\rightarrow$ Chọn **Browser (Trình duyệt)**.
3. Đặt tên nguồn: `ChanhDien_Overlay`.
4. Thiết lập chính xác các thông số trong bảng thuộc tính:
   - **URL**: `http://127.0.0.1:3000/live/overlay.html`
   - **Width (Độ rộng)**: `1080`
   - **Height (Độ cao)**: `1920`
   - **FPS**: `60`
   - **Custom CSS**: Để trống hoàn toàn (ứng dụng đã tự động áp dụng nền trong suốt `rgba(0,0,0,0)`).
   - **Tích chọn bắt buộc**:
     - `[X] Control audio via OBS` *(Cực kỳ quan trọng: Định tuyến âm thanh chuông mõ vào mixer OBS)*.
     - `[X] Shutdown source when not visible` *(Tiết kiệm RAM GPU khi ẩn cảnh)*.
     - `[ ] Refresh browser when scene becomes active` *(BỎ CHỌN: Để không bị đứt kết nối WebSocket khi đổi cảnh)*.

---

### 4.3. Cân Chỉnh Bộ Trộn Âm Thanh & Giám Sát Tai Nghe (Audio Mixer & Monitoring Routing)

Khi đã tích chọn `"Control audio via OBS"`, bạn sẽ thấy kênh `ChanhDien_Overlay` xuất hiện ngay trên thanh trượt của **Audio Mixer**:
1. Kéo thanh âm lượng của `ChanhDien_Overlay` về mức **$-3.0\text{ dB}$** (tránh bị vỡ tiếng khi thỉnh đại hồng chung).
2. Nhấp vào biểu tượng bánh răng cài đặt $\rightarrow$ Chọn **Filters (Bộ lọc)**:
   - Thêm bộ lọc **Limiter (Bộ giới hạn)**: Đặt *Threshold* ở mức `0.0 dB`, *Release* `60 ms` để bảo vệ tai người nghe không bị giật mình.
3. Kênh Micro đàm thoại của Streamer: Nên đặt mức $-1.0\text{ dB}$ để giọng nói của người phát trực tiếp luôn nổi bật hơn tiếng nhạc thiền và tiếng mõ.
4. **Cấu hình Giám Sát Âm Thanh (Audio Monitoring Configuration)**:
   - Trong khung **Audio Mixer**, nhấp biểu tượng bánh răng bất kỳ $\rightarrow$ Chọn **Advanced Audio Properties (Thuộc tính âm thanh nâng cao)**.
   - Tìm đến dòng nguồn `ChanhDien_Overlay` và cài đặt mục **Audio Monitoring**:
     - **Monitor and Output (Giám sát và đầu ra)**: Chọn chế độ này nếu streamer đeo tai nghe kiểm âm và muốn trực tiếp nghe thấy tiếng chuông, mõ, nhạc thiền và giọng xướng tên TTS trong khi đang livestream. *(Cảnh báo quan trọng: Khi chọn chế độ này, phải đảm bảo thiết bị thu âm Desktop Audio không thu lại tai nghe để tránh hiện tượng dội âm/vọng tiếng đôi — Echo/Feedback Loop trên sóng phát trực tiếp)*.
     - **Monitor Off (Tắt giám sát)**: Chọn chế độ này nếu streamer không cần nghe âm thanh trong tai nghe (hoặc đã nghe qua kênh âm thanh máy tính riêng), âm thanh sẽ được gửi thẳng 100% lên sóng livestream của người xem mà không phát ra loa/tai nghe nội bộ.

---

### 4.4. Cấu Hình Tăng Tốc Phần Cứng & Cờ Khởi Động (Hardware Acceleration Flags)

1. Trong OBS Studio, vào **Settings** $\rightarrow$ **Advanced (Nâng cao)** $\rightarrow$ Mục **Sources**:
   - Tích chọn: `[X] Enable Browser Source Hardware Acceleration` (Kích hoạt tăng tốc phần cứng cho trình duyệt).
2. Đối với máy tính phát live chuyên dụng có card đồ họa rời NVIDIA RTX / AMD Radeon:
   - Có thể thêm tham số dòng lệnh khi khởi chạy OBS để tối ưu hóa đồng bộ khung hình:
     ```text
     obs64.exe --disable-gpu-vsync --enable-zero-copy
     ```

---

## 5. BẢNG MA TRẬN PHÂN TÍCH RỦI RO KỸ THUẬT & BIỆN PHÁP GIẢM THIỂU (RISK MATRIX)

| Mã | Nguy cơ kỹ thuật | Mức độ tác động | Khả năng xảy ra | Biện pháp phòng ngừa & Giảm thiểu chi tiết |
|---|---|:---:|:---:|---|
| **R-01** | **TikTok chặn IP (Rate Limit / Captcha 429)** | **Cao** | Trung bình | 1. Chạy ứng dụng trên IP mạng dân cư thật của streamer (Viettel/VNPT/FPT).<br>2. Cung cấp sẵn Cookie phiên đăng nhập thật (`sessionId`, `tt-target-idc`).<br>3. Tích hợp sẵn bộ điều hợp proxy dân cư xoay vòng (`hpagent`). |
| **R-02** | **Thay đổi Webcast Protobuf hoặc Signing Server** | **Rất Cao** | Thấp - TB | 1. Cố định phiên bản thư viện `tiktok-live-connector`.<br>2. Hỗ trợ fallback linh hoạt sang EulerStream Signing API.<br>3. Tách biệt kiến trúc Tầng 1: Nếu TikTok đổi schema, chỉ cần sửa 1 file Adapter duy nhất mà không ảnh hưởng State và Overlay. |
| **R-03** | **Đứt kết nối mạng giữa chừng buổi livestream** | **Trung bình** | **Cao** | 1. Thuật toán tự kết nối lại Exponential Backoff with Jitter ($2\text{s} \rightarrow 30\text{s}$).<br>2. Duy trì toàn bộ bộ nhớ trạng thái: Không xóa bàn thờ, không xóa bảng công đức khi mất mạng tạm thời.<br>3. Watchdog 15 giây tự động phát hiện socket đóng băng và tái kích hoạt. |
| **R-04** | **Tràn bộ nhớ CEF gây crash OBS (Aw, Snap!)** | **Rất Cao** | Thấp | 1. Canvas 2D sử dụng Object Pooling: Tái sử dụng mảng 100 hạt, không tạo object mới.<br>2. Avatar LRU Cache: Giới hạn tối đa 150 avatar gần nhất trong bộ nhớ.<br>3. DOM ảo hóa: Tuyệt đối không sinh thêm thẻ `<div>` khi có sự kiện chat. |
| **R-05** | **Nghẽn hàng đợi TTS khi có bão quà tặng combo** | **Cao** | **Cao** | 1. Kiểm tra cờ `repeatEnd === true` cho quà combo (gộp 50 hoa hồng thành 1 câu xướng danh).<br>2. Hàng đợi ưu tiên 3 cấp (Priority Queue) giới hạn trần tối đa 10 câu, tự động hủy câu kinh cũ.<br>3. Sinh Data URI trực tiếp trong RAM, triệt tiêu $100\%$ độ trễ I/O ghi đĩa cứng. |
| **R-06** | **Spam bình luận tục tĩu, phá hoại tôn nghiêm** | **Cao** | **Cao** | 1. Bộ lọc Regex Blacklist tiếng Việt tự động loại bỏ bình luận bẩn tại Tầng 2.<br>2. Tên tài khoản nhạy cảm tự động đổi thành *"Phật tử hữu duyên"*.<br>3. Nút Kick và Trục xuất tức thì từ Admin Dashboard. |
| **R-07** | **Mã chèn Watermark ngầm từ repo tham khảo gốc** | **Trung bình** | **Đã xử lý** | Đã loại bỏ hoàn toàn mảng mã hóa `_q` tại dòng 328-335 của repo gốc. Toàn bộ mã nguồn Canvas 2D được viết mới minh bạch 100%. |

---

## 6. KỊCH BẢN VẬN HÀNH PHÒNG LIVE HÀNG NGÀY (DAILY OPERATING WORKFLOW)

Quy trình chuẩn hóa 6 bước dành cho Streamer hoặc Ban Quản Trị phòng live:

```
[BƯỚC 1: BẬT MÁY CHỦ]
Chạy terminal: npm start trong thư mục app-live.
Kiểm tra thông báo: Server sẵn sàng tại cổng 3000.
        │
        ▼
[BƯỚC 2: MỞ BẢNG ĐIỀU KHIỂN QUẢN TRỊ]
Mở trình duyệt (Chrome/Edge trên màn hình phụ hoặc iPad):
Truy cập: http://127.0.0.1:3000/live/control.html.
        │
        ▼
[BƯỚC 3: MỞ OBS STUDIO & KIỂM TRA OVERLAY]
Mở OBS Studio, chọn Scene "Chánh Điện Tịnh Tâm LIVE".
Nhìn bảng Audio Mixer: Xác nhận kênh ChanhDien_Overlay đang ở mức -3.0 dB.
        │
        ▼
[BƯỚC 4: TỔNG DUYỆT TRƯỚC GIỜ PHÁT SÓNG (REHEARSAL)]
Tại Admin Dashboard:
- Bấm "Thỉnh chuông": Kiểm tra tiếng chuông ngân và hào quang bừng sáng.
- Bấm "Gõ mõ": Kiểm tra nhịp mõ metronome 52 BPM đều đặn.
- Bấm "Đổ 15 người mẫu": Kiểm tra lưới bồ đoàn và hoạt ảnh lạy chầu.
- Bấm "Dọn sạch" để đưa chánh điện về trạng thái thanh tịnh.
        │
        ▼
[BƯỚC 5: PHÁT SÓNG & KẾT NỐI TIKTOK LIVE]
1. Trên điện thoại hoặc TikTok LIVE Studio: Bấm GO LIVE.
2. Tại Admin Dashboard: Nhập @username kênh của bạn -> Bấm [ KẾT NỐI ].
3. Đèn báo chuyển màu XANH LÁ [ TikTok: CONNECTED ✓ ].
        │
        ▼
[BƯỚC 6: ĐỒNG HÀNH TRỰC TUYẾN]
Streamer an tâm giảng pháp hoặc niệm Phật:
- Hệ thống tự động đón tiếp Phật tử mới bước vào bồ đoàn.
- Tự động xướng tên hồi hướng công đức khi có dâng cúng quà tặng.
- Tự động duy trì nhịp tụng niệm và gõ mõ thanh tịnh suốt buổi lễ.
```
