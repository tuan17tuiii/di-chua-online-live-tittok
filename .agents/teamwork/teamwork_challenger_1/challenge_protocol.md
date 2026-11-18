# BÁO CÁO THÁCH THỨC VÀ KIỂM ĐỊNH THỰC NGHIỆM (CHALLENGE PROTOCOL)
## Empirical Adversarial Review: ARCHITECTURE.md & WEBSOCKET_SPEC.md
**Agent**: `teamwork_challenger_1` (Empirical Challenger, critic/specialist)  
**Target Files**: `ARCHITECTURE.md`, `WEBSOCKET_SPEC.md`  
**Date**: 2026-11-01  
**Working Directory**: `c:\Users\tn018\Desktop\Person\media\tiktok\app-live\.agents\teamwork\teamwork_challenger_1`

---

## 1. TỔNG QUAN ĐÁNH GIÁ NGUY CƠ (CHALLENGE SUMMARY)

**Đánh giá rủi ro tổng thể (Overall Risk Assessment)**: **CRITICAL / HIGH**  
**Khuyến nghị quyết định (Recommendation Verdict)**: **`REQUEST_CHANGES`**

Qua quá trình xây dựng các kịch bản kiểm thử giả lập (stress harnesses), viết mã kiểm định toán học và rà soát đối sánh giao thức (schema cross-validation), Challenger 1 phát hiện nhiều lỗ hổng nghiêm trọng ở cả 3 chiều kích:
1. **Lỗ hổng logic nghiệp vụ cốt lõi (Deadlock / Starvation Bug)**: Thuật toán đào thải bồ đoàn `Longest-Quiet Non-Donor Eviction` dẫn tới tình trạng tê liệt hoàn toàn (gridlock) khi 100 chỗ ngồi đều đã cúng dường (`coins > 0`), từ chối 100% người dùng mới vĩnh viễn.
2. **Sai số toán học & ranh giới phối cảnh 2.5D (Perspective Projection Boundary Flaws)**:
   - Với số cột lẻ (`cols` là số lẻ), công thức hiện tại đặt nhân vật chính giữa lối đi trung tâm ($X = 540$), che khuất tầm nhìn bàn thờ Phật.
   - Bề rộng lối đi thực tế là $23.6\% - 31.2\%$, sai lệch gấp đôi so với tuyên bố $15\%$.
   - Tọa độ ngoài cùng $u = \pm 1.0$ đặt tâm nhân vật đúng mép sàn hình thang, khiến một nửa cơ thể và đệm ngồi lơ lửng ngoài khoảng không.
   - Hiện tượng đè lấp dọc (vertical occlusion) lên tới $32.3\text{px}$ giữa các hàng trước và hàng sau nhưng thiếu hoàn toàn quy chuẩn vẽ (Painter's Algorithm).
3. **Mâu thuẫn và khiếm khuyết phong bì WebSocket**:
   - Gói tin `tts` bắt buộc trường `url: string` trong khi kiến trúc khẳng định triệt tiêu $100\%$ ghi đĩa SSD và chuyển sang `dataUri`.
   - Gói tin `gift` thiếu hoàn toàn các cờ nhận diện chuỗi combo (`repeatEnd`, `comboCount`), dẫn đến việc overlay hoặc bị câm lặng trong lúc tặng combo, hoặc bị bão hiệu ứng/âm thanh xé loa khi nhận 50 gói tin dồn dập.
   - Bất nhất định danh: `bell.isGreatBell` (S2C) vs `ctl.bell.great` (C2S); `mo1` (S2C) vs `ctl.mo` (C2S).
   - Công thức Exponential Backoff áp dụng nhiễu ngẫu nhiên (jitter) sau hàm chặn trần `min(Tmax, ...)`, khiến độ trễ kết nối lại vượt quá trần tối đa $T_{\text{max}} = 30\text{s}$ lên tới $36.0\text{s}$.

---

## 2. DANH MỤC THÁCH THỨC CHI TIẾT (DETAILED CHALLENGES)

### [CRITICAL] Thách Thức 1: Nghẽn Tắc Đào Thải Bồ Đoàn Khi Đầy Người Cúng Dường (All-Donor Eviction Starvation)

- **Mục kiểm tra**: `ARCHITECTURE.md` §3.3 A (Động cơ phân bổ chỗ ngồi & Thuật toán Đào thải).
- **Giả định bị thách thức**: Giả định rằng trong phòng 100 chỗ luôn tồn tại người xem chưa cúng dường (`coins === 0`) để đào thải khi có người mới tương tác.
- **Kịch bản tấn công (Attack Scenario)**:
  Phòng livestream hoạt động sau 1-2 giờ. Lượng người xem tích lũy đạt 100 người đã từng tặng ít nhất 1 cành hoa hồng ($1\text{ xu}$). Toàn bộ 100 vị trí trong `viewers` đều có `coins > 0`.
  Khi một Phật tử thứ 101 vào phòng và bình luận:
  ```typescript
  if (viewers.size >= maxCapacity) {
    const nonDonors = [...viewers.values()].filter(v => v.coins === 0 && !v.isVip);
    if (nonDonors.length > 0) {
      // Đào thải...
    }
    // nonDonors.length === 0 -> KHÔNG AI BỊ ĐÀO THẢI!
  }
  // viewers.size vẫn là 100!
  ```
- **Hệ quả thực tế (Empirical Proof via `test_stress_harness.cjs`)**:
  - Khi chạy kịch bản 100% donors (`Scenario C`): 50/50 người dùng tiếp theo bị từ chối cấp chỗ ngồi (`failedJoins = 50`).
  - Khi chạy kịch bản 90% donors (`Scenario B`): Có tới 193/300 người dùng bị khóa ngoài cửa phòng (`failedJoins = 193`).
  - Nếu những người đã tặng 1 xu rời khỏi TikTok Live (tắt app đi ngủ), hệ thống TikTok Webcast không gửi sự kiện `leave` đáng tin cậy. Họ trở thành "vong hồn chiếm chỗ" (ghost occupants), khóa chặt sàn chánh điện vĩnh viễn! Khán giả đang xem trực tiếp không tài nào có chỗ ngồi.
- **Mức độ ảnh hưởng (Blast Radius)**: CRITICAL. Phòng livestream rơi vào trạng thái chết (deadlock), mất hoàn toàn tính tương tác cho khán giả mới.
- **Giải pháp khắc phục (Mitigation)**:
  Bổ sung cơ chế đào thải 2 tầng (Tiered Inactivity Eviction):
  1. *Tầng 1*: Đào thải người chưa cúng dường (`coins === 0` và `!isVip`) có thời gian im lặng lâu nhất (`lastActivityAt`).
  2. *Tầng 2 (Khi 100% đều là donors)*: Nếu không còn ai `coins === 0`, chỉ bảo vệ vĩnh viễn Top 10 Bảng Vàng Công Đức hoặc người có `isVip === true` hoặc người cúng dường $\ge 50\text{ xu}$. Những người cúng dường ít xu nhất ($1-9\text{ xu}$) có thời gian bất hoạt vượt quá 15 phút (`Date.now() - lastActivityAt > 15 * 60 * 1000`) sẽ bị nhường chỗ cho Phật tử mới đang active.

---

### [HIGH] Thách Thức 2: Sai Số Toán Học Phối Cảnh 2.5D, Va Chạm Lối Đi & Tràn Mép Sàn

- **Mục kiểm tra**: `ARCHITECTURE.md` §4.1 (Toán học phối cảnh hình thang 2.5D).
- **Giả định bị thách thức**:
  1. Lối đi chính giữa mở rộng $15\%$ khoảng trống.
  2. Công thức tọa độ áp dụng đúng cho mọi cấu hình ma trận `(rows, cols)`.
  3. Avatar nằm trọn vẹn trong mặt sàn chánh điện.
- **Kết quả thực nghiệm toán học (Empirical Proof via `test_perspective_math.cjs`)**:

  1. **Lỗi Cột Lẻ Đè Trúng Lối Đi Trung Tâm**:
     Công thức tọa độ $X$:
     $$u_0 = \frac{k - \frac{\text{cols} - 1}{2}}{\frac{\text{cols} - 1}{2}}, \quad u = \text{sign}(u_0) \times (0.14 + 0.86 \times |u_0|), \quad x = 540 + u \times \text{halfWidth}(r)$$
     Khi `cols` là số lẻ (ví dụ: cấu hình thử nghiệm `cols = 5` hoặc mở rộng tùy biến):
     Tại cột chính giữa $k = \frac{\text{cols} - 1}{2} = 2$:
     $u_0 = 0 \implies \text{sign}(0) = 0 \implies u = 0 \implies x(r, 2) = 540.0\text{ px}$!
     Nhân vật ngồi **CHÍNH GIỮA MÀN HÌNH ($X = 540$)**, chắn ngang lối đi chính và che khuất tượng Phật!
     *Thực nghiệm xác nhận*: `centerSlots = 1` trên mọi hàng của ma trận `5x5`.

  2. **Sai Lệch Bề Rộng Lối Đi Giữa ($23.6\% - 31.2\%$ vs $15\%$ Claimed)**:
     Tài liệu công bố: *"Lối đi chính giữa (Center Aisle): Mở rộng 15% khoảng trống ở giữa..."*.
     Tuy nhiên, do tác giả cộng thêm offset $0.14$ vào $|u_0|$ vốn dĩ đã $> 0$:
     - Với `cols = 6`: Khoảng cách giữa 2 cột sát lối đi là $268.3\text{px}$ trên bề rộng sàn $860\text{px}$ $\rightarrow$ **$31.2\%$** (gấp hơn 2 lần con số 15%).
     - Với `cols = 8`: Khoảng cách là $226.1\text{px}$ $\rightarrow$ **$26.3\%$**.
     - Với `cols = 10`: Khoảng cách là $202.6\text{px}$ $\rightarrow$ **$23.6\%$**.
     Tỷ lệ lối đi biến động theo số cột và không bao giờ đạt $15\%$.

  3. **Lỗi Treo Lơ Lửng Ngoài Sàn Ở Hai Cột Biên ($u = \pm 1.0$)**:
     Tại cột $k = 0$ và $k = \text{cols} - 1$, ta có $u = \pm 1.0$.
     Khi đó $x = 540 \pm 1.0 \times \text{halfWidth}(r)$.
     Tại hàng đáy $r = \text{rows}-1$: $x = 540 \pm 430 = 110\text{ px}$ và $970\text{ px}$.
     Đây chính là tọa độ 2 mép biên tuyệt đối của sàn chánh điện ($540 \pm \text{half}_{\text{bot}}$)!
     Do $(x, y)$ là tâm của bồ đoàn (đường kính $160 \times 0.5 = 80\text{px}$) và nhân vật (rộng $106\text{px}$):
     - Mép trái đệm ngồi vươn tới $110 - 40 = 70\text{ px}$ (thụt ra ngoài sàn $40\text{px}$).
     - Mép phải đệm ngồi vươn tới $970 + 40 = 1010\text{ px}$ (thụt ra ngoài sàn $40\text{px}$).
     **Một nửa bồ đoàn và thân hình của toàn bộ hàng Phật tử ngồi ngoài cùng bị treo lơ lửng ngoài không gian hư vô bên ngoài sàn gạch!**
- **Giải pháp khắc phục (Mitigation)**:
  - Ràng buộc cứng: `cols` bắt buộc phải là số chẵn (`cols % 2 === 0`).
  - Thêm hệ số co lề sàn (Floor Margin Padding):
    $$u_0 = \frac{k - \frac{\text{cols} - 1}{2}}{\frac{\text{cols} - 1}{2}} \in [-1, 1]$$
    $$u = \text{sign}(u_0) \times \left(\text{aisleRatio} + (1.0 - \text{marginRatio} - \text{aisleRatio}) \times |u_0|\right)$$
    Với $\text{aisleRatio} = 0.15$ (chuẩn lối đi 15%), $\text{marginRatio} = 0.12$ (giữ lề an toàn để đệm ngồi nằm trọn 100% trong mặt sàn).

---

### [HIGH] Thách Thức 3: Chồng Lấn Trục Dọc & Thiếu Định Nghĩa Thứ Tự Vẽ (Painter's Algorithm)

- **Mục kiểm tra**: `ARCHITECTURE.md` §4.1, §4.2, `ASSET_MANIFEST.md` §2.2.
- **Giả định bị thách thức**: Các nhân vật hiển thị độc lập không che khuất bất hợp lý; quy trình vẽ Canvas tự động hiển thị đúng chiều sâu.
- **Kết quả thực nghiệm toán học (Empirical Proof via `test_perspective_math.cjs` & node checks)**:
  Khoảng cách trục $Y$ giữa các hàng ở cấu hình 36, 64, 100 chỗ:
  - Ở 36 chỗ ($6 \times 6$): Khoảng cách 2 hàng $\Delta y = 126.0\text{px}$, trong khi chiều cao nhân vật hàng đáy là $150.0\text{px}$ $\rightarrow$ **Chồng lấn $24.0\text{px}$**.
  - Ở 64 chỗ ($8 \times 8$): $\Delta y = 90.0\text{px}$, chiều cao nhân vật là $120.9\text{px}$ $\rightarrow$ **Chồng lấn $30.9\text{px}$**.
  - Ở 100 chỗ ($10 \times 10$): $\Delta y = 70.0\text{px}$, chiều cao nhân vật là $102.3\text{px}$ $\rightarrow$ **Chồng lấn $32.3\text{px}$**.
- **Nguy cơ lỗi hiển thị (Rendering Inversion Bug)**:
  Sự chồng lấn dọc trong phối cảnh 2.5D là tự nhiên (người ngồi trước che một phần người ngồi sau). TUY NHIÊN:
  - Trong `ARCHITECTURE.md` §3.3 A, thứ tự cấp slot là *"từ hàng trước ra hàng sau"* (tức Slot 0 ở hàng trước, Slot 99 ở hàng sau).
  - Nếu vòng lặp vẽ trên Canvas 2D lặp duyệt theo `slotIndex` từ $0 \rightarrow 99$:
    Slot 0 (hàng trước) được vẽ trước $\rightarrow$ Slot 99 (hàng sau) được vẽ sau $\rightarrow$ **NGƯỜI NGỒI Ở HÀNG SAU BỊ ĐÈ LÊN ĐẦU NGƯỜI NGỒI Ở HÀNG TRƯỚC!**
  - Tài liệu hoàn toàn thiếu định nghĩa thuật toán Painter's Algorithm: Bắt buộc sắp xếp danh sách vẽ theo tọa độ $Y$ tăng dần (`r` từ $0 \rightarrow \text{rows}-1$) trước khi gọi lệnh `ctx.drawImage()`.
  - Tài liệu thiếu định nghĩa điểm neo tọa độ (`anchor point`): Nếu dùng `ctx.drawImage(img, x, y)` mặc định theo góc trên-trái (top-left), toàn bộ nhân vật hàng cuối sẽ bị trôi tụt xuống dưới đáy màn hình ($y + 150 = 1995 > 1920$)!
- **Giải pháp khắc phục (Mitigation)**:
  1. Xác lập quy chuẩn điểm neo tọa độ bồ đoàn & nhân vật: `anchor = (centerX, bottomY)` (chính giữa đáy bồ đoàn).
  2. Bắt buộc Canvas Renderer phải sắp xếp mảng kết xuất theo thứ tự:
     `viewers.sort((a, b) => a.y - b.y)` trước mỗi frame kết xuất.

---

### [HIGH] Thách Thức 4: Mâu Thuẫn Schema WebSocket & Omission Trường Dữ Liệu Cốt Lõi

- **Mục kiểm tra**: `WEBSOCKET_SPEC.md` §3 & §5 vs `ARCHITECTURE.md` §1.3, §3.2, §6.4.
- **Các phát hiện mâu thuẫn thực nghiệm (Empirical Discrepancy Findings)**:

| Vấn đề | Giao thức `WEBSOCKET_SPEC.md` | Kiến trúc `ARCHITECTURE.md` | Hậu quả thực thi |
|---|---|---|---|
| **1. Trường `url` trong gói `tts`** | `url: string` là **BẮT BUỘC**, `dataUri?: string` là tùy chọn. | Tuyên bố xóa bỏ 100% việc ghi file ra đĩa SSD, stream Buffer in-memory qua Base64 `dataUri`. | Nếu backend không ghi SSD, trường `url` truyền gì? Nếu truyền chuỗi rỗng `""`, client đọc `url` sẽ dính lỗi 404! |
| **2. Cờ Combo trong gói `gift`** | Chỉ có `{ t: 'gift', id, name, ... }`, **KHÔNG HỀ CÓ** cờ `repeatEnd`, `comboCount`, hay `isCombo`. | §3.2 C & §7.1 khẳng định: `repeatEnd == false` kích hoạt hiệu ứng hạt nhẹ, `repeatEnd == true` chốt thông điệp xướng danh. | Không thể phân biệt gói tin quà nào là cú chạm trung gian, gói nào là kết thúc combo. Overlay sẽ xử lý mọi quà như quà đơn lẻ, gây loạn hoạt ảnh và âm thanh! |
| **3. Bất nhất lệnh Chuông (`bell`)** | Server $\rightarrow$ Client: `isGreatBell?: boolean`<br>Client $\rightarrow$ Server: `great?: boolean` | §3.1 & §5.1 gọi lẫn lộn `great` và `isGreatBell`. | Lập trình viên dễ truyền sai tên thuộc tính giữa Frontend Control và Backend Broadcaster. |
| **4. Bất nhất định danh Mõ (`mo1` vs `mo`)** | Gói tin phát đi là `t: "mo1"` | Lệnh điều khiển là `cmd: "mo"`, tài liệu kiến trúc gọi là `mo`. | `mo1` là tàn dư từ tên file âm thanh tham chiếu cũ (`mo1.wav`), phá vỡ tính nhất quán phong bì chuẩn `mo`. |
| **5. Khuyết thiếu `slotIndex` trong `chat` & `leave`** | `slotIndex?: number` là tùy chọn. | §7.2 minh họa broadcast `{ t: 'chat', id, text }` và `{ t: 'leave', id }` (thiếu cả `slotIndex` lẫn `name`). | Nếu thiếu `slotIndex`, Canvas Overlay phải chạy hàm tìm kiếm $O(N)$ trong 100 phần tử để biết cắm bong bóng chat lên đầu ai. |
| **6. Khán giả không có bồ đoàn bình luận** | `slotIndex` không có (undefined). | Không quy định cách hiển thị bong bóng chat cho người chưa có chỗ. | Bong bóng chat bay ở đâu trên màn hình? Không có tọa độ neo sẽ phát sinh lỗi runtime undefined coordinate. |

---

### [MEDIUM] Thách Thức 5: Tràn Bão Quà Combo 50 Lần & Nghẽn Hàng Đợi Giọng Đọc (TTS Exhaustion)

- **Mục kiểm tra**: `ARCHITECTURE.md` §3.2 C, §3.3 D.
- **Giả định bị thách thức**: Cơ chế chốt combo 1.5s timeout và quy tắc "bỏ qua các thông báo 1 xu cũ nhất" đủ bảo vệ hàng đợi TTS không bị tràn.
- **Kết quả thực nghiệm (Empirical Proof via `test_stress_harness.cjs` - Test 3)**:
  - Khi giả lập đợt bão quà gồm 20 quà Tier 2 liên tiếp (mỗi quà 30 xu) gửi dồn trong 3 giây:
    - Trần hàng đợi là 10 câu.
    - Quy tắc của Spec: *"Nếu vượt ngưỡng, tự động bỏ qua các thông báo 1 xu cũ nhất"*.
    - **Vấn đề**: Trong hàng đợi KHÔNG HỀ CÓ thông báo 1 xu nào (toàn bộ là Tier 2 - 30 xu)!
    - **Hệ quả**: Thuật toán rơi vào nhánh không xác định (undefined behavior). Hàng đợi hoặc bị tràn không giới hạn (gây trễ giọng đọc hàng chục phút), hoặc làm rớt các cúng dường lớn của người xem trả tiền thật (`droppedCount = 10`).
  - Nếu kết nối mạng TikTok bị rớt đúng gói tin `repeatEnd === true`, bộ đệm phải đợi hết timeout $1.5\text{s}$. Nhưng nếu người dùng tiếp tục bấm một món quà khác ngay trong $1.5\text{s}$ đó, khóa `comboKey = ${userId}_${giftId}` có thể gây xung đột hoặc nuốt chửng sự kiện kế tiếp.
- **Giải pháp khắc phục (Mitigation)**:
  Quy chuẩn lại chính sách drop của hàng đợi TTS:
  Khi hàng đợi đạt trần 10:
  1. Ưu tiên 1: Hủy các thông báo có số xu thấp nhất (kể cả xu $> 1$).
  2. Ưu tiên 2: Không bao giờ hủy thông báo Tier 1 ($\ge 99$ xu).
  3. Khi có quá 5 thông báo dồn ứ, tự động gộp các thông báo cùng loại thành một câu tổng hợp: *"Đồng tri ân chư Phật tử đã phát tâm cúng dường hoa đăng..."* để giải phóng hàng đợi ngay lập tức.

---

### [MEDIUM] Thách Thức 6: Vi Phạm Trần Trễ Tối Đa Trong Công Thức Exponential Backoff

- **Mục kiểm tra**: `ARCHITECTURE.md` §3.1 A (Connection Watchdog & Reconnection Engine).
- **Công thức trong tài liệu**:
  $$T_{\text{delay}} = \min\left(T_{\text{max}}, T_{\text{base}} \times 1.5^{\text{attempt}}\right) \times (1 \pm 0.2)$$
  Với $T_{\text{base}} = 2.0\text{s}$, $T_{\text{max}} = 30.0\text{s}$.
- **Kết quả thực nghiệm (Empirical Proof via `test_stress_harness.cjs` - Test 2)**:
  - Từ lần thử thứ 7 trở đi: $2.0 \times 1.5^7 = 34.17\text{s} \implies \text{clamped} = 30.0\text{s}$.
  - Sau đó nhân với $(1 \pm 0.2)$:
    $T_{\text{delay}} \in [24.0\text{s}, 36.0\text{s}]$!
  - **Độ trễ tối đa thực tế là $36.0\text{s}$, vượt $20\%$ so với mức trần $T_{\text{max}} = 30.0\text{s}$ mà tài liệu cam kết!**
  - Việc để trễ tới $36$ giây trong livestream TikTok là rất nguy hiểm, người xem sẽ ngỡ phòng live bị sập và thoát ra ngoài.
- **Giải pháp khắc phục (Mitigation)**:
  Đưa hàm tính nhiễu (Full Jitter) vào TRƯỚC hàm chặn trần `min`:
  $$T_{\text{delay}} = \min\left(T_{\text{max}}, T_{\text{base}} \times 1.5^{\text{attempt}} \times (0.8 + 0.4 \times \text{Math.random}())\right)$$
  Đảm bảo $T_{\text{delay}} \le 30.0\text{s}$ trong mọi trường hợp. Cố định trần số mũ `attempt = Math.min(attempt, 8)` để chống tràn số.

---

### [MEDIUM] Thách Thức 7: Nhảy Vị Trí Slot Khi Tự Động Nâng Sức Chứa (Capacity Expansion Jumping)

- **Mục kiểm tra**: `ARCHITECTURE.md` §3.3 A, `WEBSOCKET_SPEC.md` §3.1, §3.2 (`seatMode: 'auto'`, $24 \rightarrow 36 \rightarrow 64 \rightarrow 100$).
- **Kết quả thực nghiệm (Empirical Proof via `test_capacity_resizing.cjs`)**:
  - Khi sức chứa nâng từ 36 lên 64: Ma trận đổi từ $6 \times 6$ sang $8 \times 8$.
  - Người xem đang giữ `slotIndex: 6`:
    - Ở ma trận $6 \times 6$: Tọa độ là Hàng 1, Cột 0 (mép trái hàng 2).
    - Ở ma trận $8 \times 8$: Tọa độ thành Hàng 0, Cột 6 (tít trên góc phải hàng 1 sát bàn thờ)!
  - Người xem đang giữ `slotIndex: 12`:
    - Ở ma trận $6 \times 6$: Hàng 2, Cột 0.
    - Ở ma trận $8 \times 8$: Hàng 1, Cột 4 (ngồi sát lối đi trung tâm)!
- **Hệ quả**: Khán giả đang xem livestream sẽ thấy hàng loạt nhân vật tự nhiên "dịch chuyển tức thời" (teleport) nhảy loạn xạ trên màn hình mỗi khi phòng mở rộng chỗ ngồi.
- **Giải pháp khắc phục (Mitigation)**:
  1. Giữ nguyên cấu hình số cột cố định (ví dụ luôn là `cols = 10`, chỉ tăng dần số hàng mở khóa từ $r=0..3 \rightarrow 0..5 \rightarrow 0..7 \rightarrow 0..9$), HOẶC
  2. Bổ sung gói tin thông báo tái sắp xếp chỗ ngồi `{ t: 'reseed', viewers: ViewerState[] }` khi nâng cấp ma trận để client cập nhật đồng bộ mà không tạo cảm giác giật cục.

---

### [LOW] Thách Thức 8: Nhận Diện Sai Trang Phục (Skin NLP False Positives)

- **Mục kiểm tra**: `ARCHITECTURE.md` §4.2 (Nhận diện Trang Phục Tự Động).
- **Quy tắc trong tài liệu**: Chuỗi bình luận ngắn $\le 3$ từ chứa từ khóa `nam`, `nữ`, `bà`, `chú tiểu`, `sư thầy`, `sư cô`, `cao tăng`.
- **Kết quả thực nghiệm (Empirical Proof via `test_skin_nlp.cjs`)**:
  - Bình luận: `"Nam mô Phật"` (3 từ) $\rightarrow$ Khớp từ khóa `nam` $\rightarrow$ Đổi trang phục thành Cư sĩ Nam!
  - Bình luận: `"Lạy Phật bà"` (3 từ) $\rightarrow$ Khớp từ khóa `bà` $\rightarrow$ Đổi trang phục thành Cụ bà!
  - Bình luận: `"Con chào bà"` (3 từ) $\rightarrow$ Khớp từ khóa `bà`!
  - Trong khi đó bình luận hợp lệ: `"chú tiểu dễ thương"` (4 từ) $\rightarrow$ Bị bỏ qua không đổi được trang phục!
- **Giải pháp khắc phục (Mitigation)**:
  Phải kiểm tra từ đứng độc lập (Regex word boundaries `\bnam\b`) và loại trừ tường minh tiền tố niệm Phật (`^(?!.*nam mô).*`). Tốt nhất chỉ cho phép đổi khi người xem gõ đúng cú pháp chỉ định ngắn: `đổi nam`, `skin nam`, `là nữ`, `chú tiểu`.

---

## 3. BẢNG TỔNG HỢP KẾT QUẢ THỬ NGHIỆM THỰC NGHIỆM (STRESS TEST MATRIX)

| Kịch bản kiểm thử | Hành vi kỳ vọng theo Spec | Hành vi thực tế ghi nhận | Kết quả | Mức độ |
|---|---|---|:---:|:---:|
| **100 viewers đều có `coins > 0`, viewer 101 vào phòng** | Đào thải người im lặng nhất để nhường chỗ | `nonDonors.length === 0`, không đào thải được ai, người mới bị chặn 100% | **FAIL** | CRITICAL |
| **Kiểm tra lối đi giữa với cấu hình cột lẻ (`cols = 5`)** | Lối đi thông suốt, không có ai ngồi chắn | Nhân vật cột giữa ngồi đúng tọa độ $X = 540$, chắn lối đi | **FAIL** | HIGH |
| **Đo bề rộng lối đi giữa theo công thức §4.1** | Đạt 15% bề rộng sàn như mô tả | Đạt $23.6\% - 31.2\%$ (lệch gấp đôi) | **FAIL** | HIGH |
| **Kiểm tra mép ngoài của bồ đoàn tại $u = \pm 1.0$** | Toàn bộ bồ đoàn nằm trọn trên sàn gạch | Mép bồ đoàn vươn ra ngoài biên gạch $40\text{px}$ (lơ lửng) | **FAIL** | HIGH |
| **Độ đè lấp trục dọc giữa các hàng (Cap 64, 100)** | Các hàng tách biệt hoặc có quy chuẩn Z-index | Hàng trước đè hàng sau $24 - 32\text{px}$, thiếu quy chuẩn vẽ | **FAIL** | HIGH |
| **Kiểm tra tính nhất quán gói tin `tts`** | Không phụ thuộc ghi file SSD, dùng `dataUri` | Spec bắt buộc `url: string`, `dataUri` chỉ là optional | **FAIL** | HIGH |
| **Xử lý chuỗi combo 50 hoa hồng liên tiếp** | Client hiện hạt nhẹ, không spam TTS | Giao thức thiếu cờ combo, không có cách nào báo hạt nhẹ | **FAIL** | HIGH |
| **Trần độ trễ Exponential Backoff ($T_{\text{max}} = 30\text{s}$)** | $T_{\text{delay}} \le 30.0\text{s}$ | $T_{\text{delay}}$ vọt lên $36.0\text{s}$ do jitter nằm ngoài hàm min | **FAIL** | MEDIUM |
| **Bão 20 quà tặng Tier 2 dồn dập vào hàng đợi TTS** | Bảo vệ hàng đợi, không lag live | Spec chỉ cho phép drop quà 1 xu, gây tràn hoặc drop tùy tiện | **FAIL** | MEDIUM |
| **Dịch chuyển vị trí khi auto mở rộng sức chứa** | Người xem giữ nguyên vị trí trực quan | Slot bị nhảy hàng và cột do số cột thay đổi ($6 \rightarrow 8 \rightarrow 10$) | **FAIL** | MEDIUM |
| **NLP đổi trang phục với câu kinh 3 từ ("Nam mô Phật")** | Không đổi nhầm trang phục | Đổi nhầm sang trang phục `char_man` do dính chữ "Nam" | **FAIL** | LOW |

---

## 4. KẾT LUẬN & KIẾN NGHỊ HÀNH ĐỘNG (VERDICT & ACTION ITEMS)

### **QUYẾT ĐỊNH CUỐI CÙNG: `REQUEST_CHANGES` (YÊU CẦU ĐIỀU CHỈNH ĐẶC TẢ)**

Bộ tài liệu `ARCHITECTURE.md` và `WEBSOCKET_SPEC.md` được xây dựng rất công phu, chi tiết và có tính thực tiễn cao. Tuy nhiên, các lỗi logic chết người về thuật toán đào thải chỗ ngồi (Deadlock/Starvation), sai số hình học phối cảnh 2.5D và các bất nhất trong phong bì WebSocket bắt buộc phải được điều chỉnh trước khi bước vào giai đoạn viết mã triển khai thực tế.

### Các điểm bắt buộc sửa đổi (Required Fixes):
1. **Sửa thuật toán Đào thải Chỗ ngồi (`ARCHITECTURE.md` §3.3 A)**:
   - Thêm cơ chế giải phóng chỗ ngồi dựa trên thời gian bất hoạt (Inactivity TTL: 15-30 phút) cho các donor cúng dường ít xu ($< 10\text{ xu}$) khi phòng đạt trần 100 chỗ và không còn người $0\text{ xu}$.
2. **Hiệu chỉnh Công thức Phối cảnh 2.5D (`ARCHITECTURE.md` §4.1)**:
   - Thêm ràng buộc `cols` chẵn và hệ số lề sàn $\text{marginRatio} = 0.12$ để đệm không bay ra ngoài mép sàn.
   - Chuẩn hóa điểm neo tọa độ: `(centerX, bottomY)`.
   - Bổ sung quy định bắt buộc về thứ tự vẽ (Painter's Algorithm: sắp xếp theo trục $Y$ trước khi render).
3. **Chuẩn hóa Giao thức WebSocket (`WEBSOCKET_SPEC.md` §3 & §5)**:
   - Trong `tts`: Chuyển `dataUri: string` thành bắt buộc, chuyển `url?: string` thành tùy chọn.
   - Trong `gift`: Bổ sung trường `repeatEnd?: boolean`, `comboCount?: number`, `isCombo?: boolean`.
   - Đồng bộ tên trường: `isGreatBell` trong `bell` (hoặc thống nhất dùng `great`), chuẩn hóa gói `mo1` thành `mo`.
   - Đảm bảo `slotIndex: number` luôn được đính kèm trong các sự kiện `chat`, `gift`, `like`, `leave` để tối ưu hóa hiệu năng $O(1)$ cho Canvas 60fps.
4. **Sửa công thức Exponential Backoff (`ARCHITECTURE.md` §3.1 A)**:
   - Đưa hệ số jitter vào bên trong hàm chặn trần: $\min(30.0, T_{\text{base}} \times 1.5^{\text{attempt}} \times (0.8 + 0.4 \times \text{rand}))$.
