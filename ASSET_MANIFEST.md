# DANH MỤC TÀI NGUYÊN & HƯỚNG DẪN TÍCH HỢP (ASSET MANIFEST)
## Master Asset Catalog, Technical Specifications & Host Integration Guide

---

## 1. TỔNG QUAN DANH MỤC TÀI NGUYÊN (ASSET CATALOG OVERVIEW)

Không gian livestream **"Chánh Điện Tịnh Tâm"** được xây dựng dựa trên nguyên lý **Phân tách Tài nguyên và Mã nguồn (Decoupled Asset Architecture)**. Toàn bộ hình ảnh, âm thanh và hiệu ứng được quản lý tập trung thông qua tập tin danh mục chuẩn `manifest.json`.

Điều này mang lại hai lợi thế cốt lõi:
1. **Khả năng cắm-và-chạy (Plug-and-Play)**: Chủ phòng live (streamer, chư Tăng Ni, ban hộ trì) có thể tùy biến hoàn toàn diện mạo chánh điện ngôi chùa của mình, thay đổi tượng Phật, đưa nhạc chuông truyền thống của chùa vào phát sóng mà không cần biết lập trình và không cần sửa bất kỳ dòng mã nguồn nào.
2. **Cơ chế tải thông minh & Dự phòng sự cố (Dynamic Loader & Fallback)**: Nếu một file ảnh hoặc âm thanh bị thiếu hoặc đường dẫn bị lỗi, hệ thống tự động kích hoạt tài nguyên dự phòng (Fallback Asset) hoặc bộ dao động âm thanh điện tử để luồng live không bao giờ bị gián đoạn hay xuất hiện màn hình đen.

---

## 2. BẢNG ĐẶC TẢ CHI TIẾT DANH MỤC TÀI NGUYÊN (DETAILED ASSET SPECIFICATIONS)

### 2.1. Đồ Họa Nền Chánh Điện & Các Lớp Bàn Thờ (Backgrounds & Altar Layers)

Tất cả đồ họa nền và bàn thờ được thiết kế chuẩn cho khung hình dọc TikTok LIVE: **1080 × 1920 px (tỷ lệ 9:16)**.

| Asset ID | Tên hiển thị | Đường dẫn file | Định dạng | Kích thước (px) | Dung lượng | Tầng z-index | Giấy phép | Mô tả & Lưu ý |
|---|---|---|---|---|---|:---:|---|---|
| `bg_main_hall` | Chánh Điện Cổ Tự | `/assets/backgrounds/hall.jpg` | JPG / WebP | 1080 × 1920 | < 600 KB | `0` | CC-BY-4.0 | Không gian chùa cổ kính, cột gỗ lim, gạch bái đường một điểm tụ sâu. |
| `bg_zen_garden` | Thiền Viện Trúc Lâm | `/assets/backgrounds/zen_garden.jpg` | JPG / WebP | 1080 × 1920 | < 550 KB | `0` | CC-BY-4.0 | Cảnh thiền môn đêm trăng thanh thoát dành cho các buổi tọa thiền khuya. |
| `altar_table_main` | Bàn Thờ Tam Cấp | `/assets/altar/altar_table.png` | PNG-24 (Alpha) | 1080 × 850 | < 500 KB | `1` | Public Domain | Bàn thờ sơn son thếp vàng, bình hoa sen, mâm ngũ quả. |
| `statue_shakyamuni`| Bổn Sư Thích Ca | `/assets/altar/statue_shakyamuni.png` | PNG-24 (Alpha) | 600 × 800 | < 450 KB | `3` | Public Domain | Tượng Đức Phật tọa thiền kiết già trên tòa sen vàng, sắc diện từ bi. |
| `statue_amitabha` | Phật A Di Đà | `/assets/altar/statue_amitabha.png` | PNG-24 (Alpha) | 600 × 800 | < 450 KB | `3` | Public Domain | Tượng Phật A Di Đà phóng quang tiếp dẫn chúng sinh tịnh độ. |
| `statue_avalokiteshvara`| Quán Thế Âm Bồ Tát | `/assets/altar/statue_avalokiteshvara.png` | PNG-24 (Alpha) | 550 × 820 | < 420 KB | `3` | Public Domain | Mẹ Quán Thế Âm tay cầm nhành dương liễu và bình tịnh thủy cam lộ. |
| `altar_censer_bronze`| Lư Hương Đồng | `/assets/altar/censer_bronze.png` | PNG-24 (Alpha) | 280 × 240 | < 120 KB | `4` | CC0 | Lư đồng cắm nhang trầm tỏa khói nghi ngút tại trung tâm bàn thờ. |
| `altar_candle_stand`| Cặp Chân Nến Sen | `/assets/altar/candle_stand.png` | PNG-24 (Alpha) | 150 × 350 | < 80 KB | `4` | CC0 | Chân nến đồng hai bên bàn thờ tỏa ánh lửa lung linh ấm áp. |
| `cushion_lotus_mat`| Bồ Đoàn Tọa Thiền | `/assets/altar/meditation_cushion.png` | PNG-24 (Alpha) | 160 × 90 | < 60 KB | `5` | CC0 | Đệm ngồi thiền hình tròn bọc vải nâu sẫm đặt theo ma trận phối cảnh. |

