# BÁO CÁO THẨM ĐỊNH TOÀN DIỆN & PHẢN BIỆN ADVERSARIAL (REVIEW & CHALLENGE REPORT)
## Kiểm định 36 Tài nguyên Vật lý (Visual & Audio) Dự án "Chánh Điện Tịnh Tâm"

- **Reviewer Agent**: `reviewer_asset_1` (Reviewer & Adversarial Critic)
- **Target Parent**: `orchestrator_2` (`4657945e-312a-4b1d-8783-863a86deb269`)
- **Đối tượng thẩm định**:
  - 27 tệp hình ảnh 2D từ `worker_visual_1` (`assets/backgrounds/`, `assets/altar/`, `assets/characters/`, `assets/fx/`)
  - 09 tệp âm thanh từ `worker_audio_1` (`assets/audio/sfx/`, `assets/audio/bgm/`)
  - Các tài liệu quy chuẩn: `manifest.json`, `ASSET_MANIFEST.md`, `ORIGINAL_REQUEST.md`, `SCOPE.md`
  - Mã nguồn thực thi: `public/js/CharacterRenderer.js`, `public/js/CanvasFloorEngine.js`, `scripts/verify_assets.mjs`
- **Thời gian thẩm định**: 2026-11-02T04:42:00Z

---

## 1. Review Summary (Tổng Kết Thẩm Định)

**Verdict (Phán quyết)**: **REQUEST_CHANGES (YÊU CẦU ĐIỀU CHỈNH)**

### Tóm tắt cốt lõi:
1. **Tính trung thực (Integrity Assessment)**: **ĐẠT (CLEAN)**. Không có hiện tượng gian lận, hardcode test kết quả, dùng facade giả mạo hay chèn dummy rỗng. Cả hai worker đều thực thi tạo tác thực thụ (pipeline PIL vector siêu mẫu 3x và giải thuật Node.js Buffer DSP với bộ lọc Biquad Bandpass + họa âm).
2. **Sự tồn tại vật lý**: **ĐẠT (36/36 tệp tồn tại trên đĩa, kích thước non-zero)**. Lệnh `node scripts/verify_assets.mjs` báo `0 / 29 missing physical files` và bộ kiểm tra độc lập `inspect_all_36_assets.py` xác nhận đủ 36 tệp.
3. **Lý do YÊU CẦU ĐIỀU CHỈNH (Blocking Defects)**:
   - **Lỗi Nghiêm Trọng (Critical)**: 03 bộ Spritesheet nhân vật (`char_woman`, `char_monk`, `char_nun`) được sinh với kích thước khung hình sai lệch so với `manifest.json` và `CharacterRenderer.js` (`fw` thực tế là 200, 215, 205 px thay vì 212 px). Khi engine Canvas 2D cắt khung hình với bước nhảy `fw = 212`, Frame 0-6 bị lệch chéo khung hình (cross-frame bleed) và Frame 7 (tọa thiền) cắt vượt quá biên ảnh ($sx + fw = 1484 + 212 = 1696 > 1600$), gây méo hoặc lỗi kết xuất trên OBS Studio CEF.
   - **Lỗi Đáng Kể (Major)**: 03 tượng Phật/Bồ Tát (`statue_shakyamuni.png`, `statue_amitabha.png`, `statue_avalokiteshvara.png`) được sinh ở kích thước 420×680 px trong khi `manifest.json` và `ASSET_MANIFEST.md` quy định 600×800 px (và 550×820 px). Tại `CanvasFloorEngine.js:144`, engine vẽ tượng vào khung 600×800 px, làm méo tỷ lệ co giãn ngang (bị kéo dẹp ngang 21.4%), làm mất đi tính trang nghiêm chuẩn mực.

---

## 2. Findings (Phát Hiện Chi Tiết)

