# ĐẶC TẢ GIAO THỨC WEBSOCKET: CHÁNH ĐIỆN TỊNH TÂM
## WebSocket Protocol Specification — Real-time Messaging & Event Schema

---

## 1. TỔNG QUAN & NGUYÊN TẮC THIẾT KẾ (PROTOCOL OVERVIEW)

Giao thức WebSocket trong hệ thống **"Chánh Điện Tịnh Tâm"** là kênh truyền tải dữ liệu thời gian thực hai chiều giữa Máy chủ Điều phối Trung tâm (Node.js Core Server), Màn hình Hiển thị Livestream (OBS Browser Source Overlay) và Bảng Điều Khiển Quản Trị (React Admin Dashboard).

### Các nguyên tắc kỹ thuật cốt lõi:
1. **Tuân thủ chuẩn RFC 6455**: Vận hành trên giao thức WebSocket chuẩn, tương thích 100% với trình duyệt Chromium nhúng của OBS Studio (CEF) và trình duyệt máy tính/tablet của Admin.
2. **Định dạng dữ liệu JSON UTF-8**: Mọi thông điệp trao đổi giữa máy chủ và máy khách đều là chuỗi JSON hợp lệ, được mã hóa UTF-8 hoàn chỉnh để hỗ trợ tiếng Việt có dấu.
3. **Phân quyền nghiêm ngặt theo vai trò kết nối (Role Segregation)**: Xác thực vai trò ngay tại bước bắt tay HTTP Upgrade (`Handshake`) thông qua tham số truy vấn `?role=...`.
4. **Cơ chế Ảnh chụp Ban đầu (Snapshot-First Synchronization)**: Ngay khi máy khách kết nối thành công, máy chủ lập tức gửi thông điệp `state` tổng thể trước khi phát bất kỳ sự kiện đơn lẻ nào.
5. **Kiểm soát kiểu chặt chẽ (Strict Typing)**: Toàn bộ thông điệp được ràng buộc bởi bộ định nghĩa giao diện TypeScript chuẩn hóa.

---

## 2. THIẾT LẬP KẾT NỐI & PHÂN QUYỀN VAI TRÒ (HANDSHAKE & ROLES)

### 2.1. Đường dẫn Bắt tay (Handshake Endpoints)

Client thiết lập kết nối WebSocket tới máy chủ tại cổng dịch vụ (mặc định cổng `3000`):

```http
GET /ws?role={role_type}&token={optional_auth_token} HTTP/1.1
Host: 127.0.0.1:3000
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==
Sec-WebSocket-Version: 13
Origin: http://127.0.0.1:3000
```

### 2.2. Bảng Phân Quyền Kênh (Role-Based Permissions Matrix)

| Vai trò (`role`) | Mục đích sử dụng | Quyền nhận (Inbound) | Quyền gửi (Outbound) | Biện pháp bảo vệ |
|---|---|---|---|---|
| `overlay` | Màn hình đồ họa OBS Browser Source hiển thị Chánh Điện | Nhận toàn bộ sự kiện: `state`, `settings`, `join`, `leave`, `skin`, `chat`, `gift`, `like`, `tts`, `chant`, `bell`, `mo1`, `tiktok`. | **BỊ CẤM HOÀN TOÀN**. Không được gửi bất kỳ gói tin điều khiển nào. | Nếu nhận được tin nhắn từ client `overlay`, server sẽ đóng kết nối ngay lập tức với mã lỗi `4403 Forbidden Action`. |
| `control` | Bảng Điều Khiển Quản Trị (Admin Dashboard) của Streamer | Nhận toàn bộ sự kiện hiển thị + Nhận sự kiện nhật ký hệ thống `log`, `logs`, và trạng thái bot `bots`. | **TOÀN QUYỀN ĐIỀU KHIỂN**. Gửi các lệnh `ctl` can thiệp trạng thái phòng live. | Kiểm tra tính hợp lệ của cấu trúc phong bì `t === "ctl"` và tên lệnh `cmd`. |

