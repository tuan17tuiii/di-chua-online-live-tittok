# BÁO CÁO BÀN GIAO THẨM ĐỊNH TÀI NGUYÊN (HANDOFF REPORT)
## Challenger 2 (teamwork_challenger_2) — Empirical Asset & Integration Review

**Người thực hiện**: Challenger 2 (`teamwork_challenger_2`)  
**Đối tượng bàn giao**: Orchestrator / Lead Architect (`ec57830e-4dc2-42ef-a9b3-b482633b54fd`)  
**Tài liệu thẩm tra**: `manifest.json`, `ASSET_MANIFEST.md`, `ROADMAP.md`, `PROJECT.md`  
**Thời điểm bàn giao**: 2026-11-01  

---

### 1. QUAN SÁT THỰC NGHIỆM (OBSERVATION)

1. **Kiểm tra tệp tham chiếu lược đồ JSON Schema**:
   - Tệp `manifest.json` dòng 2 khai báo:
     ```json
     "$schema": "./assets/asset-manifest.schema.json",
     ```
   - Lệnh kiểm tra: `fs.existsSync(path.resolve('assets/asset-manifest.schema.json'))`.
   - Kết quả quan sát: `false` — Tệp lược đồ hoàn toàn không tồn tại trong thư mục dự án.

2. **Kiểm tra độ phủ trường dữ liệu `category` theo yêu cầu đề bài**:
   - Đề bài yêu cầu: *"Verify every asset entry has valid id, name, category, file path, resolution/specifications, and license status."*
   - Kết quả chạy mã thực nghiệm `node scripts/verify_assets.mjs`:
     - Tổng số tài nguyên: 29.
     - Số tài nguyên thiếu trường `category`: **16 / 29** (55.2%).
     - Các tệp thiếu gồm toàn bộ nhóm `characters` (dòng 144-247 có `gender` thay vì `category`), toàn bộ nhóm `audio_sfx` (dòng 298-387 có `type` thay vì `category`), và toàn bộ nhóm `audio_bgm` (dòng 391-415 có `type` thay vì `category`).

3. **Kiểm tra bẫy đệ quy fallback tự tham chiếu (`fallbackId === id`)**:
   - Trong `manifest.json`, phát hiện 6 trường hợp khai báo `fallbackId` trỏ trực tiếp đến `id` của chính nó:
     - Dòng 23 & 31: `id: "bg_main_hall"`, `fallbackId: "bg_main_hall"`
     - Dòng 51 & 59: `id: "altar_table_main"`, `fallbackId: "altar_table_main"`
     - Dòng 64 & 72: `id: "statue_shakyamuni"`, `fallbackId: "statue_shakyamuni"`
     - Dòng 103 & 111: `id: "altar_censer_bronze"`, `fallbackId: "altar_censer_bronze"`
     - Dòng 116 & 124: `id: "altar_candle_stand"`, `fallbackId: "altar_candle_stand"`
     - Dòng 129 & 137: `id: "cushion_lotus_mat"`, `fallbackId: "cushion_lotus_mat"`

4. **Kiểm tra độ phủ cơ chế dự phòng (Fallback Coverage)**:
   - Trong tổng số 29 tài nguyên, có **16 tài nguyên** không có bất kỳ khai báo `fallbackId` lẫn `fallbackSynthetic`:
     - 7/7 nhân vật: `char_man`, `char_woman`, `char_granny`, `char_child`, `char_monk`, `char_nun`, `char_master`.
     - 4/4 hiệu ứng hình ảnh: `fx_halo_gold`, `fx_floating_lotus`, `fx_gold_petal`, `fx_gift_bell_flash`.
     - 3 âm thanh hiệu ứng: `sfx_bell_bowl`, `sfx_gift_chime_tier1`, `sfx_gift_chime_tier2`.
     - 2 nhạc nền: `bgm_flute_peace`, `bgm_zither_morning`.

5. **Mâu thuẫn diễn hoạt Spritesheet và logic lạy Phật**:
   - `ASSET_MANIFEST.md` Mục 2.2:
     - Frames 0 - 3: Bước đi (`walk`).
     - Frames 4 - 6: Quỳ xuống (`sitting`).
     - Frame 7: Tọa thiền an định (`sit idle`).
   - `manifest.json` dòng 155, 170, 185, 200, 215, 230, 245:
     ```json
     "bowingFrames": [4, 5, 6, 7],
     ```
   - `ROADMAP.md` dòng 109:
     *"bowing (lạy chầu nén chiều cao theo cosin khi có chat/gift/bell)"*.

6. **Sai lệch thông số kích thước nhân vật giữa tài liệu và manifest**:
   - `ASSET_MANIFEST.md` Mục 2.2 dòng 40: *"Chiều cao chuẩn 300px, 8 frames ngang liên tiếp."*
   - `manifest.json`:
     - Dòng 196: `char_child` có `frameHeight: 260`.
     - Dòng 241: `char_master` có `frameHeight: 320`.