---

### 2.2. Nhân Vật & Spritesheet Hoạt Ảnh Hành Lễ (Characters & Prostration Sprites)

Mỗi nhân vật được cung cấp dưới 2 dạng: Ảnh tĩnh đơn lẻ (`c_*.png`) và Dải ảnh hoạt ảnh liên hoàn (`anim_*.png` gồm 8 frames).

- **Quy chuẩn dải ảnh (Strip Dimension)**: Chiều cao chuẩn cơ sở 300px (riêng chú tiểu `char_child` là 260px và cao tăng `char_master` là 320px theo tỷ lệ thể hình nhân vật), 8 frames ngang liên tiếp.
- **Chu kỳ hoạt ảnh (8 Frames Lifecycle)**:
  - `Frame 0 - 3`: Bước chân đi từ cửa bước vào theo lối đi giữa (`walk`).
  - `Frame 4 - 6`: Hạ thấp trọng tâm, quỳ gối xuống bồ đoàn sen (`sitting`).
  - `Frame 7`: Tọa thiền an định, thẳng lưng, hai tay kết ấn thiền định (`sit idle`).
  - `Bái lạy (Bowing)`: **Mặc định trên Canvas 2D engine** sử dụng thuật toán biến dạng hình học nén trục Y theo hàm cosin (Procedural Cosine Compression) trực tiếp trên Frame 7 (tọa thiền) với điểm neo chân `(centerX, bottomY)`: $y_{\text{scale}} = 1 - 0.45 \times (1 - \cos(\theta))$. Thuộc tính `bowingFrames: [4, 5, 6, 7]` trong `manifest.json` được chuẩn hóa và tài liệu hóa là chuỗi khung hình dự phòng thay thế (alternative spritesheet frames) dành cho các engine kết xuất thuần frame không dùng biến dạng cosin.

| Asset ID | Danh xưng nhân vật | File ảnh tĩnh | File Spritesheet (8f) | Kích thước 1 Frame | Chiều cao ngồi | FPS | Giấy phép |
|---|---|---|---|:---:|:---:|:---:|---|
| `char_man` | Cư sĩ Nam áo lam | `/assets/characters/c_man.png` | `/assets/characters/anim_man.png` | 212 × 300 px | 210 px | 8 | MIT |
| `char_woman` | Cư sĩ Nữ áo lam | `/assets/characters/c_woman.png` | `/assets/characters/anim_woman.png` | 212 × 300 px | 220 px | 8 | MIT |
| `char_granny` | Cụ bà áo nâu sồng | `/assets/characters/c_granny.png` | `/assets/characters/anim_granny.png` | 195 × 300 px | 222 px | 8 | MIT |
| `char_child` | Chú tiểu ngây thơ | `/assets/characters/c_child.png` | `/assets/characters/anim_child.png` | 180 × 260 px | 190 px | 8 | MIT |
| `char_monk` | Sư thầy thiền môn | `/assets/characters/c_monk.png` | `/assets/characters/anim_monk.png` | 212 × 300 px | 215 px | 8 | MIT |
| `char_nun` | Sư cô ni chúng | `/assets/characters/c_nun.png` | `/assets/characters/anim_nun.png` | 212 × 300 px | 215 px | 8 | MIT |
| `char_master` | Cao tăng viện chủ | `/assets/characters/c_master.png` | `/assets/characters/anim_master.png` | 230 × 320 px | 230 px | 8 | MIT |

