# BÁO CÁO BÀN GIAO (HANDOFF REPORT)
## Teamwork Challenger 1 — Architecture & WebSocket Spec Adversarial Review

- **Agent**: `teamwork_challenger_1`
- **Role**: Empirical Challenger (critic, specialist)
- **Target Files**: `ARCHITECTURE.md`, `WEBSOCKET_SPEC.md`
- **Artifacts Created**:
  - `challenge_protocol.md` (Detailed Challenge Protocol)
  - `test_perspective_math.cjs` (2.5D Perspective Projection Test Harness)
  - `test_stress_harness.cjs` (Seating Eviction, Backoff, and Combo/TTS Stress Test)
  - `test_capacity_resizing.cjs` (Slot Teleportation Analysis)
  - `test_skin_nlp.cjs` (Skin NLP False Positive Validation)
- **Handoff Type**: Hard Handoff

---

### 1. Observation

1. **Deadlock thuật toán đào thải chỗ ngồi (`ARCHITECTURE.md` dòng 181-193)**:
   ```typescript
   if (viewers.size >= maxCapacity) {
     const nonDonors = [...viewers.values()].filter(v => v.coins === 0 && !v.isVip);
     if (nonDonors.length > 0) {
       nonDonors.sort((a, b) => a.lastActivityAt - b.lastActivityAt);
       const evictee = nonDonors[0];
       viewers.delete(evictee.id);
       broadcast({ t: 'leave', id: evictee.id });
     }
   }
   ```
   Khi chạy `node test_stress_harness.cjs`, kịch bản 100% donors (`Scenario C`): Toàn bộ 50 người dùng tiếp theo bị từ chối cấp slot (`failedJoins = 50`, `totalEvictions = 0`). Kịch bản 90% donors (`Scenario B`): 193/300 người dùng bị chặn (`failedJoins = 193`).
2. **Sai số hình học phối cảnh 2.5D (`ARCHITECTURE.md` dòng 276-293)**:
   - Khi `cols` là số lẻ (chạy `test_perspective_math.cjs` với ma trận $5 \times 5$): Tại $k = 2$, $u_0 = 0 \implies u = 0 \implies x(r, 2) = 540.0\text{ px}$. Vị trí ngồi rơi trúng tâm lối đi trung tâm (`centerSlots = 1` trên mọi hàng).
   - Đo bề rộng lối đi giữa: Với `cols = 6` đạt $31.2\%$; với `cols = 8` đạt $26.3\%$; với `cols = 10` đạt $23.6\%$, sai lệch so với con số $15\%$ công bố tại dòng 271.
   - Tại cột biên $u = \pm 1.0$: $x = 540 \pm \text{half}_{\text{bot}} = 110\text{ px}$ và $970\text{ px}$. Đệm ngồi rộng $80\text{px}$ có mép vươn tới $70\text{px}$ và $1010\text{px}$, thò ra ngoài mép sàn gạch $40\text{px}$.
3. **Chồng lấn trục dọc không có quy chuẩn thứ tự vẽ (`ARCHITECTURE.md` dòng 284, `ASSET_MANIFEST.md` dòng 47-55)**:
   - Chiều cao nhân vật hàng đáy ở cấu hình 36 chỗ là $150.0\text{px}$ trong khi khoảng cách giữa 2 hàng là $126.0\text{px}$ (đè lấp $24.0\text{px}$); cấu hình 64 chỗ đè lấp $30.9\text{px}$; cấu hình 100 chỗ đè lấp $32.3\text{px}$. Tài liệu không định nghĩa thuật toán Painter's Algorithm và điểm neo sprite (`anchor point`), dẫn tới nguy cơ nhân vật hàng sau vẽ đè lên hàng trước nếu duyệt theo thứ tự `slotIndex` ưu tiên từ hàng trước ra sau.
4. **Mâu thuẫn schema WebSocket (`WEBSOCKET_SPEC.md` dòng 245-253, 537)**:
   - Gói tin `tts` định nghĩa: `url: string` (bắt buộc), `dataUri?: string` (tùy chọn). Trong khi `ARCHITECTURE.md` dòng 13 & 436 khẳng định loại bỏ $100\%$ ghi file ra đĩa SSD và chuyển sang Data URI streaming qua WebSocket.
   - Gói tin `gift` (dòng 209-221, 535) thiếu hoàn toàn các cờ `repeatEnd`, `comboCount`, `isCombo`, trong khi `ARCHITECTURE.md` dòng 147-150 và sơ đồ 7.1 yêu cầu phân nhánh `repeatEnd == false` (hạt nhẹ) và `repeatEnd == true` (xướng danh).
   - Bất nhất tên trường: Lệnh chuông server gửi xuống là `isGreatBell` (dòng 275), nhưng client gửi lên là `great` (dòng 359, 561). Lệnh mõ server gửi là `mo1` (dòng 280), trong khi client gửi là `mo` (dòng 360, 562).