### [Critical Finding 1] Lệch Kích Thước Khung Spritesheet Gây Tràn Bộ Đệm & Lệch Frame Trên Canvas 2D
- **Vấn đề (What)**:
  - `anim_woman.png` trên đĩa có kích thước `1600×300` (8 frames × 200px).
  - `anim_monk.png` trên đĩa có kích thước `1720×300` (8 frames × 215px).
  - `anim_nun.png` trên đĩa có kích thước `1640×300` (8 frames × 205px).
  - Tuy nhiên, trong `manifest.json` (dòng 175, 226, 243) và `ASSET_MANIFEST.md` (bảng 2.2), kích thước chuẩn của cả 3 nhân vật này đều là `212×300` (dải strip dài $8 \times 212 = 1696\text{px}$).
- **Vị trí (Where)**:
  - `assets/characters/c_woman.png`, `anim_woman.png`
  - `assets/characters/c_monk.png`, `anim_monk.png`
  - `assets/characters/c_nun.png`, `anim_nun.png`
  - Mã nguồn tiêu thụ: `public/js/CharacterRenderer.js:59-65` và `CharacterRenderer.js:292-303`.
- **Hệ quả kỹ thuật (Why)**:
  - Trong `public/js/CharacterRenderer.js:59-65`:
    ```javascript
    { id: 'char_woman', path: '/assets/characters/anim_woman.png', fw: 212, fh: 300, seatedH: 220 },
    { id: 'char_monk', path: '/assets/characters/anim_monk.png', fw: 212, fh: 300, seatedH: 215 },
    { id: 'char_nun', path: '/assets/characters/anim_nun.png', fw: 212, fh: 300, seatedH: 215 },
    ```
  - Khi vẽ frame tĩnh tọa thiền (Frame 7):
    `const sx = frameIndex * sheet.fw; // 7 * 212 = 1484`
    `ctx.drawImage(sheet.img, 1484, 0, 212, 300, ...);`
  - Với `anim_woman.png`, bề rộng ảnh trên đĩa chỉ có **1600px**. Khi cắt tại $sx = 1484$ với bề rộng $sw = 212$, vùng đọc chạm tới $1484 + 212 = 1696\text{px} > 1600\text{px}$.
  - Theo chuẩn W3C HTML5 Canvas 2D, khi $sx + sw$ vượt quá kích thước tự nhiên của ảnh nguồn, trình duyệt sẽ clamp hoặc gây biến dạng/lỗi hiển thị.
  - Hơn nữa, tại các frame bước đi (Frame 0-3), Frame 0 đọc `0..212` (lấn 12px sang Frame 1), Frame 1 đọc `212..424` (bắt đầu lệch 12px và lấn 24px sang Frame 2). Hoạt ảnh nhân vật sẽ bị giật và cắt xén thân người.
  - Điều này vi phạm trực tiếp Tiêu chí Nghiệm thu 96 & 97 trong `ORIGINAL_REQUEST.md`: *"All character spritesheet strips (`anim_*.png`) contain exactly 8 frames horizontally with frame dimensions matching `manifest.json`"*.
- **Đề xuất xử lý (Suggestion)**:
  - Cập nhật script `generate_characters.py` của `worker_visual_1` để sinh `char_woman`, `char_monk`, `char_nun` với `fw = 212`, tạo ra dải ảnh chuẩn `1696×300` px đồng nhất với `manifest.json` và `CharacterRenderer.js`.
  - Đồng bộ lại `c_woman.png`, `c_monk.png`, `c_nun.png` về kích thước `212×300` px.

---

### [Major Finding 2] Lệch Kích Thước Tượng Phật Gây Biến Dạng Tỷ Lệ Co Giãn Trên Khung Bàn Thờ
- **Vấn đề (What)**:
  - `statue_shakyamuni.png`, `statue_amitabha.png`, `statue_avalokiteshvara.png` trên đĩa có kích thước `420×680` px.
  - `manifest.json` quy định: Shakyamuni (`600×800`), Amitabha (`600×800`), Avalokiteshvara (`550×820`).
  - `ASSET_MANIFEST.md` quy định: Shakyamuni (`600×800`), Amitabha (`600×800`), Avalokiteshvara (`550×820`).
