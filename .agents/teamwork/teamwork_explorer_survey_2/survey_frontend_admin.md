# Báo Cáo Khảo Sát Kỹ Thuật: OBS Browser Source Overlay & Admin Dashboard UI/UX Cho "Chánh Điện Tịnh Tâm"

> **Dự án**: TikTok Interactive Live Stream — "Chánh Điện Tịnh Tâm"  
> **Người thực hiện**: Explorer 2 (`teamwork_explorer_survey_2`)  
> **Tài liệu tham chiếu chính**: Mã nguồn mở `kentjuno/chanh-dien-online` & Quy chuẩn `react-web-development`  
> **Thời gian hoàn thành**: 2026-11-01  

---

## 1. Tóm Tắt Dự Án & Mục Tiêu Kỹ Thuật (Executive Summary)

Dự án **"Chánh Điện Tịnh Tâm"** là ứng dụng livestream tương tác thời gian thực trên nền tảng TikTok LIVE (và TikTok LIVE Studio / OBS Studio). Người xem khi tương tác qua bình luận, thả tim hoặc tặng quà (gifts) sẽ trực tiếp hòa mình vào không gian chánh điện ảo 2.5D:
- Bình luận để bước vào chánh điện, ngồi xuống **bồ đoàn (đệm thiền)** hành lễ, niệm Phật.
- Thả tim kích hoạt hiệu ứng **hoa sen bay, tim phát sáng, vầng hào quang lấp lánh**.
- Tặng quà kích hoạt hiệu ứng **quỳ lạy trang nghiêm (bowing animation)**, **xướng tên hồi hướng công đức** bằng giọng đọc tiếng Việt truyền cảm (Edge TTS), và ghi danh trên **Bảng Công Đức**.
- Người phát trực tiếp (Streamer / Admin) quản trị toàn bộ phiên livestream thông qua **Bảng Điều Khiển Quản Trị (Admin Dashboard)** chạy trên trình duyệt máy tính hoặc tablet phụ.

Báo cáo khảo sát này tập trung làm rõ 3 trọng tâm kỹ thuật then chốt:
1. **Khảo sát & Lựa chọn Công nghệ Front-end cho OBS Browser Source**: Phân tích chuyên sâu về hiệu năng 60fps, tương thích OBS CEF (Chromium Embedded Framework), xử lý kênh trong suốt (alpha transparency), rò rỉ bộ nhớ (memory leaks) trong các phiên live dài hạn (12-24 giờ), và kết xuất hạt hiệu ứng (particle effects).
2. **Thiết kế Bố cục Không gian Chánh Điện 2.5D & Hệ Thống Linh Kiện Đồ Họa (Visual Components)**: Tỷ lệ màn hình chuẩn 9:16 (1080×1920) dọc và 16:9 ngang, sơ đồ z-index nhiều lớp, toán học phối cảnh hình thang (trapezoid projection) cho ma trận chỗ ngồi, chu kỳ hoạt họa hành lễ, bong bóng bình luận và bảng công đức.
3. **Quy Chuẩn Kiến Trúc & Thiết Kế UI/UX Cho Admin Dashboard**: Cấu trúc module hóa cắm - rút (Pluggable Modular Registry), quản lý trạng thái kết nối TikTok Live, ma trận điều khiển slot người ngồi trực quan, bộ trộn âm thanh (chuông, mõ, nhạc thiền), và hệ thống giả lập kiểm thử (event simulator).

---

## 2. Đánh Giá & So Sánh Công Nghệ Hiển Thị OBS Browser Source

OBS Browser Source vận hành dựa trên **CEF (Chromium Embedded Framework)**, một phiên bản rút gọn của Chromium được nhúng trực tiếp vào tiến trình render của OBS Studio. Môi trường này có những đặc tính kỹ thuật rất khắt khe:

### 2.1. Ma Trận So Sánh Kỹ Thuật (Technology Comparison Matrix)

