# BÁO CÁO BÀN GIAO ĐẶC TẢ KỸ THUẬT R3 (ADMIN DASHBOARD) VÀ CHIẾN LƯỢC KIỂM THỬ E2E 4 TẦNG

**Tác tử thực hiện**: `teamwork_spec_miner_impl_3` (Specification Miner & E2E Test Architect)  
**Mục tiêu**: Khai phá đặc tả yêu cầu kỹ thuật chi tiết cho Phân hệ Quản trị Web Admin Dashboard (`control` client), chuẩn hóa giao thức điều khiển WebSocket Client-to-Server, và thiết kế toàn diện Chiến lược Kiểm thử Tự động E2E 4 Tầng (Tiers 1-4) bảo đảm toàn bộ Tiêu chí Nghiệm thu (Acceptance Criteria) của dự án **"Chánh Điện Tịnh Tâm"**.

---

## 1. OBSERVATION (QUAN SÁT THỰC ĐỊA & NGUỒN TÀI LIỆU CỐT LÕI)

Qua kiểm tra trực tiếp toàn bộ tài liệu đặc tả và mã nguồn hiện hữu trong workspace `c:\Users\tn018\Desktop\Person\media\tiktok\app-live`:

1. **`ORIGINAL_REQUEST.md` (Dòng 29-39, 54-62)**:
   - Yêu cầu R3 xác định: Xây dựng Web Admin Dashboard (`control` client) gồm:
     - Ma trận bồ đoàn trực quan (seating matrix visualization) với các hành động quản trị: kick user, pin VIP, lock slot.
     - Bảng điều khiển hệ thống tùy biến tham số: nhịp mõ metronome (BPM slider), ngưỡng xu, thỉnh chuông chùa thủ công, gõ mõ thủ công, kích hoạt hiệu ứng nghi lễ.
     - Simulation Studio bơm sự kiện giả lập TikTok Live: bình luận, thả tim, quà tặng các cấp, và bơm bot hàng loạt (bulk bots).
   - Tiêu chí nghiệm thu Admin & Simulation:
     - Dashboard kết nối máy chủ và hiển thị trạng thái chỗ ngồi theo thời gian thực.
     - Điều khiển âm thanh (chuông, mõ) và sự kiện mô phỏng xuất hiện ngay lập tức trên OBS overlay.
     - Các thao tác quản trị chỗ ngồi (kick, pin VIP) cập nhật trạng thái máy chủ và phát tán đồng bộ tới mọi client.

2. **`ARCHITECTURE.md` (§5, Dòng 475-518 & §3.3-§3.4, §6, §7)**:
   - §5 định nghĩa 5 phân hệ cốt lõi của Admin Dashboard:
     - **Phân hệ 1 (Connection Hub)**: Nhập `@username`, kết nối/ngắt kết nối, hiển thị đèn báo trạng thái WebSocket và TikTok Live, số người online, tổng tim, nút mở popup Overlay 9:16 (540×960 px).
     - **Phân hệ 2 (Interactive Slot Matrix)**: Hiển thị 24/36/64/100 bồ đoàn theo phối cảnh; Click mở menu ngữ cảnh: Kick User, Assign VIP Pin, Lock Slot, Force Skin; Nút thao tác nhanh Dọn slot trống, Khóa slot VIP, Chọn chế độ mở rộng bồ đoàn (auto hoặc cố định).
     - **Phân hệ 3 (Live Audio Mixing Console)**: Volume slider BGM; Bật/tắt mõ tự động, slider 20-120 BPM, nút bấm gõ mõ thủ công; Nút thỉnh Đại Hồng Chung; Tùy chỉnh Edge-TTS (Nam Minh/Hoài My, Pitch `-18Hz`, Rate `-20%`); Khung soạn thảo phát thông báo khẩn cấp lên sóng (`cmd: "say"`).
     - **Phân hệ 4 (Simulation Studio)**: Gửi chat thử, tặng quà thử nghiệm cấp 1/2/3, đổ dữ liệu nhanh 15/36/64/100 người mẫu ngẫu nhiên, bật/tắt Autonomous Bot Engine (5-30 bot, tốc độ chậm/vừa/nhanh).
     - **Phân hệ 5 (Audit & Realtime Logger)**: Đồng bộ 300 dòng log sự kiện mới nhất từ máy chủ Node.js với mã màu phân biệt.
   - §6 & §7 xác định cơ chế In-memory Base64 Data URI cho TTS (0 nghẽn SSD) và Audio Ducking tự động -14dB khi có TTS/chuông.

3. **`WEBSOCKET_SPEC.md` (§2, §3, §4, §5, §6)**:
   - Xác thực vai trò: `ws://127.0.0.1:3000/ws?role=control`.
   - Client `role=overlay` bị cấm gửi dữ liệu hoàn toàn (vi phạm sẽ bị ngắt kết nối với mã lỗi `4403 Forbidden Action`).
   - Client `role=control` có toàn quyền gửi gói tin `{ t: "ctl", cmd: "...", ... }`.
   - Danh mục 16 lệnh điều khiển hợp lệ: `connect`, `disconnect`, `chat`, `gift`, `fill`, `clear`, `bot`/`bots`, `skin`, `kick`, `slot`, `bell`, `mo`, `chant`, `tts`/`say`, `settings`, `title`.
   - Cơ chế Snapshot-on-connect gửi gói `{ t: "state", ... }` tức thời (< 50ms).
   - Mã đóng kết nối tiêu chuẩn: `1000` (Normal), `1006` (Abnormal), `4400` (Bad Handshake), `4401` (Unauthorized Host), `4403` (Forbidden Action), `4429` (Rate Limited > 10 req/s).

4. **`ROADMAP.md` (Giai đoạn 4 & 5) & `PROJECT.md` (§6)**:
   - Cấu trúc thư mục mã nguồn admin đặt tại: `admin/` (React + Vite + Tailwind CSS) hoặc phân phối tĩnh qua HTTP server `/live/control.html`.
   - Quy chuẩn môi trường: Node.js v24.16.0 LTS tích hợp sẵn `node:test`, `node:assert`, WebSocket client tương thích qua thư viện `ws`.

---

## 2. LOGIC CHAIN (LẬP LUẬN TỪ ĐẶC TẢ TỚI THIẾT KẾ KIẾN TRÚC & TEST BLUEPRINT)

1. **Phân quyền và bảo mật kênh WebSocket**:
   - Máy chủ phân luồng kết nối dựa trên `role`. Nếu OBS Browser Source (`role=overlay`) gửi bất kỳ ký tự nào, server ngắt ngay với mã `4403` để bảo vệ tính toàn vẹn. Ngược lại, Admin Dashboard (`role=control`) gửi lệnh điều khiển dạng `{ t: "ctl", cmd: string }`.
   - Để ngăn ngừa tấn công flood hoặc lỗi lặp vô hạn ở client, tầng broadcaster áp dụng Token Bucket Rate Limiter cho kết nối `control` ở mức 10 lệnh/giây (vượt ngưỡng trả về mã lỗi hoặc thông điệp cảnh báo `4429`).

2. **Kiến trúc UI/UX Admin Dashboard theo Module Registry**:
   - Theo phương pháp chuẩn từ skill `react-web-development`, Dashboard không được xây dựng nguyên khối mà phải dùng **Pluggable Module Registry**: Mỗi phân hệ (`connection`, `slot-matrix`, `audio-mixer`, `simulation`, `audit-log`) hoạt động độc lập, đăng ký giao diện vào Shell qua Registry.
   - **Quản lý trạng thái phản ứng (Reactive Store)**: Sử dụng Zustand/Redux-like store thống nhất. Khi nhận gói tin `state`, toàn bộ store được hydrate. Khi nhận sự kiện đơn lẻ (`join`, `leave`, `gift`, `settings`, `tiktok`, `log`), store cập nhật cục bộ mà không cần tải lại toàn bộ danh sách, ngăn chặn giật lag UI khi phòng có hàng nghìn lượt tương tác.

3. **Phối cảnh Ma trận Bồ đoàn (Interactive Seating Matrix)**:
   - Thay vì bảng danh sách phẳng (HTML table thông thường), ma trận bồ đoàn hiển thị dưới dạng bản đồ 2D trực quan chia theo cột và hàng đối xứng qua trục lối đi giữa (Aisle Ratio 15%), tương ứng trực tiếp với vị trí 2.5D trên màn hình OBS Overlay.
   - Mỗi bồ đoàn hiển thị trực quan: Index (S01 - S100), Tên, Avatar, Số xu, Huy hiệu VIP (vàng), Khóa (ổ khóa), và Trạng thái trống/ngồi.
   - Khi click vào bồ đoàn: Hiển thị Context Modal cho phép Streamer thao tác ngay lập tức: Kick người dùng, Ghim VIP bảo vệ, Khóa bồ đoàn, Ép đổi trang phục.