---

## 3. THÔNG ĐIỆP CHIỀU MÁY CHỦ -> MÁY KHÁCH (SERVER-TO-CLIENT MESSAGES)

Tất cả các thông điệp từ máy chủ gửi tới máy khách đều tuân theo phong bì chuẩn: `{ "t": "<message_type>", ... }`.

### 3.1. Gói tin Đồng Bộ Toàn Bộ Trạng Thái Ban Đầu (`state`)
- **Mục đích**: Gửi tức thì ngay sau khi kết nối WebSocket hoàn tất để client đồng bộ giao diện trong 50ms.
- **Đối tượng nhận**: Cả `overlay` và `control`.
- **Cấu trúc JSON**:
```json
{
  "t": "state",
  "settings": {
    "title": "Chánh Điện Tịnh Tâm",
    "subtitle": "Nam Mô A Di Đà Phật",
    "voice": "vi-VN-NamMinhNeural",
    "pitch": -18,
    "rate": -20,
    "music": true,
    "mo": true,
    "moBpm": 52,
    "autoChant": true,
    "chantEveryMin": 3,
    "seatMode": "auto",
    "joinOnEnter": false,
    "gifts": {
      "readAll": true,
      "minDiamonds": 1
    }
  },
  "viewers": [
    {
      "id": "71829401928401",
      "name": "Diệu Hạnh",
      "skin": "woman",
      "avatar": "https://p16-sign.tiktokcdn.com/avatar/user1.jpg",
      "coins": 150,
      "slotIndex": 0,
      "isVip": true,
      "demo": false
    },
    {
      "id": "71829401928402",
      "name": "Minh Tâm",
      "skin": "man",
      "avatar": "https://p16-sign.tiktokcdn.com/avatar/user2.jpg",
      "coins": 0,
      "slotIndex": 1,
      "isVip": false,
      "demo": false
    }
  ],
  "cap": 36,
  "startedAt": 1730476800000,
  "tiktok": {
    "status": "connected",
    "uniqueId": "chua_tinh_tam_official",
    "roomId": "729384910284729102",
    "viewerCount": 1250,
    "likeCount": 45200,
    "error": ""
  }
}
```

---

### 3.2. Gói tin Cập Nhật Cấu Hình Phòng Live (`settings`)
- **Mục đích**: Thông báo thay đổi cài đặt âm thanh, sức chứa hoặc giọng đọc.
- **Cấu trúc JSON**:
```json
{
  "t": "settings",
  "settings": {
    "title": "Chánh Điện Tịnh Tâm",
    "subtitle": "Cầu An Lạc Cho Muôn Loài",
    "voice": "vi-VN-NamMinhNeural",
    "pitch": -18,
    "rate": -20,
    "music": true,
    "mo": true,
    "moBpm": 60,
    "autoChant": true,
    "chantEveryMin": 5,
    "seatMode": "64",
    "joinOnEnter": false,
    "gifts": {
      "readAll": true,
      "minDiamonds": 1
    }
  },
  "cap": 64
}
```

---

### 3.3. Gói tin Phật Tử Vào Bồ Đoàn (`join`)
- **Mục đích**: Thông báo có người xem mới được xếp chỗ ngồi trên sàn chánh điện.
- **Cấu trúc JSON**:
```json
{
  "t": "join",
  "v": {
    "id": "71829401928499",
    "name": "Tuệ Minh",
    "skin": "man",
    "avatar": "https://p16-sign.tiktokcdn.com/avatar/user3.jpg",
    "coins": 0,
    "slotIndex": 2,
    "isVip": false,
    "demo": false
  },
  "cap": 36
}
```

---

