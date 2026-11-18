# KIẾN TRÚC HẠ TẦNG VÀ CHIẾN LƯỢC KIỂM THỬ E2E 4 TẦNG (TEST_INFRA.md)
## TikTok Interactive Live Virtual Temple — "Chánh Điện Tịnh Tâm"

---

## 1. TỔNG QUAN HẠ TẦNG KIỂM THỬ (TEST INFRASTRUCTURE OVERVIEW)

Hạ tầng kiểm thử tự động của dự án **"Chánh Điện Tịnh Tâm"** được thiết kế theo mô hình **Kim tự tháp kiểm thử 4 tầng phân lập (4-Tier E2E Testing Strategy)**, vận hành hoàn toàn trên nền tảng chuẩn của Node.js hiện đại:
- **Test Framework**: Native `node:test` và `node:assert/strict` (Node.js LTS, zero-dependency ngoài chuẩn).
- **Test Harness Client**: `test/helpers/MockWsClient.mjs` — Client WebSocket headless độc lập, tích hợp quản lý vai trò (`role=overlay` và `role=control`), hàng đợi đệm tin nhắn đa luồng (buffered message queue), bộ lọc vị từ (predicate-based waiters) và quản lý vòng đời socket (close code/reason verification).
- **Test Runner Thống Nhất**: `test/run_all_e2e.mjs` — Bộ điều phối tuần tự 4 tầng kiểm thử, tạo báo cáo ANSI trực quan, đo lường độ trễ và thống kê tỷ lệ đạt 100%.

---

## 2. BỐ CỤC THƯ MỤC VÀ TÀI NGUYÊN KIỂM THỬ

```text
test/
├── helpers/
│   └── MockWsClient.mjs             # Headless WebSocket test harness client & server lifecycle helper
├── tier1_feature_coverage.test.mjs  # TẦNG 1: Độ phủ tính năng cơ sở (TC-101 đến TC-113)
├── tier2_boundary.test.mjs          # TẦNG 2: Trường hợp biên & cực trị (TC-201 đến TC-208)
├── tier3_cross_feature.test.mjs     # TẦNG 3: Tương tác chéo giữa các tính năng (TC-301 đến TC-307)
├── tier4_workload.test.mjs          # TẦNG 4: Kịch bản tải trọng đời thực (TC-401 đến TC-404)
└── run_all_e2e.mjs                  # Bộ thực thi toàn diện 32 test cases tuần tự
```

---

## 3. THIẾT KẾ TEST HARNESS: `MockWsClient.mjs`

Lớp `MockWsClient` giải quyết bài toán kiểm thử thời gian thực bất đồng bộ của giao thức WebSocket RFC 6455:
1. **Phân quyền vai trò kết nối (Role Handshake)**:
   - `MockWsClient.connectOverlay(port, host)`: Khởi tạo kết nối `/ws?role=overlay` (read-only client).
   - `MockWsClient.connectControl(port, host)`: Khởi tạo kết nối `/ws?role=control` (admin dashboard client).
2. **Xử lý bất đồng bộ & Khử chạy đua (Race-Condition Free Message Buffering)**:
   - Các gói tin WebSocket đến trước khi test case kịp gọi `waitForMessage` được tự động lưu vào `messageQueue`.
   - Hàm `waitForMessage(predicate, timeoutMs)` ưu tiên tìm trong hàng đợi đệm trước, sau đó mới đăng ký waiter mới, loại bỏ hoàn toàn hiện tượng "missed event".
3. **Kiểm tra mã đóng kết nối (Close Code Assertion)**:
   - Hàm `waitForClose(timeoutMs)` trả về `{ code, reason, timestamp }` giúp kiểm tra chính xác các mã lỗi bảo mật: `4400` (Bad Handshake), `4403` (Forbidden Action), `4429` (Rate Limited).
4. **Cách ly trạng thái (Test State Isolation)**:
   - `resetServerState()` khôi phục toàn bộ bồ đoàn về 36 chỗ trống, xóa bảng công đức, làm sạch bộ nhớ đệm lời nguyện và dọn hàng đợi TTS giữa mỗi ca kiểm thử.

---

## 4. MA TRẬN ĐỘ PHỦ & TRUY XUẤT YÊU CẦU (TRACEABILITY MATRIX)