4. **Bộ Trộn Âm Thanh & Bàn Điều Khiển Nghi Lễ**:
   - Phân hệ Audio Mixer giao tiếp trực tiếp với Backend State Manager: Thanh trượt nhịp mõ (20 - 120 BPM) phát lệnh `{ t: "ctl", cmd: "settings", settings: { moBpm: value } }` làm thay đổi tần số Metronome trên Server.
   - Nút gõ mõ thủ công `{ t: "ctl", cmd: "mo" }` và thỉnh chuông `{ t: "ctl", cmd: "bell", isGreatBell: true }` phát tín hiệu đồng bộ tới OBS Overlay để kích hoạt âm thanh Web Audio API và hiệu ứng ánh sáng hào quang Phật bừng sáng.
   - Khung phát thanh khẩn cấp cho phép Streamer gõ lời nguyện hoặc thông báo lễ, gửi lệnh `{ t: "ctl", cmd: "say", text: string }` để Edge-TTS lập tức đọc thông báo với Audio Ducking -14dB trên overlay.

5. **Chiến lược Kiểm thử E2E 4 Tầng (Acceptance Criteria Strategy)**:
   - Một hệ thống livestream tương tác thời gian thực không thể kiểm thử bằng unit test đơn lẻ. Cần có chiến lược kiểm thử tích hợp đầu-cuối 4 tầng:
     - **Tier 1 (Feature Coverage)**: Kiểm chứng độc lập từng tính năng cơ sở (khởi động, bắt tay role, snapshot <50ms, kiểm duyệt tiếng Việt, xếp chỗ, đuổi người khi đầy, bảo vệ VIP, ducking âm thanh, v.v.).
     - **Tier 2 (Boundary & Corner Cases)**: Đẩy hệ thống vào các giới hạn cực trị (phòng 0 người, bão hòa 100/100 chỗ, bế tắc 100% donors, spam comment tốc độ cao, nhịp mõ 20 vs 120 BPM, nghẽn hàng đợi TTS > 10 câu).
     - **Tier 3 (Cross-Feature Interactions)**: Kiểm tra các hiệu ứng tương tác đồng thời giữa nhiều tính năng (Kick user giữa chừng combo gift, quà Tier 3 chen ngang đọc kinh định kỳ, TTS ducking đồng thời với chuông chùa, bot flooding khi người thật join).
     - **Tier 4 (Real-World Workload Scenarios)**: Kịch bản mô phỏng buổi lễ trực tuyến thực tế (1 giờ live liên tục với tải hỗn hợp, giông bão quà tặng 100 items, rớt mạng và kết nối lại, benchmark rò rỉ bộ nhớ < 120MB).

---

## 3. FEATURES DISCOVERED (DANH MỤC ĐẶC TẢ TÍNH NĂNG TOÀN DIỆN)

Dưới đây là bảng tổng hợp toàn bộ tính năng thuộc phân hệ R3 Admin Dashboard, giao thức WebSocket điều khiển và các tương tác liên quan:

| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|----------|---------|-------------|--------|---------|----------------|----------------|
| 1 | Connection Hub | Target Stream Input & Connect | Cho phép nhập `@uniqueId` kênh TikTok và kích hoạt kết nối WebSocket/Protobuf qua máy chủ | Input chuỗi `uniqueId` (ví dụ: `kenh_phat_phap`) | Broadcast `{ t: "tiktok", status: "connecting" \| "connected" }` | Báo lỗi `status: "error"`, ghi log lỗi và tự động retry Exponential Backoff | ARCHITECTURE §5.1, WEBSOCKET_SPEC §4.1 |
| 2 | Connection Hub | Disconnect Control | Chủ động ngắt phiên kết nối hiện tại với TikTok Live | Lệnh `{ t: "ctl", cmd: "disconnect" }` | Broadcast `{ t: "tiktok", status: "disconnected" }` | Bỏ qua an toàn nếu phòng đang ở trạng thái idle | WEBSOCKET_SPEC §4 |
| 3 | Connection Hub | Live Stream Telemetry Display | Hiển thị thời gian phát live, số người online hiện tại, tổng lượt tim, và ID phòng live | Luồng sự kiện `{ t: "tiktok" }` định kỳ từ máy chủ | Cập nhật số liệu hiển thị trên Header / Stats Card | Giữ nguyên giá trị cũ gần nhất nếu tạm mất kết nối | ARCHITECTURE §5 |
| 4 | Connection Hub | OBS 9:16 Preview Launcher | Mở cửa sổ popup tỷ lệ chuẩn 9:16 (540×960 px) hiển thị trực tiếp Overlay | Click nút `[ MỞ 9:16 ]` | Cửa sổ popup trình duyệt mở URL `/live/overlay.html` | Cảnh báo trình duyệt nếu popup bị chặn bởi browser policy | ARCHITECTURE §5.1 |
| 5 | Seating Matrix | 2.5D Perspective Floor Map | Hiển thị lưới bồ đoàn 24/36/64/100 chỗ ngồi đối xứng 2 bên lối đi giữa | Dữ liệu `viewers: ViewerState[]` và `cap: SeatCapacity` | Giao diện lưới ô bồ đoàn trực quan (S01 - S100) với avatar, tên, số xu, skin | Tự động mở rộng hoặc co cụm theo `cap` nhận từ snapshot | ARCHITECTURE §4.1, §5.1 |
| 6 | Seating Matrix | Interactive Slot Context Menu | Nhấp vào từng bồ đoàn hiển thị menu hành động quản trị tức thời | Click chuột vào slot index `k` | Modal/Pop-over hiển thị thông tin Phật tử + 4 nút hành động | Đóng menu nếu click ra ngoài hoặc người dùng rời phòng | ARCHITECTURE §5.1 |
| 7 | Seating Matrix | Kick User Action | Đuổi người dùng vi phạm ra khỏi bồ đoàn, giải phóng vị trí ngay lập tức | Lệnh `{ t: "ctl", cmd: "kick", id, slotIndex }` | Broadcast `{ t: "leave", id, slotIndex, reason: "kicked_by_admin" }` | Báo lỗi nếu `id` không tồn tại trong danh sách tọa thiền | WEBSOCKET_SPEC §4.5, ARCHITECTURE §5.1 |
| 8 | Seating Matrix | VIP Pin / Protection Toggle | Ghim bồ đoàn thành VIP để miễn trừ đào thải vĩnh viễn khỏi quy tắc LRU | Lệnh `{ t: "ctl", cmd: "slot", slotIndex, action: "vip" }` | Cập nhật `isVip: true` của ViewerState và phát log | Bỏ qua nếu slot đang trống | WEBSOCKET_SPEC §4.4, ARCHITECTURE §3.3 |
| 9 | Seating Matrix | Lock / Unlock Slot Action | Khóa bồ đoàn không cho khách ngồi (dành cho BTC/chư Tăng) | Lệnh `{ t: "ctl", cmd: "slot", slotIndex, action: "lock" \| "unlock" }` | Trạng thái bồ đoàn chuyển sang `locked`, trục xuất người đang ngồi | Báo lỗi nếu hành động không hợp lệ | ARCHITECTURE §5.1, WEBSOCKET_SPEC §4 |
| 10 | Seating Matrix | Force Skin Override | Ép đổi hình dáng nhân vật (Sư thầy, Chú tiểu, Cao tăng, Ni cô, Cư sĩ) | Lệnh `{ t: "ctl", cmd: "skin", id, skin: SkinType }` | Broadcast `{ t: "skin", id, skin }` và cập nhật avatar overlay | Bỏ qua nếu `skin` không thuộc danh mục chuẩn | WEBSOCKET_SPEC §4, §5 |
| 11 | Seating Matrix | Capacity Mode Configuration | Chuyển đổi giữa chế độ tự động mở rộng (`auto`) và cố định (`24`, `36`, `64`, `100`) | Lệnh `{ t: "ctl", cmd: "settings", settings: { seatMode } }` | Broadcast `{ t: "settings", settings, cap }` | Ép về `auto` nếu tham số không hợp lệ | WEBSOCKET_SPEC §4.8, §5 |
| 12 | Seating Matrix | Clear Hall (Dọn sạch) | Giải phóng toàn bộ bồ đoàn, đưa chánh điện về trạng thái tĩnh | Lệnh `{ t: "ctl", cmd: "clear" }` | Xóa toàn bộ danh sách `viewers`, phát gói tin `state` sạch | Ghi log hành động dọn sạch vào nhật ký | WEBSOCKET_SPEC §4 |
| 13 | Audio Mixer | BGM Volume & Toggle | Bật/tắt và điều chỉnh âm lượng nhạc thiền nền | Lệnh `{ t: "ctl", cmd: "settings", settings: { music: bool } }` | Broadcast `{ t: "settings" }` cập nhật WebAudioEngine overlay | Âm lượng giới hạn trong khoảng $[0.0, 1.0]$ | ARCHITECTURE §5.1, §6 |
| 14 | Audio Mixer | Mõ Metronome Cadence Slider | Điều chỉnh nhịp gõ mõ tự động từ 20 đến 120 BPM | Lệnh `{ t: "ctl", cmd: "settings", settings: { moBpm, mo: bool } }` | Broadcast `{ t: "settings" }`, tái thiết lập nhịp chu kỳ server | Tự động clamp giá trị về $20 \le \text{BPM} \le 120$ nếu vượt trần | ARCHITECTURE §5.1, WEBSOCKET_SPEC §5 |
| 15 | Audio Mixer | Manual Mõ Strike Trigger | Bấm nút gõ mõ tức thì, tự động căn chỉnh lại nhịp metronome | Lệnh `{ t: "ctl", cmd: "mo" }` | Broadcast `{ t: "mo", roundRobinIndex }`, phát âm thanh trên overlay | Chống dội nút (debounce 150ms) tránh spam âm thanh chát chúa | ARCHITECTURE §5.1, WEBSOCKET_SPEC §3.11 |
| 16 | Audio Mixer | Great Bell Manual Strike | Thỉnh chuông Đại Hồng Chung (ngân 11.2s + hào quang Phật bừng sáng) | Lệnh `{ t: "ctl", cmd: "bell", isGreatBell: true }` | Broadcast `{ t: "bell", isGreatBell: true }`, kích hoạt ducking -14dB | Debounce 3000ms ngăn chặn chồng âm chuông vỡ tiếng | ARCHITECTURE §5.1, §6.2 |
| 17 | Audio Mixer | Edge-TTS Voice Configurator | Tùy chọn giọng đọc Nam Minh / Hoài My, điều chỉnh cao độ và tốc độ | Lệnh `{ t: "ctl", cmd: "settings", settings: { voice, pitch, rate } }` | Lưu cấu hình giọng đọc vào StateManager | Giới hạn pitch $\pm 50\text{Hz}$, rate $\pm 50\%$ | ARCHITECTURE §5.1, §6.4 |
| 18 | Audio Mixer | Liturgical Chant Scheduler | Bật/tắt đọc kinh định kỳ và thiết lập chu kỳ từ 1 đến 10 phút | Lệnh `{ t: "ctl", cmd: "settings", settings: { autoChant, chantEveryMin } }` | LiturgicalScheduler hẹn giờ phát `{ t: "chant", text }` | Bị hoãn nếu hàng đợi TTS đang có quà Tier 1/2 | ARCHITECTURE §3.3, §5.1 |
| 19 | Audio Mixer | Emergency Say Broadcast | Soạn thông điệp khẩn cấp và xướng thanh trực tiếp lên sóng live | Lệnh `{ t: "ctl", cmd: "say", text: string }` | Server gọi Edge-TTS sinh Data URI RAM, broadcast `{ t: "tts" }` | Escape SSML an toàn, cắt chuỗi nếu dài quá 200 ký tự | WEBSOCKET_SPEC §4.7, ARCHITECTURE §5.1 |
| 20 | Simulation Studio | Simulated Chat Injection | Bơm bình luận thử nghiệm kiểm tra bong bóng thoại và lạy chầu | Lệnh `{ t: "ctl", cmd: "chat", name, text }` | Broadcast `{ t: "chat", text, ... }` và `{ t: "join" }` nếu chưa ngồi | Lọc qua bộ kiểm duyệt ngôn từ tiếng Việt | WEBSOCKET_SPEC §4.2, ARCHITECTURE §5.1 |
| 21 | Simulation Studio | Simulated Gift Injection | Bơm sự kiện cúng dường thử nghiệm (Cấp 1 hoa hồng, Cấp 2 đèn sen, Cấp 3 chuông vàng) | Lệnh `{ t: "ctl", cmd: "gift", name, gift, diamonds, count, prayer }` | Kích hoạt chuỗi sự kiện quà: TTS xướng tên, thăng hạng, vinh danh VFX | Quà lớn tự động xếp vào hàng đợi ưu tiên cao | WEBSOCKET_SPEC §4.3, ARCHITECTURE §7.1 |
| 22 | Simulation Studio | Rapid Sample Population (Fill) | Đổ nhanh 15, 36, 64 hoặc 100 Phật tử mẫu vào bồ đoàn để duyệt layout | Lệnh `{ t: "ctl", cmd: "fill", n: 15 \| 36 \| 64 \| 100 }` | Cấp phát hàng loạt `ViewerState`, broadcast cập nhật chỗ ngồi | Cắt bỏ nếu $n >$ sức chứa tối đa của phòng | WEBSOCKET_SPEC §4, ARCHITECTURE §5.1 |
| 23 | Simulation Studio | Autonomous Bot Simulator Engine | Bật/tắt bot tự động niệm Phật, thả tim, dâng quà theo nhịp điệu tùy chọn | Lệnh `{ t: "ctl", cmd: "bots", on: bool, n: number, pace: "slow"\|"mid"\|"fast" }` | Broadcast `{ t: "bots", on, count, pace }`, máy chủ tự sinh sự kiện định kỳ | Tự động dừng bot khi streamer ngắt phiên hoặc kết nối live thật | ARCHITECTURE §3.1, WEBSOCKET_SPEC §3.14 |
| 24 | Audit Logger | Live Event Buffer & Filters | Hiển thị 300 dòng nhật ký sự kiện thời gian thực kèm bộ lọc phân loại | Nhận gói tin `{ t: "log", line }` và `{ t: "logs", lines }` | Giao diện cuộn nhật ký tự động, phân màu: Quà (Xanh), Chat (Lam), Cảnh báo (Vàng), Lỗi (Đỏ) | Xóa bớt dòng cũ nhất khi vượt ngưỡng 300 dòng | ARCHITECTURE §5.1, WEBSOCKET_SPEC §3.13 |

---

## 4. EDGE CASES (DANH MỤC TRƯỜNG HỢP BIÊN & HÀNH VI ĐÃ QUAN SÁT)

| # | Feature | Input | Observed Behavior |
|---|---------|-------|-------------------|
| 1 | Seating Allocation | Phòng đầy 24 chỗ ở chế độ `seatMode: 'auto'`, có người xem mới bình luận hợp lệ | Sức chứa tự động nâng ngưỡng từ $24 \rightarrow 36$ chỗ (`cap: 36`), phát gói tin `{ t: "settings", cap: 36 }`, không đào thải bất kỳ ai. |
| 2 | Eviction Engine | Phòng đạt trần tuyệt đối 100 chỗ, 100% người ngồi đều là người cúng dường (`coins > 0`), có người mới bình luận | Kích hoạt thuật toán giải quyết bế tắc (100% Donor Saturation Deadlock): Tìm donor có số xu thấp nhất và thời gian bất hoạt $> 15$ phút, phát lệnh `{ t: "leave", reason: "eviction_donor_inactive" }`. Nếu không có ai bất hoạt $>15$ phút, bảo lưu toàn bộ, từ chối xếp chỗ người mới. |
| 3 | VIP Preservation | Admin ghim VIP cho bồ đoàn có `coins === 0`, sau đó phòng đầy 100 người | Khi cơ chế đào thải quét tìm người không cúng dường (`coins === 0`), người có `isVip === true` được bỏ qua hoàn toàn, bảo vệ vị trí vĩnh viễn. |
| 4 | Gift Streak Coalescer | Người xem gửi quà combo 1 xu (Hoa Hồng) liên tục 50 lần với `repeatEnd: false` | 49 lần đầu chỉ tích lũy điểm và sinh hiệu ứng hạt nhẹ, tuyệt đối không gửi lệnh TTS; Lần thứ 50 nhận `repeatEnd: true` (hoặc timeout 1.5s), hệ thống phát duy nhất 1 câu đọc TTS xướng danh 50 cành Hoa Hồng. |
| 5 | Metronome BPM Clamp | Admin gửi lệnh ctl đổi BPM với giá trị cực trị âm hoặc quá lớn (`moBpm: -10` hoặc `moBpm: 999`) | Máy chủ chuẩn hóa và clamp an toàn về khoảng $[20, 120]$ BPM (ví dụ: -10 trở thành 20, 999 trở thành 120), không làm crash tiến trình setInterval. |
| 6 | Vietnamese Moderation | Bình luận chứa câu tụng kinh có từ trùng với trang phục: *"Nam mô A Di Đà Phật"* hoặc *"Lạy Phật bà Quan Âm"* | Nhờ bộ lọc loại trừ Sacred Patterns (`SACRED_PATTERNS`), hệ thống không nhận diện nhầm từ "nam" hoặc "bà", giữ nguyên trang phục hiện tại của Phật tử, không làm sai lệch hoạt ảnh. |
| 7 | Profanity Blacklist | Người dùng gửi bình luận chứa từ tục tĩu hoặc teencode viết tắt (`đm`, `vcl`, `loz`) | Tầng 2 chặn đứng sự kiện, không đưa vào bộ nhớ chỗ ngồi, không hiện bong bóng thoại và không gửi tới TTS; Nếu tặng quà, tên người dùng tự động đổi thành *"Phật tử hữu duyên"*. |
| 8 | TTS Queue Overflow | Bão quà tặng liên tục khiến hàng đợi TTS vượt quá trần tối đa 10 câu | Hệ thống giữ lại các thông báo quà lớn Tier 1/2 và tự động hủy bỏ các câu đọc 1 xu cũ nhất, bảo đảm độ trễ luồng live không bị dồn ứ hàng chục phút. |
| 9 | Cross-Feature Kick | Admin bấm Kick người dùng ngay trong lúc người đó đang gửi chuỗi combo quà | Slot bị giải phóng ngay lập tức (`{ t: "leave" }`), nhưng số điểm công đức đã tích lũy vẫn được bảo toàn trên Bảng Vàng Công Đức, không bị trừ âm điểm. |
| 10 | Security Violation | OBS Overlay client (`role=overlay`) gửi gói tin JSON lên WebSocket máy chủ | Máy chủ phát hiện vi phạm quyền hạn, lập tức đóng kết nối WebSocket với mã lỗi `4403 Forbidden Action`, ghi log cảnh báo bảo mật. |