- **Vị trí (Where)**:
  - `assets/altar/statue_shakyamuni.png`
  - `assets/altar/statue_amitabha.png`
  - `assets/altar/statue_avalokiteshvara.png`
  - Mã nguồn tiêu thụ: `public/js/CanvasFloorEngine.js:144`.
- **Hệ quả kỹ thuật (Why)**:
  - Trong `public/js/CanvasFloorEngine.js:144`:
    ```javascript
    ctx.drawImage(this.images.statue, 240, 360, 600, 800);
    ```
  - Tỷ lệ khung hình gốc của ảnh được tạo: $420 / 680 \approx 0.6176$.
  - Tỷ lệ khung hình hộp đích trên Canvas: $600 / 800 = 0.7500$.
  - Khi Canvas ép ảnh vào hộp đích 600×800, hình ảnh tôn tượng Đức Phật bị kéo giãn ngang tới **+21.4%**, khiến sắc diện tượng bị dẹt ngang, phá vỡ tính thẩm mỹ tôn nghiêm và vi phạm mục Acceptance Criteria: *"Overlay displays at 1080×1920 vertical format without visual distortion"*.
- **Đề xuất xử lý (Suggestion)**:
  - Cập nhật script `generate_statues.py` để kết xuất ảnh với khung vẽ chuẩn 600×800 (cho Shakyamuni và Amitabha) và 550×820 (cho Avalokiteshvara). Tôn tượng đặt ở giữa với lề trong suốt (alpha), đảm bảo khi vẽ vào hộp Canvas không bị co giãn phi tỷ lệ.

---

### [Minor Finding 3] Lỗ Hổng Kiểm Tra Của Tập Lệnh `scripts/verify_assets.mjs`
- **Vấn đề (What)**:
  - `node scripts/verify_assets.mjs` báo `Physical files missing on disk count: 0 / 29` và kết thúc với exit code 0 mà không phát hiện ra sự sai lệch kích thước của ảnh thực tế.
- **Vị trí (Where)**:
  - `scripts/verify_assets.mjs:81-89` và `97-111`.
- **Hệ quả kỹ thuật (Why)**:
  - Dòng 81: `const filePath = item.path || item.staticPath;`
    Đối với mục `characters`, manifest dùng `staticPath` và `spritesheetPath`. Do đó `verify_assets.mjs` chỉ kiểm tra sự tồn tại của `staticPath` (`c_*.png`), hoàn toàn bỏ qua việc kiểm tra tệp `spritesheetPath` (`anim_*.png`) trên đĩa!
  - Kiểm tra specs tại dòng 98-110 chỉ kiểm tra xem trường `item.width` có được định nghĩa trong JSON hay không, hoàn toàn không đọc header của file vật lý trên đĩa để so sánh kích thước ảnh thực tế với đặc tả.
- **Đề xuất xử lý (Suggestion)**:
  - Bổ sung kiểm tra cả `spritesheetPath` cho danh mục characters.
  - Bổ sung hàm đọc kích thước nhị phân thực tế của tệp PNG/JPG để xác nhận kích thước tệp trên đĩa khớp 100% với `manifest.json`.

---

### [Minor Finding 4] Sai Lệch Khai Báo Bitrate Của Tệp Nhạc BGM MP3
- **Vấn đề (What)**:
  - `assets/audio/bgm/music1.mp3` và `music2.mp3` có bitrate thực tế là **160 kbps** (MPEG-1 Layer III, 44.1 kHz, Joint Stereo).
  - Trong khi đó, `manifest.json` (dòng 443, 459), `ASSET_MANIFEST.md` và `worker_audio_1/handoff.md` đều khai báo là **320 kbps**.
- **Vị trí (Where)**:
  - `assets/audio/bgm/music1.mp3`, `assets/audio/bgm/music2.mp3`
