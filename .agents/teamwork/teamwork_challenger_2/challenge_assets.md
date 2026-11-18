# BÁO CÁO THÁCH THỨC TÀI NGUYÊN & QUY CHUẨN OBS STUDIO (CHALLENGE ASSETS REPORT)
## Adversarial & Empirical Asset Stress-Testing Report
**Thực hiện bởi**: Challenger 2 (`teamwork_challenger_2`) — Empirical Challenger / Critic & Specialist  
**Đối tượng thẩm định**: `manifest.json`, `ASSET_MANIFEST.md`, `ROADMAP.md`, `PROJECT.md`  
**Ngày thực hiện**: 2026-11-01  
**Môi trường thử nghiệm**: Node.js v24.16.0 trên Windows 11 x64  

---

## 1. TỔNG QUAN ĐÁNH GIÁ NGUY CƠ (CHALLENGE SUMMARY)

**Đánh giá rủi ro tổng thể (Overall Risk Assessment)**: **HIGH (NGUY CƠ CAO)**  
**Đề xuất nghiệm thu (Verdict)**: **REQUEST_CHANGES (YÊU CẦU ĐIỀU CHỈNH KỸ THUẬT)**

Thông qua việc xây dựng và thực thi bộ kiểm thử thực nghiệm bằng Node.js (`scripts/verify_assets.mjs`), Challenger 2 đã phát hiện **9 điểm nghẽn, sai lệch kỹ thuật và lỗ hổng kiến trúc** nghiêm trọng trong danh mục tài nguyên `manifest.json` và tài liệu đặc tả `ASSET_MANIFEST.md` / `ROADMAP.md`. Nếu không được khắc phục trước khi bước vào triển khai mã nguồn, các lỗi này sẽ trực tiếp gây:
1. **Treo trình duyệt hoặc văng tiến trình OBS CEF** do đệ quy vô hạn khi kích hoạt cơ chế fallback.
2. **Biến dạng hoạt ảnh nhân vật và sai lệch động tác bái lạy Phật** do mâu thuẫn giữa quy chuẩn 8-frame spritesheet và logic nén cosin.
3. **Sập toàn bộ ứng dụng ngay khi khởi động** khi chủ phòng live thực hiện theo "Hướng dẫn 4 bước cắm-và-chạy" bằng Windows Notepad.
4. **Vỡ bố cục đồ họa chánh điện** khi người dùng nạp ảnh không có kênh trong suốt (Alpha Channel).

---

## 2. BẰNG CHỨNG KIỂM THỬ THỰC NGHIỆM (EMPIRICAL VERIFICATION EVIDENCE)

Bộ kiểm thử thực nghiệm độc lập đã được thực thi trực tiếp trên mã nguồn dự án:

```text
================================================================
EMPIRICAL ASSET & MANIFEST VALIDATION HARNESS
Root Directory: C:\Users\tn018\Desktop\Person\media\tiktok\app-live
Target Manifest: C:\Users\tn018\Desktop\Person\media\tiktok\app-live\manifest.json
================================================================

[PASS] manifest.json exists and parsed successfully as valid JSON.

--- CHECK 1: Schema File Reference ---
Schema path declared: ./assets/asset-manifest.schema.json
Resolved path: C:\Users\tn018\Desktop\Person\media\tiktok\app-live\assets\asset-manifest.schema.json
File exists on disk: [FAIL] Schema file does NOT exist!

--- CHECK 2: Default Configuration Block ---
Resolution: {"width":1080,"height":1920,"aspectRatio":"9:16"}
Audio defaults: {"sampleRate":48000,"channels":2,"bgmVolume":0.55,"sfxVolume":0.85,"bellVolume":0.95}
1080x1920 9:16 check: [PASS]

--- CHECK 3: Asset Entries Validation against Dispatch Requirements ---
Declared asset categories: backgrounds, altar, characters, visual_fx, audio_sfx, audio_bgm
Total assets cataloged: 29
Missing 'category' property count: 16 / 29
Missing 'path' property count: 0
Missing 'license' property count: 0
Missing 'specifications' count: 0
Physical files missing on disk count: 29 / 29

--- CHECK 4: Fallback Paths & Self-Referential Traps ---
Fallback Summary:
  - Self-Referential (Recursive Trap): 6
  - Valid Cross-Fallback: 3
  - Dead Fallback ID: 0
  - Synthetic Fallback: 4
  - Total with NO Fallback: 16

--- CHECK 5: Spritesheet & Bowing Frame Analysis ---
Bowing Frames [4,5,6,7] directly overlaps with Sitting (4-6) and Sit Idle (7)!

--- CHECK 6: ASSET_MANIFEST.md vs manifest.json Discrepancies ---
  [DISCREPANCY] Character "char_child" has frameHeight=260px, but ASSET_MANIFEST.md section 2.2 states "Chiều cao chuẩn 300px"!
  [DISCREPANCY] Character "char_master" has frameHeight=320px, but ASSET_MANIFEST.md section 2.2 states "Chiều cao chuẩn 300px"!

--- CHECK 8: Empirical Stress Test of 4-Step User Integration Guide ---
Testing common failure modes when non-technical users edit manifest.json in Windows Notepad:
  [FAIL] Node JSON.parse fails on UTF-8 BOM: Unexpected token '﻿', "﻿{"test": 1}" is not valid JSON
  [VULNERABILITY CONFIRMED] Smart quotes crash JSON.parse: Unexpected token '“', "{"path": “/assets/b"... is not valid JSON
  [VULNERABILITY CONFIRMED] Trailing comma crashes JSON.parse: Unexpected token ']', ..."": "bg1"},]}" is not valid JSON
  [VULNERABILITY CONFIRMED] Missing comma crashes JSON.parse: Expected ',' or ']' after array element in JSON at position 31 (line 1 column 32)

--- CHECK 9: OBS Studio & CEF Empirical Calculations ---
Canvas Resolution: 1080x1920 (9:16 vertical)
Single RGBA Framebuffer size: 7.91 MB
Raw Frame Compositing Bandwidth @ 60fps: 474.61 MB/s
Max Capacity: 100 avatars concurrently on 2.5D trapezoid floor.
At 60fps, 100 avatars require 6,000 drawImage draw calls/sec on Canvas 2D.
Draw call budget per 16.6ms frame: ~400-500 operations/frame.
```

---

## 3. NỘI DUNG CÁC THÁCH THỨC KỸ THUẬT CHI TIẾT (DETAILED CHALLENGES)

### [CRITICAL] Thách Thức 1: Bẫy Đệ Quy Vô Hạn Từ Fallback Tự Tham Chiếu (`fallbackId === id`)

- **Giả định bị bác bỏ**: `ASSET_MANIFEST.md` Mục 3 khẳng định: *"Nếu một file ảnh hoặc âm thanh bị thiếu hoặc đường dẫn bị lỗi, hệ thống tự động kích hoạt tài nguyên dự phòng (Fallback Asset) ... để luồng live không bao giờ bị gián đoạn hay xuất hiện màn hình đen."*
- **Kịch bản thực tế (Attack Scenario)**:
  Trong `manifest.json`, có **6 tài nguyên chủ chốt** tự trỏ `fallbackId` về chính nó:
  1. `bg_main_hall` (dòng 31): `"fallbackId": "bg_main_hall"`
  2. `altar_table_main` (dòng 59): `"fallbackId": "altar_table_main"`
  3. `statue_shakyamuni` (dòng 72): `"fallbackId": "statue_shakyamuni"`
  4. `altar_censer_bronze` (dòng 111): `"fallbackId": "altar_censer_bronze"`
  5. `altar_candle_stand` (dòng 124): `"fallbackId": "altar_candle_stand"`
  6. `cushion_lotus_mat` (dòng 137): `"fallbackId": "cushion_lotus_mat"`
  
  Khi file `hall.jpg` hoặc `statue_shakyamuni.png` bị mất hoặc đường dẫn sai:
  Bộ nạp `AssetLoader` bắt sự kiện `onerror`, kiểm tra thấy có `fallbackId = "statue_shakyamuni"`, tiếp tục gọi hàm tải tài nguyên của `statue_shakyamuni`. Kết quả là nó tải lại chính file hỏng đó. Nếu bộ nạp không có cơ chế ngăn chặn chu trình (visited set), nó sẽ tạo vòng lặp vô hạn dẫn đến lỗi `RangeError: Maximum call stack size exceeded` làm crash tiến trình `obs-browser-page.exe` của OBS! Kể cả khi có ngắt đệ quy, tài nguyên dự phòng cũng không tồn tại, màn hình sẽ bị đen.