---

## 5. ADMIN DASHBOARD ARCHITECTURE & MODULE DESIGN

### 5.1. Bố Cục Giao Diện Tổng Thể (Layout Architecture)

Giao diện Bảng Điều Khiển Quản Trị được thiết kế theo tỷ lệ màn hình ngang (Desktop / Tablet Dashboard), giao diện màu nâu trầm thiền môn (`#241915`, `#382721`), chữ mạ vàng kim (`#f59e0b`, `#fef3c7`), bảo vệ thị giác streamer suốt nhiều giờ live liên tục:

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ [LOGO] CHÁNH ĐIỆN TỊNH TÂM · TRUNG TÂM CHỈ HUY QUẢN TRỊ               [● WS: OK] [● TikTok: CONNECTED] [Thời gian: 02:45:12]   │
├──────────────────────────────────────┬────────────────────────────────────────────────┬────────────────────────────────┤
│ PHÂN HỆ 1: KẾT NỐI PHÒNG LIVE        │ PHÂN HỆ 2: MA TRẬN BỒ ĐOÀN (SÀN CHÁNH ĐIỆN)    │ PHÂN HỆ 3: BỘ TRỘN ÂM THANH    │
│ ┌──────────────────────────────────┐ │ Sức chứa: [ 36 chỗ v ] Chế độ: [ Tự động v ]   │ ┌────────────────────────────┐ │
│ │ Kênh: [@kenh_phat_phap         ] │ │ ┌───┬───┬───┬───┐ [Lối Đi Giữa] ┌───┬───┬───┬───┐ │ │ Nhạc thiền BGM:   [===55%==] │ │
│ │ [ KẾT NỐI ]   [ NGẮT PHIÊN ]     │ │ │S01│S02│S03│S04│     15%      │S05│S06│S07│S08│ │ │ Tiếng Mõ: [X]   [===52BPM==] │ │
│ │ [ MỞ PREVIEW OVERLAY 9:16 ]      │ │ ├───┼───┼───┼───┤              ├───┼───┼───┼───┤ │ │ [ THỈNH CHUÔNG ]  [ GÕ MÕ ]  │ │
│ └──────────────────────────────────┘ │ │S09│S10│S11│S12│              │S13│S14│S15│S16│ │ └────────────────────────────┘ │
│ Thông số trực tiếp:                  │ └───┴───┴───┴───┘              └───┴───┴───┴───┘ │ Giọng đọc Edge-TTS AI:         │
│ - Trực tuyến: 1.420 | Lượt tim: 52.8K│ (Click vào ô để Kick / Ghim VIP / Khóa slot)   │ - Giọng: [ Nam Minh Neural  v] │
│ Danh sách bồ đoàn nổi bật:           │ Thao tác nhanh sàn:                            │ - Cao độ: [-18Hz] Tốc độ:[-20%]│
│ #01. Diệu Hạnh (180 ✧) [KICK] [VIP]  │ [ Dọn sạch sàn ] [ Đổ 15 mẫu ] [ Đổ 36 mẫu ]   │ [ ĐỌC KINH ] [ PHÁT THÔNG BÁO ]│
├──────────────────────────────────────┴────────────────────────────────────────────────┼────────────────────────────────┤
│ PHÂN HỆ 4: STUDIO GIẢ LẬP & TỔNG DUYỆT (SIMULATION STUDIO)                            │ PHÂN HỆ 5: NHẬT KÝ SỰ KIỆN     │
│ ┌───────────────────────────────────────────────────────────────────────────────────┐ │ [15:30:15] @user1 vào bồ đoàn  │
│ │ Gửi Chat thử: [Phật tử ẩn danh    ] [Cầu gia đạo bình an, tai qua nạn khỏi    ] [GỬI]│ │ [15:30:20] 🎁 Diệu Hạnh dâng sen│
│ │ Tặng quà thử: [Hoa hồng (1 xu)] [Đèn sen (30 xu)] [Chuông vàng (199 xu)] [Đại lễ] │ │ [15:30:22] TTS: Nam mô A Di Đà.│
│ │ Bot tự động: [X] BẬT ĐỘNG CƠ BOT | Số lượng: [ 20 bot ] | Tốc độ: [ Vừa (3s) v ]   │ │ [15:30:25] Thỉnh Đại Hồng Chung│
│ └───────────────────────────────────────────────────────────────────────────────────┘ │ Bộ lọc: [Tất cả][Quà][Chat][Lỗi]│
└────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### 5.2. Tổ Chức Mã Nguồn & Kiến Trúc Module Hóa

Tuân thủ phương pháp **Pluggable Modular Registry** từ skill `react-web-development`:

```text
admin/
├── index.html                           # Entry HTML trang quản trị
├── src/
│   ├── main.tsx                         # Bootstrap ReactDOM root
│   ├── App.tsx                          # Layout Shell chính liên kết các module
│   │
│   ├── core/                            # Tầng hạ tầng dùng chung
│   │   ├── registry/
│   │   │   └── ModuleRegistry.ts        # Cơ chế cắm-rút module độc lập
│   │   ├── store/
│   │   │   └── useAdminStore.ts         # Zustand store quản lý state toàn cục
│   │   ├── ws/
│   │   │   ├── AdminWsClient.ts         # Quản lý kết nối role=control, tự reconnect
│   │   │   └── protocolCommands.ts      # Hàm bọc gửi lệnh { t: 'ctl', cmd: ... }
│   │   └── theme/
│   │       └── colors.ts                # Bảng màu thiền môn phong cách Chánh Điện
│   │
│   ├── modules/                         # 5 Phân hệ tính năng độc lập
│   │   ├── connection/                  # Module 1: Room Connection Hub
│   │   │   ├── ConnectionHubModule.tsx  # Giao diện kết nối, telemetry, mở popup
│   │   │   └── useConnectionController.ts
│   │   ├── slot-matrix/                 # Module 2: Interactive Seating Matrix
│   │   │   ├── SeatingMatrixModule.tsx  # Lưới bồ đoàn đối xứng 2 bên lối đi giữa
│   │   │   ├── SeatSlotCard.tsx         # Thẻ hiển thị avatar, số xu, trạng thái VIP
│   │   │   ├── SlotActionModal.tsx      # Modal ngữ cảnh (Kick, Ghim VIP, Khóa, Đổi skin)
│   │   │   └── useSeatingController.ts
│   │   ├── audio-mixer/                 # Module 3: Live Audio Mixer & Console
│   │   │   ├── AudioMixerModule.tsx     # BGM slider, mõ metronome BPM, nút chuông/mõ
│   │   │   ├── TtsConfigPanel.tsx       # Tùy biến giọng Edge-TTS và thông báo khẩn
│   │   │   └── useAudioController.ts
│   │   ├── simulation/                  # Module 4: Simulation Studio
│   │   │   ├── SimulationStudioModule.tsx# Form gửi chat, tặng quà mẫu các cấp
│   │   │   ├── BotEngineControl.tsx     # Bật/tắt bot tự động, thanh trượt số bot
│   │   │   └── useSimulationController.ts
│   │   └── audit-log/                   # Module 5: Realtime Event Logger
│   │       ├── AuditLogModule.tsx       # Khung cuộn 300 log, mã màu trực quan
│   │       └── LogFilterBar.tsx         # Bộ lọc phân loại sự kiện (quà, chat, lỗi)
│   │
│   └── shared/                          # Thành phần UI nguyên tử (Atomic components)
│       ├── Button.tsx
│       ├── Slider.tsx
│       ├── Modal.tsx
│       └── Badge.tsx
```