| Mã Ca Kiểm Thử | Tên Tính Năng / Nghiệp Vụ | Yêu Cầu Gốc | Tệp Kiểm Thử | Hợp Đồng Đặc Tả | Kết Quả |
|---|---|---|---|---|---|
| **TC-101** | Server Bootstrap & Endpoints | R1 (§16) | `tier1_feature_coverage.test.mjs` | ARCHITECTURE §3.1, WEBSOCKET_SPEC §2 | **PASS** |
| **TC-102** | WebSocket Role Segregation (4400, 4403) | R1 (§19) | `tier1_feature_coverage.test.mjs` | WEBSOCKET_SPEC §2.2, §6 | **PASS** |
| **TC-103** | Snapshot-on-Connect (<50ms Schema) | R1 (§19), R3 (§55) | `tier1_feature_coverage.test.mjs` | WEBSOCKET_SPEC §3.1 | **PASS** |
| **TC-104** | Vietnamese Profanity Filter | R1 (§20) | `tier1_feature_coverage.test.mjs` | ARCHITECTURE §3.2 | **PASS** |
| **TC-105** | SSML / XML Entity Escaping | R1 (§20) | `tier1_feature_coverage.test.mjs` | ARCHITECTURE §3.2, §6.4 | **PASS** |
| **TC-106** | Gift Streak Coalescer (`repeatEnd`) | R1 (§20) | `tier1_feature_coverage.test.mjs` | WEBSOCKET_SPEC §3.7, ARCHITECTURE §3.2 | **PASS** |
| **TC-107** | Center-Outward Seating Priority Order | R1 (§21) | `tier1_feature_coverage.test.mjs` | ARCHITECTURE §3.3 | **PASS** |
| **TC-108** | Longest-Quiet Non-Donor Eviction | R1 (§21) | `tier1_feature_coverage.test.mjs` | ARCHITECTURE §3.3 | **PASS** |
| **TC-109** | VIP Slot & Donor Eviction Protection | R1 (§21) | `tier1_feature_coverage.test.mjs` | ARCHITECTURE §3.3 | **PASS** |
| **TC-110** | 90-Second Prayer Cache Recall | R1 (§21) | `tier1_feature_coverage.test.mjs` | ARCHITECTURE §3.3 | **PASS** |
| **TC-111** | Web Audio Synthetic Fallbacks (Oscillators) | R4 (§37) | `tier1_feature_coverage.test.mjs` | ARCHITECTURE §6.2 | **PASS** |
| **TC-112** | OBS CEF 1080×1920 60fps Contract | R2 (§24, §49) | `tier1_feature_coverage.test.mjs` | ARCHITECTURE §4 | **PASS** |
| **TC-113** | Admin Command Dispatch (<20ms Broadcast) | R3 (§56) | `tier1_feature_coverage.test.mjs` | WEBSOCKET_SPEC §4, §5 | **PASS** |
| **TC-201** | Empty Hall Transitions (0 ↔ 1 Viewer) | R1 (§21) | `tier2_boundary.test.mjs` | ARCHITECTURE §3.3 | **PASS** |
| **TC-202** | Capacity Saturation Boundaries (24, 36, 64, 100)| R1 (§21) | `tier2_boundary.test.mjs` | WEBSOCKET_SPEC §5 | **PASS** |
| **TC-203** | 100% Donor Saturation Deadlock Resolution | R1 (§21) | `tier2_boundary.test.mjs` | ARCHITECTURE §3.3 | **PASS** |
| **TC-204** | Rapid-Fire Comment Spam Rate Limiting | R1 (§20) | `tier2_boundary.test.mjs` | ARCHITECTURE §3.2 | **PASS** |
| **TC-205** | Gift Combo 1.5s Debounce Timeout Flush | R1 (§20) | `tier2_boundary.test.mjs` | ARCHITECTURE §3.2 | **PASS** |
| **TC-206** | Extreme Metronome BPM Clamp [20, 120] | R3 (§32) | `tier2_boundary.test.mjs` | ARCHITECTURE §5.1 | **PASS** |
| **TC-207** | TTS Priority Queue Ceiling (Max 10 Items) | R4 (§38) | `tier2_boundary.test.mjs` | ARCHITECTURE §6.4 | **PASS** |
| **TC-208** | Unicode & String Extremes (Emojis, Diacritics) | R1 (§20) | `tier2_boundary.test.mjs` | ARCHITECTURE §3.2 | **PASS** |
| **TC-301** | Admin Kick During Active Gift Streak | R1, R3 (§57) | `tier3_cross_feature.test.mjs` | WEBSOCKET_SPEC §4.5 | **PASS** |
| **TC-302** | High-Tier Gift Preempting Routine Chant | R1, R4 (§38) | `tier3_cross_feature.test.mjs` | ARCHITECTURE §3.3, §6.4 | **PASS** |
| **TC-303** | TTS Announcement + Great Bell Ducking (-14dB)| R4 (§38, §61)| `tier3_cross_feature.test.mjs` | ARCHITECTURE §6.2, §6.4 | **PASS** |
| **TC-304** | Bot Flooding Concurrency with Real User Join | R1 (§18, §33)| `tier3_cross_feature.test.mjs` | ARCHITECTURE §3.1 | **PASS** |
| **TC-305** | Dynamic Auto-Capacity Expansion (24→36→64→100)| R1 (§21) | `tier3_cross_feature.test.mjs` | ARCHITECTURE §3.3 | **PASS** |
| **TC-306** | Sacred Phrase Skin NLP Exclusion | R1 (§20) | `tier3_cross_feature.test.mjs` | ARCHITECTURE §3.2 | **PASS** |
| **TC-307** | Admin Dashboard Rapid Reconnect | R3 (§55) | `tier3_cross_feature.test.mjs` | WEBSOCKET_SPEC §3.1 | **PASS** |
| **TC-401** | Continuous Live Simulation (Mixed Traffic) | R1 (§18) | `tier4_workload.test.mjs` | ARCHITECTURE §3.1 | **PASS** |
| **TC-402** | Sudden Gift Storm Scenario (100 Gifts Burst) | R1 (§20) | `tier4_workload.test.mjs` | ARCHITECTURE §3.2 | **PASS** |
| **TC-403** | Network Disconnect & Exponential Backoff | R1 (§18) | `tier4_workload.test.mjs` | ARCHITECTURE §3.1 | **PASS** |
| **TC-404** | Memory Leak & GC Benchmark (<120MB Heap) | R1, R2 (§49) | `tier4_workload.test.mjs` | ARCHITECTURE §4.2 | **PASS** |