### 3.4. Gói tin Phật Tử Rời Khỏi Chánh Điện (`leave`)
- **Mục đích**: Thông báo một vị trí bồ đoàn đã được giải phóng (do người xem rời đi, bị kick hoặc do thuật toán đào thải người không cúng dường khi phòng đầy).
- **Cấu trúc JSON**:
```json
{
  "t": "leave",
  "id": "71829401928499",
  "slotIndex": 2,
  "reason": "evicted_quiet_non_donor"
}
```

---

### 3.5. Gói tin Thay Đổi Diện Mạo / Trang Phục (`skin`)
- **Mục đích**: Cập nhật ảnh đại diện/trang phục nhân vật khi người xem gõ đúng từ khóa ("nam", "nữ", "sư thầy", "chú tiểu", "bà", "ni cô", "cao tăng") hoặc do Admin chỉ định.
- **Cấu trúc JSON**:
```json
{
  "t": "skin",
  "id": "71829401928499",
  "skin": "monk"
}
```

---

### 3.6. Gói tin Bình Luận / Niệm Phật (`chat`)
- **Mục đích**: Kích hoạt bong bóng thoại nổi trên đầu avatar người xem trong 6 giây và kích hoạt hoạt ảnh cúi đầu bái lạy.
- **Cấu trúc JSON**:
```json
{
  "t": "chat",
  "id": "71829401928499",
  "name": "Tuệ Minh",
  "text": "Nam mô A Di Đà Phật, nguyện cầu bình an cho muôn loài",
  "slotIndex": 2
}
```

---

### 3.7. Gói tin Tặng Quà Cúng Dường (`gift`)
- **Mục đích**: Kích hoạt hiệu ứng hoa sen bay, thăng hạng Bảng Vàng Công Đức, xướng tên hồi hướng và nghi lễ lạy chầu. Hỗ trợ đầy đủ cờ chuỗi liên hoàn (streak combos) để phân biệt cú nhấn trung gian và kết thúc combo.
- **Cấu trúc JSON**:
```json
{
  "t": "gift",
  "id": "71829401928401",
  "name": "Diệu Hạnh",
  "giftName": "Đèn Hoa Sen",
  "giftId": "5820",
  "count": 1,
  "coins": 30,
  "total": 180,
  "tier": 2,
  "prayer": "Nguyện cầu cha mẹ mạnh khỏe, an vui",
  "repeatEnd": true,
  "comboCount": 1,
  "isCombo": false,
  "slotIndex": 0
}
```
- **Ý nghĩa các trường combo**:
  - `repeatEnd` *(boolean)*: `true` nếu chuỗi combo kết thúc (chốt quà, kích hoạt xướng danh TTS và hiệu ứng chúc phúc); `false` nếu là các lượt bấm liên tiếp trong streak (chỉ sinh hạt nhẹ, không chen hàng đợi TTS).
  - `comboCount` *(number)*: Số lượt tặng quà tích lũy trong chuỗi combo.
  - `isCombo` *(boolean)*: Cờ đánh dấu quà thuộc chuỗi liên hoàn nhiều lượt.

---

### 3.8. Gói tin Thả Tim Tán Thán (`like`)
- **Mục đích**: Kích hoạt chùm tim bay lấp lánh tỏa sáng trên đầu avatar của người thả tim.
- **Cấu trúc JSON**:
```json
{
  "t": "like",
  "id": "71829401928401",
  "n": 15,
  "totalLikes": 45215,
  "slotIndex": 0
}
```

---

