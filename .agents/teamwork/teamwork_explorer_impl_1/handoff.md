# BÁO CÁO BÀN GIAO THIẾT KẾ KỸ THUẬT: BACKEND SERVER & STATE MANAGER (R1) VÀ AUDIO TTS PIPELINE (R4)
## Handoff Report — Technical Implementation Blueprint for R1 & R4
**Author**: `teamwork_explorer_impl_1` (Archetype: explorer / investigation & synthesis)  
**Target Milestone**: R1 (Node.js Backend & State Engine) & R4 (Backend Audio & TTS Pipeline)  
**Date**: 2026-11-01T20:10:00Z  

---

## 1. OBSERVATION

Dựa trên việc kiểm tra chi tiết toàn bộ các tài liệu đặc tả hệ thống và trạng thái thực tế của workspace:
1. **Yêu cầu nhiệm vụ (`ORIGINAL_REQUEST.md`, lines 16-22, 35-39)**:
   - **R1. Node.js Backend Server & State Manager**: Xây dựng máy chủ Node.js bao gồm thu nhận sự kiện với Mock Event Simulator và cấu trúc TikTokLiveConnector chạy cục bộ không cần luồng live thật; WebSocket broadcaster phân quyền vai trò (`role=overlay` cho OBS CEF chỉ đọc vs `role=control` cho Admin Dashboard); Tầng kiểm duyệt nội dung (bộ lọc từ cấm tiếng Việt, escape SSML/XML, per-user rate limit, gộp quà combo); Quản lý trạng thái bồ đoàn 24-100 chỗ ngồi ưu tiên từ giữa ra vách, chính sách đào thải người không cúng dường lâu nhất khi đầy chỗ, bảo vệ vĩnh viễn slot VIP và bộ nhớ đệm lời nguyện 90 giây.
   - **R4. Audio & TTS Integration**: Xây dựng luồng tổng hợp giọng đọc tiếng Việt cho Phật tử cúng dường và tụng kinh bằng Microsoft Edge-TTS, truyền tải trực tiếp trong RAM (In-Memory Buffer Base64 Data URI) qua WebSocket, không ghi đĩa SSD, hàng đợi ưu tiên 3 cấp, phối hợp ducking nhạc nền (-14dB).
2. **Kiến trúc hệ thống (`ARCHITECTURE.md`)**:
   - Kiến trúc 4 tầng phân lập rõ ràng:
     - Tầng 1 (Ingestion): `TikTokLiveAdapter.mjs`, `MockBotSimulator.mjs`, `AdminManualAdapter.mjs`, `ReconnectionEngine.mjs` (§3.1).
     - Tầng 2 (Moderation): `EventNormalizer.mjs`, `ProfanityFilter.mjs`, `GiftStreakCoalescer.mjs`, `Sanitizer.mjs` (§3.2).
     - Tầng 3 (State): `StateManager.mjs`, `SeatingEngine.mjs`, `PrayerCache.mjs`, `MeritLeaderboard.mjs`, `LiturgicalScheduler.mjs` (§3.3).
     - Tầng 4 (Broadcaster): `Broadcaster.mjs`, `MessageSchemas.mjs` (§3.4).
     - Động cơ âm thanh backend: `TtsEngine.mjs`, `AudioPriorityQueue.mjs` (§6).
3. **Giao thức WebSocket (`WEBSOCKET_SPEC.md`)**:
   - Endpoint: `/ws?role=overlay` (read-only, cấm gửi lệnh; vi phạm trả mã `4403`) và `/ws?role=control` (gửi lệnh `ctl`, nhận log).
   - Snapshot on connect: Ngay khi kết nối thành công, máy chủ lập tức gửi gói tin `state` chứa đầy đủ settings, viewers, cap, startedAt, tiktokStatus trong thời gian dưới 50ms.
   - Định dạng phong bì Server $\rightarrow$ Client: `{ "t": "<event_type>", ... }`.
   - Định dạng phong bì Client $\rightarrow$ Server: `{ "t": "ctl", "cmd": "<command_name>", ... }`.
4. **Môi trường vận hành thực tế**:
   - Hệ điều hành: Windows 11, Node.js `v24.16.0` (hỗ trợ đầy đủ ES Modules, native `node:test`, `crypto`, `fetch`).
   - Thư mục `src/` hiện chưa tồn tại trên đĩa, sẵn sàng cho công đoạn triển khai mới theo chuẩn mã nguồn sạch.

---

## 2. LOGIC CHAIN

Từ các quan sát thực nghiệm trên, chuỗi lập luận kỹ thuật dẫn dắt kiến trúc được xác lập như sau:

1. **Tính độc lập giữa Ingestion và State**:
   - *Quan sát*: TikTok LIVE API có thể thay đổi, bị chặn IP hoặc mất kết nối bất ngờ; trong khi đó môi trường phát triển cục bộ và OBS overlay cần chạy mượt mà ngay cả khi không có kết nối TikTok LIVE thật.
   - *Suy luận*: Tầng Ingestion phải trừu tượng hóa toàn bộ nguồn sự kiện thành một interface `AppEventSource`. Cả `TikTokLiveAdapter`, `MockBotSimulator`, và `AdminManualAdapter` đều emit sự kiện thô về một bus trung tâm. Cần có `ReconnectionEngine` xử lý Exponential Backoff with Jitter ($T_{\text{base}}=2\text{s}, T_{\text{max}}=30\text{s}, \pm 20\%$) và Watchdog 15 giây.