- **Đánh giá rủi ro (Risk Assessment)**:
  - Mức độ rủi ro: **Thấp**. Tệp MP3 160 kbps hoàn toàn phát bình thường trên trình duyệt và OBS Studio với chất lượng âm thanh trong trẻo, không gây lỗi runtime. Tuy nhiên, thông tin khai báo trong manifest không khớp với dữ liệu thực tế.
- **Đề xuất xử lý (Suggestion)**:
  - Cập nhật trường `bitrate: 160` trong `manifest.json` cho chính xác với tệp thực tế, hoặc re-encode tệp lên chuẩn 320 kbps nếu bắt buộc theo hợp đồng.

---

### [Minor Finding 5] Cửa Sổ Bộ Đệm Tìm Frame Sync Trong Script Kiểm Thử Của Worker Audio
- **Vấn đề (What)**:
  - Trong `worker_audio_1/verify_all_audio.py:85`, tập lệnh chỉ đọc 4096 byte đầu tiên để tìm kiếm byte đồng bộ MPEG (`0xFF 0xEx`). Do `music2.mp3` có phần header ID3v2 dài tới 4234 byte, frame đồng bộ đầu tiên nằm tại byte 4244, khiến script in ra `MPEG_Sync=False`.
- **Đánh giá thẩm định độc lập**:
  - Script độc lập `inspect_mp3.py` của reviewer đã phân tích qua toàn bộ ID3 synchsafe header và xác nhận: Frame audio đầu tiên của `music2.mp3` xuất hiện chính xác tại offset **4244** với byte `0xFF 0xFA` (MPEG-1 Layer III, 160 kbps). Tệp hoàn toàn hợp lệ, không bị lỗi cấu trúc.

---

## 3. Verified Claims (Các Xác Nhận Độc Lập Đã Kiểm Chứng Thành Công)

| Nội dung tuyên bố | Phương pháp kiểm chứng | Kết quả | Chi tiết |
|---|---|:---:|---|
| Toàn bộ 36 tệp tồn tại trên đĩa | Chạy script Python `inspect_all_36_assets.py` quét toàn bộ 36 đường dẫn | **PASS** | 0 tệp bị thiếu, 0 tệp 0-byte |
| 2 ảnh nền chuẩn 1080×1920 | Kiểm tra header JPEG và PIL size | **PASS** | `hall.jpg` (528 KB), `zen_garden.jpg` (786 KB) |
| Bàn thờ và phụ kiện bàn thờ | Kiểm tra kích thước và kênh Alpha (PNG) | **PASS** | `altar_table.png` (1080×850), `censer_bronze.png` (280×260), `candle_stand.png` (140×320), `meditation_cushion.png` (240×120) đều có `alpha_min = 0` |
| 4 tệp Visual FX | Kiểm tra kích thước và độ trong suốt | **PASS** | `fx_halo.png` (512×512), `fx_lotus.png` (128×128), `fx_petal.png` (64×64), `fx_bell.png` (256×256) |
| 7 tệp SFX WAV chuẩn 48kHz, 24-bit PCM | Đọc RIFF header, đếm sample, đo peak và RMS | **PASS** | Tần số lấy mẫu 48.000 Hz, 24-bit, 2 kênh Stereo. Đỉnh âm thanh nằm trong khoảng `-0.45 dBFS` đến `-4.11 dBFS` (hoàn toàn không bị clipping) |
| 2 tệp BGM MP3 | Phân tích ID3 header và MPEG frame sync | **PASS** | Cả 2 tệp đều có MPEG-1 Layer III frame sync hợp lệ |
| Độ trong suốt Alpha không bị hộp trắng | Kiểm tra `alpha_min` và các góc viền ảnh | **PASS** | Toàn bộ 25 tệp PNG đều có nền trong suốt (`alpha_min = 0`) |
| Thuật toán hoạt ảnh 8 frames nhân vật | Kiểm tra chiều cao dải ảnh và chia tỉ lệ 8 frames | **PASS (về số frame)** | Cả 7 dải ảnh đều có đúng 8 frames tuần tự |