5. **Vượt trần độ trễ Exponential Backoff (`ARCHITECTURE.md` dòng 108)**:
   - Công thức: $T_{\text{delay}} = \min(T_{\text{max}}, T_{\text{base}} \times 1.5^{\text{attempt}}) \times (1 \pm 0.2)$.
   - Chạy `test_stress_harness.cjs` (Test 2): Tại attempt $\ge 7$, $\text{clamped} = 30.0\text{s}$, nhưng sau jitter $30.0 \times 1.2 = 36.0\text{s} > T_{\text{max}} = 30.0\text{s}$.
6. **Nhảy vị trí slot khi tự động co giãn (`seatMode: 'auto'`)**:
   - Chạy `test_capacity_resizing.cjs`: Khi mở rộng từ 36 lên 64 chỗ (đổi từ 6 cột sang 8 cột), Slot 6 nhảy từ Hàng 1 Cột 0 sang Hàng 0 Cột 6; Slot 12 nhảy từ Hàng 2 Cột 0 sang Hàng 1 Cột 4.
7. **Nhận diện sai trang phục Skin NLP (`ARCHITECTURE.md` dòng 333)**:
   - Chạy `test_skin_nlp.cjs`: Câu kinh 3 từ `"Nam mô Phật"` khớp từ khóa `nam`, đổi nhầm sang Cư sĩ Nam; `"Lạy Phật bà"` khớp từ khóa `bà`.

---

### 2. Logic Chain

1. Từ **Quan sát 1**: Thuật toán chỉ lọc `coins === 0 && !isVip`. Khi phiên live diễn ra đủ lâu, 100 vị trí đều tích lũy ít nhất 1 xu. Khi đó mảng `nonDonors` rỗng. Logic không có nhánh `else` để xử lý khi `nonDonors.length === 0`. Do `viewers.size >= maxCapacity`, người dùng mới không thể được gán slot. Vì TikTok Live không có sự kiện disconnect chắc chắn của viewer, các donor 1 xu đã thoát app vẫn chiếm slot vĩnh viễn $\rightarrow$ **Hệ thống bị tê liệt khả năng tiếp nhận người mới (Starvation/Deadlock)**.
2. Từ **Quan sát 2**: Phân tích biểu thức $u_0 = (k - \frac{\text{cols}-1}{2}) / \frac{\text{cols}-1}{2}$. Khi `cols` lẻ, phần tử giữa có $u_0 = 0 \implies \text{sign}(0) = 0 \implies x = 540$. Do đó bất kỳ ai cấu hình số cột lẻ sẽ khiến nhân vật che bàn thờ. Tại $k = 0$, $u = -1.0 \implies x = 540 - \text{half}_{\text{bot}} = 110$, là mép sàn. Sprite có bán kính $\approx 40\text{px}$, nên đệm ngồi và thân người sẽ thò ra ngoài sàn $\rightarrow$ **Sai số ranh giới hình học nghiêm trọng**.
3. Từ **Quan sát 3**: Do hàng sau bị hàng trước đè lấp $24 - 32\text{px}$, nếu không áp dụng Painter's Algorithm sắp xếp theo tọa độ $Y$ tăng dần, việc duyệt vẽ theo `slotIndex` (vốn điền từ trước ra sau) sẽ khiến nhân vật hàng sau vẽ đè lên hàng trước $\rightarrow$ **Lỗi hiển thị đảo ngược chiều sâu không gian (Z-inversion)**.
4. Từ **Quan sát 4**: Khi backend hoàn toàn không tạo file trên SSD theo cam kết kiến trúc, trường `url: string` bắt buộc trong schema TypeScript sẽ chứa chuỗi vô nghĩa hoặc URL 404. Gói tin `gift` thiếu cờ combo khiến overlay không thể phân biệt cú chạm trung gian và cú chốt quà $\rightarrow$ **Đặc tả WebSocket mâu thuẫn trực tiếp với thiết kế luồng dữ liệu kiến trúc**.
5. Từ **Quan sát 5**: Phép nhân ngẫu nhiên $(1 \pm 0.2)$ đặt ngoài hàm `min(30.0, ...)` dẫn đến kết quả toán học $30.0 \times 1.2 = 36.0 > 30.0$, vi phạm trần thời gian chờ kết nối lại tối đa $30\text{s}$.
6. Từ các bước suy luận 1-5: Bộ đặc tả kỹ thuật chưa sẵn sàng để đưa vào triển khai mã nguồn trực tiếp vì chứa các lỗi logic nghiệp vụ, sai số phối cảnh và mâu thuẫn giao thức.

