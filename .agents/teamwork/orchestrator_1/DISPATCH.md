# Dispatch Log

## 2026-11-01T15:51:16Z
Phân tích kiến trúc hệ thống, xây dựng kế hoạch triển khai kỹ thuật chi tiết và tổng hợp bộ tài nguyên (assets) cho ứng dụng TikTok Interactive Live tương tác chánh điện online ("Chánh Điện Tịnh Tâm") tích hợp trang quản trị.

Working directory: c:\Users\tn018\Desktop\Person\media\tiktok\app-live
Integrity mode: development

## Reference Material
- Mã nguồn tham khảo mở: GitHub kentjuno/chanh-dien-online
- Các tính năng tham chiếu từ giao diện mẫu: Chánh điện ảo (tượng Phật, bàn thờ, các vị trí slot người tham gia với avatar và hoạt ảnh lạy chầu, hoa sen trôi/bay, bong bóng bình luận hiển thị trên đầu nhân vật, bảng công đức vinh danh), trang quản trị (admin dashboard) cấu hình sự kiện và slot lạy, kết nối TikTok Live Connector bắt sự kiện realtime (comment, thả tim, gửi quà), thông báo TTS đọc tên người công đức / cúng dường.

## Requirements

### R1. Phân Tích Kiến Trúc Kỹ Thuật (System Architecture Breakdown)
Phân tích chi tiết kiến trúc giải pháp dựa trên nền tảng Web-based:
- Lớp kết nối TikTok Live: Sử dụng Node.js và thư viện TikTokLiveConnector (hoặc WebSocket bridge) để lắng nghe sự kiện realtime (bình luận, thả tim, quà tặng/gift, lượt share/follow).
- Lớp hiển thị Overlay (OBS Browser Source): Ứng dụng web hiển thị đồ họa tương tác (HTML5 Canvas / PixiJS / React) hiển thị không gian chánh điện, avatar người tham gia, hiệu ứng lạy, bình luận nổi, hoa sen bay và hiệu ứng quà tặng.
- Lớp Bảng Điều Khiển Quản Trị (Admin Dashboard): Giao diện web quản lý cấu hình phòng live, kiểm soát danh sách người dùng vào slot lạy, điều chỉnh độ nhạy/ngưỡng quà tặng, bật/tắt âm thanh chuông/mõ và kích hoạt hiệu ứng thủ công.
- Lớp Âm Thanh & Đọc Tên (Audio & TTS Engine): Cơ chế phát âm thanh chuông mõ và phát giọng đọc tên người công đức / cúng dường.

### R2. Kế Hoạch Triển Khai Kỹ Thuật (Implementation Roadmap & Technical Plan)
Xây dựng kế hoạch thực hiện từng giai đoạn (roadmap) bao gồm:
- Thiết kế luồng dữ liệu (Data Flow) từ TikTok Live Event -> Backend Event Dispatcher -> WebSocket -> OBS Browser Source & Admin Panel.
- Đặc tả giao thức và cấu trúc sự kiện WebSocket giữa server, admin dashboard và overlay.
- Hướng dẫn cấu hình môi trường phát triển cục bộ và tích hợp vào phần mềm OBS Studio để livestream.
- Kế hoạch phòng ngừa rủi ro kỹ thuật (xử lý giới hạn tần suất kết nối TikTok, tự động kết nối lại khi mất mạng, tối ưu độ trễ hiển thị).

### R3. Tìm Kiếm, Tuyển Chọn và Tổ Chức Bộ Tài Nguyên (Asset Collection & Specification)
Khảo sát, thu thập và lập danh mục tài nguyên sẵn sàng sử dụng cho dự án, người dùng sẽ cung cấp thêm assets và tài khoản live cụ thể:
- Đồ họa 2D/3D (hình ảnh bàn thờ, tượng Phật trang nghiêm, hoa sen, nến, nhang/trầm hương, giao diện khung chat).
- Sprite/Animation nhân vật (avatar người quỳ lạy, chu kỳ hành lễ/bái lạy, hiệu ứng ánh hào quang).
- Hiệu ứng âm thanh (tiếng gõ mõ, tiếng chuông chùa, nhạc thiền tịnh tâm nền, âm thanh nhận quà).
- Danh mục bảng kiểm (manifest) liệt kê định dạng, kích thước khuyến nghị, nguồn gốc và trạng thái bản quyền của từng asset.

## Acceptance Criteria

### Tài Liệu Kiến Trúc & Kế Hoạch Kỹ Thuật
- [ ] Tài liệu phân tích kiến trúc hệ thống mô tả rõ ràng các thành phần (Backend connector, OBS overlay, Admin dashboard, Audio/TTS) kèm sơ đồ luồng dữ liệu.
- [ ] Đặc tả chi tiết giao thức trao đổi dữ liệu (WebSocket message format) cho tất cả các sự kiện: comment, like, gift, user join slot, trigger manual action từ admin.
- [ ] Kế hoạch triển khai chia theo các mốc công việc rõ ràng, kèm hướng dẫn cài đặt và tích hợp với OBS Studio.