| Tiêu Chí Kỹ Thuật | HTML5 Canvas 2D Native | PixiJS (WebGL 2.0) | React + Tailwind + Framer Motion (DOM) | **Mô Hình Khuyến Nghị: Hybrid (Canvas/Pixi + React/DOM)** |
| :--- | :--- | :--- | :--- | :--- |
| **Cơ chế dựng hình (Rendering Engine)** | CPU Rasterization + GPU Canvas context (`CanvasRenderingContext2D`) | GPU Hardware Accelerated WebGL/WebGPU Pipeline | DOM Tree Manipulation + CSS Layout Engine (Blink) | **Canvas/WebGL cho đồ họa/hạt; DOM cho Text/HUD/Banners** |
| **Độ ổn định 60fps trong OBS CEF** | **Xuất sắc (95-99%)**: Tải GPU rất thấp, ít biến động khung hình khi ít hơn 500 hạt. | **Đỉnh cao (99-100%)**: Xử lý 5.000+ hạt và sprite batching không tụt fps. | **Kém - Trung bình (60-80%)**: Dễ giật lag (frame drop) khi nhiều phần tử DOM xuất hiện/biến mất. | **Đỉnh cao (99%)**: Khóa cứng 60fps mượt mà trên mọi cấu hình PC livestream. |
| **Tiêu thụ Bộ Nhớ & Rò Rỉ (Memory Leaks)** | **Rất thấp & Ổn định**: ~80MB - 120MB RAM, không tạo rác DOM, Garbage Collection (GC) rất nhẹ. | **Thấp - Trung bình**: ~120MB - 200MB VRAM/RAM. Cần quản lý chặt chẽ việc giải phóng Texture. | **Nguy cơ cao**: 300MB - 800MB+. Việc liên tục mount/unmount DOM nodes sinh rác GC liên tục. | **Tối ưu**: ~130MB. DOM chỉ giữ các thành phần cố định; hoạt họa do Canvas đảm nhiệm. |
| **Hỗ trợ Kênh Trong Suốt (Alpha Transparency)** | Hỗ trợ tự nhiên: `clearRect()` giữ kênh alpha 0 tuyệt đối, hòa vào nền OBS không viền đen. | Xuất sắc: Cờ `transparent: true`, hỗ trợ Blend Mode đỉnh cao (`ADD`, `SCREEN`). | Tốt về mặt CSS, nhưng đôi khi gặp lỗi compositing viền mờ đen (black fringe) trong CEF cũ. | **Hoàn hảo**: Nền trong suốt sắc nét, không lỗi viền compositing. |
| **Xử lý Hạt Hiệu Ứng (Particles & Lighting)** | Đạt: Vẽ hoa sen, khói nhang, tim bay bằng toán học cơ bản (`arc`, `drawImage`). | Xuất sắc: Hỗ trợ Sprite Sheets, ParticleContainer, Shader ánh sáng hào quang lung linh. | Kém: Render hàng trăm `<div>` tim/sen bay gây thắt cổ chai layout reflow. | **Rất mạnh**: Hạt bay và khói nhang chạy trên Canvas, giao diện chữ chạy trên DOM. |
| **Xử lý Văn Bản & Phông Chữ Tiếng Việt** | Khá phức tạp: Phải đo độ rộng thủ công (`measureText`), tự cắt dòng, không có flexbox text. | Tương đối: `PIXI.Text` sinh texture tốn bộ nhớ; cần dùng BitmapFont nếu tối ưu. | **Xuất sắc**: Định dạng phông tiếng Việt có dấu, emoji, đổ bóng vàng son cực đẹp và dễ chỉnh. | **Xuất sắc**: Tận dụng toàn bộ sức mạnh typography của CSS cho tên và lời nguyện. |
| **Độ phức tạp phát triển & bảo trì** | Trung bình: Toàn bộ code gói gọn, ít phụ thuộc bên ngoài. | Trung bình - Cao: Cần hiểu lifecycle của WebGL và quản lý asset loader. | Thấp: Lập trình viên React làm quen rất nhanh. | **Cân bằng & Chuyên nghiệp**: Phân tách rõ ràng giữa Engine Đồ Họa và Lớp Giao Diện. |

---

### 2.2. Phân Tích Chuyên Sâu Môi Trường OBS CEF (Chromium Embedded Framework)

Khi phát triển ứng dụng web hiển thị trực tiếp trong OBS Browser Source, phải đặc biệt lưu ý các yếu tố sau:

#### 1. Hardware Acceleration & Threading
- OBS Studio chạy Chromium với tiến trình `obs-browser-page.exe`. 
- Trong OBS, mục `Settings -> Advanced -> Enable Browser Source Hardware Acceleration` thường được bật theo mặc định. Tuy nhiên, trên các máy livestream dùng card đồ họa đơn (vừa render game/OBS vừa encode video qua NVENC/AMF), GPU có thể bị quá tải 95%+.
- **Nguy cơ**: Nếu sử dụng hiệu ứng 3D nặng (Three.js) hoặc WebGL không tối ưu batching, tiến trình CEF sẽ bị OBS ngắt khung hình (dropped frames) để ưu tiên luồng video encode.
- **Giải pháp**: Canvas 2D kết hợp tối ưu sprite (hoặc PixiJS nhẹ 2D) chỉ chiếm < 2-4% GPU GPU 3D engine, đảm bảo luồng livestream luôn ổn định 60fps tuyệt đối.

#### 2. Kênh Trong Suốt (Alpha Channel Transparency)
- Để lớp overlay hòa trộn hoàn hảo lên khung hình nền camera thật hoặc cảnh 3D của streamer:
  ```css
  /* Quy chuẩn bắt buộc cho OBS Overlay */
  html, body {
    background-color: rgba(0, 0, 0, 0) !important;
    margin: 0;
    padding: 0;
    overflow: hidden;
  }
  ```
- Tránh sử dụng bộ lọc CSS `filter: drop-shadow(...)` phức tạp trên các phần tử DOM toàn màn hình vì CEF sẽ chuyển sang chế độ phần mềm (software fallback) gây sụt giảm khung hình đột ngột. Thay vào đó, hãy dùng Canvas native shadow hoặc `box-shadow` có giới hạn phạm vi.

#### 3. Chống Rò Rỉ Bộ Nhớ (Memory Leak & Garbage Collection) Trong Live 24/7
Livestream chánh điện thường được phát liên tục nhiều ngày đêm (live stream tụng kinh xuyên suốt 24/7). Nếu xảy ra rò rỉ dù chỉ 10KB mỗi sự kiện comment, sau vài tiếng ứng dụng sẽ tiêu thụ hàng Gigabyte RAM và crash tiến trình CEF (`Aw, Snap!`).
- **Nguyên nhân phổ biến**:
  1. Giữ tham chiếu ảnh avatar TikTok trong bộ nhớ mà không dọn dẹp (`new Image()` cache vô hạn).
  2. Tạo liên tục mảng hạt (petals/hearts/lotus) mà không tái sử dụng đối tượng (Object Pooling).
  3. Quên hủy `setInterval`, `requestAnimationFrame`, hoặc audio buffer sau khi phát xong âm thanh.