### 3.9. Gói tin Phát Giọng Đọc AI (`tts`)
- **Mục đích**: Chuyển luồng âm thanh giọng đọc Edge-TTS trực tiếp tới OBS Browser Source để phát qua Web Audio API. Trường `dataUri` là định dạng sơ cấp (primary) truyền dữ liệu Base64 trực tiếp trong RAM, loại bỏ hoàn toàn việc đọc/ghi ổ SSD.
- **Cấu trúc JSON**:
```json
{
  "t": "tts",
  "dataUri": "data:audio/mp3;base64,//uQxAAAAAAAAAAAAAAAAAAAAAAASW5mbwAAAA8AAAA...",
  "url": "/api/tts/tts_1730476850000_1.mp3",
  "text": "Nam mô A Di Đà Phật. Phật tử Diệu Hạnh thành tâm cúng dường Đèn Hoa Sen. Nguyện cầu cha mẹ mạnh khỏe, an vui.",
  "tag": "gift",
  "priority": 2,
  "id": "71829401928401"
}
```
- **Quy định trường dữ liệu**:
  - `dataUri` *(string - Bắt buộc/Primary)*: Chuỗi Data URI Base64 nạp thẳng vào Web Audio Context mà không cần request HTTP phụ.
  - `url` *(string - Tùy chọn/Optional)*: Đường dẫn URL tĩnh phục vụ kiểm tra hoặc cache trình duyệt khi cần thiết.

---

### 3.10. Gói tin Tụng Kinh Định Kỳ (`chant`)
- **Mục đích**: Hiển thị băng rôn câu kinh hồi hướng ở trung tâm màn hình chánh điện và điều phối âm thanh tụng niệm.
- **Cấu trúc JSON**:
```json
{
  "t": "chant",
  "text": "Nguyện đem công đức này, hướng về khắp tất cả, đệ tử và chúng sanh, đều trọn thành Phật đạo."
}
```

---

### 3.11. Gói tin Thỉnh Chuông & Gõ Mõ (`bell`, `mo`)
- **Mục đích**: Đồng bộ âm thanh tức thời tới Overlay khi Admin bấm nút hoặc khi diễn ra sự kiện đặc biệt. Chuẩn hóa tên lệnh `mo` thống nhất hai chiều client/server.
- **Cấu trúc JSON**:
```json
{
  "t": "bell",
  "isGreatBell": true
}
```
```json
{
  "t": "mo",
  "roundRobinIndex": 1
}
```

---

### 3.12. Gói tin Trạng Thái Kết Nối TikTok (`tiktok`)
- **Mục đích**: Cập nhật trạng thái luồng thu nhận sự kiện từ TikTok LIVE CDN tới Admin Dashboard.
- **Cấu trúc JSON**:
```json
{
  "t": "tiktok",
  "status": "connected",
  "uniqueId": "chua_tinh_tam_official",
  "roomId": "729384910284729102",
  "viewerCount": 1420,
  "likeCount": 52800,
  "error": ""
}
```

---

### 3.13. Gói tin Nhật Ký Hệ Thống (`log`, `logs`)
- **Mục đích**: Đẩy nhật ký sự kiện kiểm tra trực tiếp tới Admin Dashboard (`role=control`).
- **Cấu trúc JSON**:
```json
{
  "t": "log",
  "line": "[15:30:25] 🎁 Diệu Hạnh cúng dường Đèn Hoa Sen x1 (+30 xu). Tổng công đức: 180"
}
```
```json
{
  "t": "logs",
  "lines": [
    "[15:30:15] @tue_minh vào chánh điện (Slot #2)",
    "[15:30:20] @dieu_hanh bình luận: Nguyện cầu cha mẹ mạnh khỏe",
    "[15:30:25] 🎁 Diệu Hạnh cúng dường Đèn Hoa Sen x1 (+30 xu)"
  ]
}
```

---

### 3.14. Gói tin Trạng Thái Động Cơ Bot (`bots`)
- **Mục đích**: Thông báo trạng thái hoạt động của bot mô phỏng tới Admin Dashboard.
- **Cấu trúc JSON**:
```json
{
  "t": "bots",
  "on": true,
  "count": 15,
  "pace": "mid"
}
```

---

## 4. THÔNG ĐIỆP CHIỀU MÁY KHÁCH -> MÁY CHỦ (CLIENT-TO-SERVER CONTROL COMMANDS)

Tất cả các thông điệp điều khiển từ Admin Dashboard bắt buộc phải có cấu trúc phong bì chuẩn:
`{ "t": "ctl", "cmd": "<command_name>", ... }`.