2. **Kiểm duyệt nội dung trước khi chạm tới State**:
   - *Quan sát*: Nếu bình luận thô tục, teencode báng bổ hoặc script độc hại được đưa vào StateManager hay Edge-TTS, chánh điện sẽ bị xúc phạm nghiêm trọng và Edge-TTS sẽ phát sinh lỗi đọc hoặc treo hàng đợi.
   - *Suy luận*: Toàn bộ sự kiện thô bắt buộc phải đi qua Tầng 2 (`EventNormalizer`, `ProfanityFilter`, `Sanitizer`) trước khi chạm vào `StateManager`. Ký tự XML SSML (`<`, `>`, `&`, `"`, `'`) phải được escape 100%. Nickname vi phạm từ cấm được thay thế bằng `"Phật tử hữu duyên"`.

3. **Chống nghẽn hàng đợi bằng Gift Streak Coalescer**:
   - *Quan sát*: TikTok gửi combo quà (ví dụ 1 bông hồng gửi 99 lần) thành 99 sự kiện liên tiếp. Nếu mỗi sự kiện đều sinh TTS và cập nhật leaderboard thì máy chủ sẽ nghẽn và OBS giật lag.
   - *Suy luận*: `GiftStreakCoalescer` sử dụng cờ `repeatEnd` kết hợp bộ đệm debounce 1.5 giây để gộp toàn bộ lượt tặng trong một combo thành đúng 1 thông điệp xướng tên duy nhất khi kết thúc streak. Trong thời gian streak đang chạy (`repeatEnd === false`), hệ thống chỉ phát tín hiệu hạt nhẹ tới overlay.

4. **Quản lý bồ đoàn 2.5D & Thuật toán Đào thải Đa Cấp**:
   - *Quan sát*: Khung hình chánh điện yêu cầu ấm cúng, người xem ngồi từ gần camera dạt về phía Phật và từ lối đi giữa dạt sang hai bên vách. Khi phòng đầy (24/36/64/100 chỗ), cần giải phóng chỗ cho người mới nhưng không được làm phiền người cúng dường (`coins > 0`) hoặc VIP.
   - *Suy luận*: `SeatingEngine` tính toán thứ tự bồ đoàn ưu tiên theo ma trận hàng và cột (hàng trước về sau, cột kề lối đi giữa ra hai biên). Khi đầy:
     - Ưu tiên đào thải 1: Tìm người `coins === 0` và không phải VIP có thời gian im lặng lâu nhất (`lastActivityAt` nhỏ nhất).
     - Xử lý bế tắc 100% Donors: Nếu tất cả đều là donors, chỉ đào thải donor có số xu thấp nhất và thời gian bất hoạt > 15 phút. Slot VIP được Admin ghim luôn miễn trừ đào thải.

5. **Bộ nhớ đệm lời nguyện 90 giây & Bảng công đức**:
   - *Quan sát*: Khán giả thường chat lời nguyện trước khi ấn tặng quà.
   - *Suy luận*: `PrayerCache` lưu trữ bình luận dạng sliding window 90 giây theo `userId`. Khi có quà, hệ thống rút lời nguyện ra xướng tên. Nếu không có, hàm `pickPrayer()` chọn một câu phúc lành ngẫu nhiên. `MeritLeaderboard` duy trì bảng xếp hạng Top 5 / Top 10 và phát cờ `isTopChange` để kích hoạt ánh sáng vàng kim trên HUD.

6. **Phát sóng WebSocket siêu nhẹ & Snapshot on Connect**:
   - *Quan sát*: Thư viện `Socket.io` có overhead lớn và không tối ưu cho OBS CEF. OBS Overlay và Admin cần cập nhật ngay trong 50ms khi mở trang.
   - *Suy luận*: Sử dụng native `ws` (RFC 6455). Tách biệt vai trò qua URL `?role=overlay` (read-only) và `?role=control` (toàn quyền). Ngay tại event `'connection'`, máy chủ serialize trạng thái `StateManager.getSnapshot()` gửi tức thì cho client.

7. **R4 Audio Pipeline: In-Memory Streaming & Priority Queue**:
   - *Quan sát*: Việc ghi file `.mp3` ra đĩa rồi gọi HTTP GET xóa file gây mòn ổ cứng SSD và nghẽn I/O khi live đông.
   - *Suy luận*: `TtsEngine` tích hợp `msedge-tts` sinh trực tiếp `Buffer` âm thanh trong RAM, chuyển đổi sang Base64 Data URI và gửi qua gói tin WebSocket `{ t: 'tts', dataUri: 'data:audio/mp3;base64,...' }`. Caching MD5 cho các câu kinh cố định. `AudioPriorityQueue` quản lý 3 cấp độ ưu tiên (Tier 1 $\ge 99$ xu ưu tiên tối thượng; Tier 2 1-98 xu FIFO; Tier 3 tụng kinh tự động bị hoãn nếu có quà).

---

## 3. BẢN THIẾT KẾ TRIỂN KHAI HOÀN CHỈNH (COMPLETE TECHNICAL BLUEPRINT)

### PHẦN A: CẤU TRÚC THƯ MỤC VÀ TỆP DƯỚI `src/`