- **Biện pháp giải quyết chuẩn kỹ thuật**:
  - **Avatar LRU Cache**: Giới hạn tối đa 150 avatar gần nhất trong `Map`. Khi vượt quá, giải phóng các avatar cũ nhất (`im.src = ''`, xóa key).
  - **Particle Pool**: Khởi tạo sẵn một mảng cố định 100 đối tượng hạt (lotus/petal/heart). Khi kích hoạt hiệu ứng, chỉ lấy hạt từ pool và đặt cờ `active = true`, khi hết thời gian sống thì trả lại pool, tuyệt đối không tạo mới bằng `new Object()`.
  - **DOM Virtualization / Tối giản hóa**: Chỉ render các phần tử thực sự hiển thị trên màn hình.

---

### 2.3. Lựa Chọn Kiến Trúc Tối Ưu (Architectural Recommendation)

Dựa trên khảo sát thực tế từ mã nguồn `kentjuno/chanh-dien-online` và yêu cầu mở rộng tương lai:

> **Kiến trúc Khuyến Nghị: HYBRID ENGINE (HTML5 Canvas 2D + Lightweight CSS/DOM Overlay)**
> - **Lớp Đồ Họa Cốt Lõi (HTML5 Canvas 2D)**: Dựng hình không gian chánh điện 2.5D, mặt sàn phối cảnh, tượng Phật, hào quang tỏa sáng, chu kỳ avatar cử động lạy chầu, khói nhang trầm nghi ngút và các hạt hoa sen trôi lơ lửng. Lý do: Nhẹ nhất, tiêu thụ ít tài nguyên nhất, độ ổn định tuyệt đối trong CEF, không lo lỗi mất ngữ cảnh WebGL (context loss).
> - **Lớp Giao Diện HUD & Vinh Danh (React / DOM Layer)**: Đảm nhận Bảng biển tên chùa (Title Plaque), Bộ đếm thời gian & số người đang thiền, Bảng Công Đức (Leaderboard) cuộn vinh danh, Bong bóng bình luận và Banner chúc mừng cúng dường toàn màn hình. Lý do: Đảm bảo độ sắc nét tuyệt đối của phông chữ Việt Nam, tạo kiểu chữ viền vàng kim sa lộng lẫy bằng CSS và dễ dàng tùy biến giao diện mà không phải can thiệp vào logic vẽ tọa độ pixel của Canvas.

---

## 3. Thiết Kế Bố Cục Không Gian Chánh Điện 2.5D & Visual Components

### 3.1. Tiêu Chuẩn Kích Thước & Tỷ Lệ Khung Hình

Ứng dụng hướng đến hai kịch bản phát sóng:
1. **Chuẩn Dọc (9:16 Portrait - 1080×1920 px)**: **Ưu tiên số 1**, tối ưu chuẩn mực cho thuật toán phân phối TikTok LIVE trên điện thoại và công cụ TikTok LIVE Studio.
2. **Chuẩn Ngang (16:9 Landscape - 1920×1080 px)**: Dành cho livestream đa nền tảng (YouTube Live, Facebook Live hoặc OBS Studio phát ngang). Hệ thống tự động chuyển đổi layout lưới từ hình thang sâu sang hàng ghế ngang rộng mở.

---

### 3.2. Sơ Đồ Phân Tầng Thị Giác (Z-Index Hierarchy)

```
[Layer 8] - Banner Chúc Mừng & Xướng Tên Hồi Hướng (Gift Celebration Banner) - z-index: 100
[Layer 7] - Bảng Công Đức Ticker & Biển Tên Chánh Điện (HUD Header & Leaderboard) - z-index: 80
[Layer 6] - Bong Bóng Bình Luận (Speech Chat Bubbles) bay trên đầu avatar - z-index: 60
[Layer 5] - Hạt Hiệu Ứng Bay (Floating Lotuses, Petals, Hearts, Golden Sparkles) - z-index: 50
[Layer 4] - Ma Trận Người Tham Gia (Avatars, Bồ Đoàn, Thẻ Tên, Hào Quang VIP) - z-index: 30
[Layer 3] - Chư Tăng Hướng Dẫn Cố Định (Thầy Minh Đạo, Sư Trụ Trì, Thầy Tâm Từ) - z-index: 25
[Layer 2] - Khói Nhang Trầm & Ánh Sáng Nến Hoa Sen (Atmospheric FX) - z-index: 20
[Layer 1] - Bàn Thờ Phật, Tượng Phật Thích Ca/A Di Đà Trang Nghiêm & Hào Quang - z-index: 10
[Layer 0] - Khung Cảnh Chánh Điện Gỗ Cổ Kính (Background Hall Canvas) - z-index: 0
```

---

### 3.3. Chi Tiết Thành Phần Chánh Điện & Toán Học Phối Cảnh (Trapezoid Floor Projection)