---

## 4. Adversarial Challenge & Stress-Test Results (Phản Biện Đối Kháng)

### Thách thức 1: Tấn công tràn khung hình (Out-of-Bounds Frame Drift) khi đổi Skin qua NLP
- **Kịch bản tấn công**:
  Khán giả livestream gửi bình luận: *"cô niệm phật tinh tấn"*. Bộ tách từ khóa NLP trong `CharacterRenderer.js` nhận diện từ *"cô"* và chuyển đổi skin của nhân vật sang `char_woman`. Nhân vật bước vào (walk phase), quỳ gối (sitting phase) và chuyển sang tĩnh tọa thiền (sit idle phase, frameIndex = 7).
- **Phân tích va chạm**:
  - `CharacterRenderer.js` lấy thông số `fw = 212` cố định.
  - Vị trí cắt frame 7: $sx = 7 \times 212 = 1484$. Chiều rộng cần vẽ: $fw = 212$.
  - Tọa độ $X$ lớn nhất được truy cập: $1484 + 212 = 1696\text{px}$.
  - Tệp `anim_woman.png` thực tế chỉ có chiều rộng $1600\text{px}$.
- **Hậu quả dự đoán**: Vùng quét vượt quá biên ảnh 96 pixel. Trình duyệt Chromium/CEF sẽ clamp phần viền hoặc làm rách hình ảnh nhân vật hiển thị trên màn hình livestream.
- **Kết quả Stress Test**: **CONFIRMED VULNERABILITY (LỖ HỔNG XÁC NHẬN)**.

### Thách thức 2: Co giãn phi tỷ lệ tượng Phật trên luồng phát dọc
- **Kịch bản tấn công**:
  Streamer mở livestream ở độ phân giải dọc 1080×1920. Khán giả nhìn trực diện vào chánh điện.
- **Phân tích va chạm**:
  - `CanvasFloorEngine.js` gọi `drawImage` với kích thước cố định `600×800`.
  - Ảnh nguồn `statue_shakyamuni.png` có tỷ lệ $420 : 680 \approx 0.6176$.
  - Hộp vẽ có tỷ lệ $600 : 800 = 0.7500$.
- **Hậu quả dự đoán**: Bức tượng bị kéo giãn ngang 21.4%, mặt Phật và đài sen bị biến dạng dẹp, không đạt tiêu chuẩn tôn nghiêm.
- **Kết quả Stress Test**: **CONFIRMED DEFECT (KHUYẾT TẬT XÁC NHẬN)**.

### Thách thức 3: Quá tải âm lượng (Audio Clipping & Autoplay Failure)
- **Kịch bản tấn công**:
  Phát liên tục tiếng mõ đập nhanh (BPM cao) cùng lúc với chuông đại hồng chung và hiệu ứng cúng dường quà tặng.
- **Phân tích biên độ**:
  - Đo lường thực tế trên 7 tệp WAV:
    - `mo_strike_01.wav`: Peak = -0.50 dBFS
    - `mo_strike_02.wav`: Peak = -0.60 dBFS
    - `mo_strike_03.wav`: Peak = -0.45 dBFS
    - `bell_bowl.wav`: Peak = -4.11 dBFS
    - `bell_temple.wav`: Peak = -2.11 dBFS
    - `gift_tier1.wav`: Peak = -0.45 dBFS
    - `gift_tier2.wav`: Peak = -0.45 dBFS
- **Kết quả Stress Test**: **PASS**. Tất cả các tệp âm thanh đều được giới hạn biên độ an toàn dưới 0 dBFS. Bộ tạo đệm của `worker_audio_1` đã áp dụng thuật toán chuẩn hóa `gain = peak > 0.95 ? (0.95 / peak) : 1.0` cùng làm mờ đuôi 5ms, triệt tiêu hoàn toàn DC click.

---

## 5. Bảng Đối Soát Toàn Diện 36 Tài Nguyên (Comprehensive Asset Matrix)