- **Bán kính thiệt hại (Blast Radius)**: Rất lớn. Mất nền hoặc bàn thờ/tượng Phật là sập toàn bộ visual cốt lõi của phòng live.
- **Biện pháp khắc phục (Mitigation)**:
  - Cung cấp đường dẫn dự phòng độc lập, ví dụ: file vector SVG nội tại đóng gói sẵn trong mã nguồn hoặc ảnh nhúng Base64 nhẹ (`data:image/svg+xml,...`).
  - Không cho phép `fallbackId` trùng với `id` của chính asset đó.
  - Kiểm tra tính chu trình (Cycle Detection) trong `AssetLoader`.

---

### [CRITICAL] Thách Thức 2: 16/29 (55%) Tài Nguyên Hoàn Toàn Không Có Cơ Chế Dự Phòng (No Fallback)

- **Giả định bị bác bỏ**: Tuyên bố hệ thống tự động fallback cho toàn bộ hình ảnh và âm thanh khi xảy ra sự cố.
- **Kịch bản thực tế**:
  Thực nghiệm kiểm tra thấy **16 trên tổng số 29 tài nguyên (55.2%)** không có bất kỳ khai báo `fallbackId` hay `fallbackSynthetic`:
  - **100% Nhân vật (7/7 characters)**: `char_man`, `char_woman`, `char_granny`, `char_child`, `char_monk`, `char_nun`, `char_master`.
  - **100% Hiệu ứng thị giác (4/4 visual_fx)**: `fx_halo_gold`, `fx_floating_lotus`, `fx_gold_petal`, `fx_gift_bell_flash`.
  - **3 Hiệu ứng âm thanh quan trọng**: `sfx_bell_bowl` (chuông bát), `sfx_gift_chime_tier1`, `sfx_gift_chime_tier2`.
  - **100% Nhạc nền BGM (2/2 audio_bgm)**: `bgm_flute_peace`, `bgm_zither_morning`.
  
  Nếu người dùng xóa hoặc đổi tên file `anim_man.png` hoặc `music1.mp3`, hệ thống hoàn toàn không có kế hoạch xử lý dự phòng: nhân vật biến mất khỏi bồ đoàn hoặc phòng live rơi vào im lặng hoàn toàn.
- **Bán kính thiệt hại**: Lớn. Khi có người xem bước vào slot mà không nạp được avatar/spritesheet, Canvas 2D sẽ ném ngoại lệ khi gọi `ctx.drawImage(null, ...)` nếu thiếu lệnh guard `if (!img) return;`.
- **Biện pháp khắc phục**:
  - Gán `fallbackId: "char_man"` cho các nhân vật khác, và tạo một nhân vật mặc định tối giản (placeholder character).
  - Với BGM: Thêm cơ chế tổng hợp âm thiền drone (Pink Noise + Singing Bowl oscillator 432Hz) bằng Web Audio API khi mất file MP3.
  - Bổ sung `fallbackSynthetic: true` cho `sfx_bell_bowl` (tần số 587Hz D5).

---

### [HIGH] Thách Thức 3: Mâu Thuẫn Hoạt Ảnh Spritesheet 8-Frame và Động Tác Bái Lạy (Bowing Cycle)