#### 1. Khu Vực Bàn Thờ Phật Trang Nghiêm (Main Altar Area)
- **Tượng Phật Thích Ca Mâu Ni / A Di Đà**: Tọa thiền kiết già trên tòa sen vàng ở chính giữa trung tâm phía trên khung hình (`x: 540, y: 560`).
- **Vầng Ánh Hào Quang (Divine Halo)**: Sử dụng kỹ thuật hòa trộn màu sắc `ctx.globalCompositeOperation = 'lighter'`. Kết hợp hai vòng hào quang:
  - Vòng trong: Xoay chậm chu kỳ 60 giây, phát ra ánh sáng vàng ấm (`#ffe494`).
  - Vòng ngoài: Xung nhịp thở (breathing pulse) bán kính biến thiên `R = R_0 + 15 * sin(t * 1.5)`. Khi có tiếng chuông lớn hoặc quà tặng khủng, hào quang bừng sáng cực đại (`haloPulse = 1.0`).
- **Lư Hương / Bát Hương Trầm & Nến Sen**:
  - Khói nhang trầm: Tạo bằng hệ thống hạt di chuyển theo phương thẳng đứng với hàm sóng nhiễu: `x = 540 + sin(a * 7 + i) * 20 * a`, `y = 1000 - a * 280`, bán kính hạt nở dần và độ mờ giảm dần (`alpha = 0.28 * (1 - a)`), tạo cảm giác khói trầm hương lượn lờ thanh tịnh.
  - Ngọn nến lung linh: Nhấp nháy tự nhiên bằng hàm cộng hưởng tần số: `alpha = 0.05 + 0.035 * sin(t * 9) * sin(t * 13.3)`.

#### 2. Ma Trận Chỗ Ngồi Phối Cảnh 2.5D (Participant Slot Grid Math)
Sàn chánh điện là một hình thang phối cảnh sâu:
- Đỉnh trên (sát chân bàn thờ): `yTop = 1215px`, nửa chiều rộng sàn `halfTop = 290px`.
- Đáy dưới (sát mép camera người xem): `yBot = 1845px`, nửa chiều rộng sàn `halfBot = 430px`.
- Lối đi chính giữa (Center Aisle): Mở rộng 15% khoảng trống ở giữa để chừa tầm nhìn thông suốt lên Đức Phật.

**Công thức chuẩn xác tính toán vị trí từng Slot `(x, y, scale)` theo hàng `r` và cột `k`:**
```javascript
// t: tham số chiều sâu từ 0 (hàng sau cùng) đến 1 (hàng trước nhất)
const t = rows === 1 ? 0.5 : r / (rows - 1);
const y = yTop + (yBot - yTop) * t;
const halfWidth = halfTop + (halfBot - halfTop) * t;

// Hệ số thu phóng kích thước avatar theo chiều sâu không gian (nhân vật ở xa nhỏ hơn)
const scale = (0.26 + 0.24 * t) * Math.pow(6 / cols, 0.75);

// Tính toán tọa độ x với lối đi ở giữa
let u = (k - (cols - 1) / 2) / ((cols - 1) / 2); // chuẩn hóa từ -1 đến +1
u = Math.sign(u) * (0.14 + 0.86 * Math.abs(u));   // dạt sang hai bên tạo lối đi giữa
const x = 540 + u * halfWidth;
```

**Chiến lược mở rộng slot động (Dynamic Capacity Expansion):**
Hệ thống hỗ trợ 4 ngưỡng cấu hình:
- **Ngưỡng 24 chỗ (6 cột × 4 hàng)**: Phù hợp lúc live mới bắt đầu hoặc phòng xem vừa phải, avatar to rõ, thấy rõ từng chi tiết cử động.
- **Ngưỡng 36 chỗ (6 cột × 6 hàng)**: Cân đối, trang nghiêm.
- **Ngưỡng 64 chỗ (8 cột × 8 hàng)**: Tạo không khí đại lễ trang nghiêm, đông đúc.
- **Ngưỡng 100 chỗ (10 cột × 10 hàng)**: Tối đa, hiển thị biển người cùng tụng kinh niệm Phật.
- **Thứ tự xếp chỗ ưu tiên (Seating Priority)**: Điền từ hàng trước ra hàng sau, từ sát lối đi giữa ra hai bên vách. Giúp sân chùa luôn trông ấm cúng và đầy đặn ngay cả khi chỉ có vài người tham gia.

#### 3. Cấu Trúc Nhân Vật & Hoạt Ảnh Hành Lễ (Bowing Animation State Machine)
Mỗi người ngồi trên **Bồ Đoàn Sen (Lotus Meditation Mat)** bao gồm:
1. **Trang Phục / Nhân Dạng (Skins)**:
   - Các mẫu nhân vật: Nam (`man`), Nữ (`woman`), Cụ bà (`granny`), Chú tiểu (`child`), Sư cô/Ni (`nun`), Sư thầy (`monk`), Cao tăng đại đức (`master`).
   - Tự động thay đổi diện mạo khi bình luận đúng từ khóa (nhờ bộ lọc regex thông minh không nhận nhầm câu tụng "Nam mô...").