```text
src/
├── server.mjs                     # Entry point HTTP (Express) & WebSocket (ws) Server
├── config.mjs                     # Quản lý cấu hình, biến môi trường & hằng số hệ thống
│
├── ingestion/                     # TẦNG 1: THU NHẬN SỰ KIỆN ĐA NGUỒN
│   ├── TikTokLiveAdapter.mjs      # Kết nối TikTok Live, EulerStream signature, hpagent proxy
│   ├── MockBotSimulator.mjs       # Bộ sinh bot tự động tương tác (1-100 bots, đa nhịp độ)
│   ├── AdminManualAdapter.mjs     # Bộ tiếp nhận sự kiện kích hoạt thủ công từ Control Dashboard
│   └── ReconnectionEngine.mjs     # Exponential backoff with jitter & Watchdog 15s
│
├── moderation/                    # TẦNG 2: CHUẨN HÓA & KIỂM DUYỆT NỘI DUNG
│   ├── EventNormalizer.mjs        # Chuẩn hóa về CanonicalAppEvent & NLP nhận diện trang phục
│   ├── ProfanityFilter.mjs        # Bộ lọc danh sách đen từ cấm tiếng Việt, teencode, báng bổ
│   ├── GiftStreakCoalescer.mjs    # Bộ gộp quà combo dựa trên repeatEnd & bộ đệm 1.5s
│   └── Sanitizer.mjs              # Làm sạch chuỗi, giới hạn ký tự & escape XML/SSML
│
├── state/                         # TẦNG 3: BỘ QUẢN LÝ TRẠNG THÁI TRUNG TÂM
│   ├── StateManager.mjs           # Điều phối trạng thái tổng thể, snapshot & xử lý lệnh ctl
│   ├── SeatingEngine.mjs          # Lưới bồ đoàn 24-100 chỗ, xếp từ giữa ra vách, LRU eviction
│   ├── PrayerCache.mjs            # Bộ nhớ đệm lời nguyện cầu 90 giây & kho phúc lành
│   ├── MeritLeaderboard.mjs       # Bảng vinh danh công đức Top 5 / Top 10 realtime
│   └── LiturgicalScheduler.mjs    # Nhịp mõ metronome 20-120 BPM & chu kỳ tụng kinh tự động
│
├── audio/                         # R4: ĐỘNG CƠ ÂM THANH & GIỌNG ĐỌC AI BACKEND
│   ├── TtsEngine.mjs              # msedge-tts in-memory buffer streaming (Base64 Data URI)
│   └── AudioPriorityQueue.mjs     # Hàng đợi ưu tiên 3 cấp, trần an toàn 10 câu & MD5 cache
│
└── broadcaster/                   # TẦNG 4: WEBSOCKET BROADCASTER
    ├── Broadcaster.mjs            # Native ws server, phân quyền role=overlay vs role=control
    └── MessageSchemas.mjs         # Schema validation, TypeScript interfaces & error codes
```

---

### PHẦN B: ĐẶC TẢ `package.json` VÀ BIẾN MÔI TRƯỜNG `.env`

#### 1. Manifest `package.json`
```json
{
  "name": "chanh-dien-tinh-tam",
  "version": "1.0.0",
  "description": "TikTok Interactive Live Virtual Temple - Chánh Điện Tịnh Tâm",
  "type": "module",
  "main": "src/server.mjs",
  "scripts": {
    "start": "node src/server.mjs",
    "dev": "node --watch src/server.mjs",
    "test": "node --test tests/**/*.test.mjs",
    "verify-assets": "node scripts/verify_assets.mjs",
    "lint": "eslint src/"
  },
  "dependencies": {
    "dotenv": "^16.4.5",
    "express": "^4.19.2",
    "hpagent": "^1.2.0",
    "msedge-tts": "^2.1.1",
    "tiktok-live-connector": "^2.5.0",
    "ws": "^8.18.0"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/node": "^20.12.7",
    "@types/ws": "^8.5.10",
    "eslint": "^8.57.0",
    "typescript": "^5.4.5"
  },
  "engines": {
    "node": ">=20.0.0"
  }
}
```

#### 2. File Mẫu Cấu Hình Biến Môi Trường (`.env.example`)
```ini
# Cổng lắng nghe HTTP & WebSocket
PORT=3000
HOST=127.0.0.1

# Cấu hình TikTok Ingestion & Resilience
SIGN_API_KEY=
TIKTOK_SESSION_ID=
TIKTOK_TARGET_IDC=alisg
RESIDENTIAL_PROXY_URL=

# Cấu hình Audio & TTS Giọng Đọc
DEFAULT_TTS_VOICE=vi-VN-NamMinhNeural
DEFAULT_TTS_PITCH=-18Hz
DEFAULT_TTS_RATE=-20%
AUDIO_CACHE_DIR=./cache/audio
```

---

### PHẦN C: ĐẶC TẢ CHI TIẾT CÁC CLASS, METHOD VÀ CẤU TRÚC DỮ LIỆU

#### 1. `EventNormalizer.mjs` & `Sanitizer.mjs`
Chuyển đổi dữ liệu đa nguồn về chuẩn thống nhất và phân loại diện mạo nhân vật:

```typescript
export interface CanonicalAppEvent {
  eventId: string;
  source: 'tiktok' | 'bot' | 'admin';
  timestamp: number;
  userId: string;
  uniqueId: string;
  nickname: string;
  avatarUrl: string;
  type: 'chat' | 'gift' | 'like' | 'member';
  payload: any;
}
```

- **Lớp `EventNormalizer`**:
  - `normalizeTikTokChat(raw: any): CanonicalAppEvent`
  - `normalizeTikTokGift(raw: any): CanonicalAppEvent`
  - `normalizeTikTokLike(raw: any): CanonicalAppEvent`
  - `normalizeTikTokMember(raw: any): CanonicalAppEvent`
  - `detectSkinFromText(text: string): SkinType | null`:
    Nhận diện qua Regex các danh từ chỉ trang phục:
    - Monk: `/\b(sư thầy|thầy tu|thầy)\b/i`
    - Nun: `/\b(ni cô|sư cô)\b/i`
    - Child: `/\b(chú tiểu|tiểu đồng)\b/i`
    - Granny: `/\b(cụ bà|bà lão|phật tử già)\b/i`
    - Master: `/\b(cao tăng|viện chủ|hòa thượng)\b/i`
    - Man: `/\b(cư sĩ nam|con là nam|nam)\b/i`
    - Woman: `/\b(cư sĩ nữ|con là nữ|nữ)\b/i`
    *Bộ lọc loại trừ cụm từ tụng niệm*: Không nhận diện nếu chuỗi khớp với các câu xưng tán Phật giáo: `/(Nam mô|A Di Đà|Thích Ca|Bồ Tát|Quan Âm)/i`.