7. **Kiểm nghiệm lỗi khi người dùng sửa file bằng Windows Notepad**:
   - Thực nghiệm chèn ký tự UTF-8 BOM (`\uFEFF`) dẫn đến lỗi:
     `SyntaxError: Unexpected token '﻿', "﻿{"test": 1}" is not valid JSON`
   - Thực nghiệm chèn smart quotes `“...”` dẫn đến lỗi:
     `SyntaxError: Unexpected token '“', "{"path": “/assets/b"... is not valid JSON`
   - Thực nghiệm trailing comma `[{"id": "bg1"},]` dẫn đến lỗi:
     `SyntaxError: Unexpected token ']', ..."": "bg1"},]}" is not valid JSON`

8. **Tính toán băng thông CEF và tải lượng Canvas 2D**:
   - Framebuffer $1080 \times 1920 \times 4 \text{ bytes} = 7.91 \text{ MB}$. Tại 60fps cần băng thông đồ họa $474.61 \text{ MB/s}$.
   - Tối đa 100 slot bồ đoàn tạo ra $\approx 6.000$ draw calls/giây trên Canvas 2D.

---

### 2. CHUỖI SUY LUẬN LOGIC (LOGIC CHAIN)

1. Từ **Quan sát 1** và **Quan sát 2**: Lược đồ cấu hình JSON chưa hoàn thiện. Việc thiếu tệp schema và không đồng nhất trường phân loại (`category` vs `gender` vs `type`) cho thấy cấu trúc `manifest.json` chưa trải qua quá trình xác thực tự động (automated schema validation). Điều này tiềm ẩn nguy cơ lỗi runtime khi các module khác truy vấn thuộc tính `asset.category`.
2. Từ **Quan sát 3**: Nếu một tệp ảnh nền hoặc tượng Phật chính (như `hall.jpg` hay `statue_shakyamuni.png`) bị thiếu hoặc hỏng, cơ chế fallback xử lý sự kiện nạp thất bại sẽ tra cứu `fallbackId`. Vì `fallbackId` trỏ lại chính mã định danh đó, vòng lặp nạp tài nguyên sẽ lặp vô hạn. Trừ khi lập trình viên tự chèn thêm cờ bảo vệ vòng lặp, việc này sẽ dẫn đến lỗi tràn ngăn xếp (`Maximum call stack size exceeded`) và làm sập trình duyệt nguồn OBS CEF.
3. Từ **Quan sát 4**: Tuyên bố trong `ASSET_MANIFEST.md` rằng hệ thống có cơ chế dự phòng toàn diện để không bao giờ xuất hiện màn hình đen hay mất tiếng là **không chính xác** trên thực tế mã manifest. Hơn một nửa số tài nguyên (55.2%), bao gồm toàn bộ nhân vật và nhạc nền, hoàn toàn không được cấu hình đường dẫn hoặc cơ chế dự phòng nào.
4. Từ **Quan sát 5**: Tồn tại mâu thuẫn kiến trúc trực tiếp giữa `manifest.json` và `ROADMAP.md`:
   - `manifest.json` quy định phát dải ảnh `[4, 5, 6, 7]` cho hành động lạy chầu. Nhưng theo phân rã dải ảnh, các khung hình này là động tác quỳ xuống và ngồi thẳng, không chứa cử động dập đầu chạm sàn.
   - Ngược lại, `ROADMAP.md` lại chỉ định thuật toán bóp dẹp chiều cao cosin. Việc áp dụng biến đổi hình học cosin trên toàn bộ khung hình tĩnh sẽ làm biến dạng méo mó hình thể nhân vật thay vì một động tác lạy Phật uy nghi.
5. Từ **Quan sát 6**: Việc không đồng nhất chiều cao giữa tài liệu (khẳng định chuẩn 300px) và manifest (có nhân vật 260px và 320px) sẽ khiến hệ thống cắt lát sprite và neo tọa độ 2.5D bị sai lệch điểm tựa chân (pivot anchor) trên bồ đoàn.
6. Từ **Quan sát 7**: Tuyên bố "Plug-and-Play cắm-và-chạy không cần đụng vào mã nguồn" trong Hướng dẫn 4 bước là phản thực tế. Việc yêu cầu người dùng mở Notepad sửa JSON thực chất là sửa mã cấu hình. Các hành vi mặc định của Windows Notepad (chèn BOM, smart quotes) và các lỗi nhập liệu phổ biến chắc chắn sẽ làm crash hàm `JSON.parse` của Node.js, khiến máy chủ ngừng hoạt động ngay từ khâu khởi động.
7. Từ **Quan sát 8**: Màn hình dọc 1080x1920 ở 60fps với 100 avatar đòi hỏi quản lý bộ nhớ đệm đồ họa nghiêm ngặt. Thiếu kỹ thuật OffscreenCanvas cho nền và bàn thờ tĩnh sẽ làm OBS tụt khung hình khi diễn ra sự kiện bão quà và tương tác đông người.

---

### 3. CÁC ĐIỂM GIỚI HẠN & GIẢ ĐỊNH (CAVEATS)