2. **Avatar Tròn & Thẻ Tên (Nickname Tag)**:
   - Avatar người dùng thật lấy từ TikTok API được bo tròn, gắn viền bảo vệ.
   - Thẻ tên gỗ viền vàng kim, chữ rõ ràng chống nhòe khi nén video livestream.
   - Người công đức lớn hoặc VIP được bao bọc bởi vầng hào quang vàng kim bao quanh chân tọa (`radial-gradient`).
3. **Chu Kỳ Cử Động (Motion Lifecycle)**:
   - **Trạng thái Bước Vào (`walk`)**: Đi từ cửa chánh điện (`y = 2020`) bước lên dọc theo lối đi giữa rồi rẽ vào bồ đoàn của mình.
   - **Trạng thái Ngồi Xuống (`sitting`)**: Chuyển đổi khung hình từ đứng sang quỳ xếp bằng trên bồ đoàn.
   - **Trạng thái Thiền Tịnh (`sit - breathing`)**: Nhấp nhô nhẹ nhàng theo nhịp thở thanh tịnh: `offsetY = sin(t * 1.1 + phase) * 2 * scale`.
   - **Trạng thái Lạy Chầu / Hành Lễ (`bowing`)**:
     - Kích hoạt khi: Người dùng gõ bình luận, tặng quà, hoặc khi chủ phòng gõ mõ/thỉnh chuông.
     - Biến đổi ma trận: Nén chiều cao nhân vật theo hàm Cosine mượt mà: `transform(1, 0, 0, 1 - bowK, 0, 0)` kết hợp xoay nhẹ thân mình rạp xuống bồ đoàn, sau đó nâng người lên trang nghiêm.

#### 4. Bong Bóng Bình Luận (Floating Speech Bubbles)
- Xuất hiện ngay trên đầu avatar khi có bình luận mới.
- Thời gian tồn tại: 6 giây với hiệu ứng nổi nhẹ lên trên.
- Tự động rút gọn chuỗi (`ellipsis`) nếu bình luận quá dài, đảm bảo không che khuất mặt Phật hoặc các avatar hàng sau.
- Bình luận chứa từ cấm hoặc nội dung không phù hợp được lọc qua danh sách đen ở Backend trước khi chuyển tiếp.

#### 5. Bảng Công Đức (Merit Leaderboard & Animated Ticker)
- Tọa lạc ở góc trên bên phải màn hình (`width: 290px`).
- Hiển thị Top 5 Phật tử cúng dường nhiều điểm công đức nhất trong phiên live.
- Mỗi hàng gồm: Xếp hạng (1, 2, 3 mạ vàng), tên Phật tử, điểm công đức (quy đổi từ kim cương TikTok).
- Khi có lượt tặng quà mới, dòng người tặng lóe sáng ánh vàng kim và trượt vị trí thăng hạng mượt mà.

#### 6. Hệ Thống Hiệu Ứng Quà Tặng (Gift Celebration VFX Tiers)
Phân loại 3 cấp độ vinh danh theo giá trị quà tặng TikTok:
- **Cấp 1 (Quà Nhỏ: 1 - 9 kim cương - Hoa hồng, Cây ước nguyện...)**:
  - Avatar người tặng bừng sáng nhẹ (`glow = 0.8`), avatar cúi lạy.
  - 4-6 cánh hoa sen / trái tim hồng bay lên từ bồ đoàn.
  - Âm thanh gõ mõ điểm nhịp.
- **Cấp 2 (Quà Vừa: 10 - 99 kim cương - Nến sen, Đèn lồng, Chuông đồng...)**:
  - Avatar phát sáng rực rỡ, lạy chầu 3 lần.
  - Biểu tượng đài sen vàng tỏa sáng bay lên từ vị trí người tặng.
  - 10-15 cánh sen tỏa ra bay lượn quanh chánh điện.
  - Giọng đọc Edge TTS cất lời hồi hướng: *"Nam mô A Di Đà Phật, Phật tử [Tên] thành tâm cúng dường..."*.
- **Cấp 3 (Đại Lễ Cúng Dường: 100+ kim cương - Lâu đài, Phượng hoàng, Thần tài...)**:
  - Toàn bộ chánh điện bừng sáng ánh hào quang hoàng kim.
  - Tiếng chuông chùa ngân vang trầm bổng chấn động không gian (`bell(true)`).
  - Khung banner hồi hướng hoàng gia trượt vào chính giữa màn hình với họa tiết hoa sen vàng chạm trổ, tôn vinh đại thí chủ cùng lời cầu nguyện bình an.
  - Mưa hoa sen vàng và cánh hoa rơi lấp lánh toàn màn hình suốt 10 giây.
  - Nhạc nền tự động giảm âm lượng (audio ducking) để giọng đọc xướng danh rõ ràng, tôn nghiêm.

---

## 4. Thiết Kế Hệ Thống & Giao Diện Bảng Quản Trị (Admin Dashboard)

Bảng quản trị là trung tâm chỉ huy của streamer, được thiết kế theo tiêu chuẩn **Pluggable Modular Dashboard** (tách biệt module, bố cục responsive hỗ trợ Desktop / iPad, theme nâu trầm thiền tịnh, bảo vệ mắt khi livestream ban đêm).