---

### 2.3. Hiệu Ứng Hình Ảnh & Hào Quang (Visual FX & Atmospheric Props)

| Asset ID | Tên hiệu ứng | Đường dẫn file | Kích thước | Blend Mode | Chức năng hiển thị |
|---|---|---|:---:|:---:|---|
| `fx_halo_gold` | Hào Quang Hoàng Kim | `/assets/fx/fx_halo.png` | 512 × 512 px | `lighter` | Vòng ánh sáng kim quang sau đầu Đức Phật, xung nhịp thở. |
| `fx_floating_lotus`| Hoa Sen Hồng Tỏa Sáng | `/assets/fx/fx_lotus.png` | 128 × 128 px | `source-over`| Hoa sen bay lơ lửng khi người xem thả tim hoặc cúng dường quà. |
| `fx_gold_petal` | Cánh Sen Vàng Rơi | `/assets/fx/fx_petal.png` | 64 × 64 px | `source-over`| Mưa cánh hoa sen vàng rơi nhẹ nhàng trong các đại lễ cúng dường lớn. |
| `fx_gift_bell_flash`| Chuông Vàng Phát Sáng | `/assets/fx/fx_bell.png` | 256 × 256 px | `lighter` | Biểu tượng chuông đồng phát sáng bừng lên khi có quà tặng Tier 3. |

---

### 2.4. Danh Mục Âm Thanh Hiệu Ứng (Audio SFX - Sound Effects)

Đạt chuẩn phòng thu chuyên nghiệp: **WAV (PCM) 48.000 Hz / 24-bit Stereo**, chuẩn hóa âm lượng theo đơn vị đo chuẩn quốc tế **LUFS** để không bị vỡ tiếng trên luồng phát trực tiếp của TikTok.

| Asset ID | Tên âm thanh | Đường dẫn file | Định dạng / Tần số | Độ dài | Mức âm lượng (LUFS) | Kỹ thuật phát |
|---|---|---|---|:---:|:---:|---|
| `sfx_mo_01` | Tiếng Mõ Đơn Mộc 1 | `/assets/audio/sfx/mo_strike_01.wav` | WAV 48kHz 24-bit | 0.35s | -12.0 LUFS | Round-Robin 1, ngẫu nhiên cao độ $\pm 25\text{ cents}$. |
| `sfx_mo_02` | Tiếng Mõ Đơn Mộc 2 | `/assets/audio/sfx/mo_strike_02.wav` | WAV 48kHz 24-bit | 0.35s | -12.0 LUFS | Round-Robin 2, tạo cảm giác gõ tay tự nhiên. |
| `sfx_mo_03` | Tiếng Mõ Đơn Mộc 3 | `/assets/audio/sfx/mo_strike_03.wav` | WAV 48kHz 24-bit | 0.35s | -12.0 LUFS | Round-Robin 3, luân phiên không lặp lại mẫu vừa phát. |
| `sfx_bell_bowl` | Chuông Bát Gia Trì | `/assets/audio/sfx/bell_bowl.wav` | WAV 48kHz 24-bit | 4.50s | -10.0 LUFS | Tiếng chuông bát trong trẻo thỉnh khi bắt đầu tụng kinh. |
| `sfx_bell_great_temple`| Đại Hồng Chung | `/assets/audio/sfx/bell_temple.wav` | WAV 48kHz 24-bit | 11.20s| -8.0 LUFS | Tiếng chuông chùa ngân vang rền trời cho đại lễ cúng dường. |
| `sfx_gift_chime_tier1`| Chúc Phúc Cấp 1 | `/assets/audio/sfx/gift_tier1.wav` | WAV 48kHz 24-bit | 1.80s | -12.0 LUFS | Chuông gió ngân nhẹ cho quà tặng 1 - 9 kim cương. |
| `sfx_gift_chime_tier2`| Chúc Phúc Cấp 2 | `/assets/audio/sfx/gift_tier2.wav` | WAV 48kHz 24-bit | 2.60s | -10.0 LUFS | Đàn hạc và hoa nở cho quà tặng 10 - 99 kim cương. |