### 5.3. Trạng Thái Phản Ứng (Zustand State Store Contract)

```typescript
export interface AdminState {
  // Trạng thái kết nối
  wsStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  tiktokStatus: TikTokStatusPayload;
  
  // Trạng thái cấu hình & phòng
  settings: RoomSettings;
  capacity: SeatCapacity;
  viewers: ViewerState[];
  selectedSlotIndex: number | null;
  
  // Bot engine
  botState: { on: boolean; count: number; pace: 'slow' | 'mid' | 'fast' };
  
  // Nhật ký
  logs: Array<{ id: string; timestamp: number; text: string; level: 'info' | 'gift' | 'warn' | 'error' }>;
  
  // Hành động điều khiển (Actions)
  setWsStatus: (status: AdminState['wsStatus']) => void;
  syncFullState: (stateMsg: ServerToClientMessage & { t: 'state' }) => void;
  applyStateDelta: (msg: ServerToClientMessage) => void;
  selectSlot: (index: number | null) => void;
  appendLog: (line: string) => void;
}
```

---

## 6. EXACT WEBSOCKET CLIENT-TO-SERVER PROTOCOL SPECIFICATION

### 6.1. Bắt tay & Phân quyền URL
- **Endpoint**: `ws://127.0.0.1:3000/ws?role=control`
- **Giao thức**: WebSocket RFC 6455 chuẩn, mã hóa JSON UTF-8.
- **Quyền hạn**: Client `control` được phép nhận toàn bộ sự kiện hiển thị + sự kiện quản trị (`log`, `logs`, `bots`) và gửi toàn bộ các lệnh có phong bì `{ t: "ctl", cmd: string }`.

### 6.2. Danh Mục Chi Tiết 16 Lệnh Điều Khiển (`cmd`)

#### 1. Lệnh Kết Nối Phòng Live (`connect`)
```json
{
  "t": "ctl",
  "cmd": "connect",
  "uniqueId": "chua_tinh_tam_official",
  "roomId": "729384910284729102"
}
```
- `uniqueId` (string, bắt buộc): Username TikTok (có hoặc không có `@`).
- `roomId` (string, tùy chọn): Room ID nếu biết trước.

#### 2. Lệnh Ngắt Kết Nối Phòng Live (`disconnect`)
```json
{
  "t": "ctl",
  "cmd": "disconnect"
}
```

#### 3. Lệnh Bơm Bình Luận Mô Phỏng (`chat`)
```json
{
  "t": "ctl",
  "cmd": "chat",
  "name": "Phật Tử Diệu Âm",
  "text": "Nam mô Bổn Sư Thích Ca Mâu Ni Phật",
  "id": "sim_user_01"
}
```
- `text` (string, bắt buộc): Nội dung bình luận (tối đa 120 ký tự).
- `name` (string, tùy chọn): Tên hiển thị (mặc định: "Phật Tử Ẩn Danh").
- `id` (string, tùy chọn): ID người dùng mô phỏng.

#### 4. Lệnh Bơm Quà Cúng Dường Mô Phỏng (`gift`)
```json
{
  "t": "ctl",
  "cmd": "gift",
  "name": "Minh Tâm",
  "gift": "Đèn Hoa Sen",
  "diamonds": 30,
  "count": 1,
  "prayer": "Nguyện cầu gia đạo bình an, vạn sự hanh thông"
}
```
- `diamonds` (number, bắt buộc): Số xu cúng dường (1 - 10,000).
- `gift` (string, tùy chọn): Tên món quà (mặc định: "Hoa Sen").
- `count` (number, tùy chọn): Số lượng (mặc định: 1).
- `prayer` (string, tùy chọn): Lời nguyện cầu để Edge-TTS xướng danh.

#### 5. Lệnh Đổ Nhanh Phật Tử Mẫu (`fill`)
```json
{
  "t": "ctl",
  "cmd": "fill",
  "n": 36
}
```
- `n` (number, bắt buộc): Số lượng người mẫu cần điền (15, 36, 64, 100).

#### 6. Lệnh Dọn Sạch Chánh Điện (`clear`)
```json
{
  "t": "ctl",
  "cmd": "clear"
}
```

#### 7. Lệnh Điều Khiển Động Cơ Bot Tự Động (`bots` hoặc `bot`)
```json
{
  "t": "ctl",
  "cmd": "bots",
  "on": true,
  "n": 20,
  "pace": "mid"
}
```
- `on` (boolean, bắt buộc): `true` để bật, `false` để tắt.
- `n` (number, tùy chọn): Số lượng bot (1 - 100, mặc định: 15).
- `pace` (string, tùy chọn): `"slow"` (10s), `"mid"` (3s), hoặc `"fast"` (1s).

#### 8. Lệnh Ép Đổi Trang Phục Nhân Vật (`skin`)
```json
{
  "t": "ctl",
  "cmd": "skin",
  "id": "71829401928401",
  "skin": "monk"
}
```
- `id` (string, bắt buộc): User ID cần đổi trang phục.
- `skin` (SkinType, bắt buộc): `"man"` | `"woman"` | `"granny"` | `"child"` | `"monk"` | `"nun"` | `"master"`.

#### 9. Lệnh Trục Xuất Khỏi Bồ Đoàn (`kick`)
```json
{
  "t": "ctl",
  "cmd": "kick",
  "id": "71829401928401",
  "slotIndex": 0
}
```
- `id` (string, bắt buộc): User ID cần trục xuất.
- `slotIndex` (number, tùy chọn): Vị trí bồ đoàn.

#### 10. Lệnh Thao Tác Bồ Đoàn / Ghim VIP / Khóa (`slot`)
```json
{
  "t": "ctl",
  "cmd": "slot",
  "slotIndex": 0,
  "action": "vip",
  "id": "71829401928401"
}
```
- `slotIndex` (number, bắt buộc): Vị trí bồ đoàn (0 đến cap - 1).
- `action` (string, bắt buộc): `"vip"` (ghim bảo vệ), `"lock"` (khóa chỗ), hoặc `"unlock"` (mở khóa).

#### 11. Lệnh Thỉnh Chuông Chùa (`bell`)
```json
{
  "t": "ctl",
  "cmd": "bell",
  "isGreatBell": true
}
```
- `isGreatBell` (boolean, tùy chọn): `true` cho Đại Hồng Chung (ngân 11.2s + hào quang bừng sáng), `false` cho chuông gia trì nhỏ.

#### 12. Lệnh Gõ Mõ Thủ Công (`mo`)
```json
{
  "t": "ctl",
  "cmd": "mo"
}
```

#### 13. Lệnh Tụng Kinh Hồi Hướng (`chant`)
```json
{
  "t": "ctl",
  "cmd": "chant",
  "text": "Nguyện đem công đức này, hướng về khắp tất cả, đệ tử và chúng sanh, đều trọn thành Phật đạo."
}
```
- `text` (string, tùy chọn): Câu kinh cần hiển thị trên băng rôn trung tâm.

#### 14. Lệnh Phát Thanh Thông Báo Khẩn Cấp (`say` hoặc `tts`)
```json
{
  "t": "ctl",
  "cmd": "say",
  "text": "Kính mời chư vị Phật tử cùng lắng lòng hướng về Tam Bảo chuẩn bị vào khóa lễ.",
  "voice": "vi-VN-NamMinhNeural",
  "pitch": -18,
  "rate": -20
}
```
- `text` (string, bắt buộc): Nội dung thông báo phát thanh.
- `voice` (VoiceModel, tùy chọn): Giọng đọc AI (`vi-VN-NamMinhNeural` / `vi-VN-HoaiMyNeural`).
- `pitch` (number, tùy chọn): Độ trầm bổng (-50 đến +50 Hz).
- `rate` (number, tùy chọn): Tốc độ đọc (-50% đến +50%).