---

### 3. Caveats

- Các kịch bản kiểm thử giả định kích thước sprite nhân vật theo đúng bảng kê khai `ASSET_MANIFEST.md` (§2.2: chiều cao 300px, chiều rộng 212px, đệm bồ đoàn 160×90px). Nếu kích thước thực tế thay đổi, mức độ chồng lấn sẽ thay đổi tương ứng nhưng bản chất chồng lấn dọc vẫn tồn tại do tỷ lệ hình học.
- Động cơ bot và kết nối TikTok Live thực tế sử dụng các gói tin Protobuf nhị phân qua WebSocket, kiểm thử ở đây tập trung vào luồng chuẩn hóa (Normalized Canonical Events) và giao thức WebSocket nội bộ giữa Server và Clients.
- Không có thêm giả định nào khác.

---

### 4. Conclusion

**Verdict: `REQUEST_CHANGES` (YÊU CẦU ĐIỀU CHỈNH ĐẶC TẢ)**

Bộ tài liệu kỹ thuật có chất lượng cấu trúc và định hướng tốt, nhưng **BẮT BUỘC PHẢI ĐƯỢC CHỈNH SỬA VÀ ĐỒNG BỘ LẠI** trước khi đội ngũ lập trình bắt đầu viết mã, bao gồm:
1. Sửa thuật toán `Longest-Quiet Non-Donor Eviction` để hỗ trợ giải phóng chỗ ngồi cho donor ít xu khi phòng đầy $100\%$ donor và có người bất hoạt $> 15$ phút.
2. Hiệu chỉnh công thức phối cảnh 2.5D: ràng buộc `cols` chẵn, bổ sung hệ số lề sàn $\text{marginRatio} = 0.12$ để đệm không thò ra ngoài sàn gạch, xác lập điểm neo `(centerX, bottomY)` và quy chuẩn Painter's Algorithm (sort by Y ascending).
3. Chuẩn hóa schema WebSocket: chuyển `dataUri` trong `tts` thành bắt buộc và `url` thành tùy chọn; bổ sung `repeatEnd`, `comboCount`, `isCombo` trong `gift`; đồng bộ hóa `bell` (`great`) và `mo` (thay vì `mo1`).
4. Sửa công thức Exponential Backoff: đưa jitter vào trong hàm `min` để đảm bảo trần $T \le 30.0\text{s}$.

---

### 5. Verification Method

Để kiểm tra và tái lập độc lập toàn bộ các kết quả trên, người kiểm tra chạy các lệnh sau trong powershell tại thư mục gốc dự án:
```powershell
# 1. Kiểm chứng sai số phối cảnh 2.5D, lối đi giữa và cột lẻ
node .agents/teamwork/teamwork_challenger_1/test_perspective_math.cjs

# 2. Kiểm chứng deadlock khi 100% viewers là donors và vi phạm trần backoff 36s
node .agents/teamwork/teamwork_challenger_1/test_stress_harness.cjs

# 3. Kiểm chứng hiện tượng dịch chuyển tức thời khi auto mở rộng sức chứa
node .agents/teamwork/teamwork_challenger_1/test_capacity_resizing.cjs

# 4. Kiểm chứng lỗi nhận diện trang phục NLP với câu kinh 3 từ
node .agents/teamwork/teamwork_challenger_1/test_skin_nlp.cjs

# 5. Kiểm tra đối sánh mâu thuẫn schema WebSocket
node .agents/teamwork/teamwork_challenger_1/test_schema_validator.cjs
```
- **Điều kiện phủ định kết luận (Invalidation Condition)**: Kết luận sẽ bị phủ định nếu chứng minh được rằng khi phòng có 100 donor (`coins > 0`), thuật toán hiện tại vẫn cấp được chỗ cho người thứ 101 mà không bị đè/mất dữ liệu, hoặc nếu công thức phối cảnh hiện tại giữ được toàn bộ đệm ngồi nằm trọn 100% trong mặt sàn $110 - 970\text{px}$ mà không cần chỉnh lề.