### Danh Mục & Bộ Tài Nguyên (Assets)
- [ ] Bảng danh mục tài nguyên (Asset Manifest) hoàn chỉnh phân loại theo hình ảnh, animation và âm thanh, nêu rõ kích thước/định dạng chuẩn cho OBS overlay và giấy phép sử dụng.
- [ ] Hướng dẫn tích hợp tài nguyên do người dùng cung cấp vào cấu trúc thư mục của dự án.


## 2026-11-01T20:00:49Z
Build the functional codebase and working prototype for the TikTok interactive live virtual temple platform ("Chánh Điện Tịnh Tâm") according to existing specifications (ARCHITECTURE.md, WEBSOCKET_SPEC.md, ROADMAP.md, ASSET_MANIFEST.md, PROJECT.md).

Working directory: c:\Users\tn018\Desktop\Person\media\tiktok\app-live
Integrity mode: development

## Reference Material
- Specifications in workspace: ARCHITECTURE.md, WEBSOCKET_SPEC.md, ROADMAP.md, ASSET_MANIFEST.md, PROJECT.md
- Manifest and scripts: manifest.json, assets/asset-manifest.schema.json, scripts/verify_assets.mjs

## Requirements

### R1. Node.js Backend Server & State Manager
Build the Node.js backend server featuring:
- Event ingestion with Mock Event Simulator (and TikTokLiveConnector structure) allowing local end-to-end event generation and testing without requiring an active TikTok live stream.
- WebSocket broadcaster with role segregation (`role=overlay` for read-only OBS overlay clients, `role=control` for admin dashboard) and snapshot synchronization on connect.
- Content moderation layer: Vietnamese profanity blacklist filter, string sanitizer/SSML escaper, per-user rate limiting, and gift streak coalescer.
- Core seating state manager: 2.5D seating slots (24-100 seats, populated center-outward), longest-quiet non-donor eviction policy (evicting coin === 0 users when full), VIP slot protection for donors, and 90-second prayer cache.

### R2. Web-based OBS Browser Source Overlay
Build the web-based overlay (1080×1920 9:16 vertical CEF) featuring:
- Virtual temple scene ("Chánh Điện Tịnh Tâm"), altar, and 2.5D perspective seating floor rendered via HTML5 Canvas 2D, combined with a DOM text layer for high-clarity typography.
- Character states and animations (sitting, breathing idle, bowing/prostration on gifts and rituals).
- Realtime comment bubbles anchored above seated avatars, floating lotus/gift particle effects, and merit leaderboard display.

### R3. Web Admin Dashboard (`control` client)
Build the web admin control dashboard featuring:
- Seating matrix visualization showing seat occupancy with administrative actions (kick, pin VIP, lock).
- System control panel for adjusting parameters (mõ BPM metronome, thresholds) and manual triggers for temple bell, mõ, and ritual visual effects.
- Simulation studio capable of injecting simulated TikTok live events (comments, likes, gifts, bulk bots) to verify end-to-end functionality.

### R4. Audio & TTS Integration
Build the audio and TTS integration featuring:
- Temple bell and mõ sound effects with synthetic / Web Audio API oscillator fallbacks ensuring reliable playback under browser autoplay policies.
- Vietnamese TTS announcement pipeline for gift donors and prayers, with audio ducking (-14dB) during announcements.

## Acceptance Criteria

### Backend & WebSocket Protocol
- [ ] Node.js server starts cleanly and serves WebSocket endpoints respecting role authentication (`role=overlay` vs `role=control`).
- [ ] Initial state snapshot is sent immediately upon client connection within 50ms.
- [ ] Moderation filter sanitizes profanity, escapes SSML/HTML entities, and coalesces combo gifts.
- [ ] Seating manager allocates slots from center outward, evicts quiet non-donors when full, and preserves VIP donors.

### OBS Overlay Visual & Animation
- [ ] Overlay displays at 1080×1920 vertical format without visual distortion.
- [ ] Canvas 2D renders temple environment, altar, and seated avatars with correct 2.5D perspective scaling.
- [ ] Avatars transition between idle breathing, sitting, and bowing animations when events are received.
- [ ] Comment bubbles appear above corresponding seated avatars upon comment events.

### Admin Dashboard & Simulation
- [ ] Admin dashboard connects to the server and displays live seating status in real time.
- [ ] Admin controls can trigger bell/mõ sounds and fire simulated comments, likes, and gifts that immediately appear on the overlay.
- [ ] Administrative seating actions (kick, VIP pin) update server state and broadcast updates to connected clients.

### Audio & Sound Fallback
- [ ] Bell and mõ sound triggers produce audible playback in the overlay client using Web Audio API synthesis when audio files are not present.
- [ ] Background audio ducks appropriately when donor announcement / bell audio is active.