---

### 2.5. Danh Mục Nhạc Thiền Tĩnh Tâm Nền (Ambient Meditation BGM)

Âm nhạc không lời mang âm hưởng sáo trúc, đàn tranh, tiếng suối reo êm dịu: **MP3 Stereo 320 kbps, 48.000 Hz, chuẩn hóa -16.0 LUFS**, có khả năng lặp bài liền mạch (Seamless Loop).

| Asset ID | Tên bản nhạc | Đường dẫn file | Bitrate | Độ dài | Chuẩn Loudness | Mô tả nhạc cảnh |
|---|---|---|:---:|:---:|:---:|---|
| `bgm_flute_peace` | Trăng Trên Rừng Trúc | `/assets/audio/bgm/music1.mp3` | 320 kbps | 5m 20s | -16.0 LUFS | Sáo trúc thanh tịnh, đưa tâm thức về trạng thái an định. |
| `bgm_zither_morning` | Hơi Thở Ban Mai | `/assets/audio/bgm/music2.mp3` | 320 kbps | 6m 15s | -16.0 LUFS | Tiếng đàn tranh hòa cùng tiếng nước chảy róc rách thanh lọc phiền não. |

---

## 3. CƠ CHẾ DỰ PHÒNG & TẢI ĐỘNG (DYNAMIC ASSET LOADER & FALLBACKS)

Nhằm bảo vệ phòng livestream luôn hoạt động thông suốt ngay cả khi có sự cố xóa nhầm file:

```
[Yêu cầu tải Asset] ─── Tìm thấy file hợp lệ? ───► [Nạp vào RAM & Kết xuất bình thường]
        │
        └── KHÔNG (Lỗi 404 / File hỏng)
                 │
                 ▼
        [Kiểm tra Fallback ID trong manifest.json]
                 ├── Có Fallback ID ──► [Tải Asset mặc định ban đầu]
                 └── Không có Fallback
                           │
                           ▼
                 [KÍCH HOẠT FALLBACK NỘI TẠI]
                 ├── Hình ảnh: Vẽ Vector hình chữ nhật bo góc viền vàng trên Canvas 2D
                 └── Âm thanh: Kích hoạt Web Audio Oscillator tổng hợp sóng tức thì
```

1. **Dự phòng Âm thanh**: Nếu file `mo_strike_01.wav` hoặc `bell_temple.wav` bị mất, Audio Engine sẽ tự động kích hoạt bộ tạo sóng `OscillatorNode` (sóng tam giác quét tần số cho mõ, sóng sine 4 họa âm cho chuông), đảm bảo không bao giờ bị mất tiếng trên livestream.
2. **Dự phòng Hình ảnh**: Nếu ảnh tượng Phật hoặc bồ đoàn bị mất, Canvas 2D tự động vẽ biểu tượng đài sen vector mạ vàng kim dự phòng.

---

## 4. HƯỚNG DẪN 4 BƯỚC TÍCH HỢP TÀI NGUYÊN DÀNH CHO HOST STREAMER (USER GUIDE)

Tài liệu này được biên soạn ngắn gọn, dễ hiểu nhất dành cho quý thầy, quý sư cô hoặc chủ kênh TikTok muốn tự thay ảnh và âm thanh ngôi chùa của mình bằng cơ chế **Thả Tệp Theo Quy Ước (Convention Drop-In)** kết hợp **Bộ Quét Tự Động & Nạp Nóng (Auto-Scan & Hot-Reload)**. 

> ⚠️ **LƯU Ý QUAN TRỌNG**: Bạn **KHÔNG CẦN** mở file `manifest.json` bằng Windows Notepad để sửa mã. Máy chủ Node.js đã tích hợp sẵn cơ chế tự động quét thư mục và nạp nóng tức thời khi phát hiện tệp mới, loại bỏ hoàn toàn các lỗi sập server do Notepad chèn ký tự UTF-8 BOM, dấu ngoặc kép thông minh (`“”`) hay lỗi dấu phẩy!

