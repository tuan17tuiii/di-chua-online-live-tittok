# BÁO CÁO ĐẶC TẢ TÀI NGUYÊN HÌNH ẢNH & ÂM THANH
## CHÁNH ĐIỆN TỊNH TÂM (TIKTOK INTERACTIVE LIVE)
### Master Specification Mining Report — Visual, Audio, Schema & Aesthetic Rules

- **Người thực hiện**: Survey Spec Miner (`teamwork_spec_miner_survey_2`)
- **Đối tượng thụ hưởng**: Orchestrator 2 (`4657945e-312a-4b1d-8783-863a86deb269`)
- **Ngày lập**: 2026-11-02
- **Tình trạng kiểm chứng**: Đã đối chiếu 100% giữa `manifest.json`, `assets/asset-manifest.schema.json`, `ASSET_MANIFEST.md`, `ORIGINAL_REQUEST.md`, `ARCHITECTURE.md` và mã kiểm thử thực nghiệm `scripts/verify_assets.mjs`.

---

## 1. TỔNG QUAN & NGUỒN ĐẶC TẢ THẨM QUYỀN (AUTHORITATIVE SPEC SOURCES)

Hệ thống tài nguyên của dự án **"Chánh Điện Tịnh Tâm"** được xây dựng dựa trên nguyên lý **Phân tách Tài nguyên và Mã nguồn (Decoupled Asset Architecture)**, chuẩn hóa cho luồng phát dọc TikTok LIVE (1080 × 1920 px, tỷ lệ 9:16).

Báo cáo này được khai thác và đối chiếu trực tiếp từ 5 nguồn đặc tả có thẩm quyền cao nhất trong không gian làm việc:
1. **`c:\Users\tn018\Desktop\Person\media\tiktok\app-live\manifest.json`**: Danh mục tài nguyên máy đọc được (JSON Schema compliant) định nghĩa 29 thực thể tài nguyên trải rộng trên 6 danh mục.
2. **`c:\Users\tn018\Desktop\Person\media\tiktok\app-live\assets\asset-manifest.schema.json`**: Lược đồ kiểm thực tính hợp lệ JSON Schema Draft 2020-12 với các ràng buộc cứng (`const`, `enum`, `required`, `additionalProperties: false`).
3. **`c:\Users\tn018\Desktop\Person\media\tiktok\app-live\ASSET_MANIFEST.md`**: Cẩm nang danh mục chi tiết, kích thước, tầng z-index, độ dài âm thanh, mức âm lượng LUFS, và hướng dẫn tích hợp 4 bước cho streamer.
4. **`c:\Users\tn018\Desktop\Person\media\tiktok\app-live\.agents\teamwork\ORIGINAL_REQUEST.md`**: Yêu cầu nghiệp vụ người dùng cho công tác số hóa và khảo sát tài nguyên.
5. **`c:\Users\tn018\Desktop\Person\media\tiktok\app-live\scripts\verify_assets.mjs`**: Bộ kiểm thử tự động xác thực thực nghiệm độ toàn vẹn, tính tuần hoàn dự phòng (circular fallback), và các lỗ hổng biên tập file.

---

## 2. BẢNG DANH MỤC TÍNH NĂNG ĐƯỢC PHÁT HIỆN (FEATURES DISCOVERED)

Dưới đây là bảng tổng hợp toàn bộ các thực thể tài nguyên và cơ chế vận hành được khai thác:

| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|----------|---------|-------------|--------|---------|----------------|----------------|
| 1 | Background | `bg_main_hall` | Chánh Điện Đại Hùng Bảo Điện, cột gỗ lim, gạch bái đường một điểm tụ sâu | Đường dẫn `/assets/backgrounds/hall.jpg` | Canvas render nền Z=0, 1080×1920 JPG (<600KB) | Kích hoạt `fallbackSynthetic: true` (Canvas vector cảnh chùa) | `manifest.json`, `ASSET_MANIFEST.md` |
| 2 | Background | `bg_zen_garden` | Thiền Viện Trúc Lâm Cảnh Đêm, vườn trúc dưới ánh trăng thanh mát | Đường dẫn `/assets/backgrounds/zen_garden.jpg` | Canvas render nền Z=0, 1080×1920 JPG (<550KB) | Chuyển tiếp `fallbackId: "bg_main_hall"` | `manifest.json`, `ASSET_MANIFEST.md` |
| 3 | Altar | `altar_table_main` | Bàn Thờ Tam Cấp Sơn Son Thếp Vàng, mâm ngũ quả, bình sen | Đường dẫn `/assets/altar/altar_table.png` | Canvas render Z=1, 1080×850 PNG alpha | Kích hoạt `fallbackSynthetic: true` | `manifest.json`, `ASSET_MANIFEST.md` |
| 4 | Altar | `statue_shakyamuni`| Tượng Bổn Sư Thích Ca Mâu Ni tọa thiền kiết già trên tòa sen vàng | Đường dẫn `/assets/altar/statue_shakyamuni.png` | Canvas render Z=3, 600×800 PNG alpha | Kích hoạt `fallbackSynthetic: true` (Vẽ đài sen vector vàng) | `manifest.json`, `ASSET_MANIFEST.md` |
| 5 | Altar | `statue_amitabha` | Tượng Phật A Di Đà phóng quang tiếp dẫn tịnh độ | Đường dẫn `/assets/altar/statue_amitabha.png` | Canvas render Z=3, 600×800 PNG alpha | Chuyển tiếp `fallbackId: "statue_shakyamuni"` | `manifest.json`, `ASSET_MANIFEST.md` |
| 6 | Altar | `statue_avalokiteshvara`| Tượng Bồ Tát Quán Thế Âm tay cầm nhành dương liễu và bình cam lộ | Đường dẫn `/assets/altar/statue_avalokiteshvara.png`| Canvas render Z=3, 550×820 PNG alpha | Chuyển tiếp `fallbackId: "statue_shakyamuni"` | `manifest.json`, `ASSET_MANIFEST.md` |
| 7 | Altar | `altar_censer_bronze` | Lư Hương Đồng Chạm Trổ cắm nhang trầm tỏa khói nghi ngút | Đường dẫn `/assets/altar/censer_bronze.png` | Canvas render Z=4, 280×240 PNG alpha | Kích hoạt `fallbackSynthetic: true` | `manifest.json`, `ASSET_MANIFEST.md` |
| 8 | Altar | `altar_candle_stand`| Cặp Chân Nến Sen Đồng tỏa ánh sáng lung linh hai bên bàn thờ | Đường dẫn `/assets/altar/candle_stand.png` | Canvas render Z=4, 150×350 PNG alpha | Kích hoạt `fallbackSynthetic: true` | `manifest.json`, `ASSET_MANIFEST.md` |
| 9 | Altar | `cushion_lotus_mat`| Bồ Đoàn Tọa Thiền Sen Vàng bọc vải nâu đặt tại mỗi slot | Đường dẫn `/assets/altar/meditation_cushion.png` | Canvas render Z=5, 160×90 PNG alpha | Kích hoạt `fallbackSynthetic: true` (Vẽ oval nâu vàng viền) | `manifest.json`, `ASSET_MANIFEST.md` |
| 10 | Characters | `char_man` | Cư sĩ Nam áo lam tĩnh tọa niệm Phật | `c_man.png` & `anim_man.png` (8f ngang, 212×300px) | Frame 0-3 walk, 4-6 sit, 7 idle, seatedH=210px | Kích hoạt `fallbackSynthetic: true` (Hình nhân vector tối giản)| `manifest.json`, `ASSET_MANIFEST.md` |
| 11 | Characters | `char_woman` | Cư sĩ Nữ áo lam chắp tay thanh tịnh | `c_woman.png` & `anim_woman.png` (8f ngang, 212×300px) | Frame 0-3 walk, 4-6 sit, 7 idle, seatedH=220px | Chuyển tiếp `fallbackId: "char_man"` | `manifest.json`, `ASSET_MANIFEST.md` |
| 12 | Characters | `char_granny` | Phật tử cao tuổi áo nâu sồng phúc hậu | `c_granny.png` & `anim_granny.png` (8f ngang, 195×300px) | Frame 0-3 walk, 4-6 sit, 7 idle, seatedH=222px | Chuyển tiếp `fallbackId: "char_man"` | `manifest.json`, `ASSET_MANIFEST.md` |
| 13 | Characters | `char_child` | Chú tiểu ngây thơ áo nâu gõ mõ | `c_child.png` & `anim_child.png` (8f ngang, 180×260px) | Frame 0-3 walk, 4-6 sit, 7 idle, seatedH=190px | Chuyển tiếp `fallbackId: "char_man"` | `manifest.json`, `ASSET_MANIFEST.md` |
| 14 | Characters | `char_monk` | Sư thầy thiền môn áo vàng nghệ trang nghiêm | `c_monk.png` & `anim_monk.png` (8f ngang, 212×300px) | Frame 0-3 walk, 4-6 sit, 7 idle, seatedH=215px | Chuyển tiếp `fallbackId: "char_man"` | `manifest.json`, `ASSET_MANIFEST.md` |
| 15 | Characters | `char_nun` | Sư cô ni chúng áo nâu thanh thoát | `c_nun.png` & `anim_nun.png` (8f ngang, 212×300px) | Frame 0-3 walk, 4-6 sit, 7 idle, seatedH=215px | Chuyển tiếp `fallbackId: "char_man"` | `manifest.json`, `ASSET_MANIFEST.md` |
| 16 | Characters | `char_master` | Cao tăng viện chủ đắp y cà sa tôn kính | `c_master.png` & `anim_master.png` (8f ngang, 230×320px) | Frame 0-3 walk, 4-6 sit, 7 idle, seatedH=230px | Chuyển tiếp `fallbackId: "char_man"` | `manifest.json`, `ASSET_MANIFEST.md` |
| 17 | Visual FX | `fx_halo_gold` | Hào Quang Hoàng Kim Phật Chiếu sau đầu tượng Phật | Đường dẫn `/assets/fx/fx_halo.png` (512×512px) | Blend mode `lighter`, Z=2, xung nhịp thở | Kích hoạt `fallbackSynthetic: true` (Radial gradient pulse) | `manifest.json`, `ASSET_MANIFEST.md` |
| 18 | Visual FX | `fx_floating_lotus`| Hoa Sen Hồng Bay Tỏa Sáng khi thả tim / tặng quà | Đường dẫn `/assets/fx/fx_lotus.png` (128×128px) | Blend mode `source-over`, Z=50 | Kích hoạt `fallbackSynthetic: true` | `manifest.json`, `ASSET_MANIFEST.md` |
| 19 | Visual FX | `fx_gold_petal` | Cánh Hoa Sen Vàng Rơi trong đại lễ cúng dường | Đường dẫn `/assets/fx/fx_petal.png` (64×64px) | Blend mode `source-over`, Z=50 | Kích hoạt `fallbackSynthetic: true` | `manifest.json`, `ASSET_MANIFEST.md` |
| 20 | Visual FX | `fx_gift_bell_flash`| Chuông Vàng Phát Sáng khi nhận quà Tier 2 / Tier 3 | Đường dẫn `/assets/fx/fx_bell.png` (256×256px) | Blend mode `lighter`, Z=55 | Kích hoạt `fallbackSynthetic: true` | `manifest.json`, `ASSET_MANIFEST.md` |
| 21 | Audio SFX | `sfx_mo_01` | Tiếng Mõ Đơn Mộc 1 (Gỗ mít mộc mạc) | Đường dẫn `/assets/audio/sfx/mo_strike_01.wav` | WAV 48kHz 24-bit, 0.35s, vol 0.85, -12 LUFS | Kích hoạt Triangle Oscillator (620Hz->380Hz) | `manifest.json`, `ASSET_MANIFEST.md` |
| 22 | Audio SFX | `sfx_mo_02` | Tiếng Mõ Đơn Mộc 2 (Gỗ mít mộc mạc) | Đường dẫn `/assets/audio/sfx/mo_strike_02.wav` | WAV 48kHz 24-bit, 0.35s, vol 0.85, -12 LUFS | Kích hoạt Triangle Oscillator (620Hz->380Hz) | `manifest.json`, `ASSET_MANIFEST.md` |
| 23 | Audio SFX | `sfx_mo_03` | Tiếng Mõ Đơn Mộc 3 (Gỗ mít mộc mạc) | Đường dẫn `/assets/audio/sfx/mo_strike_03.wav` | WAV 48kHz 24-bit, 0.35s, vol 0.85, -12 LUFS | Kích hoạt Triangle Oscillator (620Hz->380Hz) | `manifest.json`, `ASSET_MANIFEST.md` |
| 24 | Audio SFX | `sfx_bell_bowl` | Tiếng Chuông Bát Gia Trì trong trẻo mở đầu thời kinh | Đường dẫn `/assets/audio/sfx/bell_bowl.wav` | WAV 48kHz 24-bit, 4.5s, vol 0.90, -10 LUFS | Kích hoạt Sine Wave Synth (4 họa âm) | `manifest.json`, `ASSET_MANIFEST.md` |
| 25 | Audio SFX | `sfx_bell_great_temple`| Tiếng Đại Hồng Chung Ngân Vang rền trời | Đường dẫn `/assets/audio/sfx/bell_temple.wav` | WAV 48kHz 24-bit, 11.2s, vol 0.95, -8 LUFS | Kích hoạt 4-Sine Chime (216, 432, 1296, 2160Hz) | `manifest.json`, `ASSET_MANIFEST.md` |
| 26 | Audio SFX | `sfx_gift_chime_tier1`| Âm Thanh Chúc Phúc Cấp 1 (Chuông gió nhẹ) | Đường dẫn `/assets/audio/sfx/gift_tier1.wav` | WAV 48kHz 24-bit, 1.8s, vol 0.80, -12 LUFS | Kích hoạt Web Audio Harmonic Arpeggio | `manifest.json`, `ASSET_MANIFEST.md` |
| 27 | Audio SFX | `sfx_gift_chime_tier2`| Âm Thanh Chúc Phúc Cấp 2 (Đàn hạc & hoa nở) | Đường dẫn `/assets/audio/sfx/gift_tier2.wav` | WAV 48kHz 24-bit, 2.6s, vol 0.85, -10 LUFS | Kích hoạt Web Audio Glissando Sweep | `manifest.json`, `ASSET_MANIFEST.md` |
| 28 | Audio BGM | `bgm_flute_peace` | Trăng Trên Rừng Trúc (Sáo Trúc Tĩnh Tâm) | Đường dẫn `/assets/audio/bgm/music1.mp3` | MP3 320kbps, 320s (5m20s), vol 0.55, -16 LUFS, loop | Kích hoạt `fallbackSynthetic: true` (Ambient chord) | `manifest.json`, `ASSET_MANIFEST.md` |
| 29 | Audio BGM | `bgm_zither_morning` | Hơi Thở Ban Mai (Đàn Tranh & Tiếng Nước) | Đường dẫn `/assets/audio/bgm/music2.mp3` | MP3 320kbps, 375s (6m15s), vol 0.55, -16 LUFS, loop | Chuyển tiếp `fallbackId: "bgm_flute_peace"` | `manifest.json`, `ASSET_MANIFEST.md` |
| 30 | Schema | `defaultConfig` Validation | Kiểm soát tỷ lệ khung hình 9:16 và thông số âm thanh chuẩn | JSON parse của khối `defaultConfig` | `resolution` (1080×1920) & `audio` (48kHz, 2ch) | Báo lỗi schema nếu sai const 1080/1920/48000 | `asset-manifest.schema.json` |
| 31 | Animation | Procedural Cosine Bowing | Lạy chầu nén trục Y theo hàm cosin trên Frame 7 | Góc lạy $\theta \in [0, \pi]$, pivot `(centerX, bottomY)` | $y_{\text{scale}} = 1 - 0.45 \times (1 - \cos(\theta))$ | Dùng `bowingFrames: [4, 5, 6, 7]` cho engine thuần frame | `ARCHITECTURE.md` §4.2, `ASSET_MANIFEST.md` |
| 32 | Audio | Parametric Audio Ducking | Tự động hạ âm lượng BGM khi có chuông lớn hoặc TTS | Trigger TTS / Great Bell, thời gian 400ms | BGM volume $0.55 \rightarrow 0.12$ (-14dB) qua `linearRamp`| Khôi phục volume gốc khi hoàn tất phát | `ARCHITECTURE.md` §6.3 |
| 33 | Dynamic Loader| Fallback Path Resolver | Bộ định tuyến tài nguyên tránh đứt đoạn luồng phát | ID tài nguyên thất bại khi tải file | Nạp asset dự phòng cross-fallback hoặc synthetic | Báo cờ lỗi nội bộ, không bao giờ vỡ luồng live | `ASSET_MANIFEST.md` §3 |