- **Giả định bị bác bỏ**: Spritesheet 8 frames có thể diễn hoạt đầy đủ chu kỳ: đi vào -> ngồi thiền -> lạy chầu (prostration).
- **Phân tích thực nghiệm**:
  Xem xét định nghĩa trong `ASSET_MANIFEST.md` Mục 2.2:
  - `Frame 0 - 3`: Bước chân đi từ cửa bước vào (walk) — 4 frames.
  - `Frame 4 - 6`: Hạ thấp trọng tâm, quỳ gối xuống bồ đoàn (sitting) — 3 frames.
  - `Frame 7`: Tọa thiền an định, thẳng lưng, kết ấn (sit idle) — 1 frame.
  
  Tuy nhiên, trong `manifest.json`, thuộc tính `bowingFrames` được định nghĩa là:
  `"bowingFrames": [4, 5, 6, 7]`.
  
  **Điểm phi lý kỹ thuật**:
  1. Frames 4, 5, 6 là động tác **chuyển tiếp từ đứng sang quỳ**. Frame 7 là **ngồi thẳng**. Nếu phát chuỗi `[4, 5, 6, 7]` khi có chat hoặc tặng quà, nhân vật sẽ thực hiện động tác... **từ đứng quỳ xuống rồi ngồi thẳng**, hoàn toàn KHÔNG CÓ động tác cúi gập người (dập đầu/lạy Phật)!
  2. Mâu thuẫn với `ROADMAP.md` Giai đoạn 2 Mục 3: ROADMAP lại ghi là *"bowing (lạy chầu nén chiều cao theo cosin khi có chat/gift/bell)"*.
  Tức là một bên nói dùng frame `[4, 5, 6, 7]`, một bên nói dùng thuật toán bóp dẹp chiều cao bằng toán học cosin (`ctx.scale(1, Math.cos(t))`)!
  3. Nếu bóp dẹp theo cosin trên Frame 7, toàn bộ cơ thể nhân vật (kể cả đầu, thân, chân và bồ đoàn) sẽ bị co rúm như một miếng cao su bị nén, nhìn rất phản cảm và mất đi sự trang nghiêm thanh tịnh của chánh điện.
- **Bán kính thiệt hại**: Trung bình - Cao (ảnh hưởng trực tiếp đến trải nghiệm thị giác cốt lõi của người xem TikTok LIVE).
- **Biện pháp khắc phục**:
  - Tách bạch rõ ràng: Spritesheet nhân vật chuẩn cần có **ít nhất 12 frames**:
    - Frames 0 - 3 (4 frames): Đi bộ (Walk cycle).
    - Frames 4 - 6 (3 frames): Quỳ xuống (Kneel down).
    - Frame 7 (1 frame): Tọa thiền an định (Sit idle).
    - Frames 8 - 11 (4 frames): Cúi rạp mình trán chạm đất rồi ngẩng đầu dậy (Prostration Bowing cycle).
  - Hoặc nếu giữ nguyên 8 frames, phải hủy bỏ thuộc tính `bowingFrames: [4, 5, 6, 7]` trong `manifest.json` và chuẩn hóa mô tả cơ chế bóp dẹp phối cảnh 2.5D có neo chân (pivot point ở đáy nhân vật) trong tài liệu.

---

### [HIGH] Thách Thức 4: Bác Bỏ Tuyên Bố "Cắm-Và-Chạy Không Cần Sửa Mã" Của Hướng Dẫn 4 Bước