1. **Giới hạn môi trường thực thi**: Kiểm thử được tiến hành trên môi trường Windows 11 với Node.js v24.16.0. Chưa chạy trực tiếp bên trong nhân Chromium CEF tích hợp sẵn của OBS Studio phiên bản Linux hoặc macOS.
2. **Trạng thái tài nguyên vật lý**: Toàn bộ 29 tệp tài nguyên hiện tại chưa có sẵn trên đĩa cứng; các quan sát và đánh giá dựa trên đặc tả cấu hình, định dạng, logic điều phối và toán học kết xuất.
3. **Giả định về mã nguồn bộ nạp**: Giả định rằng bộ nạp `AssetLoader` trong tương lai sẽ tuân thủ nghiêm ngặt đặc tả `manifest.json`. Nếu lập trình viên tự chèn logic sửa lỗi ngoài đặc tả (ví dụ tự động lọc bỏ BOM, tự ngắt vòng lặp fallback), lỗi có thể được giảm nhẹ một phần nhưng cấu trúc manifest vẫn vi phạm nguyên tắc thiết kế sạch.

---

### 4. KẾT LUẬN & PHÁN QUYẾT (CONCLUSION & VERDICT)

Dựa trên toàn bộ chuỗi chứng cứ thực nghiệm và suy luận logic chặt chẽ:

**PHÁN QUYẾT CHÍNH THỨC: `REQUEST_CHANGES` (YÊU CẦU ĐIỀU CHỈNH KỸ THUẬT)**

Tài liệu đặc tả tài nguyên `manifest.json`, `ASSET_MANIFEST.md` và `ROADMAP.md` **chưa đạt tiêu chuẩn phê duyệt** để chuyển giao sang giai đoạn lập trình do tồn tại 2 lỗi nghiêm trọng (Critical), 2 lỗi rủi ro cao (High), và 5 điểm bất nhất kỹ thuật (Medium).

**Các hành động bắt buộc phải điều chỉnh (Mandatory Action Items)**:
1. **Khử bẫy đệ quy**: Loại bỏ toàn bộ 6 liên kết `fallbackId` tự tham chiếu; thay thế bằng tham chiếu chéo hợp lệ hoặc vector nội tại.
2. **Hoàn thiện độ phủ Fallback**: Cấu hình cơ chế fallback cho 16 tài nguyên đang bị bỏ trống (nhân vật, visual fx, chuông bát, nhạc thiền).
3. **Thống nhất giải pháp diễn hoạt lạy Phật (Bowing Animation)**: Quyết định dứt khoát giữa việc tăng số khung hình spritesheet lên 12-16 frames hay chuẩn hóa công thức cosin có neo pivot chân trên Frame 7; đồng bộ giữa `manifest.json` và `ROADMAP.md`.
4. **Viết lại Hướng dẫn tích hợp**: Chuyển đổi sang cơ chế quy ước thư mục (Convention Drop-in) cho hình nền và tượng Phật (thay vì bắt người dùng sửa JSON bằng Notepad); bổ sung bộ lọc xử lý BOM/JSON5 trên server.
5. **Đồng bộ hóa kích thước**: Đính chính chiều cao dải ảnh nhân vật giữa `ASSET_MANIFEST.md` và `manifest.json`.
6. **Bổ sung tệp JSON Schema**: Tạo tệp `assets/asset-manifest.schema.json` để xác thực toàn vẹn tự động.

---

### 5. PHƯƠNG PHÁP XÁC MINH ĐỘC LẬP (VERIFICATION METHOD)

Để độc lập kiểm chứng toàn bộ các phát hiện trên:
1. Chạy lệnh kiểm thử tự động đã được Challenger 2 xây dựng:
   ```powershell
   node scripts/verify_assets.mjs
   ```
2. Kiểm tra trực tiếp các dòng mã trong `manifest.json`:
   - Dòng 31, 59, 72, 111, 124, 137: Xác minh các trường `fallbackId` tự trỏ chính nó.
   - Dòng 155, 170, 185, 200, 215, 230, 245: So sánh `bowingFrames: [4, 5, 6, 7]` với mô tả động tác tại Mục 2.2 của `ASSET_MANIFEST.md`.
   - Dòng 196 & 241: Kiểm tra kích thước `frameHeight` (260 và 320) so với tuyên bố chuẩn 300px tại Mục 2.2 dòng 40 của `ASSET_MANIFEST.md`.
3. Kiểm tra sự tồn tại của tệp schema:
   ```powershell
   Test-Path "assets/asset-manifest.schema.json"
   # Kết quả: False
   ```
4. Điều kiện giải tỏa (Invalidation Condition):
   Phán quyết `REQUEST_CHANGES` sẽ được chuyển thành `APPROVE` sau khi các tệp `manifest.json`, `ASSET_MANIFEST.md` và `ROADMAP.md` được cập nhật khắc phục đầy đủ 6 hành động bắt buộc nêu tại Mục 4.