| STT | Asset ID | File Path | Định dạng thực tế | Kích thước thực tế | Trạng thái kênh Alpha | Đánh giá Thẩm định |
|:---:|---|---|:---:|:---:|:---:|:---:|
| 1 | `bg_main_hall` | `assets/backgrounds/hall.jpg` | JPEG RGB | 1080×1920 | N/A | **PASS** |
| 2 | `bg_zen_garden` | `assets/backgrounds/zen_garden.jpg` | JPEG RGB | 1080×1920 | N/A | **PASS** |
| 3 | `altar_table_main` | `assets/altar/altar_table.png` | PNG RGBA | 1080×850 | Alpha (0..255) | **PASS** |
| 4 | `statue_shakyamuni` | `assets/altar/statue_shakyamuni.png` | PNG RGBA | 420×680 | Alpha (0..255) | **DEFECT (Lệch 600×800)** |
| 5 | `statue_amitabha` | `assets/altar/statue_amitabha.png` | PNG RGBA | 420×680 | Alpha (0..255) | **DEFECT (Lệch 600×800)** |
| 6 | `statue_avalokiteshvara` | `assets/altar/statue_avalokiteshvara.png` | PNG RGBA | 420×680 | Alpha (0..255) | **DEFECT (Lệch 550×820)** |
| 7 | `altar_censer_bronze` | `assets/altar/censer_bronze.png` | PNG RGBA | 280×260 | Alpha (0..255) | **PASS** |
| 8 | `altar_candle_stand` | `assets/altar/candle_stand.png` | PNG RGBA | 140×320 | Alpha (0..255) | **PASS** |
| 9 | `cushion_lotus_mat` | `assets/altar/meditation_cushion.png` | PNG RGBA | 240×120 | Alpha (0..255) | **PASS** |
| 10 | `c_man` (portrait) | `assets/characters/c_man.png` | PNG RGBA | 212×300 | Alpha (0..255) | **PASS** |
| 11 | `anim_man` (strip) | `assets/characters/anim_man.png` | PNG RGBA | 1696×300 | Alpha (0..255) | **PASS** |
| 12 | `c_woman` (portrait) | `assets/characters/c_woman.png` | PNG RGBA | 200×300 | Alpha (0..255) | **DEFECT (Lệch 212×300)** |
| 13 | `anim_woman` (strip) | `assets/characters/anim_woman.png` | PNG RGBA | 1600×300 | Alpha (0..255) | **CRITICAL DEFECT (Lệch 1696×300)** |
| 14 | `c_granny` (portrait) | `assets/characters/c_granny.png` | PNG RGBA | 195×300 | Alpha (0..255) | **PASS** |
| 15 | `anim_granny` (strip) | `assets/characters/anim_granny.png` | PNG RGBA | 1560×300 | Alpha (0..255) | **PASS** |
| 16 | `c_child` (portrait) | `assets/characters/c_child.png` | PNG RGBA | 180×260 | Alpha (0..255) | **PASS** |
| 17 | `anim_child` (strip) | `assets/characters/anim_child.png` | PNG RGBA | 1440×260 | Alpha (0..255) | **PASS** |
| 18 | `c_monk` (portrait) | `assets/characters/c_monk.png` | PNG RGBA | 215×300 | Alpha (0..255) | **DEFECT (Lệch 212×300)** |
| 19 | `anim_monk` (strip) | `assets/characters/anim_monk.png` | PNG RGBA | 1720×300 | Alpha (0..255) | **CRITICAL DEFECT (Lệch 1696×300)** |
| 20 | `c_nun` (portrait) | `assets/characters/c_nun.png` | PNG RGBA | 205×300 | Alpha (0..255) | **DEFECT (Lệch 212×300)** |
| 21 | `anim_nun` (strip) | `assets/characters/anim_nun.png` | PNG RGBA | 1640×300 | Alpha (0..255) | **CRITICAL DEFECT (Lệch 1696×300)** |
| 22 | `c_master` (portrait) | `assets/characters/c_master.png` | PNG RGBA | 230×320 | Alpha (0..255) | **PASS** |
| 23 | `anim_master` (strip) | `assets/characters/anim_master.png` | PNG RGBA | 1840×320 | Alpha (0..255) | **PASS** |
| 24 | `fx_halo` | `assets/fx/fx_halo.png` | PNG RGBA | 512×512 | Alpha (0..214) | **PASS** |
| 25 | `fx_lotus` | `assets/fx/fx_lotus.png` | PNG RGBA | 128×128 | Alpha (0..255) | **PASS** |
| 26 | `fx_petal` | `assets/fx/fx_petal.png` | PNG RGBA | 64×64 | Alpha (0..255) | **PASS** |
| 27 | `fx_bell` | `assets/fx/fx_bell.png` | PNG RGBA | 256×256 | Alpha (0..255) | **PASS** |
| 28 | `sfx_mo_01` | `assets/audio/sfx/mo_strike_01.wav` | WAV 48k 24b | 0.35s | N/A | **PASS** |
| 29 | `sfx_mo_02` | `assets/audio/sfx/mo_strike_02.wav` | WAV 48k 24b | 0.35s | N/A | **PASS** |
| 30 | `sfx_mo_03` | `assets/audio/sfx/mo_strike_03.wav` | WAV 48k 24b | 0.35s | N/A | **PASS** |
| 31 | `sfx_bell_bowl` | `assets/audio/sfx/bell_bowl.wav` | WAV 48k 24b | 4.50s | N/A | **PASS** |
| 32 | `sfx_bell_temple` | `assets/audio/sfx/bell_temple.wav` | WAV 48k 24b | 11.20s | N/A | **PASS** |
| 33 | `sfx_gift_tier1` | `assets/audio/sfx/gift_tier1.wav` | WAV 48k 24b | 1.80s | N/A | **PASS** |
| 34 | `sfx_gift_tier2` | `assets/audio/sfx/gift_tier2.wav` | WAV 48k 24b | 2.60s | N/A | **PASS** |
| 35 | `bgm_flute_peace` | `assets/audio/bgm/music1.mp3` | MP3 160k | 5m 20s | N/A | **PASS (Ghi chú bitrate 160k)** |
| 36 | `bgm_zither_morning` | `assets/audio/bgm/music2.mp3` | MP3 160k | 6m 15s | N/A | **PASS (Ghi chú bitrate 160k)** |