- **Lớp `Sanitizer`**:
  - `escapeXml(str: string): string`: Thay thế `<>&'"` bằng thực thể tương ứng (`&lt;`, `&gt;`, `&amp;`, `&apos;`, `&quot;`).
  - `cleanString(str: string, maxLength: number): string`: Loại bỏ các ký tự điều khiển Unicode không in được, cắt ngắn độ dài (tên $\le 18$, chat $\le 120$).

#### 2. `ProfanityFilter.mjs`
Bộ lọc từ cấm tiếng Việt và bảo vệ tôn ti Phật giáo:
- **Cấu trúc Dữ liệu**:
  - `BLACKLIST_PATTERNS`: Mảng các biểu thức chính quy (Regex) bao gồm:
    - Tiếng lóng, viết tắt teencode: `/\b(đm|dmm|đcm|vcl|vkl|loz|lồn|cặc|buồi|địt|đéo|đụ|mẹ mày|đụ má)\b/iu`
    - Từ ngữ khiêu dâm, bạo lực: `/\b(dâm|thủ dâm|bú cu|hiếp)\b/iu`
    - Từ ngữ báng bổ tôn giáo, xúc phạm Tam Bảo hoặc chư Tăng Ni: `/\b(chùa lừa|sư giả|buôn thần bán thánh|ma tăng)\b/iu`
- **Phương thức**:
  - `isProfane(text: string): boolean`: Kiểm tra xem chuỗi có chứa từ ngữ trong danh sách đen không.
  - `sanitizeNickname(nickname: string): string`: Nếu tên người dùng vi phạm, trả về `"Phật tử hữu duyên"`.
  - `filterComment(text: string): { allowed: boolean; cleanedText: string }`: Nếu vi phạm, trả về `allowed: false` để StateManager hủy bỏ hoàn toàn sự kiện.

#### 3. `GiftStreakCoalescer.mjs`
Bộ gộp chuỗi quà tặng combo:
- **Cấu trúc Dữ liệu**:
  - `activeStreaks: Map<string, { streakKey: string, userId: string, giftId: string, giftName: string, count: number, diamondsEach: number, totalCoins: number, timer: NodeJS.Timeout, lastTimestamp: number }>`
- **Cơ chế Hoạt động**:
  - Tạo `streakKey = `${userId}_${giftId}``.
  - Khi nhận quà combo (`giftType === 1` hoặc `isCombo === true`):
    - Nếu `repeatEnd === false`:
      - Cập nhật số lượng quà tích lũy: `count = currentCount`.
      - Reset bộ đệm 1.5 giây: `clearTimeout(streak.timer)`.
      - Phát tín hiệu hạt nhẹ tới overlay: `{ t: 'gift', repeatEnd: false, isCombo: true, comboCount: count }` (KHÔNG phát TTS).
      - Thiết lập `streak.timer = setTimeout(() => this.flushStreak(streakKey), 1500)`.
    - Khi nhận được `repeatEnd === true` hoặc bộ đệm 1.5s kích hoạt:
      - Thu hồi timer, gọi `this.flushStreak(streakKey)`:
        - Tính toán tổng số xu: `totalCoins = count * diamondsEach`.
        - Cập nhật điểm công đức vào `StateManager` & `MeritLeaderboard`.
        - Đẩy yêu cầu xướng tên vào `AudioPriorityQueue`: `"Phật tử [Tên] thành tâm cúng dường [Số lượng] cành [Tên quà]. [Lời nguyện]"`
        - Phát thông điệp chốt quà tới Broadcaster: `{ t: 'gift', repeatEnd: true, total: totalCoins, tier, ... }`.
        - Xóa khỏi `activeStreaks`.

#### 4. `SeatingEngine.mjs`
Động cơ quản lý bồ đoàn và thuật toán đào thải người không cúng dường:
- **Cấu trúc Dữ liệu**:
  - `capacity: SeatCapacity` (24, 36, 64, 100).
  - `seatMode: SeatMode` ('auto' | '24' | '36' | '64' | '100').
  - `slots: Array<ViewerState | null>` (Mảng bồ đoàn có độ dài bằng `capacity`).
  - `viewers: Map<string, ViewerState & { lastActivityAt: number }>`
  - `lockedSlots: Set<number>` (Các vị trí bị Admin khóa).
  - `vipSlots: Set<number>` (Các vị trí được ghim VIP).
- **Thuật toán Tạo Thứ Tự Ưu Tiên Xếp Chỗ (Center-Outward Math)**:
  Để phòng luôn ấm cúng từ giữa ra hai vách và từ trước ra sau:
  - Cho ma trận có `rows` hàng và `cols` cột (với `cols % 2 === 0`):
    - Cột kề lối đi giữa nhất: `centerLeft = cols / 2 - 1`, `centerRight = cols / 2`.
    - Danh sách ưu tiên cột: `[centerLeft, centerRight, centerLeft - 1, centerRight + 1, ...]`.
    - Danh sách ưu tiên hàng: Từ hàng 0 (sát mép màn hình trước) đến hàng `rows - 1` (gần bàn thờ).
    - Tạo trước mảng `priorityOrder: number[]` chứa chỉ số slot theo thứ tự này.