- **Giả định bị bác bỏ**: `ASSET_MANIFEST.md` Mục 1 & Mục 4 tuyên bố: *"Khả năng cắm-và-chạy (Plug-and-Play) ... mà không cần biết lập trình và không cần sửa bất kỳ dòng mã nguồn nào."*
- **Kịch bản thực tế**:
  1. **Bước 1, Bước 2, Bước 3** trong tài liệu hướng dẫn người dùng:
     - Mở file `manifest.json` bằng Windows Notepad.
     - Tìm kiếm và sửa chuỗi đường dẫn JSON.
     - Thêm một đối tượng JSON mới `{ "id": "...", "name": "...", ... }`.
  2. **Thực tế kỹ thuật**: Việc chỉnh sửa một file JSON có cấu trúc nghiêm ngặt bằng Notepad trên hệ điều hành Windows chính là **chỉnh sửa mã cấu hình (Configuration Code Editing)**.
  3. **Thực nghiệm chứng minh lỗi crash**:
     - *Lỗi A (Windows UTF-8 BOM)*: Khi lưu file bằng Notepad trên Windows, file thường bị chèn thêm ký tự Byte Order Mark `\uFEFF`. Khi máy chủ Node.js gọi `JSON.parse()`, lệnh ném ngoại lệ ngay lập tức: `Unexpected token '﻿', "﻿{"test": 1}" is not valid JSON`. Máy chủ sập!
     - *Lỗi B (Smart Quotes / Dấu ngoặc kép cong)*: Khi người dùng sao chép mẫu từ tài liệu hoặc gõ trên bộ gõ tiếng Việt Unikey, dấu `"` thường biến thành `“` hoặc `”`. Thực nghiệm cho thấy `JSON.parse` báo lỗi cú pháp ngay tức khắc.
     - *Lỗi C (Dấu phẩy cuối / Trailing Comma)*: Thói quen cực kỳ phổ biến của người không biết lập trình là để dấu phẩy ở phần tử cuối mảng `[{"id": "bg1"},]`. `JSON.parse` tiêu chuẩn ném lỗi và dừng hoạt động.
- **Bán kính thiệt hại**: Nghiêm trọng đối với người dùng cuối. Ứng dụng không thể khởi động được.
- **Biện pháp khắc phục**:
  - Đúng chuẩn "Plug-and-Play" thực thụ: Định nghĩa thư mục ghi đè quy ước (Convention-over-Configuration). Ví dụ: Nếu người dùng đặt file `assets/custom/background.jpg`, hệ thống tự động ưu tiên nạp file này mà không cần đụng vào `manifest.json` (tương tự như Bước 4 đối với âm thanh).
  - Triển khai tính năng **Tải & Quản lý Tài nguyên trực quan (Visual Asset Manager)** ngay trên giao diện React Admin Dashboard (Phase 4), cho phép bấm nút "Chọn ảnh" và tự động lưu.
  - Sử dụng thư viện parse JSON nới lỏng (như `json5` hoặc hàm khử BOM) khi đọc `manifest.json`.

---

### [MEDIUM] Thách Thức 5: Thiếu Tập Tin Schema `$schema` & Bất Nhất Trường Thuộc Tính

- **Phát hiện thực nghiệm**:
  1. Dòng 2 trong `manifest.json`: `"$schema": "./assets/asset-manifest.schema.json"`.
     Kiểm tra thực tế: Tập tin này **hoàn toàn không tồn tại** trên ổ đĩa. Trình soạn thảo mã nguồn (VS Code) và công cụ CI/CD sẽ báo cảnh báo lỗi đường dẫn schema không hợp lệ.
  2. Yêu cầu nghiệm thu của đề bài: *"Verify every asset entry has valid id, name, category, file path, resolution/specifications, and license status."*
     Kiểm tra thực nghiệm cho thấy:
     - **16/29 tài nguyên thiếu trường `category`**:
       - 7 nhân vật chỉ có trường `gender`, không có `category`.
       - 7 âm thanh SFX chỉ có trường `type`, không có `category`.
       - 2 nhạc nền BGM chỉ có trường `type`, không có `category`.
     - **Trường đường dẫn không đồng nhất**: Nhóm ảnh dùng `"path"`, nhóm nhân vật lại dùng `"staticPath"` và `"spritesheetPath"`.
- **Biện pháp khắc phục**:
  - Tạo tập tin JSON Schema chuẩn `assets/asset-manifest.schema.json`.
  - Chuẩn hóa thuộc tính: Bổ sung `"category": "character"`, `"category": "audio_sfx"`, `"category": "audio_bgm"` cho toàn bộ 16 asset để đạt tính nhất quán 100%.

---

### [MEDIUM] Thách Thức 6: Sai Lệch Thông Số Chiều Cao Nhân Vật Giữa Markdown và JSON