### Bảng Danh Mục Các Lệnh Điều Khiển (`cmd`):

| Lệnh (`cmd`) | Tham số bắt buộc | Tham số tùy chọn | Chức năng kỹ thuật |
|---|---|---|---|
| `connect` | `uniqueId`: string | `roomId`: string | Kết nối tới phòng TikTok LIVE của `@uniqueId`. |
| `disconnect`| *(không có)* | *(không có)* | Ngắt phiên lắng nghe hiện tại với TikTok LIVE. |
| `chat` | `text`: string | `name`: string, `id`: string | Bơm một bình luận thử nghiệm vào hệ thống. |
| `gift` | `diamonds`: number | `name`: string, `gift`: string, `count`: number, `prayer`: string | Bơm một sự kiện tặng quà công đức thử nghiệm. |
| `fill` | `n`: number (15, 36, 64, 100)| *(không có)* | Đổ dữ liệu mẫu đúng số lượng người tham gia vào các bồ đoàn. |
| `clear` | *(không có)* | *(không có)* | Xóa trắng toàn bộ người đang ngồi, đưa phòng về trạng thái tĩnh. |
| `bot` / `bots` | `on`: boolean | `n`: number (1-100), `pace`: "slow" \| "mid" \| "fast" | Bật hoặc tắt động cơ sinh bot tự động tương tác. |
| `skin` | `id`: string, `skin`: SkinType | *(không có)* | Ép đổi trang phục của một vị trí người dùng cụ thể. |
| `kick` | `id`: string | `slotIndex`: number | Trục xuất một người dùng ra khỏi bồ đoàn (giải phóng slot). |
| `slot` | `slotIndex`: number, `action`: "vip" \| "lock" \| "unlock" | `id`: string | Ghim slot thành VIP (chống đào thải) hoặc Khóa slot ban tổ chức. |
| `bell` | *(không có)* | `isGreatBell`: boolean (hoặc `great`: boolean) | Thỉnh chuông chùa tức thì (kích hoạt hiệu ứng hào quang Phật). |
| `mo` | *(không có)* | *(không có)* | Gõ một tiếng mõ tức thì (tự động cân chỉnh lại nhịp cadence). |
| `chant` | *(không có)* | `text`: string | Kích hoạt ngay một lượt đọc kinh hồi hướng. |
| `tts` / `say` | `text`: string | `voice`: string, `pitch`: number, `rate`: number | Phát trực tiếp một thông báo phát thanh khẩn cấp lên live. |
| `settings` | `settings`: Partial<RoomSettings> | *(không có)* | Cập nhật một phần hoặc toàn bộ cấu hình phòng thiền. |
| `title` | `title`: string | `subtitle`: string | Đổi tên hoành phi chánh điện và câu kinh phụ. |

---

### Chi Tiết Cấu Trúc Các Gói Tin Điều Khiển Mẫu:

#### 1. Lệnh Kết Nối TikTok LIVE (`cmd: "connect"`)
```json
{
  "t": "ctl",
  "cmd": "connect",
  "uniqueId": "chua_tinh_tam_official"
}
```

#### 2. Lệnh Bơm Bình Luận Thử Nghiệm (`cmd: "chat"`)
```json
{
  "t": "ctl",
  "cmd": "chat",
  "name": "Thí Chủ Ẩn Danh",
  "text": "Nam mô A Di Đà Phật"
}
```

#### 3. Lệnh Bơm Quà Tặng Thử Nghiệm (`cmd: "gift"`)
```json
{
  "t": "ctl",
  "cmd": "gift",
  "name": "Phật Tử Diệu Âm",
  "gift": "Chuông Vàng",
  "diamonds": 199,
  "count": 1,
  "prayer": "Cầu cho quốc thái dân an, phong điều vũ thuận"
}
```

#### 4. Lệnh Điều Khiển Slot & Ghim VIP (`cmd: "slot"`)
```json
{
  "t": "ctl",
  "cmd": "slot",
  "slotIndex": 0,
  "action": "vip"
}
```