- **Thuật toán Đào thải Đa Cấp khi Đầy Chỗ (`evictIfNeeded`)**:
  ```javascript
  if (this.viewers.size >= this.capacity) {
    if (this.seatMode === 'auto' && this.capacity < 100) {
      this.autoScaleCapacity(); // Nâng ngưỡng: 24 -> 36 -> 64 -> 100
    } else {
      // BƯỚC 1: Tìm người CHƯA CÚNG DƯỜNG (coins === 0), không phải VIP và không nằm trong slot khóa
      const nonDonors = [...this.viewers.values()].filter(
        v => v.coins === 0 && !v.isVip && !this.lockedSlots.has(v.slotIndex)
      );
      if (nonDonors.length > 0) {
        // Đào thải người im lặng lâu nhất (lastActivityAt nhỏ nhất)
        nonDonors.sort((a, b) => a.lastActivityAt - b.lastActivityAt);
        const evictee = nonDonors[0];
        this.freeSlot(evictee.slotIndex, 'evicted_quiet_non_donor');
        return evictee;
      }

      // BƯỚC 2: Giải quyết bế tắc bão hòa 100% người cúng dường (100% Donor Saturation)
      // Tìm donor có thời gian bất hoạt > 15 phút (900.000 ms) và không phải VIP
      const INACTIVITY_THRESHOLD_MS = 15 * 60 * 1000;
      const now = Date.now();
      const inactiveDonors = [...this.viewers.values()].filter(
        v => !v.isVip && !this.lockedSlots.has(v.slotIndex) && (now - v.lastActivityAt > INACTIVITY_THRESHOLD_MS)
      );
      if (inactiveDonors.length > 0) {
        // Đào thải donor có ít xu nhất trước, nếu bằng xu thì bất hoạt lâu nhất trước
        inactiveDonors.sort((a, b) => {
          if (a.coins !== b.coins) return a.coins - b.coins;
          return a.lastActivityAt - b.lastActivityAt;
        });
        const evictee = inactiveDonors[0];
        this.freeSlot(evictee.slotIndex, 'evicted_inactive_donor');
        return evictee;
      }
      return null; // Không thể đào thải (tất cả đều là donor đang hoạt động hoặc VIP)
    }
  }
  ```
- **Phương thức Bổ sung**:
  - `assignSeat(user: ViewerState): { slotIndex: number, evicted: ViewerState | null }`
  - `freeSlot(slotIndex: number, reason: string): ViewerState | null`
  - `touchActivity(userId: string): void`
  - `addCoins(userId: string, amount: number): void`
  - `setSkin(userId: string, skin: SkinType): boolean`
  - `setVip(slotIndex: number, isVip: boolean): void`
  - `setLock(slotIndex: number, isLocked: boolean): void`
  - `fillDemo(count: number): ViewerState[]`
  - `clearAll(): void`

#### 5. `PrayerCache.mjs`
Bộ nhớ đệm lời nguyện cầu 90 giây:
- **Cấu trúc Dữ liệu**:
  - `cache: Map<string, { prayer: string, timestamp: number }>`
  - `TTL = 90 * 1000` (90 giây).
  - `DEFAULT_PRAYERS: string[]`: Danh mục lời chúc phúc tâm linh chuẩn mực:
    - `"Cầu gia đạo bình an, vạn sự kiết tường như ý."`
    - `"Nguyện cầu cha mẹ mạnh khỏe, phúc thọ tăng long."`
    - `"Cầu cho quốc thái dân an, phong điều vũ thuận."`
    - `"Nguyện tiêu trừ nghiệp chướng, phước huệ trang nghiêm."`
    - `"Cầu cho sở nguyện tòng tâm, bình an thanh tịnh."`
- **Phương thức**:
  - `recordPrayer(userId: string, text: string): void`: Lưu vết bình luận cầu nguyện, làm mới mốc thời gian.
  - `getPrayer(userId: string): string`: Lấy lời nguyện trong vòng 90s và xóa khỏi cache (one-time consume). Nếu hết hạn hoặc không có, gọi `pickPrayer()`.
  - `pickPrayer(): string`: Chọn ngẫu nhiên một câu từ `DEFAULT_PRAYERS`.
  - `cleanupExpired(): void`: Định kỳ dọn các lời nguyện quá 90 giây.

#### 6. `MeritLeaderboard.mjs`
Bảng vàng vinh danh công đức:
- **Cấu trúc Dữ liệu**:
  - `donors: Map<string, { id: string, name: string, avatar: string, coins: number }>`
  - `currentTop: Array<{ id: string, name: string, avatar: string, coins: number, rank: number }>`
- **Phương thức**:
  - `recordDonation(user: { id: string, name: string, avatar: string }, coins: number): { isTopChange: boolean, newRank: number, totalCoins: number }`:
    - Cộng dồn số xu vào `donors`.
    - Sắp xếp lại danh sách theo `coins` giảm dần.
    - Cập nhật `currentTop` (Top 10).
    - So sánh với thứ hạng cũ: Nếu có thay đổi trong Top 5/10, trả về `isTopChange: true`.
  - `getTop(limit = 10)`: Lấy danh sách vinh danh hiện thời.
  - `reset(): void`: Xóa trắng bảng công đức khi bắt đầu phiên mới.

#### 7. `LiturgicalScheduler.mjs`
Bộ điều phối nhịp mõ và chu kỳ tụng kinh:
- **Cấu trúc Dữ liệu**:
  - `moIntervalId: NodeJS.Timeout | null`
  - `chantIntervalId: NodeJS.Timeout | null`
  - `moBpm: number` (mặc định 52)
  - `chantEveryMin: number` (mặc định 3)
  - `roundRobinIndex: number` (1, 2, 3)
  - `onMoTick: (index: number) => void`
  - `onChantTick: (chantText: string) => void`