- **Phát hiện thực nghiệm**:
  - Trong `ASSET_MANIFEST.md` Mục 2.2 ghi quy chuẩn dải ảnh:
    `- Quy chuẩn dải ảnh (Strip Dimension): Chiều cao chuẩn 300px, 8 frames ngang liên tiếp.`
  - Tuy nhiên, trong `manifest.json`:
    - `char_child` (Chú tiểu): `frameHeight = 260px` (Chiều cao 1 frame là 260, không phải 300).
    - `char_master` (Cao tăng viện chủ): `frameHeight = 320px` (Chiều cao 1 frame là 320, vượt chuẩn 300).
- **Hệ quả kỹ thuật**: Nếu lập trình viên xây dựng Canvas Renderer dựa trên giả định dải ảnh cố định cao 300px, hình ảnh chú tiểu sẽ bị kéo giãn (stretch) và hình ảnh cao tăng sẽ bị cắt cụt đỉnh đầu (clipping).
- **Biện pháp khắc phục**: Cập nhật lại tài liệu `ASSET_MANIFEST.md` nêu rõ: Chiều cao chuẩn là 300px đối với người lớn, ngoại lệ Chú tiểu (260px) và Cao tăng (320px). Hoặc chuẩn hóa toàn bộ canvas frame của mọi nhân vật về đúng 320x300px (thêm padding trong suốt).

---

### [MEDIUM] Thách Thức 7: Rủi Ro Mất Kênh Trong Suốt (Alpha Channel) Của Tượng Phật & Bàn Thờ

- **Vấn đề kỹ thuật**:
  - Toàn bộ các lớp bàn thờ (`altar_table.png`), tượng Phật (`statue_shakyamuni.png`, v.v.), và bồ đoàn bắt buộc phải là định dạng **PNG-24 có kênh Alpha trong suốt**.
  - Trong "Hướng dẫn Bước 2: Đổi Tượng Phật Bản Tự", người dùng được hướng dẫn tự chụp ảnh và tách nền.
  - Tuy nhiên, phần lớn người dùng không chuyên khi lưu ảnh thường lưu nhầm định dạng JPEG, hoặc PNG-24 nhưng nền màu trắng/đen, hoặc tải ảnh có sẵn trên mạng với hoa văn caro giả trong suốt (fake transparency checkerboard).
  - Khi đưa vào hệ thống Canvas 2D, tượng Phật sẽ xuất hiện dưới dạng một khối chữ nhật trắng xóa khổng lồ che khuất toàn bộ bàn thờ và vầng hào quang.
- **Biện pháp khắc phục**:
  - Bổ sung cơ chế kiểm tra định dạng MIME và kiểm tra điểm ảnh mẫu (Pixel Alpha Sampling) khi nạp tài nguyên: Nếu 4 góc của ảnh tượng Phật có `alpha === 255` (đục tuyệt đối), hệ thống đưa ra cảnh báo trên Admin Dashboard: *"Ảnh tượng Phật chưa được tách nền trong suốt!"*.
  - Hỗ trợ tính năng tách nền tự động cơ bản hoặc áp dụng bộ lọc Canvas `globalCompositeOperation` phù hợp.

---

### [MEDIUM] Thách Thức 8: Sai Lệch Giữa Chuẩn Loudness (LUFS) và Thuộc Tính Âm Lượng Tuyến Tính (Linear Gain)

- **Vấn đề kỹ thuật**:
  - `ASSET_MANIFEST.md` Bảng 2.4 và 2.5 liệt kê mức âm lượng tiêu chuẩn theo đơn vị đo truyền hình chuyên nghiệp: `-12.0 LUFS`, `-10.0 LUFS`, `-8.0 LUFS`, `-16.0 LUFS`.
  - Trong `manifest.json`, thuộc tính được cấu hình lại là số thực tuyến tính: `"volume": 0.85`, `0.9`, `0.95`, `0.55`.
  - Trình duyệt Web Audio API qua `GainNode.gain.value` chỉ nhận giá trị biên độ tuyến tính (0.0 đến 1.0) hoặc decibels, **hoàn toàn không có khả năng tự động phân tích và cân chỉnh theo đơn vị LUFS** trong thời gian thực nếu không có thuật toán DSP chuẩn ITU-R BS.1770-4.
  - Nếu người dùng tải lên một file nhạc thiền có âm lượng gốc quá lớn (ví dụ $0\text{ dBFS}$), áp hệ số `volume = 0.55` vẫn sẽ gây vỡ tiếng trầm trọng và đè bẹp tiếng đọc TTS.