#### 5. Lệnh Trục Xuất Người Dùng (`cmd: "kick"`)
```json
{
  "t": "ctl",
  "cmd": "kick",
  "id": "71829401928499"
}
```

#### 6. Lệnh Bật Bot Tự Động (`cmd: "bots"`)
```json
{
  "t": "ctl",
  "cmd": "bots",
  "on": true,
  "n": 20,
  "pace": "mid"
}
```

#### 7. Lệnh Phát Thông Báo Giọng Đọc Trực Tiếp (`cmd: "say"`)
```json
{
  "t": "ctl",
  "cmd": "say",
  "text": "Kính mời chư vị Phật tử cùng lắng lòng hướng về Tam Bảo chuẩn bị vào khóa lễ tụng kinh."
}
```

#### 8. Lệnh Cập Nhật Cấu Hình Phòng (`cmd: "settings"`)
```json
{
  "t": "ctl",
  "cmd": "settings",
  "settings": {
    "moBpm": 56,
    "chantEveryMin": 4,
    "music": true
  }
}
```

---

## 5. BỘ ĐỊNH NGHĨA KIỂU TYPESCRIPT CHUẨN HOÁ (STRICT TYPESCRIPT DEFINITIONS)

```typescript
// ==========================================
// CÁC KIỂU DỮ LIỆU CỐT LÕI (CORE TYPES)
// ==========================================

export type SkinType = 
  | 'man'      // Cư sĩ Nam áo lam
  | 'woman'    // Cư sĩ Nữ áo lam
  | 'granny'   // Phật tử cao tuổi áo nâu sồng
  | 'child'    // Chú tiểu ngây thơ
  | 'monk'     // Sư thầy
  | 'nun'      // Ni cô
  | 'master';  // Cao tăng đại đức

export type SeatCapacity = 24 | 36 | 64 | 100;

export type SeatMode = 'auto' | '24' | '36' | '64' | '100';

export type VoiceModel = 'vi-VN-NamMinhNeural' | 'vi-VN-HoaiMyNeural';

export type TikTokConnectionStatus = 
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'error';

export interface RoomSettings {
  title: string;
  subtitle: string;
  voice: VoiceModel;
  pitch: number;          // Tần số dao động (-50Hz đến +50Hz, mặc định -18Hz)
  rate: number;           // Tốc độ phần trăm (-50% đến +50%, mặc định -20%)
  music: boolean;         // Trạng thái bật/tắt BGM
  mo: boolean;            // Trạng thái bật/tắt tiếng mõ định kỳ
  moBpm: number;          // Nhịp gõ mõ BPM (20 - 120, mặc định 52)
  autoChant: boolean;     // Bật/tắt tự động đọc kinh hồi hướng
  chantEveryMin: number;  // Chu kỳ đọc kinh (1 - 10 phút, mặc định 3)
  seatMode: SeatMode;     // Chế độ mở rộng bồ đoàn
  joinOnEnter: boolean;   // Xếp chỗ ngay khi vào phòng hay chờ chat
  gifts: {
    readAll: boolean;
    minDiamonds: number;  // Ngưỡng xu tối thiểu để đọc tên (mặc định 1)
  };
}

export interface ViewerState {
  id: string;             // Unique User ID từ TikTok
  name: string;           // Nickname đã chuẩn hóa
  skin: SkinType;         // Loại trang phục đại diện
  avatar: string;         // URL ảnh đại diện TikTok
  coins: number;          // Tổng điểm công đức tích lũy
  slotIndex: number;      // Vị trí bồ đoàn trên sàn (0 -> 99)
  isVip?: boolean;        // Cờ miễn trừ đào thải
  demo?: boolean;         // Cờ phân biệt dữ liệu mẫu hoặc bot
}

export interface TikTokStatusPayload {
  status: TikTokConnectionStatus;
  uniqueId: string;
  roomId?: string;
  viewerCount?: number;
  likeCount?: number;
  error?: string;
}

// ==========================================
// SERVER-TO-CLIENT MESSAGES (INBOUND OVERLAY/ADMIN)
// ==========================================

export type ServerToClientMessage =
  | { t: 'state'; settings: RoomSettings; viewers: ViewerState[]; cap: SeatCapacity; startedAt: number; tiktok: TikTokStatusPayload }
  | { t: 'settings'; settings: RoomSettings; cap: SeatCapacity }
  | { t: 'join'; v: ViewerState; cap: SeatCapacity }
  | { t: 'leave'; id: string; slotIndex?: number; reason?: string }
  | { t: 'skin'; id: string; skin: SkinType }
  | { t: 'chat'; id: string; name: string; text: string; slotIndex?: number }
  | { t: 'gift'; id: string; name: string; giftName: string; giftId?: string; count: number; coins: number; total: number; tier: 1 | 2 | 3; prayer: string; repeatEnd: boolean; comboCount: number; isCombo: boolean; slotIndex?: number }
  | { t: 'like'; id: string; n: number; totalLikes?: number; slotIndex?: number }
  | { t: 'tts'; dataUri: string; url?: string; text: string; tag?: string; priority?: number; id?: string }
  | { t: 'chant'; text: string }
  | { t: 'bell'; isGreatBell?: boolean }
  | { t: 'mo' | 'mo1'; roundRobinIndex?: number }
  | { t: 'tiktok'; status: TikTokConnectionStatus; uniqueId: string; roomId?: string; viewerCount?: number; likeCount?: number; error?: string }
  | { t: 'log'; line: string }
  | { t: 'logs'; lines: string[] }
  | { t: 'bots'; on: boolean; count?: number; pace?: 'slow' | 'mid' | 'fast' };

// ==========================================
// CLIENT-TO-SERVER MESSAGES (ADMIN CONTROL ONLY)
// ==========================================

export type ClientToServerCommand =
  | { t: 'ctl'; cmd: 'connect'; uniqueId: string; roomId?: string }
  | { t: 'ctl'; cmd: 'disconnect' }
  | { t: 'ctl'; cmd: 'chat'; name?: string; text: string; id?: string }
  | { t: 'ctl'; cmd: 'gift'; name?: string; gift?: string; diamonds: number; count?: number; prayer?: string }
  | { t: 'ctl'; cmd: 'fill'; n: number }
  | { t: 'ctl'; cmd: 'clear' }
  | { t: 'ctl'; cmd: 'bot' | 'bots'; on: boolean; n?: number; pace?: 'slow' | 'mid' | 'fast' }
  | { t: 'ctl'; cmd: 'skin'; id: string; skin: SkinType }
  | { t: 'ctl'; cmd: 'kick'; id: string; slotIndex?: number }
  | { t: 'ctl'; cmd: 'slot'; slotIndex: number; action: 'vip' | 'lock' | 'unlock'; id?: string }
  | { t: 'ctl'; cmd: 'bell'; isGreatBell?: boolean; great?: boolean }
  | { t: 'ctl'; cmd: 'mo' }
  | { t: 'ctl'; cmd: 'chant'; text?: string }
  | { t: 'ctl'; cmd: 'tts' | 'say'; text: string; voice?: VoiceModel; pitch?: number; rate?: number }
  | { t: 'ctl'; cmd: 'settings'; settings: Partial<RoomSettings> }
  | { t: 'ctl'; cmd: 'title'; title: string; subtitle?: string };
```