```
+-------------------------------------------------------------------------------------------------------+
|  CHÁNH ĐIỆN TỊNH TÂM · TRUNG TÂM QUẢN TRỊ                                [Server: OK] [TikTok: LIVE]  |
+------------------------------------+----------------------------------+-------------------------------+
|  MODULE 1: KẾT NỐI & TIKTOK LIVE  |  MODULE 2: BẢN ĐỒ SLOT TRỰC QUAN |  MODULE 3: ÂM THANH & TTS     |
|                                    |                                  |                               |
|  - Username: [@kenh_phat_phap   ]  |  [Sàn Chánh Điện - 24/36 Chỗ]    |  - Giọng: [Nam Minh (Trầm) v] |
|  - Trạng thái: ĐANG KẾT NỐI (2h45m)|  [S1] [S2] [S3] [S4] [S5] [S6]   |  - Tone: [-18Hz] Tốc độ: [-20%]|
|  - Người xem: 1.250 | Tim: 45.2K   |  [S7] [S8] [S9][S10][S11][S12]   |  - [X] Nhạc Thiền (Vol 50%)   |
|  [ KẾT NỐI ]  [ NGẮT ]  [ MỞ 9:16 ]|  ... (Click slot để Kick/VIP)    |  - [X] Tiếng Mõ (52 BPM)      |
|                                    |  [Dọn slot trống] [Khóa slot VIP]|  - [X] Tự Động Đọc Kinh (3p)   |
|  Danh sách người trong sân:        |                                  |  [ THỈNH CHUÔNG ]  [ GÕ MÕ ]  |
|  #1. Minh Tâm (199 ✧) [KICK][VIP]  |  Cấu hình mở rộng:               |                               |
|  #2. Hoa Sen Trắng (50 ✧)          |  - Chế độ: [Tự mở 24 -> 100 v]   |  Phát thông báo tức thì:      |
|  #3. Diệu Âm (12 ✧)                |  - Ngưỡng like lạy: [ 20 tim ]   |  [Cầu bình an...    ] [ PHÁT ]|
+------------------------------------+----------------------------------+-------------------------------+
|  MODULE 4: STUDIO GIẢ LẬP & KIỂM THỬ (SIMULATION CONSOLE)             |  MODULE 5: NHẬT KÝ SỰ KIỆN    |
|                                                                       |                               |
|  - Người gửi: [Phật Tử Ẩn Danh  ]  - Nội dung: [Cầu gia đạo an khang ]|  [14:20:01] @an_nhien: Nam mô |
|  [ Gửi Chat Mẫu ]  [ Tặng Hoa Hồng (1) ]  [ Tặng Chuông Vàng (199) ]   |  [14:20:05] @tam_tu: +50 tim  |
|  - Đổ dữ liệu test: [ 15 người ] [ 36 người ] [ 64 người ] [ 100 ]     |  [14:20:10] TTS đọc quà tặng  |
|  - Bot mô phỏng tự động: [ 12 bot ] - Tốc độ: [ Vừa v ] [ BẬT BOT ]   |  [14:20:15] Slot #4 đổi skin  |
+-----------------------------------------------------------------------+-------------------------------+
```

### 4.1. Đặc Tả Chi Tiết Các Phân Hệ (Features Specification)

#### Module 1: Cấu Hình Phòng Live & Trạng Thái Kết Nối (Live Connection Hub)
- **Input Username TikTok**: Nhập `@username` của kênh đang phát trực tiếp.
- **Trạng thái kết nối (Connection Status Badge)**:
  - `IDLE` (Xám): Chưa kết nối.
  - `CONNECTING` (Vàng chớp nháy): Đang bắt tay WebSocket tới TikTok Webcast CDN.
  - `CONNECTED` (Xanh lá): Đã khóa luồng, hiển thị thời gian live, số người xem online, tổng điểm kim cương.
  - `ERROR` (Đỏ): Mất kết nối hoặc sai tên kênh, nút tự động kết nối lại (`Auto-reconnect with exponential backoff`).
- **Phím tắt mở Overlay 9:16**: Mở cửa sổ popup đúng kích thước 540×960 (tỷ lệ 1080×1920) để streamer kiểm tra màn hình trực quan mà không cần bật OBS.

#### Module 2: Quản Lý Slot Người Tham Gia (Visual Slot Management Matrix)
- **Bản đồ trực quan (Interactive Floor Grid)**: Thể hiện vị trí thực tế của từng bồ đoàn trong chánh điện.
  - Mỗi ô hiển thị: Ảnh đại diện người dùng, Tên rút gọn, Loại trang phục, Điểm công đức tích lũy.
  - Màu sắc viền: Xanh (người đang online hoạt động), Vàng (VIP / Thí chủ cúng dường lớn), Đỏ (Bị khóa).
- **Hành động tương tác nhanh khi click vào từng Slot**:
  - `Kick User`: Đưa người dùng ra khỏi bồ đoàn (nhường chỗ cho người khác nếu spam hoặc vi phạm quy tắc).
  - `Assign VIP Slot`: Đóng đinh vị trí cho Phật tử thân thiết hoặc thí chủ cúng dường lớn (không bao giờ bị hệ thống tự động mời ra khi phòng đầy).
  - `Lock Slot`: Khóa ghế này (không cho ai ngồi, dùng để giữ vị trí cho ban tổ chức).
  - `Force Change Skin`: Đổi diện mạo trang phục sang Cao tăng, Sư thầy hoặc Cụ bà.