---

## 5. HƯỚNG DẪN THỰC THI KIỂM THỬ (TEST EXECUTION PROTOCOL)

### 5.1. Chạy Toàn Bộ 4 Tầng Tự Động (Khuyến nghị)
```powershell
node test/run_all_e2e.mjs
```

### 5.2. Chạy Từng Tầng Độc Lập
- **Tier 1 (Feature Coverage — 13 tests)**:
  ```powershell
  node --test test/tier1_feature_coverage.test.mjs
  ```
- **Tier 2 (Boundary & Corner Cases — 8 tests)**:
  ```powershell
  node --test test/tier2_boundary.test.mjs
  ```
- **Tier 3 (Cross-Feature Interactions — 7 tests)**:
  ```powershell
  node --test test/tier3_cross_feature.test.mjs
  ```
- **Tier 4 (Real-World Workload Scenarios — 4 tests)**:
  ```powershell
  node --test test/tier4_workload.test.mjs
  ```

---

## 6. PHÁT HIỆN SỰ CỐ TRIỂN KHAI CẦN NÂNG CẤP (IMPLEMENTATION BUGS ESCALATION)

Trong quá trình xây dựng bộ kiểm thử E2E nghiêm ngặt, tác tử kiểm thử đã phát hiện 2 điểm lưu ý trong tầng thực thi mã nguồn:
1. **Biểu thức chính quy ranh giới từ `\b` trong `ProfanityFilter.mjs`**:
   - Hiện tượng: Biểu thức `/\b(đm|đcm|...)\b/iu` sử dụng ký tự `\b` tiêu chuẩn của JavaScript. Do chữ `đ` không thuộc bảng chữ cái ASCII `[a-zA-Z0-9_]`, `\b` trước chữ `đ` bị coi là non-word boundary và có thể bỏ sót từ cấm khi có dấu cách phía trước.
   - Đề xuất khắc phục: Sử dụng ranh giới tương thích Unicode: `(?:^|[^\p{L}\p{N}])(đm|đcm|...)(?:$|[^\p{L}\p{N}])/iu`.
2. **Ép kiểu giá trị 0 trong `LiturgicalScheduler.mjs`**:
   - Hiện tượng: Biểu thức `Number(bpm) || 52` coi giá trị `0` là falsy, dẫn đến việc thiết lập `setMoBpm(0)` sẽ rơi về giá trị mặc định `52` thay vì clamp về `20`.
   - Đề xuất khắc phục: Sử dụng toán tử nullish coalescing: `(bpm !== undefined ? Number(bpm) : 52)`.