- **Phương thức**:
  - `start(): void`: Khởi động bộ bấm giờ nhịp mõ: `interval = (60 / this.moBpm) * 1000` và chu kỳ tụng kinh.
  - `stop(): void`: Dừng toàn bộ timer.
  - `triggerMoManual(): number`:
    - Tăng `roundRobinIndex = (roundRobinIndex % 3) + 1`.
    - **Căn chỉnh nhịp (Cadence Reset)**: Khởi động lại timer mõ để tiếng gõ thủ công không bị gõ đè chát chúa lên tiếng gõ tự động sắp tới.
    - Trả về `roundRobinIndex`.
  - `setMoBpm(bpm: number): void`: Cập nhật tốc độ mõ từ 20 đến 120 BPM.
  - `setChantInterval(minutes: number): void`: Cập nhật chu kỳ tụng kinh từ 1 đến 10 phút.

---

### PHẦN D: THIẾT KẾ R4 BACKEND AUDIO & TTS PIPELINE

#### 1. `TtsEngine.mjs`
Động cơ giọng đọc Microsoft Edge-TTS trực tiếp trong RAM:
- **Nguyên lý cốt lõi**:
  - Loại bỏ hoàn toàn việc tạo file `.mp3` ra đĩa SSD.
  - Tích hợp package `msedge-tts` sử dụng chế độ stream nhị phân.
  - Thu nhận toàn bộ chunks nhị phân vào một mảng `Buffer[]`, ghép thành `Buffer.concat()`.
  - Chuyển đổi thành chuỗi Base64 Data URI:
    ```javascript
    const base64Audio = buffer.toString('base64');
    const dataUri = `data:audio/mp3;base64,${base64Audio}`;
    ```
- **Bộ nhớ đệm MD5 (MD5 In-Memory Audio Cache)**:
  - Khóa băm: `key = crypto.createHash('md5').update(`${voice}_${pitch}_${rate}_${text}`).digest('hex')`.
  - Sử dụng Map LRU giới hạn tối đa 200 câu kinh hoặc lời chúc cố định.
  - Nếu cache hit: Trả về `dataUri` ngay tức thì với độ trễ 0ms!

#### 2. `AudioPriorityQueue.mjs`
Hàng đợi ưu tiên âm thanh 3 cấp độ:
- **Phân loại 3 Cấp độ**:
  - **Tier 1 (Ưu tiên Khẩn cấp - Quà lớn $\ge 99$ xu)**: Cắt ngang hoặc chèn lên đầu hàng đợi.
  - **Tier 2 (Tiêu chuẩn - Quà 1 - 98 xu)**: Xếp hàng xử lý theo thứ tự FIFO.
  - **Tier 3 (Định kỳ - Tụng kinh tự động mỗi 3-5 phút)**: Bị tạm hoãn hoặc tự động hủy bỏ nếu hàng đợi đang có quà dồn dập.
- **Trần An Toàn Tránh Tràn Bộ Nhớ**:
  - Giới hạn tối đa 10 phần tử trong hàng đợi.
  - Nếu hàng đợi đầy $\ge 10$ phần tử: Tự động loại bỏ các câu xướng danh 1 xu cũ nhất thuộc Tier 2 để bảo đảm độ trễ thời gian thực cho luồng live.
- **Cơ chế Xử lý Tuần Tự (Serial Processing)**:
  - Duy trì cờ `isBusy: boolean`.
  - Khi một thông điệp TTS được tổng hợp xong và phát qua WebSocket:
    Ước tính thời gian phát dựa trên độ dài văn bản (`durationMs = Math.max(3000, text.length * 120)`), hoặc đợi tín hiệu báo phát xong từ client.
    Sau đó chuyển tiếp sang phần tử kế tiếp trong hàng đợi.

---

### PHẦN E: TẦNG BROADCASTER & SERVER ENTRY POINT

#### 1. `Broadcaster.mjs`
- **Handshake & Segregation**:
  - Bắt tay HTTP Upgrade tại `/ws`:
    - Phân tích `new URL(req.url, 'http://localhost')`.
    - Trích xuất `role = url.searchParams.get('role')`.
    - Nếu `role === 'overlay'`: Đưa vào `overlayClients: Set<WebSocket>`. Thiết lập listener cấm gửi tin (nếu nhận được message, đóng kết nối với mã lỗi `4403 Forbidden Action`).
    - Nếu `role === 'control'`: Đưa vào `controlClients: Set<WebSocket>`. Lắng nghe lệnh `ctl` với cơ chế Rate Limiting (tối đa 10 lệnh / giây; vượt quá trả mã `4429`).
    - Nếu thiếu hoặc sai `role`: Đóng kết nối với mã `4400 Bad Handshake`.
- **Đồng bộ Ảnh chụp Ban đầu (Snapshot On Connect)**:
  - Ngay trong sự kiện `connection`, gọi `stateManager.getSnapshot()` và gửi gói tin `{ t: 'state', ... }` đồng bộ toàn bộ giao diện trong <50ms.
- **Phương thức Phát tin**:
  - `broadcast(payload)`: Gửi JSON UTF-8 cho tất cả client cả hai nhóm (`readyState === WebSocket.OPEN`).
  - `broadcastOverlayOnly(payload)`: Chỉ gửi cho màn hình OBS.
  - `broadcastControlOnly(payload)`: Chỉ gửi cho trang quản trị Admin (nhật ký hệ thống `log`, `logs`, trạng thái bot `bots`).

#### 2. `server.mjs`
- Khởi tạo ứng dụng Express phục vụ tệp tĩnh:
  - `app.use('/live', express.static(publicDir))`
  - `app.use('/', express.static(publicDir))` (đảm bảo cả 2 URL `overlay.html` và `/live/overlay.html` đều hoạt động chuẩn xác).