---

## 6. MÃ LỖI WEBSOCKET & QUY TRÌNH XỬ LÝ SỰ CỐ (ERROR HANDLING & STATUS CODES)

Khi kết nối bị đóng bất thường hoặc vi phạm chính sách bảo mật, máy chủ sẽ ngắt kết nối với các mã lỗi tiêu chuẩn sau:

| Mã Lỗi (Code) | Tên Lỗi | Lý do kích hoạt | Hành động của Client |
|---|---|---|---|
| `1000` | Normal Closure | Đóng kết nối có chủ đích khi dừng server hoặc tải lại trang | Client không cần kết nối lại trừ khi có chỉ định người dùng. |
| `1006` | Abnormal Closure | Đứt cáp mạng, sập tiến trình máy chủ đột ngột | Client tự động chạy thuật toán Exponential Backoff để kết nối lại. |
| `4400` | Bad Handshake | Thiếu tham số truy vấn bắt buộc `role` trong URL (`?role=overlay` hoặc `control`) | Kiểm tra lại URL cấu hình trong OBS hoặc Admin. Không tự động kết nối lại. |
| `4401` | Unauthorized Host | Header `Host` không khớp với danh sách máy chủ hợp lệ (`localhost`, `127.0.0.1`) | Cảnh báo tấn công DNS Rebinding. |
| `4403` | Forbidden Action | Client có vai trò `role=overlay` cố tình gửi gói tin dữ liệu lên máy chủ | Kiểm tra mã nguồn overlay, cấm mọi hành vi can thiệp ngược. |
| `4429` | Rate Limited | Client `control` gửi lệnh vượt quá trần tần suất cho phép (10 lệnh / giây) | Tạm dừng gửi lệnh trong 3 giây. |