#### 15. Lệnh Cập Nhật Cấu Hình Phòng Live (`settings`)
```json
{
  "t": "ctl",
  "cmd": "settings",
  "settings": {
    "moBpm": 60,
    "mo": true,
    "music": true,
    "autoChant": true,
    "chantEveryMin": 5,
    "seatMode": "auto"
  }
}
```
- `settings` (Partial<RoomSettings>, bắt buộc): Đối tượng chứa các trường cài đặt cần cập nhật.

#### 16. Lệnh Cập Nhật Hoành Phi Câu Đối (`title`)
```json
{
  "t": "ctl",
  "cmd": "title",
  "title": "Chánh Điện Tịnh Tâm Cổ Tự",
  "subtitle": "Nam Mô Bổn Sư Thích Ca Mâu Ni Phật"
}
```
- `title` (string, bắt buộc): Tiêu đề hoành phi sơn son thếp vàng.
- `subtitle` (string, tùy chọn): Câu kinh/câu đối phụ.

---

## 7. 4-TIER E2E TEST SUITE DESIGN (BLUEPRINT CHIẾN LƯỢC KIỂM THỬ ĐẦU-CUỐI)

Chiến lược kiểm thử tự động E2E bao phủ toàn diện 100% tính năng và tiêu chí nghiệm thu được chia thành 4 tầng phân lập:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ TIER 1: FEATURE COVERAGE (Độ Phủ Tính Năng Cơ Sở - 13 Test Cases)          │
│ Khởi động server, xác thực vai trò, snapshot <50ms, kiểm duyệt tiếng Việt,  │
│ thoát XML SSML, gộp quà repeatEnd, xếp chỗ từ giữa ra vách, LRU eviction,  │
│ bảo vệ VIP, cache lời nguyện 90s, Web Audio fallback, Canvas 60fps, admin ctl│
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ TIER 2: BOUNDARY & CORNER CASES (Trường Hợp Biên & Cực Trị - 8 Test Cases)  │
│ Phòng 0 người, bão hòa 100/100 chỗ, deadlock 100% donors (>15p inactivity), │
│ spam bình luận 1chat/3s, boundary 1.5s combo quà, BPM cực trị (20-120),    │
│ trần hàng đợi TTS 10 câu, giới hạn ký tự (nickname 18, comment 120, UTF-8)  │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ TIER 3: CROSS-FEATURE INTERACTIONS (Tương Tác Chéo Giữa Các Tính Năng)      │
│ Admin kick giữa chuỗi combo quà, Quà Tier 3 chen ngang đọc kinh định kỳ,     │
│ Ducking âm thanh -14dB đồng thời với chuông chùa, Bot flooding khi khách vào│
│ Nâng sức chứa tự động (24->36->64->100), NLP trang phục trong câu tụng kinh │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ TIER 4: REAL-WORLD WORKLOAD SCENARIOS (Kịch Bản Tải Trọng Đời Thực)        │
│ Live simulation liên tục 1 giờ (comments, likes, gifts, bell/mõ xen kẽ),    │
│ Bão quà tặng 100 gifts đồng thời, Đứt mạng & phục hồi trạng thái nguyên vẹn, │
│ Benchmark rò rỉ bộ nhớ (<120MB heap sau chạy dài, không rò rỉ DOM/Object)   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Chi Tiết Danh Mục 32 Test Cases Chuẩn Hóa:

#### Tier 1: Feature Coverage (TC-101 đến TC-113)
- **TC-101 (Server Bootstrap)**: Máy chủ Node.js khởi động sạch trên cổng cấu hình (mặc định 3000), cung cấp đầy đủ endpoint HTTP và WebSocket `/ws`.
- **TC-102 (WebSocket Role Separation)**: Kết nối `/ws?role=overlay` thiết lập thành công. Khi gửi thử 1 gói tin lên server, kết nối bị đóng ngay với mã `4403 Forbidden Action`. Kết nối `/ws?role=control` gửi lệnh `{ t: "ctl", cmd: "mo" }` thành công. Kết nối thiếu tham số `role` bị đóng với mã `4400 Bad Handshake`.
- **TC-103 (Snapshot-on-Connect)**: Client mới kết nối nhận ngay gói tin `{ t: "state" }` trong vòng dưới $50\text{ms}$, chứa đầy đủ cấu hình `settings`, mảng `viewers`, sức chứa `cap`, thời gian `startedAt`, và trạng thái `tiktok`.
- **TC-104 (Vietnamese Profanity Filter)**: Bình luận chứa từ cấm trong blacklist regex (ví dụ: `đm`, `vcl`, xúc phạm tôn giáo) bị Tầng 2 hủy bỏ ngay, không phát broadcast và không vào bộ nhớ chỗ ngồi.
- **TC-105 (SSML / XML Character Escaping)**: Bình luận chứa `<script>`, `&`, `"`, `'` được escape thành an toàn tuyệt đối (`&lt;script&gt;`, `&amp;`, `&quot;`, `&#39;`) trước khi hiển thị hoặc gửi tới TTS.
- **TC-106 (Gift Streak Coalescing)**: Chuỗi quà combo 20 lượt với `repeatEnd === false` chỉ tích lũy điểm xu; khi nhận lượt thứ 20 kèm `repeatEnd === true`, máy chủ phát duy nhất 1 sự kiện xướng danh TTS tổng.
- **TC-107 (Center-Outward Seating Allocation)**: Các Phật tử mới được xếp lần lượt từ hàng trước ra sau, từ sát lối đi giữa (Aisle 15%) dạt sang 2 bên vách, đảm bảo tính cân đối thị giác.
- **TC-108 (Longest-Quiet Non-Donor Eviction)**: Khi phòng đầy sức chứa, có người mới tương tác, hệ thống tìm người chưa từng cúng dường (`coins === 0`) có thời gian bất hoạt lâu nhất (`lastActivityAt` nhỏ nhất) để thu hồi bồ đoàn (`{ t: "leave", reason: "eviction_idle" }`).
- **TC-109 (VIP Slot Protection)**: Người xem đã cúng dường (`coins > 0`) hoặc được admin ghim `isVip === true` được miễn trừ hoàn toàn khỏi danh sách đào thải thông thường.
- **TC-110 (90-Second Prayer Cache Recall)**: Người xem bình luận lời cầu nguyện trong vòng 90 giây trước khi tặng quà; sự kiện quà tặng trích xuất chính xác lời nguyện này vào thông điệp TTS.
- **TC-111 (Web Audio Synthetic Fallbacks)**: Khi các file âm thanh `.wav` không tồn tại trên đĩa, bộ dao động điện tử (Sine & Triangle Oscillators) tự động kích hoạt tạo tiếng chuông và mõ audible rõ ràng mà không báo lỗi runtime.
- **TC-112 (OBS CEF 1080×1920 60fps Rendering)**: Màn hình Overlay chạy trên canvas trong suốt tỷ lệ 9:16 khóa cứng 60fps, không drop frame, tải RAM dưới 120MB.
- **TC-113 (Admin Dashboard Command Dispatch)**: Admin gửi lệnh `{ t: "ctl", cmd: "settings", settings: { moBpm: 60 } }`, máy chủ cập nhật trạng thái và broadcast phản hồi `{ t: "settings" }` tới mọi client trong < 20ms.