- **Biện pháp khắc phục**:
  - Cần quy định rõ trong tài liệu: Giá trị LUFS trong bảng là tiêu chuẩn khuyến nghị khi xử lý tiền kỳ (offline mastering) trước khi nạp file vào hệ thống.
  - Trong Audio Engine (Phase 3), bổ sung một nốt `DynamicsCompressorNode` tổng (Master Limiter) tại đầu ra của Web Audio Context để ngăn chặn hiện tượng vỡ tiếng kỹ thuật số (clipping).

---

### [MEDIUM] Thách Thức 9: Áp Lực Băng Thông Khung Hình OBS Studio CEF @ 1080x1920 60fps & 100 Slot

- **Tính toán thực nghiệm**:
  - Độ phân giải dọc: $1080 \times 1920$ px.
  - Dung lượng 1 Framebuffer RGBA thuần: $1080 \times 1920 \times 4 \text{ bytes} \approx 7.91 \text{ MB}$.
  - Băng thông hòa trộn điểm ảnh thô tại 60fps: $7.91 \text{ MB} \times 60 \approx \mathbf{474.6 \text{ MB/s}}$.
  - Tại tải trọng tối đa 100 bồ đoàn: Mỗi frame 16.6ms phải thực hiện:
    - 100 lệnh vẽ bồ đoàn sen.
    - 100 lệnh vẽ nhân vật (cắt từ spritesheet).
    - 100 lệnh vẽ bóng đổ và tên Phật tử.
    - 50-100 hạt nhang trầm và hào quang.
    - Tổng cộng: **400 - 500 thao tác vẽ/khung hình (draw calls/frame)**, tương đương **24.000 - 30.000 draw calls/giây**.
  - Nếu mã nguồn Canvas 2D không sử dụng kỹ thuật gom cụm (batching), không dùng `requestAnimationFrame` đồng bộ GPU, hoặc streamer sử dụng máy tính không kích hoạt cờ tăng tốc phần cứng CEF (`--enable-gpu-rasterization`), tốc độ khung hình trong OBS sẽ sụt giảm xuống dưới 45fps, gây giật lag luồng phát.
- **Biện pháp khắc phục**:
  - Đưa vào tài liệu `ROADMAP.md` và `ASSET_MANIFEST.md` yêu cầu bắt buộc: Sử dụng kỹ thuật OffscreenCanvas cho các thành phần tĩnh (bàn thờ, nền, bồ đoàn cố định) để giảm số lệnh vẽ mỗi frame từ 500 xuống dưới 120.

---

## 4. BẢNG TỔNG HỢP KẾT QUẢ KIỂM THỬ TẢI TRỌNG & RỦI RO (STRESS TEST MATRIX)