- Khởi tạo `http.createServer(app)`.
- Khởi tạo WebSocketServer gắn vào HTTP server qua sự kiện `'upgrade'`.
- Khởi tạo `StateManager` trung tâm và kết nối các tầng nghiệp vụ.
- Thiết lập cơ chế tắt ứng dụng an toàn (`SIGINT`, `SIGTERM` graceful shutdown).

---

### PHẦN F: THIẾT KẾ GIẢ LẬP CỤC BỘ (LOCAL SIMULATION DESIGN)

Để toàn bộ hệ thống kiểm thử được mượt mà trên môi trường máy tính cục bộ của lập trình viên mà **hoàn toàn không cần tài khoản hay phiên live TikTok thật**:

#### 1. `MockBotSimulator.mjs`
- **Hồ Sơ Bot Mẫu (Virtual Profiles)**:
  - Mảng 20 danh xưng Phật tử thuần Việt: `['Diệu Hạnh', 'Minh Tâm', 'Tuệ Đức', 'Tịnh Quang', 'Thiện Nhân', 'Diệu Âm', 'Quang Minh', 'Bảo Ngọc', 'Chân Như', 'An Lạc', ...]`
  - Mảng avatar ảnh Phật / hoa sen cục bộ: `['/assets/characters/c_man.png', '/assets/characters/c_woman.png', ...]`
  - Mảng trang phục tương ứng (`SkinType`).
- **Chế độ Vận hành**:
  - `on: boolean`: Bật/tắt động cơ bot.
  - `count: number`: Số lượng bot tham gia (1 - 100 bots).
  - `pace: 'slow' | 'mid' | 'fast'`:
    - `slow`: Sinh sự kiện mỗi 8 - 15 giây.
    - `mid`: Sinh sự kiện mỗi 3 - 6 giây.
    - `fast`: Sinh 1 - 3 sự kiện mỗi giây.
- **Phân Bổ Tỷ Lệ Hành Vi Tự Nhiên**:
  - $60\%$ Niệm Phật / Cầu an: Gửi các câu tụng niệm chuẩn mực vào `EventNormalizer`.
  - $30\%$ Thả tim: Tăng từ 5 đến 30 tim cho luồng live.
  - $10\%$ Cúng dường quà tặng: Tặng hoa sen (1 xu), đèn sen (10 xu), chuông đồng (30 xu).
- Tích hợp liền mạch: Sự kiện bot được đóng gói với `source: 'bot'` và truyền trực tiếp vào `StateManager.handleCanonicalEvent()`, kiểm thử trọn vẹn toàn bộ chu trình bái lạy, xướng danh TTS và thăng hạng công đức.

#### 2. `TikTokLiveAdapter.mjs` Kháng Lỗi Cục Bộ
- Khởi tạo ở trạng thái `status: 'idle'`.
- Khi chưa kết nối tới live thật, adapter không ném lỗi unhandled exception và không làm gián đoạn máy chủ.
- Khi nhận lệnh `connect(uniqueId)` từ Admin:
  - Chuyển `status = 'connecting'`.
  - Khởi tạo `WebcastPushConnection` từ `tiktok-live-connector`.
  - Nếu kết nối thất bại (do kênh không live hoặc không có mạng):
    - Cập nhật `status = 'error'` hoặc `'disconnected'` với thông báo lỗi rõ ràng.
    - Kích hoạt `ReconnectionEngine` (nếu cấu hình tự động nối lại).
    - Phát thông điệp `{ t: 'tiktok', status: 'error', error: 'Phòng live hiện không trực tuyến' }` tới Admin Dashboard.
    - Tuyệt đối không làm sập (crash) tiến trình Node.js!

---

### PHẦN G: TIÊU CHÍ HIỆU NĂNG & XỬ LÝ TRƯỜNG HỢP BIÊN (EDGE CASES)

| Tiêu Chí / Trường Hợp Biên | Hiện Tượng Thử Thách | Giải Pháp Kỹ Thuật Đảm Bảo |
|---|---|---|
| **Snapshot on Connect < 50ms** | Client mới kết nối bị lag do tính toán trạng thái lớn. | Cache mảng `viewers` và `settings` trong bộ nhớ RAM, cấu trúc sẵn object, serialize JSON tức thời trong < 5ms. |
| **Bão quà combo 99 items liên tiếp** | Quà 1 xu gửi liên tục trong 2 giây làm nghẽn hàng đợi TTS. | `GiftStreakCoalescer` bắt giữ các sự kiện trung gian (`repeatEnd === false`), chỉ phát hạt nhẹ, gom lại thành 1 câu xướng danh duy nhất khi kết thúc. |
| **100% Donor Saturation Deadlock** | Phòng đầy 100 chỗ và tất cả đều là donors (`coins > 0`). | Thuật toán kích hoạt cơ chế giải tỏa bế tắc: Đào thải donor có số xu ít nhất và đã bất hoạt $> 15$ phút. Slot VIP luôn được bảo vệ. |
| **Bình luận thô tục / Báng bổ** | Kẻ phá hoại chat từ ngữ độc hại để bot TTS đọc lên live. | `ProfanityFilter` loại bỏ ngay ở Tầng 2, không đưa vào bồ đoàn, không hiển thị bong bóng chat, không gửi TTS. Tên người tặng quà vi phạm đổi thành `"Phật tử hữu duyên"`. |
| **Tấn công SSML / HTML Injection** | Tin nhắn chứa thẻ `<script>` hoặc mã XML SSML làm vỡ TTS. | `Sanitizer.escapeXml()` chuyển đổi tất cả `<, >, &, ", '` thành thực thể XML an toàn trước khi nạp vào `msedge-tts` hay DOM. |
| **Mòn ổ cứng SSD (SSD Wear)** | Hàng ngàn file MP3 ghi/xóa liên tục trong suốt phiên live. | `TtsEngine` giữ Buffer trong RAM, gửi Base64 Data URI qua WebSocket, triệt tiêu $100\%$ thao tác I/O đĩa cứng. |
| **Tràn bộ nhớ RAM (Memory Leak)** | Chạy liên tục 12 - 24 giờ tích lũy rác. | Giới hạn dung lượng các bộ đệm: Avatar cache tối đa 150 items, System logs tối đa 300 dòng, Audio queue tối đa 10 items, MD5 audio cache tối đa 200 items. RAM duy trì $< 120\text{MB}$. |