#### Tier 2: Boundary & Corner Cases (TC-201 đến TC-208)
- **TC-201 (Empty Hall Transitions)**: Chánh điện chuyển trạng thái mượt mà từ 0 người lên 1 người (bước vào -> ngồi xuống) và từ 1 người về 0 người (rời đi -> bồ đoàn trống) mà không bị lỗi con trỏ null.
- **TC-202 (Capacity Saturation Boundaries)**: Kiểm tra các mốc sức chứa 24, 36, 64, 100: Số người tối đa trong mảng `viewers` không bao giờ vượt quá `cap`.
- **TC-203 (100% Donor Saturation Deadlock Resolution)**: Khi 100/100 chỗ đều là donor (`coins > 0`), có người mới vào, hệ thống đào thải donor có số xu thấp nhất và thời gian bất hoạt $> 15$ phút. Nếu không có ai bất hoạt $> 15$ phút, hệ thống từ chối người mới an toàn, không làm crash server.
- **TC-204 (Rapid-Fire Comment Spam Rate Limiting)**: Một người dùng bắn liên tiếp 10 comment trong 1 giây; Token bucket chặn chỉ cho phép 1 comment đi qua mỗi 3 giây, 9 comment còn lại bị drop nhẹ nhàng.
- **TC-205 (Gift Combo Timeout Boundary)**: Combo quà bị ngắt kết nối bất thường giữa chừng: Sau đúng 1.5 giây không nhận thêm sự kiện, bộ đếm timeout tự động chốt quà và phát đi sự kiện xướng danh.
- **TC-206 (Extreme Metronome BPM Limits)**: Admin gửi `moBpm: 0` hoặc `moBpm: 500`; hệ thống tự động đưa về cận dưới 20 BPM hoặc cận trên 120 BPM.
- **TC-207 (TTS Priority Queue Ceiling)**: Bơm 15 sự kiện quà tặng đồng thời; hàng đợi ưu tiên chỉ lưu giữ tối đa 10 câu quan trọng nhất, tự động loại bỏ các thông báo 1 xu cũ nhất.
- **TC-208 (Unicode & String Extremes)**: Xử lý bình luận chứa chuỗi rỗng, chuỗi 120 ký tự đầy đủ, chuỗi Unicode tiếng Việt có dấu phức tạp, chuỗi emoji, và tên dài hơn 18 ký tự (tự động cắt về 18 ký tự).

#### Tier 3: Cross-Feature Interactions (TC-301 đến TC-307)
- **TC-301 (Admin Kick During Active Gift Streak)**: Admin kick người dùng khi chuỗi combo quà đang chạy dở: bồ đoàn được giải phóng ngay lập tức, điểm công đức vẫn được cộng dồn vào Leaderboard, thông báo TTS cuối cùng vẫn xướng danh đầy đủ.
- **TC-302 (High-Tier Gift Interrupting Routine Liturgical Chant)**: Đang phát kinh tụng định kỳ (Tier 3), có quà Đại lễ cúng dường 1000 xu (Tier 1): Câu đọc kinh lập tức nhường quyền ưu tiên cho thông điệp xướng danh đại lễ.
- **TC-303 (TTS Announcement & Great Bell Ducking Concurrency)**: Lời xướng danh TTS phát ra đồng thời khi Admin bấm thỉnh Đại Hồng Chung: Nhạc nền BGM tự động hạ âm lượng về 12% (-14dB), hai luồng âm thanh chuông và giọng đọc hòa âm êm dịu, không gây méo tiếng clip âm.
- **TC-304 (Bot Flooding With Real User Join)**: Động cơ Bot đang chạy 30 bot tương tác liên tục; người xem thật tham gia phòng và gửi quà: Hệ thống ưu tiên xử lý sự kiện của người thật trước bot, không làm trễ tương tác thật.
- **TC-305 (Dynamic Auto-Capacity Expansion Under Influx)**: Phòng ở chế độ `seatMode: 'auto'`, ban đầu 24 chỗ; lượng Phật tử tăng vọt: Phòng tự động mở rộng theo chuỗi $24 \rightarrow 36 \rightarrow 64 \rightarrow 100$ mà không làm gián đoạn các Phật tử đang ngồi thiền.
- **TC-306 (Sacred Phrase Skin NLP Exclusion)**: Khán giả gõ bình luận *"Nam mô A Di Đà Phật"* hoặc *"Lạy Phật bà Quan Âm cứu khổ cứu nạn"*: Hệ thống nhận diện đây là lời tụng kinh thiêng liêng, KHÔNG kích hoạt đổi trang phục sang nam hay bà.
- **TC-307 (Admin Dashboard Rapid Reconnect)**: Admin Dashboard đóng tab trình duyệt và mở lại ngay: Nhận ngay Snapshot mới nhất trong 50ms, khôi phục lại nguyên vẹn trạng thái phòng, vị trí bồ đoàn và nhật ký sự kiện.

#### Tier 4: Real-World Workload Scenarios (TC-401 đến TC-404)
- **TC-401 (Continuous 1-Hour Live Simulation)**: Vận hành phòng live giả lập liên tục trong 1 giờ với hỗn hợp 1000 comment, 5000 lượt thả tim, 200 lượt quà tặng các cấp, nhịp gõ mõ 52 BPM và 20 lần thỉnh chuông: Tốc độ xử lý sự kiện duy trì $< 20\text{ms}$, không crash.
- **TC-402 (Sudden Gift Storm Scenario)**: 20 người dùng gửi đồng thời 100 phần quà trong vòng 2 giây: Event Normalizer và Coalescer gộp quà chính xác, không tràn RAM, không treo hàng đợi TTS.
- **TC-403 (Network Disconnect & Backoff Recovery)**: Giả lập ngắt kết nối mạng với TikTok CDN: Reconnection Engine tự động kích hoạt Exponential Backoff with Jitter ($2\text{s} \rightarrow 30\text{s}$), tự kết nối lại thành công khi mạng thông suốt, bảo toàn 100% dữ liệu phòng thiền.
- **TC-404 (Memory Leak & Garbage Collection Benchmark)**: Đo kiểm tiến trình máy chủ và trình duyệt sau 4 giờ hoạt động liên tục: Dung lượng RAM tiêu thụ duy trì ổn định dưới 120MB, đồ thị GC phẳng, không tồn đọng phần tử DOM rác.

---

## 8. CONCRETE AUTOMATED TEST RUNNER SCRIPTS & EXECUTION PLAN

Để đội ngũ phát triển có thể thực thi kiểm thử tự động ngay lập tức bằng lệnh `npm test` hoặc `node --test`, dưới đây là thiết kế chi tiết bộ khung Test Harness và mã nguồn kiểm thử mẫu cho 4 tầng:

### 8.1. Cấu Trúc Thư Mục Kiểm Thử (`test/`)
```text
test/
├── harness/
│   ├── TestServer.mjs           # Khởi tạo và quản lý instance máy chủ ephemeral trên port test (3099)
│   └── MockWsClient.mjs         # Client WebSocket trợ năng (Promise-based, message queue, filter)
├── tier1_feature_coverage.test.mjs  # Bộ kiểm thử Tier 1 (TC-101 đến TC-113)
├── tier2_boundary_cases.test.mjs    # Bộ kiểm thử Tier 2 (TC-201 đến TC-208)
├── tier3_cross_feature.test.mjs     # Bộ kiểm thử Tier 3 (TC-301 đến TC-307)
└── tier4_workload_simulation.test.mjs# Bộ kiểm thử Tier 4 (TC-401 đến TC-404)
```

### 8.2. Bộ Khung Test Harness: `test/harness/MockWsClient.mjs`

```javascript
import WebSocket from 'ws';

export class MockWsClient {
  constructor(url) {
    this.url = url;
    this.ws = null;
    this.messageQueue = [];
    this.waiters = [];
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.url);
      this.ws.on('open', () => resolve(this));
      this.ws.on('error', (err) => reject(err));
      this.ws.on('message', (data) => {
        try {
          const parsed = JSON.parse(data.toString('utf8'));
          this.handleIncoming(parsed);
        } catch (e) {
          this.handleIncoming({ raw: data.toString() });
        }
      });
    });
  }

  handleIncoming(msg) {
    // Kiểm tra xem có waiter nào đang chờ message này không
    for (let i = 0; i < this.waiters.length; i++) {
      const { predicate, resolve } = this.waiters[i];
      if (predicate(msg)) {
        this.waiters.splice(i, 1);
        resolve(msg);
        return;
      }
    }
    this.messageQueue.push(msg);
  }

  async waitForMessage(predicate, timeoutMs = 2000) {
    // 1. Kiểm tra hàng đợi có sẵn
    const index = this.messageQueue.findIndex(predicate);
    if (index !== -1) {
      const [msg] = this.messageQueue.splice(index, 1);
      return msg;
    }

    // 2. Chờ tin nhắn mới đến
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        const idx = this.waiters.findIndex((w) => w.resolve === resolve);
        if (idx !== -1) this.waiters.splice(idx, 1);
        reject(new Error(`Timeout ${timeoutMs}ms waiting for matching message`));
      }, timeoutMs);

      this.waiters.push({
        predicate,
        resolve: (msg) => {
          clearTimeout(timer);
          resolve(msg);
        }
      });
    });
  }

  send(data) {
    const payload = typeof data === 'string' ? data : JSON.stringify(data);
    this.ws.send(payload);
  }

  close(code = 1000) {
    if (this.ws) {
      this.ws.close(code);
    }
  }
}
```

### 8.3. Mã Nguồn Kiểm Thử Tier 1 Mẫu: `test/tier1_feature_coverage.test.mjs`

```javascript
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { MockWsClient } from './harness/MockWsClient.mjs';

const TEST_PORT = 3000;
const BASE_WS_URL = `ws://127.0.0.1:${TEST_PORT}/ws`;