| Kịch bản kiểm thử (Scenario) | Kỳ vọng thiết kế (Expected) | Kết quả thực nghiệm (Actual) | Trạng thái | Mức độ |
|---|---|---|:---:|:---:|
| **Parse cú pháp `manifest.json`** | Phân tích JSON thành công | Hợp lệ không lỗi cú pháp | **PASS** | Thấp |
| **Kiểm tra file Schema `$schema`** | Tồn tại file schema tương ứng | File `./assets/asset-manifest.schema.json` không tồn tại | **FAIL** | Trung bình |
| **Độ phủ thuộc tính `category`** | 100% tài nguyên có `category` | 16/29 tài nguyên thiếu trường `category` | **FAIL** | Trung bình |
| **Độ an toàn của liên kết Fallback** | Fallback sang tài nguyên hợp lệ khác | 6 tài nguyên tự trỏ chính mình (nguy cơ đệ quy vô hạn) | **FAIL** | **CRITICAL** |
| **Độ phủ dự phòng (Fallback Coverage)** | Toàn bộ tài nguyên đều có fallback | 16/29 tài nguyên (55.2%) hoàn toàn không có fallback | **FAIL** | **CRITICAL** |
| **Tính nhất quán của Spritesheet** | 8 frames diễn hoạt trọn vẹn chu kỳ lạy | Frame 4-7 là ngồi, không có frame lạy; mâu thuẫn với cosin nén | **FAIL** | **HIGH** |
| **Độ chuẩn hóa chiều cao nhân vật** | Chiều cao đồng nhất 300px | Chú tiểu 260px, Viện chủ 320px (lệch đặc tả) | **FAIL** | Trung bình |
| **Thử nghiệm sửa file bằng Notepad** | Không bị lỗi khi host tự sửa | Sập hoàn toàn khi dính UTF-8 BOM, Smart Quotes, Trailing Comma | **FAIL** | **HIGH** |
| **Tải trọng tính toán CEF 60fps** | Duy trì 60fps ổn định dưới 120MB RAM | Băng thông 475 MB/s, cần OffscreenCanvas cache để tránh tụt FPS | **WARN** | Trung bình |

---

## 5. CÁC HẠNG MỤC CHƯA THÁCH THỨC ĐẦY ĐỦ (UNCHALLENGED AREAS)

1. **Hiệu ứng âm thanh đa kênh Spatial Audio**: Chưa kiểm thử khả năng định vị âm thanh chuông mõ theo tọa độ x/y của bồ đoàn trên không gian chánh điện do dự án hiện tại chỉ dùng Stereo thông thường.
2. **Mức độ tương thích của Web Audio API trên macOS / Linux**: Môi trường kiểm thử hiện tại là Windows 11; hành vi của OBS Browser Source trên macOS (Metal vs OpenGL) cần được kiểm chứng thêm khi có môi trường.

---

## 6. DANH MỤC ĐIỀU CHỈNH ĐỀ NGHỊ (REQUIRED ACTIONS FOR AUTHOR)

Để dự án đạt tiêu chuẩn chất lượng cao nhất và sẵn sàng cho việc phát triển mã nguồn, tác giả tài liệu cần hoàn thiện các điểm sau:
1. **Sửa 6 tài nguyên tự tham chiếu trong `manifest.json`**: Gán fallback độc lập hoặc sử dụng cơ chế nội tại đã được bảo vệ chống lặp đệ quy.
2. **Bổ sung cơ chế fallback cho 16 tài nguyên còn lại**: Đặc biệt là các spritesheet nhân vật và âm thanh chuông bát, nhạc thiền.
3. **Thống nhất hoạt ảnh bái lạy (Bowing Cycle)**:
   - Làm rõ giữa việc dùng Spritesheet 12-16 frames hay dùng thuật toán nén cosin 2.5D trên Frame 7.
   - Sửa trường `bowingFrames` trong `manifest.json` cho phù hợp.
4. **Cập nhật Hướng dẫn tích hợp tài nguyên (User Guide)**:
   - Bổ sung cảnh báo về UTF-8 không BOM và định dạng JSON khi sửa bằng Notepad.
   - Ưu tiên cơ chế đặt tên file theo quy ước (Convention Drop-in) để đạt tính "cắm-và-chạy" thực sự không cần đụng vào JSON.
   - Lên kế hoạch cho tính năng Asset Manager trên React Admin Dashboard ở Phase 4.
5. **Đồng bộ hóa quy chuẩn kích thước**: Đính chính chiều cao nhân vật Chú tiểu (260px) và Viện chủ (320px) trong `ASSET_MANIFEST.md`.
6. **Tạo tập tin Schema**: Khởi tạo `assets/asset-manifest.schema.json` để IDE và công cụ kiểm tra tự động hoạt động chính xác.