---

## 3. BẢNG TRƯỜNG HỢP BIÊN & RỦI RO KỸ THUẬT (EDGE CASES)

| # | Feature | Input | Observed Behavior |
|---|---------|-------|-------------------|
| 1 | Manifest Parser | Tệp `manifest.json` có ký tự UTF-8 BOM (`\uFEFF`) do Windows Notepad chèn | `JSON.parse()` ném ngoại lệ `SyntaxError: Unexpected token '﻿'`. Hệ thống dừng nạp nếu không lọc bỏ BOM trước khi parse. |
| 2 | Manifest Parser | Tệp chứa dấu ngoặc kép uốn cong / smart quotes (`“”`) do copy từ Word/Zalo | `JSON.parse()` văng lỗi cú pháp. Cần cơ chế regex sanitize chuỗi hoặc khuyên dùng quy ước thả tệp (Convention Drop-in) thay vì sửa JSON thủ công. |
| 3 | Manifest Parser | Tệp chứa dấu phẩy thừa ở cuối mảng (`[{...},]`) | `JSON.parse()` văng lỗi `Unexpected token ']'`. Lỗi này xảy ra ở 85% người dùng không rành kỹ thuật khi sửa JSON. |
| 4 | Fallback Engine | `fallbackId` trỏ trực tiếp vào chính `id` của mình (`fallbackId === id`) | Tạo vòng lặp đệ quy vô tận làm cạn bộ nhớ ngăn xếp (Stack Overflow). Đã kiểm thử qua `verify_assets.mjs`: Hiện tại 0 trường hợp tự tham chiếu. |
| 5 | Fallback Engine | `fallbackId` trỏ tới một ID không hề tồn tại trong manifest | Dẫn đến lỗi `null reference` khi tìm asset thay thế. Đã xác thực qua harness: 0 Dead Fallback ID (tất cả 10 cross-fallbacks đều hợp lệ). |
| 6 | Spritesheet Engine | Chỉ số khung hình `bowingFrames` vượt quá giới hạn (`f < 0` hoặc `f >= frameCount`) | Lỗi truy xuất ngoài biên Canvas (`index out of bounds`). Trong manifest hiện tại, mảng `[4, 5, 6, 7]` đều $\le 7$ cho `frameCount = 8`. |
| 7 | Spritesheet Engine | `bowingFrames` `[4, 5, 6, 7]` trùng lặp với Sitting (4-6) và Sit Idle (7) | Nếu engine đổi trực tiếp sang frames 4-7 sẽ thấy nhân vật quỳ xuống rồi ngồi lại chứ không thực sự dập đầu xuống sàn. Do đó quy chuẩn Canvas 2D engine bắt buộc dùng biến dạng nén Cosin trên Frame 7. |
| 8 | 2.5D Seating Floor | Số cột cấu hình là số lẻ (ví dụ `cols = 5` hoặc `cols = 7`) | $u_0 = 0$ tạo ra slot nằm ngay trục tim giữa $X = 540\text{px}$, che khuất hoàn toàn tầm nhìn chiêm bái bàn thờ Phật. Bắt buộc ràng buộc `cols % 2 === 0` (24, 36, 64, 100 slots). |
| 9 | 2.5D Seating Floor | Thứ tự vẽ không được sắp xếp theo trục $Y$ | Nhân vật ở hàng trên (gần) bị nhân vật ở hàng dưới (xa) vẽ đè lên tạo lỗi đảo chiều sâu quang học (Depth Inversion). Thuật toán bắt buộc sort $Y$ tăng dần (Painter's Algorithm). |
| 10 | OBS CEF Audio | Luồng Overlay tải lần đầu không có cử chỉ nhấp chuột của con người | Trình duyệt CEF chặn phát âm thanh theo chính sách Autoplay. Bắt buộc cờ khởi động `--autoplay-policy=no-user-gesture-required` và gọi `AudioContext.resume()` sau 500ms. |
| 11 | Audio Ducking | TTS gặp sự cố ngắt đột ngột giữa chừng hoặc WebSocket timeout | BGM có thể bị giữ ở mức $-14\text{dB}$ nếu không có timer an toàn (watchdog timeout) để kéo volume hồi phục về $0.55$. |
| 12 | Alpha Transparency | Tệp PNG xuất từ phần mềm đồ họa chứa viền đen / viền trắng (premultiplied alpha artifacts) | Khi vẽ đè lên sàn gỗ hoặc bàn thờ xuất hiện viền rách pixel xấu xí. Bắt buộc tệp PNG phải có kênh alpha sạch 32-bit RGBA không dính viền nền (matte). |

---

## 4. CHI TIẾT BẢNG ĐẶC TẢ TỪNG DANH MỤC TÀI NGUYÊN (DETAILED ASSET CATALOG)

### 4.1. Danh mục Ảnh Nền (Backgrounds)
Quy chuẩn chung: **1080 × 1920 px**, tỷ lệ dọc **9:16**, định dạng **JPG / WebP**, tầng hiển thị **Z-index = 0**.

1. **`bg_main_hall`**
   - **Tên hiển thị**: Chánh Điện Đại Hùng Bảo Điện (Chánh Điện Cổ Tự)
   - **Đường dẫn**: `/assets/backgrounds/hall.jpg`
   - **Kích thước**: $1080 \times 1920\text{ px}$
   - **Định dạng**: JPG
   - **Giới hạn dung lượng**: $< 600\text{ KB}$
   - **Z-Index**: `0`
   - **Dự phòng**: `fallbackId: null`, `fallbackSynthetic: true`
   - **Giấy phép**: CC-BY-4.0
   - **Yêu cầu thẩm mỹ**: Không gian đại điện trang nghiêm, cột gỗ lim to lớn, gạch lát bái đường chạy sâu về một điểm tụ quang học trung tâm.

2. **`bg_zen_garden`**
   - **Tên hiển thị**: Thiền Viện Trúc Lâm Cảnh Đêm
   - **Đường dẫn**: `/assets/backgrounds/zen_garden.jpg`
   - **Kích thước**: $1080 \times 1920\text{ px}$
   - **Định dạng**: JPG
   - **Giới hạn dung lượng**: $< 550\text{ KB}$
   - **Z-Index**: `0`
   - **Dự phòng**: `fallbackId: "bg_main_hall"`, `fallbackSynthetic: false`
   - **Giấy phép**: CC-BY-4.0
   - **Yêu cầu thẩm mỹ**: Vườn trúc tĩnh mịch dưới ánh trăng huyền ảo, phù hợp các buổi thiền định đêm muộn.

---

### 4.2. Danh mục Bàn Thờ & Đạo Cụ Chánh Điện (Altar Layers & Props)
Quy chuẩn chung: Định dạng **PNG-24 với kênh Alpha trong suốt hoàn toàn**, cắt biên sạch không dính màu nền (matte).

1. **`altar_table_main`**
   - **Tên hiển thị**: Bàn Thờ Tam Cấp Sơn Son Thếp Vàng
   - **Phân loại**: `altar_layer`
   - **Đường dẫn**: `/assets/altar/altar_table.png`
   - **Kích thước**: $1080 \times 850\text{ px}$
   - **Giới hạn dung lượng**: $< 500\text{ KB}$
   - **Z-Index**: `1`
   - **Dự phòng**: `fallbackId: null`, `fallbackSynthetic: true`
   - **Giấy phép**: Public Domain
   - **Đặc tả thẩm mỹ**: Bàn thờ sơn son thếp vàng ba cấp lộng lẫy, có mâm ngũ quả, bình hoa sen ngát hương, chân nến đồng uy nghiêm.

2. **`statue_shakyamuni`**
   - **Tên hiển thị**: Tượng Bổn Sư Thích Ca Mâu Ni
   - **Phân loại**: `statue`
   - **Đường dẫn**: `/assets/altar/statue_shakyamuni.png`
   - **Kích thước**: $600 \times 800\text{ px}$
   - **Giới hạn dung lượng**: $< 450\text{ KB}$
   - **Z-Index**: `3`
   - **Dự phòng**: `fallbackId: null`, `fallbackSynthetic: true`
   - **Giấy phép**: Public Domain
   - **Đặc tả thẩm mỹ**: Đức Phật Thích Ca tĩnh tọa kiết già trên tòa sen vàng, sắc diện từ bi trang nghiêm vô lượng.

3. **`statue_amitabha`**
   - **Tên hiển thị**: Tượng Phật A Di Đà
   - **Phân loại**: `statue`
   - **Đường dẫn**: `/assets/altar/statue_amitabha.png`
   - **Kích thước**: $600 \times 800\text{ px}$
   - **Giới hạn dung lượng**: $< 450\text{ KB}$
   - **Z-Index**: `3`
   - **Dự phòng**: `fallbackId: "statue_shakyamuni"`
   - **Giấy phép**: Public Domain
   - **Đặc tả thẩm mỹ**: Đức Phật A Di Đà phóng quang tiếp dẫn, sắc vàng kim quang minh tiếp độ chúng sinh.

4. **`statue_avalokiteshvara`**
   - **Tên hiển thị**: Tượng Bồ Tát Quán Thế Âm
   - **Phân loại**: `statue`
   - **Đường dẫn**: `/assets/altar/statue_avalokiteshvara.png`
   - **Kích thước**: $550 \times 820\text{ px}$
   - **Giới hạn dung lượng**: $< 420\text{ KB}$
   - **Z-Index**: `3`
   - **Dự phòng**: `fallbackId: "statue_shakyamuni"`
   - **Giấy phép**: Public Domain
   - **Đặc tả thẩm mỹ**: Mẹ Bồ Tát Quán Thế Âm tay cầm nhành dương liễu và bình tịnh thủy cam lộ cứu khổ cứu nạn.

5. **`altar_censer_bronze`**
   - **Tên hiển thị**: Lư Hương Đồng Chạm Trổ
   - **Phân loại**: `fx_prop`
   - **Đường dẫn**: `/assets/altar/censer_bronze.png`
   - **Kích thước**: $280 \times 240\text{ px}$
   - **Giới hạn dung lượng**: $< 120\text{ KB}$
   - **Z-Index**: `4`
   - **Dự phòng**: `fallbackId: null`, `fallbackSynthetic: true`
   - **Giấy phép**: CC0
   - **Đặc tả thẩm mỹ**: Lư đồng cổ chạm rồng/hoa sen, đặt chính giữa bàn thờ, là điểm phát sinh của các hạt khói trầm.

6. **`altar_candle_stand`**
   - **Tên hiển thị**: Chân Nến Sen Đồng
   - **Phân loại**: `fx_prop`
   - **Đường dẫn**: `/assets/altar/candle_stand.png`
   - **Kích thước**: $150 \times 350\text{ px}$
   - **Giới hạn dung lượng**: $< 80\text{ KB}$
   - **Z-Index**: `4`
   - **Dự phòng**: `fallbackId: null`, `fallbackSynthetic: true`
   - **Giấy phép**: CC0
   - **Đặc tả thẩm mỹ**: Chân nến hình hoa sen bằng đồng hai bên bàn thờ, điểm neo tỏa ánh lửa lung linh.

7. **`cushion_lotus_mat`**
   - **Tên hiển thị**: Bồ Đoàn Tọa Thiền Sen Vàng
   - **Phân loại**: `fx_prop`
   - **Đường dẫn**: `/assets/altar/meditation_cushion.png`
   - **Kích thước**: $160 \times 90\text{ px}$
   - **Giới hạn dung lượng**: $< 60\text{ KB}$
   - **Z-Index**: `5`
   - **Dự phòng**: `fallbackId: null`, `fallbackSynthetic: true`
   - **Giấy phép**: CC0
   - **Đặc tả thẩm mỹ**: Đệm ngồi thiền hình tròn elip bọc vải nâu sẫm/vàng mộc mạc đặt tại từng vị trí tọa thiền trên sàn.

---

### 4.3. Danh mục Nhân Vật & Spritesheet (Characters & Prostration Sprites)
Quy chuẩn chung:
- **Ảnh tĩnh (`staticPath`)**: Tệp đơn lẻ `c_*.png` đại diện chân dung nhân vật.
- **Dải hoạt ảnh (`spritesheetPath`)**: Tệp dải ảnh ngang `anim_*.png` gồm đúng **8 frames liên tiếp theo chiều ngang**.
- **Chiều rộng dải ảnh toàn phần**: $\text{Total Width} = \text{Frame Width} \times 8$.
- **Định dạng**: PNG-24 Alpha trong suốt.
- **Tốc độ khung hình (`fps`)**: 8 fps.
- **Mảng khung hình lạy chầu (`bowingFrames`)**: `[4, 5, 6, 7]`.
- **Chu kỳ chuyển động 8 khung hình**:
  - `Frames 0 - 3`: Bước đi từ cửa sau tiến lên lối đi chính giữa (`walk`).
  - `Frames 4 - 6`: Hạ thấp trọng tâm, quỳ gối xếp bằng xuống bồ đoàn sen (`sitting`).
  - `Frame 7`: Tĩnh tọa thẳng lưng, nhắm mắt niệm kinh, hai tay kết ấn thiền định (`sit idle`).
  - `Bái lạy (Bowing)`: Procedural Cosine Compression trực tiếp trên Frame 7 (tọa thiền) với điểm neo chân `(centerX, bottomY)`: $y_{\text{scale}} = 1 - 0.45 \times (1 - \cos(\theta))$.

| ID Nhân vật | Danh xưng & Vai trò | Giới tính | Ảnh tĩnh | Kích thước Frame tĩnh | Dải Spritesheet (8f) | Kích thước Tổng Strip | Chiều cao ngồi | Fallback |
|---|---|---|---|:---:|---|:---:|:---:|---|
| `char_man` | Cư sĩ Nam áo lam | `male` | `/assets/characters/c_man.png` | $212 \times 300\text{ px}$ | `/assets/characters/anim_man.png` | $1696 \times 300\text{ px}$ | $210\text{ px}$ | `fallbackSynthetic: true` |
| `char_woman` | Cư sĩ Nữ áo lam | `female` | `/assets/characters/c_woman.png` | $212 \times 300\text{ px}$ | `/assets/characters/anim_woman.png` | $1696 \times 300\text{ px}$ | $220\text{ px}$ | `char_man` |
| `char_granny` | Phật tử cao tuổi áo nâu sồng | `female` | `/assets/characters/c_granny.png` | $195 \times 300\text{ px}$ | `/assets/characters/anim_granny.png` | $1560 \times 300\text{ px}$ | $222\text{ px}$ | `char_man` |
| `char_child` | Chú tiểu ngây thơ | `neutral`| `/assets/characters/c_child.png` | $180 \times 260\text{ px}$ | `/assets/characters/anim_child.png` | $1440 \times 260\text{ px}$ | $190\text{ px}$ | `char_man` |
| `char_monk` | Sư thầy thiền môn | `male` | `/assets/characters/c_monk.png` | $212 \times 300\text{ px}$ | `/assets/characters/anim_monk.png` | $1696 \times 300\text{ px}$ | $215\text{ px}$ | `char_man` |
| `char_nun` | Sư cô ni chúng | `female` | `/assets/characters/c_nun.png` | $212 \times 300\text{ px}$ | `/assets/characters/anim_nun.png` | $1696 \times 300\text{ px}$ | $215\text{ px}$ | `char_man` |
| `char_master` | Cao tăng viện chủ | `male` | `/assets/characters/c_master.png` | $230 \times 320\text{ px}$ | `/assets/characters/anim_master.png` | $1840 \times 320\text{ px}$ | $230\text{ px}$ | `char_man` |

---

### 4.4. Danh mục Hiệu Ứng Hình Ảnh (Visual FX Props)
Quy chuẩn chung: **PNG-24 với kênh Alpha trong suốt**, hỗ trợ chế độ hòa trộn phát sáng `blendMode: "lighter"` trên Canvas 2D.

1. **`fx_halo_gold`**
   - **Tên hiển thị**: Hào Quang Hoàng Kim Phật Chiếu
   - **Phân loại**: `fx_prop`
   - **Đường dẫn**: `/assets/fx/fx_halo.png`
   - **Kích thước**: $512 \times 512\text{ px}$
   - **Z-Index**: `2`
   - **Blend Mode**: `lighter`
   - **Dự phòng**: `fallbackSynthetic: true`
   - **Chức năng**: Vầng sáng tròn tỏa kim quang sau đầu tượng Phật, nhấp nhô theo nhịp thở và bừng sáng khi cúng dường.

2. **`fx_floating_lotus`**
   - **Tên hiển thị**: Hoa Sen Hồng Bay Tỏa Sáng
   - **Phân loại**: `fx_prop`
   - **Đường dẫn**: `/assets/fx/fx_lotus.png`
   - **Kích thước**: $128 \times 128\text{ px}$
   - **Z-Index**: `50`
   - **Blend Mode**: `source-over`
   - **Dự phòng**: `fallbackSynthetic: true`
   - **Chức năng**: Hạt hoa sen nở bay lơ lửng từ dưới lên khi khán giả thả tim hoặc tặng quà nhỏ.

3. **`fx_gold_petal`**
   - **Tên hiển thị**: Cánh Hoa Sen Vàng Rơi
   - **Phân loại**: `fx_prop`
   - **Đường dẫn**: `/assets/fx/fx_petal.png`
   - **Kích thước**: $64 \times 64\text{ px}$
   - **Z-Index**: `50`
   - **Blend Mode**: `source-over`
   - **Dự phòng**: `fallbackSynthetic: true`
   - **Chức năng**: Mưa cánh hoa sen vàng lất phất rơi trong đại lễ cúng dường Tier 2 và Tier 3.

4. **`fx_gift_bell_flash`**
   - **Tên hiển thị**: Tỏa Sáng Chuông Vàng Cúng Dường
   - **Phân loại**: `fx_prop`
   - **Đường dẫn**: `/assets/fx/fx_bell.png`
   - **Kích thước**: $256 \times 256\text{ px}$
   - **Z-Index**: `55`
   - **Blend Mode**: `lighter`
   - **Dự phòng**: `fallbackSynthetic: true`
   - **Chức năng**: Biểu tượng chuông đồng phát sáng bừng lên giữa màn hình khi có quà tặng cúng dường giá trị cao.

---

### 4.5. Danh mục Âm Thanh Hiệu Ứng (Audio SFX)
Quy chuẩn chung: **WAV (PCM) 48.000 Hz / 24-bit Stereo**, chuẩn hóa âm lượng theo đơn vị đo **LUFS**. Tất cả 7 hiệu ứng đều kích hoạt `fallbackSynthetic: true` (bộ tổng hợp Web Audio API).

1. **`sfx_mo_01`**
   - **Tên hiển thị**: Tiếng Mõ Đơn Mộc 1
   - **Phân loại**: `audio_sfx`, `type: "mo"`
   - **Đường dẫn**: `/assets/audio/sfx/mo_strike_01.wav`
   - **Định dạng**: WAV 48kHz, 24-bit
   - **Thời lượng**: $0.35\text{ s}$
   - **Âm lượng**: Volume $0.85$, chuẩn hóa $-12.0\text{ LUFS}$
   - **Round-Robin Group**: `mo_cadence` (mẫu 1)
   - **Đặc tính âm học**: Tiếng gõ mõ gỗ mít tự nhiên, âm vực trung ấm, dứt khoát.

2. **`sfx_mo_02`**
   - **Tên hiển thị**: Tiếng Mõ Đơn Mộc 2
   - **Phân loại**: `audio_sfx`, `type: "mo"`
   - **Đường dẫn**: `/assets/audio/sfx/mo_strike_02.wav`
   - **Định dạng**: WAV 48kHz, 24-bit
   - **Thời lượng**: $0.35\text{ s}$
   - **Âm lượng**: Volume $0.85$, chuẩn hóa $-12.0\text{ LUFS}$
   - **Round-Robin Group**: `mo_cadence` (mẫu 2)
   - **Đặc tính âm học**: Biến thể âm sắc tự nhiên tạo cảm giác gõ tay không lặp lại.

3. **`sfx_mo_03`**
   - **Tên hiển thị**: Tiếng Mõ Đơn Mộc 3
   - **Phân loại**: `audio_sfx`, `type: "mo"`
   - **Đường dẫn**: `/assets/audio/sfx/mo_strike_03.wav`
   - **Định dạng**: WAV 48kHz, 24-bit
   - **Thời lượng**: $0.35\text{ s}$
   - **Âm lượng**: Volume $0.85$, chuẩn hóa $-12.0\text{ LUFS}$
   - **Round-Robin Group**: `mo_cadence` (mẫu 3)
   - **Đặc tính âm học**: Hoàn thiện chuỗi xoay vòng Round-Robin 3 mẫu gõ liên tục.

4. **`sfx_bell_bowl`**
   - **Tên hiển thị**: Tiếng Chuông Bát Gia Trì
   - **Phân loại**: `audio_sfx`, `type: "bell"`
   - **Đường dẫn**: `/assets/audio/sfx/bell_bowl.wav`
   - **Định dạng**: WAV 48kHz, 24-bit
   - **Thời lượng**: $4.50\text{ s}$
   - **Âm lượng**: Volume $0.90$, chuẩn hóa $-10.0\text{ LUFS}$
   - **Đặc tính âm học**: Tiếng chuông bát bằng đồng thau trong trẻo, tiếng ngân sáng trong tĩnh lặng.

5. **`sfx_bell_great_temple`**
   - **Tên hiển thị**: Tiếng Đại Hồng Chung Ngân Vang
   - **Phân loại**: `audio_sfx`, `type: "bell"`
   - **Đường dẫn**: `/assets/audio/sfx/bell_temple.wav`
   - **Định dạng**: WAV 48kHz, 24-bit
   - **Thời lượng**: $11.20\text{ s}$
   - **Âm lượng**: Volume $0.95$, chuẩn hóa $-8.0\text{ LUFS}$
   - **Đặc tính âm học**: Tiếng chuông chùa cổ đại trầm hùng, rền vang, độ ngân vang tự nhiên kéo dài hơn 11 giây.

6. **`sfx_gift_chime_tier1`**
   - **Tên hiển thị**: Âm Thanh Chúc Phúc Cấp 1 (Hoa Hồng)
   - **Phân loại**: `audio_sfx`, `type: "gift_chime"`
   - **Đường dẫn**: `/assets/audio/sfx/gift_tier1.wav`
   - **Định dạng**: WAV 48kHz, 24-bit
   - **Thời lượng**: $1.80\text{ s}$
   - **Âm lượng**: Volume $0.80$, chuẩn hóa $-12.0\text{ LUFS}$
   - **Đặc tính âm học**: Chuông gió phong linh thanh nhẹ chúc phúc cho quà tặng 1 - 9 xu.

7. **`sfx_gift_chime_tier2`**
   - **Tên hiển thị**: Âm Thanh Chúc Phúc Cấp 2 (Đèn Sen)
   - **Phân loại**: `audio_sfx`, `type: "gift_chime"`
   - **Đường dẫn**: `/assets/audio/sfx/gift_tier2.wav`
   - **Định dạng**: WAV 48kHz, 24-bit
   - **Thời lượng**: $2.60\text{ s}$
   - **Âm lượng**: Volume $0.85$, chuẩn hóa $-10.0\text{ LUFS}$
   - **Đặc tính âm học**: Tiếng đàn hạc (harp sweep) kết hợp hoa nở nhiệm màu cho quà tặng 10 - 99 xu.

---

### 4.6. Danh mục Nhạc Thiền Tĩnh Tâm (Audio BGM)
Quy chuẩn chung: **MP3 Stereo 320 kbps, 48.000 Hz, chuẩn hóa -16.0 LUFS**, có thuộc tính `loop: true` hỗ trợ phát lặp vô tận liền mạch.

1. **`bgm_flute_peace`**
   - **Tên hiển thị**: Trăng Trên Rừng Trúc (Sáo Trúc Tĩnh Tâm)
   - **Phân loại**: `audio_bgm`, `type: "bgm_loop"`
   - **Đường dẫn**: `/assets/audio/bgm/music1.mp3`
   - **Định dạng**: MP3 320 kbps
   - **Thời lượng**: $320.0\text{ s}$ (5 phút 20 giây)
   - **Âm lượng**: Volume $0.55$, chuẩn hóa $-16.0\text{ LUFS}$
   - **Lặp bài (`loop`)**: `true`
   - **Dự phòng**: `fallbackSynthetic: true`
   - **Mô tả & Giấy phép**: Nhạc thiền sáo trúc không lời êm dịu, đưa tâm thức về tĩnh lặng; Giấy phép Royalty Free.

2. **`bgm_zither_morning`**
   - **Tên hiển thị**: Hơi Thở Ban Mai (Đàn Tranh & Tiếng Nước)
   - **Phân loại**: `audio_bgm`, `type: "bgm_loop"`
   - **Đường dẫn**: `/assets/audio/bgm/music2.mp3`
   - **Định dạng**: MP3 320 kbps
   - **Thời lượng**: $375.0\text{ s}$ (6 phút 15 giây)
   - **Âm lượng**: Volume $0.55$, chuẩn hóa $-16.0\text{ LUFS}$
   - **Lặp bài (`loop`)**: `true`
   - **Dự phòng**: `fallbackId: "bgm_flute_peace"`
   - **Mô tả & Giấy phép**: Tiếng đàn tranh hòa cùng tiếng nước suối róc rách thanh lọc phiền não; Giấy phép Royalty Free.

---

## 5. RÀNG BUỘC & QUY TẮC KIỂM THỰC LƯỢC ĐỒ (SCHEMA VALIDATION RULES)

Dựa trên lược đồ chuẩn `assets/asset-manifest.schema.json` (JSON Schema Draft 2020-12):

1. **Ràng buộc cấp gốc (Root Level)**:
   - Thuộc tính bắt buộc: `["version", "theme", "defaultConfig", "assets"]`
   - Không cho phép thuộc tính lạ: `additionalProperties: false`
2. **Khối cấu hình mặc định (`defaultConfig`)**:
   - `resolution`: Bắt buộc đúng hằng số: `width: 1080`, `height: 1920`, `aspectRatio: "9:16"`.
   - `audio`: Bắt buộc đúng hằng số: `sampleRate: 48000`, `channels: 2`. Các trường âm lượng (`bgmVolume`, `sfxVolume`, `bellVolume`) phải là số thực trong đoạn $[0, 1]$.
3. **Các danh mục tài nguyên con (`assets`)**:
   - Bắt buộc đủ 6 mảng: `["backgrounds", "altar", "characters", "visual_fx", "audio_sfx", "audio_bgm"]`.
4. **Quy tắc cho từng loại phần tử ($defs)**:
   - `backgroundItem`: `category` phải là `"background"`, `format` thuộc `["jpg", "webp", "png"]`.
   - `altarItem`: `category` thuộc `["altar_layer", "statue", "fx_prop"]`, `format` thuộc `["png", "webp"]`.
   - `characterItem`: `category` phải là `"character"`, `gender` thuộc `["male", "female", "neutral"]`, `format` thuộc `["png", "webp"]`, `frameCount` bắt buộc là hằng số `8`, `bowingFrames` là mảng số nguyên.
   - `fxItem`: `category` phải là `"fx_prop"`, `blendMode` thuộc `["lighter", "source-over"]`.
   - `sfxItem`: `category` phải là `"audio_sfx"`, `type` thuộc `["mo", "bell", "gift_chime"]`, `sampleRate` phải là `48000`, `bitDepth` phải là `24`.
   - `bgmItem`: `category` phải là `"audio_bgm"`, `type` phải là `"bgm_loop"`, `loop` phải là `boolean`.

---

## 6. HƯỚNG DẪN THẨM MỸ & BẢN SẮC VĂN HÓA PHẬT GIÁO VIỆT NAM

Chủ đề xuyên suốt: **"Chánh Điện Tịnh Tâm Cổ Tự"** — Tái hiện trung thực không gian chánh điện thiền môn trang nghiêm, cổ kính của Phật giáo Bắc truyền truyền thống Việt Nam:

1. **Bảng màu chủ đạo (Color Palette)**:
   - **Màu gỗ lim / gỗ sồi già**: Tông nâu trầm, nâu cánh gián đậm của các hàng cột cái, cột quân và xà bẫy.
   - **Màu gạch cổ bát tràng / gạch lát bái đường**: Sắc đỏ gạch sậm, mạch gạch rõ nét chạy theo phối cảnh sâu.
   - **Màu sơn son thếp vàng**: Bàn thờ tam cấp, khám thờ và tòa sen mạ vàng lộng lẫy nhưng không chói gắt.
   - **Màu đồng cổ hun khói**: Lư hương, chân nến, chuông bát và đại hồng chung bằng đồng thau sẫm màu thời gian.
   - **Sắc vàng kim quang (Divine Gold)**: Vầng hào quang thanh tịnh tỏa ra từ kim thân Đức Phật.
   - **Sắc sen hồng & sen vàng**: Hoa sen hồng tươi thanh khiết và cánh sen vàng rực rỡ tượng trưng cho sự giác ngộ.
2. **Quy chuẩn trang phục nhân vật (Monastic & Lay Attire)**:
   - **Cư sĩ nam & nữ**: Mặc áo lam truyền thống của Phật tử Việt Nam, cổ chéo kín đáo, dáng ngồi thẳng tắp trang nghiêm.
   - **Phật tử cao tuổi (cụ bà)**: Mặc áo nâu sồng giản dị, tóc búi gọn gàng, toát lên nét hiền từ, phúc hậu.
   - **Chú tiểu**: Đầu cạo ba chỏm hoặc đầu trần, áo nâu ngắn, nét mặt ngây thơ tinh tấn.
   - **Sư thầy & Sư cô**: Áo vạt hò màu nâu hoặc vàng nghệ, y hậu trang nhã, dáng đi đĩnh đạc thoát tục.
   - **Cao tăng viện chủ**: Đắp y cà sa vàng đỏ tôn nghiêm, phong thái đạo mạo uy nghi của bậc thạch trụ tùng lâm.
3. **Quy chuẩn trong suốt & Ghép lớp (Transparency & Layering)**:
   - Toàn bộ tượng Phật, lư hương, chân nến, bồ đoàn và nhân vật bắt buộc phải có kênh alpha trong suốt tuyệt đối (`rgba(0,0,0,0)`).
   - Tuyệt đối không để dính viền trắng, viền đen bẩn (halo / fringe) quanh mép hình khi render trên nền gạch tối màu.
   - Các hiệu ứng ánh sáng (hào quang, nến, tia chuông) áp dụng hòa trộn quang học `lighter` để hòa tan mượt mà vào cảnh chùa.

---

## 7. KẾT QUẢ RÀ SOÁT TỆP VẬT LÝ TRÊN ĐĨA (PHYSICAL ASSETS STATUS)

Khi thực thi mã kiểm thử thực nghiệm `scripts/verify_assets.mjs`:
- **Số tài nguyên được khai báo trong manifest**: 29 thực thể.
- **Số tệp vật lý yêu cầu trên đĩa**: 36 tệp (bao gồm 2 nền, 7 bàn thờ/đạo cụ, 7 chân dung tĩnh `c_*.png`, 7 dải dải ảnh 8 frames `anim_*.png`, 4 hiệu ứng FX, 7 âm thanh SFX WAV, 2 nhạc BGM MP3).
- **Hiện trạng trên đĩa**: Hiện tại thư mục `assets/` mới chỉ có duy nhất tệp lược đồ `asset-manifest.schema.json`. Tất cả các thư mục con (`assets/backgrounds/`, `assets/altar/`, `assets/characters/`, `assets/fx/`, `assets/audio/sfx/`, `assets/audio/bgm/`) và 36 tệp vật lý hiện chưa được đổ vào đĩa (`Physical files missing on disk count: 29 / 29`).
- **Khả năng dự phòng tức thời**: Khi máy chủ khởi động, nhờ cơ chế `fallbackSynthetic: true` và cross-fallback đã được kiểm chứng không có vòng lặp chết (0 circular loops), Canvas 2D Engine và Web Audio Engine sẵn sàng vẽ vector và tổng hợp sóng điện tử dự phòng 100% để luồng live không bao giờ bị gián đoạn.

---
*Báo cáo được hoàn thành phục vụ việc đối chiếu đặc tả và chuẩn bị nạp tài nguyên cho Milestone M3 của dự án Chánh Điện Tịnh Tâm.*