---

## 6. Kế Hoạch Khắc Phục Cụ Thể (Actionable Fix Plan)

Để đạt chứng nhận **APPROVE** tuyệt đối, các hành động sau cần được thực thi:

1. **Điều phối `worker_visual_1` cập nhật mã nguồn sinh nhân vật**:
   - Trong `generate_characters.py`: Đặt `fw: 212` cho cả `char_woman`, `char_monk`, `char_nun`.
   - Chạy lại để tái tạo `c_woman.png`, `anim_woman.png` (`1696×300`), `c_monk.png`, `anim_monk.png` (`1696×300`), `c_nun.png`, `anim_nun.png` (`1696×300`).
2. **Điều phối `worker_visual_1` cập nhật mã nguồn sinh tượng**:
   - Trong `generate_statues.py`: Đặt độ phân giải canvas xuất ra là `600×800` px cho `statue_shakyamuni.png` và `statue_amitabha.png`, và `550×820` px cho `statue_avalokiteshvara.png`. Tôn tượng căn giữa với lề trong suốt.
3. **Cập nhật `scripts/verify_assets.mjs`**:
   - Thêm kiểm tra `spritesheetPath` song song với `staticPath`.
   - Đọc kích thước file nhị phân thực tế để so sánh với kích thước yêu cầu trong manifest.
4. **Đồng bộ bitrate BGM trong `manifest.json`**:
   - Cập nhật trường `bitrate: 160` cho 2 mục BGM để khớp chính xác với tệp thực tế trên đĩa.