---

## 7. BIỂU ĐỒ TRÌNH TỰ VẬN HÀNH WEBSOCKET (SEQUENCE DIAGRAM)

```mermaid
sequenceDiagram
    autonumber
    participant OBS as OBS Overlay (role=overlay)
    participant Server as Node.js WebSocket Server
    participant Admin as Admin Dashboard (role=control)
    participant TikTok as TikTok Live CDN

    Note over OBS, Server: GIAI ĐOẠN 1: BẮT TAY & ĐỒNG BỘ BAN ĐẦU
    OBS->>Server: HTTP Upgrade: /ws?role=overlay
    Server-->>OBS: 101 Switching Protocols (Xác thực Overlay hợp lệ)
    Server->>OBS: { t: "state", settings: {...}, viewers: [...], cap: 24 }

    Admin->>Server: HTTP Upgrade: /ws?role=control
    Server-->>Admin: 101 Switching Protocols (Xác thực Control hợp lệ)
    Server->>Admin: { t: "state", settings: {...}, viewers: [...], cap: 24 }
    Server->>Admin: { t: "logs", lines: ["Khởi tạo hệ thống thành công"] }

    Note over Admin, TikTok: GIAI ĐOẠN 2: KÍCH HOẠT KẾT NỐI TIKTOK
    Admin->>Server: { t: "ctl", cmd: "connect", uniqueId: "kenh_chua" }
    Server->>TikTok: Handshake Protobuf Webcast
    TikTok-->>Server: Connected OK
    Server->>OBS: { t: "tiktok", status: "connected", uniqueId: "kenh_chua" }
    Server->>Admin: { t: "tiktok", status: "connected", uniqueId: "kenh_chua" }
    Server->>Admin: { t: "log", line: "[15:00] Đã khóa luồng TikTok Live @kenh_chua" }

    Note over TikTok, OBS: GIAI ĐOẠN 3: SỰ KIỆN LIVE THỜI GIAN THỰC
    TikTok->>Server: WebcastGiftMessage (Hoa Sen x1)
    Server->>Server: Normalizer & Prayer Cache Lookup
    Server->>OBS: { t: "gift", name: "Diệu Âm", giftName: "Hoa Sen", tier: 2 }
    Server->>OBS: { t: "tts", dataUri: "data:audio/mp3;base64,...", text: "..." }
    Server->>Admin: { t: "log", line: "[15:05] 🎁 Diệu Âm dâng Hoa Sen" }
    OBS->>OBS: Ducking BGM (-14dB) & Phát TTS & Hiệu ứng lạy chầu
```