---

## 4. CAVEATS (CÁC ĐIỂM CẦN LƯU Ý)

1. **Phạm vi biên giới**: Báo cáo này tập trung chuyên biệt vào R1 (Backend Server, State Manager, Moderation, Broadcaster) và R4 Backend Audio (TTS pipeline, Audio Priority Queue). Phần kết xuất đồ họa Canvas 2D phía client của OBS Browser Source (R2) và giao diện React Admin Dashboard (R3) do các tác tử chuyên trách tiếp quản.
2. **Thư viện `msedge-tts`**: Thư viện này giao tiếp với dịch vụ Microsoft Edge Read Aloud qua kết nối WebSocket bảo mật (WSS). Trên môi trường offline hoàn toàn (không có internet), `msedge-tts` sẽ thất bại; khi đó hệ thống cần ghi log cảnh báo và bỏ qua phát âm thanh TTS một cách an toàn mà không làm gián đoạn máy chủ.
3. **Mã lỗi WebSocket chuẩn hóa**: Đảm bảo mã lỗi đóng kết nối tuân thủ bảng mã: `4400` (Bad Handshake), `4401` (Unauthorized Host), `4403` (Forbidden Action), `4429` (Rate Limited).

---

## 5. CONCLUSION (KẾT LUẬN & HƯỚNG DẪN THỰC THI CHO WORKER)

Bản thiết kế kỹ thuật trên cung cấp đầy đủ thông số kiến trúc, sơ đồ lớp, mã nguồn cốt lõi và các giải pháp phòng ngừa rủi ro cho R1 và R4.
Các bước triển khai cụ thể cho Implementation Worker:
1. Tạo tệp `package.json` và `.env.example` tại thư mục gốc dự án. Chạy `npm install`.
2. Tạo thư mục `src/` và các thư mục con: `src/ingestion/`, `src/moderation/`, `src/state/`, `src/audio/`, `src/broadcaster/`.
3. Triển khai theo thứ tự phân tầng:
   - Bước 3.1: Viết `src/config.mjs` và `src/moderation/Sanitizer.mjs`, `ProfanityFilter.mjs`, `EventNormalizer.mjs`, `GiftStreakCoalescer.mjs`.
   - Bước 3.2: Viết `src/state/PrayerCache.mjs`, `MeritLeaderboard.mjs`, `LiturgicalScheduler.mjs`, `SeatingEngine.mjs`, `StateManager.mjs`.
   - Bước 3.3: Viết `src/audio/TtsEngine.mjs`, `AudioPriorityQueue.mjs`.
   - Bước 3.4: Viết `src/broadcaster/MessageSchemas.mjs`, `Broadcaster.mjs`.
   - Bước 3.5: Viết `src/ingestion/ReconnectionEngine.mjs`, `MockBotSimulator.mjs`, `AdminManualAdapter.mjs`, `TikTokLiveAdapter.mjs`.
   - Bước 3.6: Viết `src/server.mjs` tích hợp toàn bộ các thành phần và cung cấp static file hosting.
4. Chạy kiểm thử tự động với `npm test`.

---

## 6. VERIFICATION METHOD (PHƯƠNG PHÁP XÁC MINH ĐỘC LẬP)

Để xác minh độc lập tính chính xác và hoàn chỉnh của bản thiết kế:
1. **Kiểm tra cú pháp và cấu trúc tệp**:
   - Chạy lệnh kiểm tra node và tệp xác thực: `node scripts/verify_assets.mjs`.
   - Kiểm tra toàn bộ schema WebSocket khớp 100% với `WEBSOCKET_SPEC.md`.
2. **Kiểm thử đơn vị (Unit Tests)**:
   - Kiểm tra `ProfanityFilter`: Xác nhận các chuỗi vi phạm bị loại bỏ hoàn toàn, tên độc hại bị đổi thành `"Phật tử hữu duyên"`.
   - Kiểm tra `GiftStreakCoalescer`: Bơm 50 sự kiện combo quà tặng liên tiếp, xác nhận chỉ phát sinh đúng 1 thông điệp xướng tên duy nhất khi kết thúc.
   - Kiểm tra `SeatingEngine`: Bơm 25 người vào phòng 24 chỗ, kiểm tra người im lặng lâu nhất (`coins === 0`) bị đào thải. Bơm 25 donors vào phòng 24 chỗ, kiểm tra donor ít xu nhất và bất hoạt > 15 phút bị đào thải.
   - Kiểm tra `Broadcaster Snapshot`: Đo thời gian trả về của gói tin `state` khi client kết nối, xác nhận thời gian $< 50\text{ms}$.
   - Kiểm tra `TtsEngine`: Xác nhận âm thanh trả về dưới dạng chuỗi Data URI `data:audio/mp3;base64,...` mà không xuất hiện bất kỳ file MP3 tạm nào trên đĩa cứng.