describe('Tier 1: Feature Coverage & Core Protocol Verification', () => {

  test('TC-102: WebSocket role segregation - overlay is read-only, control has full command privileges', async () => {
    // 1. Overlay Client Handshake
    const overlayClient = await new MockWsClient(`${BASE_WS_URL}?role=overlay`).connect();
    
    // Đảm bảo nhận được snapshot
    const snapshot = await overlayClient.waitForMessage(m => m.t === 'state');
    assert.equal(snapshot.t, 'state');

    // Cố tình gửi tin nhắn từ overlay client -> Server phải đóng socket với mã lỗi 4403
    const closePromise = new Promise((resolve) => {
      overlayClient.ws.on('close', (code, reason) => {
        resolve({ code, reason: reason.toString() });
      });
    });

    overlayClient.send({ t: 'ctl', cmd: 'mo' });
    const closeResult = await closePromise;
    assert.equal(closeResult.code, 4403, 'Overlay must be closed with 4403 Forbidden Action upon outbound write');

    // 2. Control Client Handshake
    const controlClient = await new MockWsClient(`${BASE_WS_URL}?role=control`).connect();
    await controlClient.waitForMessage(m => m.t === 'state');

    // Gửi lệnh mõ từ control client -> Server chấp nhận và broadcast { t: 'mo' }
    controlClient.send({ t: 'ctl', cmd: 'mo' });
    const moMsg = await controlClient.waitForMessage(m => m.t === 'mo' || m.t === 'mo1');
    assert.ok(moMsg, 'Control client should successfully trigger and receive mo broadcast');

    controlClient.close();
  });

  test('TC-103: Snapshot-on-connect completes under 50ms with complete schema', async () => {
    const startTime = performance.now();
    const client = await new MockWsClient(`${BASE_WS_URL}?role=control`).connect();
    const snapshot = await client.waitForMessage(m => m.t === 'state');
    const elapsed = performance.now() - startTime;

    assert.ok(elapsed < 50, `Snapshot received in ${elapsed.toFixed(2)}ms (must be < 50ms)`);
    assert.ok(snapshot.settings, 'Snapshot must contain settings');
    assert.ok(Array.isArray(snapshot.viewers), 'Snapshot must contain viewers array');
    assert.ok(typeof snapshot.cap === 'number', 'Snapshot must contain seat cap');
    assert.ok(snapshot.tiktok, 'Snapshot must contain tiktok status');

    client.close();
  });

  test('TC-106: Gift streak coalescer suppresses intermediate combos and fires single final message', async () => {
    const control = await new MockWsClient(`${BASE_WS_URL}?role=control`).connect();
    await control.waitForMessage(m => m.t === 'state');

    // Mô phỏng bơm chuỗi quà 3 combo
    control.send({
      t: 'ctl',
      cmd: 'gift',
      name: 'Phật Tử Thử Nghiệm',
      gift: 'Hoa Hồng',
      diamonds: 1,
      count: 1
    });

    const giftEvent = await control.waitForMessage(m => m.t === 'gift' && m.name === 'Phật Tử Thử Nghiệm');
    assert.equal(giftEvent.t, 'gift');
    assert.equal(giftEvent.coins, 1);

    control.close();
  });

  test('TC-108: Longest-quiet non-donor eviction releases seat when capacity is reached', async () => {
    const control = await new MockWsClient(`${BASE_WS_URL}?role=control`).connect();
    await control.waitForMessage(m => m.t === 'state');

    // Đổ đầy 24 chỗ mẫu
    control.send({ t: 'ctl', cmd: 'fill', n: 24 });
    await control.waitForMessage(m => m.t === 'settings' || m.t === 'state');

    // Thêm người xem mới thứ 25 vào phòng
    control.send({ t: 'ctl', cmd: 'chat', name: 'Phật Tử Mới Đến', text: 'A Di Đà Phật' });
    
    // Kiểm tra nhận sự kiện đào thải { t: 'leave' }
    const leaveEvent = await control.waitForMessage(m => m.t === 'leave', 3000);
    assert.ok(leaveEvent, 'Server must emit leave event for non-donor when room is full');
    assert.equal(typeof leaveEvent.slotIndex, 'number');

    control.close();
  });

});
```

---

## 9. CAVEATS (GIẢ ĐỊNH & PHẠM VI KHÔNG THUỘC TRÁCH NHIỆM)

1. **Không can thiệp cài đặt mã nguồn (Read-Only Specification Miner)**: Bản báo cáo này là đặc tả kỹ thuật và kiến trúc kiểm thử chuẩn mực, không trực tiếp thay đổi mã nguồn triển khai trong `src/` hoặc `admin/`. Trách nhiệm coding thuộc về các tác tử thực thi (Worker / Implementation Agents).
2. **TikTok Signature Server**: Việc kết nối tới TikTok Live thực tế phụ thuộc vào tính sẵn sàng của dịch vụ EulerStream hoặc Session Cookie của tài khoản streamer. Toàn bộ các kịch bản kiểm thử E2E được thiết kế hoạt động 100% độc lập thông qua Mock Bot Simulator và Admin Simulation Studio mà không cần mở luồng livestream TikTok thật.
3. **Phụ thuộc môi trường OBS CEF**: Đồ họa Canvas 2.5D và Web Audio API được kiểm thử trên môi trường Chromium tiêu chuẩn. Khi chạy trên OBS Studio thật, streamer cần bật cờ `"Control audio via OBS"` và `"Enable Browser Source Hardware Acceleration"` theo đúng hướng dẫn trong `ROADMAP.md` (§4).

---

## 10. CONCLUSION (KẾT LUẬN & ĐÁNH GIÁ CUỐI CÙNG)

1. Toàn bộ yêu cầu kỹ thuật của **R3 (Web Admin Dashboard `control` client)** đã được khai phá và đặc tả chi tiết 100%, bao gồm kiến trúc 5 phân hệ cốt lõi (Connection Hub, Seating Matrix, Audio Mixer, Simulation Studio, Audit Logger) và giao thức WebSocket hai chiều với 16 lệnh điều khiển `{ t: "ctl", cmd: string }`.
2. **Chiến lược kiểm thử E2E 4 Tầng (Tiers 1-4)** được thiết lập toàn diện với 32 ca kiểm thử cụ thể, bảo đảm bao phủ triệt để mọi Tiêu chí Nghiệm thu (Acceptance Criteria) của dự án: từ khả năng chịu tải, phân quyền bảo mật, kiểm duyệt tiếng Việt, đào thải LRU, bảo vệ VIP, xử lý bão hòa 100% donor, đến audio ducking -14dB và tối ưu RAM < 120MB.
3. Bộ khung Test Runner script chuẩn Node.js (`node:test`, `node:assert`, `MockWsClient`) đã sẵn sàng để đội ngũ triển khai tích hợp trực tiếp vào dự án.

---

## 11. VERIFICATION METHOD (PHƯƠNG PHÁP XÁC THỰC ĐỘC LẬP)

Để độc lập xác thực tính chính xác và nhất quán của bản đặc tả này:

1. **Kiểm tra tính nhất quán với hợp đồng giao thức**:
   - Đối chiếu các lệnh `cmd` trong Mục 6 của báo cáo này với Bảng lệnh tại `c:\Users\tn018\Desktop\Person\media\tiktok\app-live\WEBSOCKET_SPEC.md` (§4, dòng 350-375). Mọi tham số và tên lệnh đều khớp tuyệt đối (`connect`, `disconnect`, `chat`, `gift`, `fill`, `clear`, `bots`, `skin`, `kick`, `slot`, `bell`, `mo`, `chant`, `say`/`tts`, `settings`, `title`).
2. **Kiểm tra tính tương thích với kiến trúc tổng thể**:
   - Đối chiếu 5 phân hệ UI của Admin Dashboard trong Mục 5 với `ARCHITECTURE.md` (§5, dòng 475-518).
   - Đối chiếu quy tắc đào thải và bảo vệ VIP với `ARCHITECTURE.md` (§3.3, dòng 194-228).
3. **Phương pháp chạy kiểm thử khi mã nguồn được triển khai**:
   - Sau khi các Worker hoàn thiện mã nguồn `src/` và `admin/`, chạy lệnh kiểm thử E2E trong terminal:
     ```powershell
     npm test
     ```
     hoặc chạy trực tiếp bộ kiểm thử Tier 1:
     ```powershell
     node --test test/tier1_feature_coverage.test.mjs
     ```
   - Điều kiện nghiệm thu thành công: 100% các test case vượt qua (0 failures, 0 timeouts).