```
app-live/
├── assets/                          <--- THƯ MỤC TÀI NGUYÊN QUY ƯỚC (CONVENTION DROP-IN)
│   ├── backgrounds/                 <--- Thả ảnh chánh điện ngôi chùa của bạn vào đây
│   │   ├── hall.jpg                 (Ảnh nền mặc định)
│   │   └── custom_hall.jpg          (Ảnh chùa thật của bạn - server tự động nhận diện)
│   ├── altar/                       <--- Thả ảnh tượng Phật & bàn thờ vào đây (nền trong suốt PNG)
│   │   ├── statue_shakyamuni.png    (Tượng Phật mặc định)
│   │   └── custom_statue.png        (Tượng Phật chùa của bạn)
│   ├── audio/
│   │   ├── bgm/                     <--- Thả các bài nhạc thiền MP3 bạn thích vào đây
│   │   │   ├── music1.mp3
│   │   │   └── thien_an_lac.mp3     (Server tự phát xoay vòng danh sách bài hát)
│   │   └── sfx/                     <--- Thả file ghi âm tiếng chuông, mõ thật của chùa
│   │       ├── mo_strike_01.wav     (Tiếng mõ thật)
│   │       └── bell_temple.wav      (Tiếng đại hồng chung thật)
│   └── asset-manifest.schema.json   <--- Lược đồ xác thực tính toàn vẹn hệ thống
```

---

### BƯỚC 1: Thay Thế Ảnh Nền Chánh Điện Chùa Của Bạn
1. Dùng điện thoại hoặc máy ảnh chụp một bức ảnh chính diện bàn thờ chánh điện ngôi chùa của bạn.
2. Cắt ảnh đúng tỷ lệ dọc **1080 × 1920 pixels** (chuẩn 9:16 dọc của TikTok LIVE).
3. Đặt tên file là `custom_hall.jpg` (hoặc chép đè trực tiếp lên `hall.jpg`).
4. Chép file ảnh vào thư mục: `assets/backgrounds/`.
5. Máy chủ tự động nhận diện file mới và kích hoạt nạp nóng (Hot-Reload) qua WebSocket. Hình ảnh ngôi chùa của bạn sẽ xuất hiện rực rỡ trên màn hình live mà không cần khởi động lại máy chủ!

---

### BƯỚC 2: Đổi Tượng Phật Bản Tự (Nền Trong Suốt)
1. Chuẩn bị ảnh Tượng Bổn Sư, Tượng Phật A Di Đà hoặc Tượng Mẹ Quán Thế Âm của chùa.
2. Tách nền để chỉ giữ lại hình tượng Phật (nền phải trong suốt, định dạng file `.png`).
3. Đặt tên file là `custom_statue.png` (hoặc chép đè lên `statue_shakyamuni.png`).
4. Chép file vào thư mục: `assets/altar/`.
5. Màn hình OBS sẽ tự động cập nhật tôn tượng trang nghiêm mới ngay tức khắc.

---

### BƯỚC 3: Thêm Nhạc Thiền Tĩnh Tâm Yêu Thích
1. Chuẩn bị các bài nhạc thiền không lời định dạng `.mp3` (chuẩn âm lượng -16 LUFS).
2. Chép trực tiếp các bài nhạc vào thư mục: `assets/audio/bgm/`.
3. Máy chủ tự động quét toàn bộ tệp `.mp3` trong thư mục này, tự động bổ sung vào danh sách phát xoay vòng và làm mờ chuyển bài êm ái (cross-fade) giữa các bài kinh.
4. Bạn cũng có thể bật/tắt hoặc chọn bài đang phát ngay trên Admin Dashboard (`http://localhost:3000/live/control.html`).

---

### BƯỚC 4: Sử Dụng Tiếng Chuông Hoặc Tiếng Mõ Thu Âm Thật
1. Nếu chùa có file thu âm tiếng chuông đại hồng chung hoặc tiếng mõ thật của chùa:
2. Chuyển đổi file âm thanh sang định dạng `.wav` chuẩn 48.000 Hz, 24-bit.
3. Đổi tên file thành `mo_strike_01.wav` (cho tiếng mõ) hoặc `bell_temple.wav` (cho tiếng chuông lớn).
4. Chép đè trực tiếp vào thư mục: `assets/audio/sfx/`.
5. Máy chủ nạp ngay bộ đệm âm thanh mới vào RAM. Livestream sẽ lập tức ngân vang âm hưởng chuông mõ linh thiêng chân thực của chính bổn tự.