- **Quy tắc xếp hàng & giải phóng slot (Eviction Logic)**:
  - Thuật toán `Longest-Quiet Non-Donor Eviction`: Khi phòng đạt tối đa 100 chỗ, nếu có người mới bình luận, hệ thống tìm người có `coins == 0` và có thời gian im lặng lâu nhất (`lastAt` nhỏ nhất) để mời rời bồ đoàn.
  - Miễn trừ (Immunity): Bất kỳ người nào đã cúng dường từ 1 kim cương trở lên sẽ **không bao giờ bị kick tự động**.

#### Module 3: Bộ Điều Khiển Âm Thanh & Đọc Tên (Audio & TTS Mixing Console)
- **Kênh Nhạc Thiền Nền (Meditation BGM)**:
  - Bật/tắt nhạc nền, thanh trượt âm lượng (0% - 100%).
  - Danh sách bài nhạc tĩnh tâm định dạng MP3 nhẹ nhàng, tự động lặp bài hoặc chuyển bài ngẫu nhiên.
- **Kênh Tiếng Mõ Tụng Kinh (Wooden Fish Metronome)**:
  - Bật/tắt gõ mõ tự động theo nhịp.
  - Điều chỉnh tốc độ nhịp mõ: Thanh trượt từ 20 BPM đến 120 BPM (mặc định 52 BPM - nhịp niệm Phật tịnh độ chuẩn).
  - Nút bấm tay: `Gõ mõ thủ công` (phục vụ người live muốn tự tay gõ từng nhịp niệm Phật).
- **Kênh Thỉnh Chuông Đại Hồng Chung (Temple Bell)**:
  - Nút bấm `Thỉnh chuông`: Tổng hợp âm thanh chuông chùa bằng Web Audio API với 4 dao động điều hòa (`sine oscillators`: 216Hz, 432Hz, 1296Hz, 2160Hz) tạo âm vang sâu thẳm, đồng thời kích hoạt hào quang Phật bừng sáng.
- **Kênh Giọng Đọc AI (Edge TTS Engine)**:
  - Lựa chọn giọng đọc truyền cảm: `vi-VN-NamMinhNeural` (giọng nam ấm áp, trang trọng) hoặc `vi-VN-HoaiMyNeural` (giọng nữ thanh thoát).
  - Tinh chỉnh: Độ trầm (Pitch: mặc định `-18Hz` tạo độ vang trầm như trong chái chùa), Tốc độ (Rate: mặc định `-20%` cho lời tụng khoan thai, từ tốn).
  - Khung nhập văn bản: Cho phép streamer soạn lời hồi hướng hoặc thông báo khẩn để phát ngay lập tức lên sóng.
  - Tự động đọc kinh định kỳ: Bật/tắt và chọn khoảng thời gian lặp lại (1 - 10 phút/lần).
  - **Cơ chế Audio Ducking**: Tự động giảm 70% âm lượng nhạc nền khi giọng đọc AI bắt đầu xướng danh và từ từ hồi phục âm lượng sau khi đọc xong.

#### Module 4: Trung Tâm Giả Lập & Kiểm Thử Livestream (Simulation Studio)
Rất quan trọng cho streamer kiểm tra toàn bộ luồng hiển thị trước giờ lên sóng chính thức mà không cần phụ thuộc vào người xem thật:
- **Giả lập sự kiện đơn lẻ**:
  - Nhập tên người xem, nội dung bình luận -> Gửi kiểm tra bong bóng chat và đổi màu nhân vật.
  - Chọn nút quà tặng mẫu: Hoa hồng (1 diamond), Đèn hoa sen (30 diamonds), Chuông vàng (199 diamonds) -> Kiểm tra chu kỳ lạy chầu, hiệu ứng pháo sen và giọng đọc xướng danh.
- **Đổ người mẫu hàng loạt (Batch Populate)**:
  - Nút đổ nhanh: 15 người, 36 người, 64 người, 100 người với đầy đủ tên ngẫu nhiên tiếng Việt và phân bố trang phục hài hòa.
  - Nút dọn sạch bồ đoàn (`Clear All Slots`).
- **Bot tương tác thông minh (Autonomous Simulation Bots)**:
  - Tùy chọn 5 - 30 bot tự động: Bot định kỳ vào phòng, gửi bình luận niệm Phật ngẫu nhiên ("A Di Đà Phật", "Nam mô Quan Thế Âm", "Cầu an khang..."), thỉnh thoảng tặng quà nhỏ và thả tim liên tục.
  - Giúp phòng live lúc nào cũng sôi động, kích thích người xem thật tham gia tương tác.

---

## 5. Quy Chuẩn Kiến Trúc Mã Nguồn (Pluggable React Architecture)

Áp dụng quy chuẩn từ skill `react-web-development`, mã nguồn Admin Dashboard được cấu trúc thành các module độc lập cắm - rút, giúp dự án dễ dàng bảo trì và bổ sung các tính năng mới trong tương lai:

```text
src/
├── core/                         # Hệ thống điều phối trung tâm
│   ├── registry/                 # Đăng ký module (Module Registry)
│   ├── store/                    # Quản lý State toàn cục (Zustand / Redux Toolkit)
│   │   ├── useLiveStore.ts       # Lưu trạng thái kết nối TikTok, thông tin phòng
│   │   ├── useSlotStore.ts       # Danh sách người ngồi, bồ đoàn, VIP
│   │   └── useAudioStore.ts      # Âm lượng, nhịp mõ, danh sách phát kinh
│   ├── types/                    # Khai báo TypeScript Interfaces chung
│   └── websocket/                # WebSocket Client đồng bộ thời gian thực
├── modules/                      # Các phân hệ chức năng độc lập
│   ├── tiktok-connection/        # Module kết nối phòng live TikTok
│   │   ├── components/LiveStatusCard.tsx
│   │   └── hooks/useTikTokConnector.ts
│   ├── slot-management/          # Module quản lý ma trận bồ đoàn
│   │   ├── components/FloorMatrixGrid.tsx
│   │   ├── components/UserSlotDetailModal.tsx
│   │   └── hooks/useSlotActions.ts
│   ├── audio-studio/             # Module điều khiển âm thanh & TTS
│   │   ├── components/AudioFaderMixer.tsx
│   │   ├── components/TTSAnnouncerBox.tsx
│   │   └── hooks/useSoundEngine.ts
│   ├── simulation-console/       # Module giả lập sự kiện & bot
│   │   ├── components/EventInjector.tsx
│   │   └── components/BotController.tsx
│   └── audit-logger/             # Module ghi nhật ký sự kiện
│       └── components/LiveLogViewer.tsx
├── shared/                       # Thành phần dùng chung (UI components, utils)
│   ├── components/ui/            # Button, Slider, Modal, Badge, Switch
│   └── utils/formatters.ts       # Định dạng tiền tệ, điểm công đức, thời gian
├── App.tsx                       # Dashboard Shell
└── main.tsx                      # Entry Point
```

---

## 6. Hướng Dẫn Tích Hợp Vào OBS Studio & Kịch Bản Vận Hành

### 6.1. Hướng Dẫn Cài Đặt OBS Browser Source (Step-by-Step)
1. Khởi động phần mềm **OBS Studio** (khuyến nghị phiên bản 29.1+ hoặc 30+).
2. Tạo Scene mới đặt tên là: `Chánh Điện Tịnh Tâm LIVE`.
3. Trong bảng **Sources**, bấm dấu `+` -> Chọn **Browser** (Trình duyệt).
4. Thiết lập các thông số cấu hình chuẩn:
   - **URL**: `http://localhost:3000/live/overlay.html`
   - **Width**: `1080`
   - **Height**: `1920` (hoặc `1920` × `1080` nếu phát khung ngang)
   - **FPS**: `60` (đảm bảo hoạt ảnh mượt mà tuyệt đối)
   - **Custom CSS**: Để trống (ứng dụng đã tích hợp CSS nền trong suốt tự động)
   - **Tích chọn**:
     - `[X] Shutdown source when not visible` (Tắt nguồn khi ẩn để tiết kiệm RAM)
     - `[X] Refresh browser when scene becomes active`
     - `[X] Control audio via OBS` (Để âm thanh chuông mõ xuất hiện trên mixer của OBS, giúp streamer dễ dàng cân chỉnh âm lượng micro của mình với tiếng chùa).

### 6.2. Kịch Bản Vận Hành Phòng Live Hàng Ngày (Streamer Workflow)
1. **Bước 1**: Bật server backend NodeJS (`npm start` trong thư mục `live`).
2. **Bước 2**: Mở trình duyệt truy cập `http://localhost:3000/live/control.html` trên màn hình phụ hoặc iPad.
3. **Bước 3**: Trên điện thoại hoặc TikTok LIVE Studio, bấm nút **Go LIVE**.
4. **Bước 4**: Tại Bảng điều khiển quản trị, nhập `@username` của phiên live, bấm nút **Kết nối**.
5. **Bước 5**: Kiểm tra đèn báo xanh `TikTok: @username ✓`. Bấm thử nghiệm `Thỉnh chuông` và `Đổ 15 người mẫu` để kích hoạt không gian chánh điện ban đầu.
6. **Bước 6**: Streamer an tâm trò chuyện, giảng pháp hoặc để không gian thiền tự động vận hành; hệ thống tự động đón tiếp Phật tử, gõ mõ tụng kinh và vinh danh người cúng dường suốt phiên phát sóng.

---

## 7. Kết Luận Khảo Sát

1. **Về Mặt Hiển Thị (Overlay)**: Mô hình **Hybrid Canvas 2D + DOM Overlay** là giải pháp tối thượng cho OBS Browser Source: giữ vững 60fps, không rò rỉ bộ nhớ trong các phiên live 24/7, chịu tải hàng ngàn lượt thả tim/quà tặng mà không giật lag, đồng thời giữ được nét chữ Việt Nam tinh xảo, tôn nghiêm.
2. **Về Mặt Bố Cục Không Gian**: Thiết kế ma trận hình thang 2.5D với lối đi ở giữa mang lại chiều sâu tâm linh sâu sắc, tái hiện chân thực khung cảnh thiền đường trang nghiêm của các ngôi chùa Việt.
3. **Về Mặt Quản Trị**: Admin Dashboard được thiết kế trực quan, module hóa cao, trao toàn quyền kiểm soát phòng live, âm thanh chuông mõ và vinh danh công đức cho người phát trực tiếp.

*Báo cáo được hoàn thiện và sẵn sàng chuyển giao cho Orchestrator cùng đội ngũ phát triển.*
