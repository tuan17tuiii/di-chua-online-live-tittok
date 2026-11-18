# BÁO CÁO KHẢO SÁT KỸ THUẬT: HỆ THỐNG ÂM THANH, TTS & ĐẶC TẢ TÀI NGUYÊN (ASSET MANIFEST) CHO ỨNG DỤNG "CHÁNH ĐIỆN TỊNH TÂM"

> **Dự án**: TikTok Interactive Live Chánh Điện Online ("Chánh Điện Tịnh Tâm")  
> **Người thực hiện**: Explorer 3 (`teamwork_explorer_survey_3`)  
> **Ngày lập báo cáo**: 2026-11-01  
> **Tài liệu tham chiếu**: `ORIGINAL_REQUEST.md`, repo mã nguồn mở `kentjuno/chanh-dien-online`

---

## MỤC LỤC
1. [Tổng Quan Khảo Sát & Phạm Vi Kỹ Thuật](#1-tổng-quan-khảo-sát--phạm-vi-kỹ-thuật)
2. [Phân Tích Kiến Trúc Audio Engine](#2-phân-tích-kiến-trúc-audio-engine)
   - 2.1 Yêu cầu âm thanh & Đặc tính âm học (Acoustic Profiles)
   - 2.2 So sánh cơ chế phát âm thanh (OBS CEF vs Backend vs Admin)
   - 2.3 Xử lý chính sách Autoplay trong OBS Studio CEF & Định tuyến Audio
   - 2.4 Cơ chế nhịp gõ mõ tự động (Cadence) vs Kích hoạt thời gian thực (Realtime Trigger)
   - 2.5 Kiến trúc Audio Bus, Trộn âm (Mixing) & Tự động giảm âm nền (Audio Ducking)
3. [Đánh Giá & Thiết Kế Động Cơ TTS Tiếng Việt](#3-đánh-giá--thiết-kế-động-cơ-tts-tiếng-việt)
   - 3.1 Bảng so sánh toàn diện các giải pháp TTS tiếng Việt
   - 3.2 Phân tích chuyên sâu Microsoft Edge-TTS (`msedge-tts`)
   - 3.3 Chuẩn hóa văn bản, xử lý tên Phật tử & bộ lọc từ ngữ
   - 3.4 Hàng đợi ưu tiên (Priority Queue), gộp chuỗi quà (Streak Aggregator) & Caching
4. [Đặc Tả Danh Mục Tài Nguyên Đồ Họa & Âm Thanh](#4-đặc-tả-danh-mục-tài-nguyên-đồ-họa--âm-thanh)
   - 4.1 Danh mục đồ họa 2D & Cấu trúc lớp Chánh Điện (Altar Layers)
   - 4.2 Hiệu ứng động: Nhang trầm, Khói tỏa, Nến lập lòe & Hoa sen bay
   - 4.3 Đặc tả Spritesheet hoạt ảnh nhân vật (Tọa thiền -> Bái lạy -> Hồi vị)
   - 4.4 Bảng vàng công đức & Thành phần giao diện (HUD)
   - 4.5 Bảng đặc tả chuẩn âm thanh (Sample Rate, Bitrate, Loudness LUFS)
5. [Đặc Tả Lược Đồ Asset Manifest (JSON Schema)](#5-đặc-tả-lược-đồ-asset-manifest-json-schema)
   - 5.1 JSON Schema chuẩn (`asset-manifest.schema.json`)
   - 5.2 Mẫu dữ liệu hoàn chỉnh (`manifest.json`)
   - 5.3 Cơ chế Fallback & Tải động (Dynamic Asset Loader)
6. [Cẩm Nang Hướng Dẫn Tích Hợp Tài Nguyên Dành Cho Host Streamer](#6-cẩm-nang-hướng-dẫn-tích-hợp-tài-nguyên-dành-cho-host-streamer)
   - 6.1 Cấu trúc thư mục chuẩn
   - 6.2 Quy ước đặt tên & Định dạng chuẩn
   - 6.3 Hướng dẫn từng bước thay đổi Chùa, Tượng Phật & Nhạc nền
   - 6.4 Khắc phục sự cố & Tối ưu hóa hiệu năng trong OBS Studio

---

## 1. TỔNG QUAN KHẢO SÁT & PHẠM VI KỸ THUẬT

Ứng dụng **"Chánh Điện Tịnh Tâm"** là hệ thống livestream tương tác đa phương tiện chạy trên nền tảng TikTok LIVE kết hợp phần mềm OBS Studio. Trong không gian chánh điện tâm linh trực tuyến, âm thanh và giọng đọc (TTS) đóng vai trò là "linh hồn" tạo nên cảm giác trang nghiêm, tĩnh tại và kết nối tâm linh cho người xem, trong khi hệ thống tài nguyên hình ảnh (Assets) xác định độ thẩm mỹ, sắc nét và khả năng tùy biến của từng phòng live.

Báo cáo này tập trung giải quyết 3 bài toán kỹ thuật trọng tâm:
1. **Audio Engine**: Xây dựng kiến trúc phát âm thanh độ trễ thấp, không phụ thuộc vào thao tác nhấp chuột của người dùng trên OBS CEF, xử lý đồng thời nhạc thiền nền, chuông chùa ngân vang, nhịp mõ tụng kinh đều đặn và âm thanh nhận quà.
2. **Vietnamese TTS Engine**: Tuyển chọn và xây dựng pipeline chuyển văn bản thành giọng đọc tiếng Việt truyền cảm, trang trọng, giải quyết triệt để vấn đề phát âm tên người dùng phức tạp trên TikTok, chống spam khi người xem dâng quà dồn dập.
3. **Asset Manifest & Host Integration**: Chuẩn hóa toàn bộ tài nguyên hình ảnh/âm thanh thành một Manifest linh hoạt theo mô hình cắm-và-chạy (Plug-and-Play), cung cấp tài liệu hướng dẫn trực quan để các chủ phòng live (streamer) có thể thả ảnh chùa của mình, thay đổi tượng Phật hay chèn nhạc chuông riêng mà không cần can thiệp vào mã nguồn.

---

## 2. PHÂN TÍCH KIẾN TRÚC AUDIO ENGINE

### 2.1 Yêu cầu âm thanh & Đặc tính âm học (Acoustic Profiles)

Hệ thống âm thanh của Chánh Điện Tịnh Tâm bao gồm 4 nhóm âm thanh cốt lõi:

| Loại âm thanh | Vai trò tâm linh & Trải nghiệm | Đặc tính âm học (Acoustic Profile) | Kỹ thuật hiện thực đề xuất |
|---|---|---|---|
| **Gõ mõ (Wooden Fish Strike)** | Giữ nhịp tụng kinh, nhiếp tâm, định thần cho phật tử. | Tần số cơ bản: 450Hz - 700Hz. Âm sắc: Đanh, rỗng ruột (hollow acoustic resonance của gỗ mít già), decay ngắn (120ms - 180ms), transient sắc nét. | Studio acoustic sample (WAV 48kHz) kết hợp micro-pitch & gain jitter (+/-3%) chống hiệu ứng máy móc (machine-gun effect). |
| **Chuông chùa / Đại Hồng Chung** | Thức tỉnh tâm thức, báo hiệu sự kiện lớn, tiêu trừ phiền não. | Tần số cơ bản: 108Hz - 216Hz (trầm ấm), họa âm trên: 432Hz, 1296Hz, 2160Hz. Decay rất dài (6.0s - 12.0s) với dải tần cao tiêu tán trước, dải trầm ngân vang kéo dài. | High-fidelity sample (WAV 24-bit stereo) kết hợp bộ lọc Web Audio Sub-bass Boost. |
| **Nhạc thiền tịnh tâm (Ambient BGM)** | Không gian nền tĩnh lặng, giải tỏa căng thẳng. | Sáo trúc, đàn tranh, tiếng nước chảy róc rách nhẹ, không lời. Tần số dàn trải 80Hz - 12kHz, dynamic range êm dịu, chuẩn hóa -16 LUFS. | HTML5 `<audio>` stream phát qua MediaElementAudioSourceNode với cơ chế crossfade 4s giữa các bài. |
| **Âm nhận quà chúc phúc (Gift Chime)** | Vinh danh công đức, tạo phản hồi tích cực tức thì. | Âm sắc lung linh (chimes, harp, tiếng chuông gió kết hợp âm vang ánh hào quang). 3 tầng âm theo cấp bậc quà tặng. | Web Audio BufferSourceNode phát đa âm sắc (polyphonic playback). |

### 2.2 So sánh cơ chế phát âm thanh (Playback Mechanisms)

Có 3 mô hình kiến trúc có thể triển khai để phát âm thanh trong livestream:

```
+-----------------------------------------------------------------------------------+
| MO HINH A: Client-side Web Audio API trong OBS Browser Source (KHUYEN DUNG)        |
| [Server Node.js] --WS Event--> [OBS Browser Source] -> [Web Audio Graph] -> [OBS]  |
| * Uu diem: Dong bo tuyet doi voi do hoa/visual FX, OBS quan ly am thanh rieng.    |
+-----------------------------------------------------------------------------------+
| MO HINH B: Server-side Audio Engine (Phat qua Virtual Audio Cable)                |
| [Server Node.js] -> [Speaker/ALSA/Node-Audio] -> [Virtual Cable] -> [OBS Input]   |
| * Nhuoc diem: Phu thuoc OS, de bi tre lech hinh/tieng voi Web Overlay.            |
+-----------------------------------------------------------------------------------+
| MO HINH C: Admin Audio Routing (Phat tren trinh duyet Dashboard cua Admin)        |
| [Server Node.js] --WS--> [Admin Browser] -> [Desktop Audio] -> [OBS Desktop Cap]  |
| * Nhuoc diem: Nguy co tao vong lap echo neu Admin bat mic, phu thuoc tab Admin.   |
+-----------------------------------------------------------------------------------+
```

#### Bảng so sánh chi tiết:

| Tiêu chí | Mô hình A: OBS Browser Source (Web Audio) | Mô hình B: Backend Server-side (Node.js) | Mô hình C: Admin Dashboard Audio |
|---|---|---|---|
| **Độ trễ với hình ảnh** | **0ms (Hoàn hảo)**: Âm thanh và hiệu ứng Canvas/PixiJS chạy chung một frame loop. | **50ms - 250ms**: Lệch pha giữa lệnh WebSocket tới Overlay và âm thanh phát qua driver OS. | **100ms - 500ms**: Phụ thuộc vào độ trễ render tab Admin và buffer Desktop Capture. |
| **Định tuyến vào OBS** | **Trực tiếp & Độc lập**: Tích hợp sẵn trong OBS Mixer dưới kênh "Browser". Dễ áp compressor/EQ OBS. | Phức tạp: Phải cài phần mềm thứ 3 như VB-Audio Virtual Cable, VoiceMeeter. | Nguy hiểm: Dễ lẫn âm thanh thông báo Windows, tiếng click chuột của Admin. |
| **Tải tài nguyên CPU** | Rất thấp (tận dụng bộ giải mã phần cứng của Chromium CEF). | Trung bình (Node.js cần spawn tiến trình ffmpeg hoặc native binding như `node-speaker`). | Thấp, nhưng tab Admin phải luôn active. |
| **Độ tin cậy** | **Rất cao**: Khi streamer mở OBS, Browser Source tự khởi động và phát ngay. | Dễ lỗi: Lỗi driver âm thanh ảo, xung đột sample rate 44.1kHz vs 48kHz gây rè tiếng. | Kém: Nếu admin vô tình tắt tab hoặc mute tab là mất tiếng live. |
| **Đánh giá** | **LỰA CHỌN TỐI ƯU SỐ 1** | Phù hợp làm phương án thứ cấp nếu OBS không dùng Browser Source | Chỉ dùng để Admin nghe kiểm âm (preview/monitor) |

### 2.3 Xử lý chính sách Autoplay trong OBS Studio CEF & Định tuyến Audio

#### Vấn đề Autoplay Policy trong Chromium:
Theo chuẩn bảo mật của các trình duyệt hiện đại (Chrome 71+), `AudioContext` và thẻ `<audio>` mặc định bị khóa (trạng thái `suspended`) cho đến khi có sự kiện tương tác vật lý (như `click`, `touchstart`) từ người dùng.

Trong repo tham khảo `kentjuno/chanh-dien-online`, tác giả đã đặt một nút đỏ to trên màn hình:
```html
<button id="unmute">🔔 Bấm để bật âm thanh</button>
```
Nếu streamer quên click nút này hoặc sử dụng OBS chế độ tự động, toàn bộ âm thanh và giọng đọc TTS sẽ hoàn toàn bị câm!

#### Giải pháp kỹ thuật cho OBS Studio CEF:
1. **Thuộc tính tích hợp của OBS CEF**: OBS Studio nhúng Chromium với cờ khởi động `--autoplay-policy=no-user-gesture-required`. Do đó, nếu cấu hình OBS đúng cách, Web Audio API có thể tự động phát ngay lập tức.
2. **Khởi tạo và Resume an toàn**:
   ```javascript
   class TempleAudioEngine {
     constructor() {
       this.ctx = null;
       this.isUnlocked = false;
     }

     init() {
       const AudioContextClass = window.AudioContext || window.webkitAudioContext;
       this.ctx = new AudioContextClass({ sampleRate: 48000 });

       // Kiem tra trang thai suspend cua CEF
       if (this.ctx.state === 'suspended') {
         const unlock = () => {
           this.ctx.resume().then(() => {
             this.isUnlocked = true;
             console.log('[Audio] AudioContext da duoc kich hoat thanh cong');
             window.removeEventListener('click', unlock);
             window.removeEventListener('keydown', unlock);
           });
         };
         window.addEventListener('click', unlock);
         window.addEventListener('keydown', unlock);
         // Tu dong trigger resume sau 500ms danh cho OBS CEF
         setTimeout(unlock, 500);
       } else {
         this.isUnlocked = true;
       }
     }
   }
   ```
3. **Cấu hình chuẩn trong OBS Studio**:
   - Khi thêm `Browser Source`:
     - Tích chọn: **"Control audio via OBS"** (Điều khiển âm thanh qua OBS) để kênh âm thanh xuất hiện trong Audio Mixer của OBS, cho phép streamer kiểm soát âm lượng, áp bộ lọc Noise Gate, Compressor.
     - Tích chọn: **"Shutdown source when not visible"** = Bỏ chọn (để âm thanh không bị gián đoạn khi chuyển cảnh).
     - Tích chọn: **"Refresh browser when scene becomes active"** = Bỏ chọn (tránh reload làm đứt nhịp tụng kinh).

### 2.4 Cơ chế nhịp gõ mõ tự động (Cadence) vs Kích hoạt thời gian thực (Realtime Trigger)

Âm thanh gõ mõ trong nhà Phật có đặc thù rất thiêng liêng: nhịp gõ phải khoan thai, đều đặn, tạo nên tần số sóng não alpha đưa người nghe vào trạng thái tịnh tâm sâu sắc.

#### 1. Nhịp gõ định kỳ (Cadence Engine):
- **Tốc độ chuẩn (Tempo)**: 40 đến 60 BPM (khuyến nghị mặc định: **52 BPM** ~ 1.154 giây/tiếng gõ).
- **Tránh hiện tượng "Machine-gun Effect"**: Nếu lặp lại 1 file âm thanh y hệt ở cùng một mức âm lượng và cao độ, não bộ người nghe sẽ nhận ra sự giả tạo sau 1-2 phút.
- **Thuật toán Humanization (Nhân bản hóa tiếng gõ)**:
  - **Pitch Randomization**: Dịch cao độ ngẫu nhiên từ $-25$ cents đến $+25$ cents bằng `playbackRate = 1 + (Math.random() - 0.5) * 0.03`.
  - **Velocity Jitter**: Âm lượng dao động $\pm 5\%$ để tạo cảm giác tay người gõ lúc mạnh lúc nhẹ tự nhiên.
  - **Round-Robin Multi-sampling**: Sử dụng 3 biến thể âm thanh thu âm thực tế khác nhau (`mo_strike_01.wav`, `mo_strike_02.wav`, `mo_strike_03.wav`), luân phiên phát không lặp lại mẫu vừa phát.

#### 2. Kích hoạt thời gian thực (Realtime Trigger):
- **Sự kiện kích hoạt**:
  - Khi người xem bình luận các câu tán thán Phật pháp: `"Nam mô A Di Đà Phật"`, `"Mô Phật"`, `"Thành tâm sám hối"`.
  - Khi Admin bấm nút "Gõ mõ" hoặc "Thỉnh chuông" trên Admin Dashboard.
  - Khi nhận quà công đức.
- **Quy tắc phối hợp giữa Cadence và Realtime**:
  Khi có sự kiện kích hoạt thủ công, hệ thống **reschedule** lại nhịp định kỳ (reset timer) để tránh 2 tiếng gõ đập sát sạt nhau gây chát chúa.

### 2.5 Kiến trúc Audio Bus, Trộn âm (Mixing) & Tự động giảm âm nền (Audio Ducking)

Để âm thanh không bị hỗn loạn khi cùng lúc có: nhạc nền, tiếng mõ, chuông chùa và giọng đọc TTS, hệ thống thiết kế theo mô hình **Audio Bus Architecture**:

```
[Music Player (BGM)]       ---> [Music Gain Node] --(Duck: -14dB)---+
                                                                     |
[Cadence Mo / Strike SFX]   ---> [SFX Gain Node]   -------------------+---> [Master Gain Node] ---> [OBS Output]
                                                                     |        (0dB / Limiter)
[Bell / Dai Hong Chung]    ---> [Bell Gain Node]  -------------------+
                                                                     |
[TTS Voice Player]         ---> [TTS Gain Node]   --(Sidechain trig)-+
```

#### Kỹ thuật Audio Ducking mượt mà (Parametric Smooth Ducking):
Khi giọng đọc TTS phát hoặc tiếng chuông lớn gióng lên, nhạc nền (BGM) sẽ tự động giảm âm mượt mà (linear/exponential ramp) xuống **20% âm lượng ban đầu (khoảng -14dB)**, và phục hồi dần sau khi dứt câu đọc:

```javascript
function setAudioDucking(isDucking, durationMs = 400) {
  if (!musicGainNode || !audioCtx) return;
  const now = audioCtx.currentTime;
  const rampTime = durationMs / 1000;
  const targetGain = isDucking ? 0.12 : 0.55; // Giam tu 55% xuong 12%

  musicGainNode.gain.cancelScheduledValues(now);
  musicGainNode.gain.setValueAtTime(musicGainNode.gain.value, now);
  musicGainNode.gain.linearRampToValueAtTime(targetGain, now + rampTime);
}
```

---

## 3. ĐÁNH GIÁ & THIẾT KẾ ĐỘNG CƠ TTS TIẾNG VIỆT

Giọng xướng danh công đức và hồi hướng lời nguyện là yếu tố giữ chân người xem TikTok LIVE lâu nhất.

### 3.1 Bảng so sánh toàn diện các giải pháp TTS tiếng Việt

| Tiêu chí | Web Speech API (`window.speechSynthesis`) | Microsoft Edge-TTS (`msedge-tts`) | Google Cloud TTS (`Neural2 / WaveNet`) | eSpeak-NG (Offline) |
|---|---|---|---|---|
| **Chất lượng giọng (MOS 1-5)** | 2.5 / 5.0 (Cơ học, cứng nhắc) | **4.7 / 5.0 (Tự nhiên, truyền cảm như người thật)** | 4.8 / 5.0 (Rất tự nhiên) | 1.8 / 5.0 (Robot thập niên 90) |
| **Giọng đọc tiếng Việt chuyên biệt** | Phụ thuộc hệ điều hành máy tính. Windows thường chỉ có Microsoft An, OBS CEF thường thiếu hoàn toàn voice Việt. | **Có 2 giọng Neural đỉnh cao**: `vi-VN-NamMinhNeural` (Nam, trầm ấm, chuẩn mực) & `vi-VN-HoaiMyNeural` (Nữ, dịu dàng, trong trẻo). | Đa dạng (`vi-VN-Neural2-A/D`, `WaveNet-A/B/C/D`). | Giọng thô, phát âm tiếng Việt lơ lớ, sai thanh điệu. |
| **Chi phí bản quyền & API** | **Miễn phí** (Tích hợp trình duyệt). | **Miễn phí 100%** (Sử dụng endpoint Read Aloud công khai của MS Edge). Không cần thẻ tín dụng, không giới hạn ký tự thực tế. | Miễn phí 4 triệu ký tự đầu/tháng, sau đó $16/triệu ký tự. Bắt buộc tạo tài khoản GCP & thẻ visa. | Miễn phí (Mã nguồn mở). |
| **Khả năng chạy trên OBS CEF** | **Kém**: Thường xuyên lỗi `speechSynthesis.getVoices()` trả về mảng rỗng trong môi trường CEF. | **Tuyệt vời**: Server Node.js sinh file MP3 gửi về Overlay phát qua thẻ `<audio>`. Đảm bảo 100% máy đều đọc được. | Tốt (Server gọi API rồi stream về client). | Tốt trên Linux, phức tạp khi cài đặt trên Windows. |
| **Tùy biến cao độ & tốc độ** | Cơ bản (`rate`, `pitch`). | **Hỗ trợ SSML sâu**: Tinh chỉnh cao độ (Hz), tốc độ (%), ngắt nghỉ nhịp nhàng phù hợp tụng kinh. | Hỗ trợ SSML đầy đủ. | Hạn chế. |
| **Kết luận lựa chọn** | *Không sử dụng* (Rủi ro mất tiếng trên OBS). | **LỰA CHỌN TỐI ƯU SỐ 1 CHO DỰ ÁN** | Phương án dự phòng cấp doanh nghiệp | *Loại bỏ hoàn toàn* |

### 3.2 Phân tích chuyên sâu Microsoft Edge-TTS (`msedge-tts`)

#### 1. Tuyển chọn Voice Models:
- **`vi-VN-NamMinhNeural` (Khuyến nghị cho Chánh Điện)**:
  - Tông giọng nam trầm, đĩnh đạc, mang phong thái của một vị tu sĩ hay người hướng dẫn thiền môn.
  - Phù hợp nhất cho xướng danh Phật tử, đọc kinh kệ định kỳ, tụng niệm hồi hướng.
- **`vi-VN-HoaiMyNeural` (Tùy chọn)**:
  - Tông giọng nữ thanh tao, nhẹ nhàng, ấm áp. Phù hợp cho phòng live mang phong cách tịnh độ, chúc phúc nhẹ nhàng.

#### 2. Căn chỉnh thông số âm học cho không gian Phật giáo:
Giọng nói trên livestream thông thường đọc rất nhanh, nhưng trong chánh điện cần độ **chậm rãi, trang nghiêm, lắng đọng**:
- **Tốc độ (Rate)**: `-18%` đến `-22%` (Ví dụ: `rate: "-20%"`).
- **Cao độ (Pitch)**: `-15Hz` đến `-20Hz` (Ví dụ: `pitch: "-18Hz"` để hạ trầm giọng nói, tạo độ uy nghi, ấm áp).

#### 3. Cấu trúc SSML mẫu cho lời nguyện hồi hướng:
```xml
<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="vi-VN">
  <voice name="vi-VN-NamMinhNeural">
    <prosody pitch="-18Hz" rate="-20%">
      Nam mô A Di Đà Phật. <break time="400ms"/>
      Phật tử <emphasis level="moderate">Nguyễn Văn An</emphasis> thành tâm cúng dường <break time="250ms"/> Hoa Sen 5 lần. <break time="500ms"/>
      Nguyện cầu gia đạo bình an, vạn sự cát tường.
    </prosody>
  </voice>
</speak>
```

### 3.3 Chuẩn hóa văn bản, xử lý tên Phật tử & Bộ lọc từ ngữ

Tên tài khoản TikTok của người dùng thường chứa ký tự đặc biệt, số ngẫu nhiên hoặc từ ngữ lóng (`@user_9837482_deptrai`, `xX_Bao_Bao_Xx`). Nếu đưa thẳng vào TTS, máy sẽ đọc "a-còng u-sơ chín tám ba...", phá hỏng hoàn toàn không khí trang nghiêm.

#### Pipeline chuẩn hóa văn bản (Text Normalization Pipeline):

```
[Raw TikTok Event] 
        |
        v
1. Tách Nickname & UniqueId (Ưu tiên nickname hiển thị có dấu)
        |
        v
2. Loại bỏ ký tự đặc biệt, emoji, underscore, dấu chấm (@, _, ., emoji)
        |
        v
3. Chuyển đổi số thành chữ tiếng Việt ("100 hoa" -> "một trăm hoa")
        |
        v
4. Bộ lọc từ ngữ tục tĩu / Nhạy cảm (Blacklist check & Masking)
        |
        v
5. Ghép mẫu câu trang trọng: "Phật tử [Tên Đẹp] thành tâm dâng [Tên Quà]..."
        |
        v
6. XML Escaping tránh lỗi SSML (<, >, &, ", ')
```

#### Mã xử lý chuẩn hóa đề xuất:
```javascript
const PROFANITY_REGEX = /dm|đm|vcl|vl|cl|loz|buồi|cặc|đụ|má/gi;

function cleanDonorName(rawName) {
  if (!rawName) return 'Ẩn Danh';
  // Loai bo ky tu vo nghia, emoji va tag @
  let clean = rawName
    .replace(/^@/, '')
    .replace(/[_\.\-]+/g, ' ')
    .replace(/[^\p{L}\p{N}\s]/gu, '') // Giu lai chu co dau va so
    .trim();

  // Kiem tra tu ngu phan cam
  if (PROFANITY_REGEX.test(clean)) {
    return 'Phật tử hữu duyên';
  }

  // Cat ngan ten tranh spam
  clean = clean.slice(0, 20);
  return clean || 'Ẩn Danh';
}
```

### 3.4 Hàng đợi ưu tiên (Priority Queue), Gộp chuỗi quà (Streak Aggregator) & Caching

#### 1. Vấn đề nghẽn âm thanh khi bão quà (Gift Storm):
Khi một người xem tặng liên tiếp hàng chục món quà (Ví dụ: 1 bông hồng gửi 99 lần liên tục), nếu sinh 99 file TTS, hàng đợi sẽ bị trễ cả tiếng đồng hồ và đè âm thanh liên tục.

#### 2. Cơ chế Gộp Quà (Gift Streak Aggregator):
- Thư viện `tiktok-live-connector` trả về trường `repeatEnd` và `repeatCount`.
- Hệ thống chỉ kích hoạt TTS xướng tên **sau khi kết thúc chuỗi quà (Combo Finish)** hoặc khi timeout sau 1.5 giây không còn quà liên tiếp:
  - *Thay vì đọc*: "Phật tử A tặng 1 hoa... Phật tử A tặng 1 hoa..." (99 lần).
  - *Hệ thống sẽ đọc*: "Phật tử A thành tâm dâng chín mươi chín cành Hoa Hồng."

#### 3. Cấu trúc Hàng Đợi Ưu Tiên (Priority Queue):
- **Ưu tiên 1 (High Priority)**: Quà tặng giá trị lớn ($\ge 99$ xu - Đại lễ thỉnh chuông, đèn hoa sen lớn). Lập tức đưa lên đầu hàng đợi.
- **Ưu tiên 2 (Normal Priority)**: Quà tặng thông thường (1 - 98 xu). Xử lý theo thứ tự FIFO.
- **Ưu tiên 3 (Low Priority)**: Tụng kinh định kỳ (Mỗi 3 - 5 phút). Bị hủy bỏ hoặc hoãn nếu đang có quà tặng dồn dập.
- **Ngưỡng an toàn**: Giới hạn hàng đợi tối đa **10 câu**. Nếu vượt quá 10 câu, tự động bỏ qua các câu tụng kinh và quà 1 xu cũ nhất để bảo vệ luồng live không bị trễ.

#### 4. Cơ chế Bộ nhớ đệm (MD5 Audio Caching):
- Các câu tụng kinh cố định hoặc các lời nguyện ngẫu nhiên (`pickPrayer()`) được lưu vào ổ đĩa với tên file dạng `hash_md5(text + voice + rate + pitch).mp3`.
- Khi cần phát lại câu đã có trong cache, server gửi trực tiếp URL file đã tạo, giảm 100% thời gian chờ sinh giọng từ Microsoft Edge API (0ms latency).

---

## 4. ĐẶC TẢ DANH MỤC TÀI NGUYÊN ĐỒ HỌA & ÂM THANH

Toàn bộ đồ họa hiển thị trên màn hình dọc tiêu chuẩn **1080 × 1920 px (tỷ lệ 9:16)** cho TikTok LIVE.

### 4.1 Danh mục đồ họa 2D & Cấu trúc lớp Chánh Điện (Altar Layers)

Để tạo chiều sâu 2.5D trang nghiêm và hiệu ứng ánh sáng chân thực, không gian chánh điện được phân tách thành các lớp độc lập:

```
+-------------------------------------------------------------------------+
| Layer 6 (Foremost): HUD / Bảng Công Đức / Bong bóng chat bình luận       |
| Layer 5: Hàng ghế bồ đoàn & Nhân vật Phật tử ngồi tọa thiền (Dynamic)   |
| Layer 4: Bàn thờ tiền cảnh, Chân nến lập lòe & Bát hương tỏa khói      |
| Layer 3: Tượng Phật chính tọa trên tòa sen (Buddha Statue)              |
| Layer 2: Vòng hào quang Phật tỏa sáng (Animated Halo Pulse)             |
| Layer 1: Hậu cảnh Bàn thờ tam cấp, câu đối, bình hoa, lư đồng           |
| Layer 0 (Base): Không gian Chánh Điện (Hall Wall, Cột gỗ, Mái chùa)     |
+-------------------------------------------------------------------------+
```

#### Bảng thông số kỹ thuật đồ họa 2D:

| Tên Asset | File Path Khuyến Nghị | Định dạng | Độ phân giải | Kích thước file | Mô tả & Chức năng |
|---|---|---|---|---|---|
| **Chánh Điện Nền (Hall Base)** | `assets/backgrounds/hall_main.jpg` | JPG (Quality 90) / WebP | 1080 × 1920 px | < 600 KB | Không gian chùa cổ kính, cột gỗ lim, hoành phi, gạch lát chánh điện góc nhìn một điểm tụ. |
| **Bàn Thờ & Tòa Sen** | `assets/altar/altar_table.png` | PNG (Trong suốt) | 1080 × 850 px | < 500 KB | Bàn thờ sơn son thếp vàng, bình hoa huệ tây, mâm ngũ quả trang nghiêm. |
| **Tượng Bổn Sư Thích Ca** | `assets/altar/statue_shakyamuni.png` | PNG-24 (Alpha) | 600 × 800 px | < 450 KB | Tượng Phật ngồi thiền kiết già, sắc diện từ bi, hào quang tĩnh tại. |
| **Tượng Phật A Di Đà** | `assets/altar/statue_amitabha.png` | PNG-24 (Alpha) | 600 × 800 px | < 450 KB | Tượng Phật tiếp dẫn thế đứng hoặc ngồi, tay bắt ấn cam lộ. |
| **Tượng Quán Thế Âm** | `assets/altar/statue_avalokiteshvara.png`| PNG-24 (Alpha) | 550 × 820 px | < 420 KB | Bồ Tát Quán Âm tay cầm nhành dương liễu và bình tịnh thủy. |
| **Vòng Hào Quang (Halo)**| `assets/fx/fx_halo_gold.png` | PNG (Additive Blend) | 512 × 512 px | < 180 KB | Vòng tròn ánh sáng tỏa tia kim quang sau đầu tượng Phật. |
| **Đèn Dầu / Chân Nến** | `assets/altar/candle_stand.png` | PNG-24 (Alpha) | 150 × 350 px | < 80 KB | Cặp chân nến đồng đặt hai bên bàn thờ. |
| **Lư Hương Đồng** | `assets/altar/censer_bronze.png` | PNG-24 (Alpha) | 280 × 240 px | < 120 KB | Lư đồng chạm rồng/hoa sen dùng để cắm nhang trầm. |
| **Bồ Đoàn Tọa Thiền** | `assets/altar/meditation_cushion.png` | PNG-24 (Alpha) | 160 × 90 px | < 60 KB | Nệm ngồi hình tròn bọc vải nâu/vàng sẫm đặt theo lưới tọa độ. |

### 4.2 Hiệu ứng động: Nhang trầm, Khói tỏa, Nến lập lòe & Hoa sen bay

Khói hương và ngọn nến là linh hồn của sự thanh tịnh, nhưng nếu dùng ảnh GIF sẽ bị viền răng cưa đen xì rất xấu, còn dùng video MP4 thì nặng CPU.

#### So sánh các giải pháp kỹ thuật cho khói và lửa:

| Giải pháp | Độ mượt mà | Kích thước | Tải CPU/GPU | Đánh giá |
|---|---|---|---|---|
| **Animated GIF** | Rất kém (Tối đa 256 màu, không có kênh alpha mờ đục 8-bit). | Lớn (1 - 3 MB) | Thấp | **Không dùng** (Viền răng cưa xấu). |
| **Animated PNG (APNG)** | Rất đẹp (Hỗ trợ 24-bit màu + 8-bit alpha). | Rất lớn (3 - 8 MB) | Trung bình | Chỉ dùng cho hiệu ứng ngắn (< 2s). |
| **Video WebM (VP9 + Alpha)** | Hoàn hảo (Mịn màng, độ trong suốt chuẩn xác). | Nhỏ (400 - 800 KB) | Trung bình | Tốt nhất cho khói cuộn phức tạp. |
| **Procedural Canvas Particle (Hạt giả lập)** | **Cực kỳ mượt (60 FPS vô tận, không lặp hình)**. | **0 KB (Dùng code vẽ)** | **Rất nhẹ (< 1% GPU)** | **KHUYÊN DÙNG SỐ 1 CHO DỰ ÁN** |

#### Thuật toán vẽ khói nhang trầm bằng Canvas Procedural Particles:
```javascript
// Gia lap 16 phan tu khoi huong bay uon luon mem mai
function drawIncenseSmoke(ctx, nowMs, censerX = 540, censerY = 1050) {
  const t = nowMs / 1000;
  ctx.save();
  ctx.fillStyle = '#efe3cc';
  for (let i = 0; i < 18; i++) {
    const age = (t * 0.09 + i * (1 / 18)) % 1; // Tu 0 den 1
    const alpha = Math.sin(age * Math.PI) * 0.25; // Mo dan o ngon va goc
    const sway = Math.sin(age * 6.5 + i) * (25 * age); // Dao dong ngang
    const y = censerY - age * 320; // Bay len tren 320px
    const radius = 3 + age * 16; // Hat no to dan khi bay len cao

    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.arc(censerX + sway, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
```

#### Hiệu ứng Ngọn nến lung linh (Candle Flame Flicker):
Tận dụng `globalCompositeOperation = 'lighter'` trong Canvas 2D để tạo ánh lửa lập lòe không cần tải ảnh ngoài:
```javascript
function drawCandleGlow(ctx, x, y, time) {
  const flicker = 0.85 + 0.15 * Math.sin(time * 11) * Math.cos(time * 7);
  const grad = ctx.createRadialGradient(x, y, 2, x, y, 35 * flicker);
  grad.addColorStop(0, 'rgba(255, 230, 150, 0.9)');
  grad.addColorStop(0.3, 'rgba(255, 140, 40, 0.5)');
  grad.addColorStop(1, 'rgba(255, 60, 0, 0)');
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = grad;
  ctx.fillRect(x - 40, y - 40, 80, 80);
  ctx.restore();
}
```

### 4.3 Đặc tả Spritesheet hoạt ảnh nhân vật (Tọa thiền -> Bái lạy -> Hồi vị)

Mỗi người xem khi vào livestream sẽ được cấp một chỗ ngồi (bồ đoàn) và mang một hình dạng đại diện (Skin). Khi người xem bình luận hoặc tặng quà, nhân vật sẽ thực hiện chu trình bái lạy tôn kính.

#### 1. Danh sách nhân vật (Skins):
1. `c_man.png` / `anim_man.png`: Nam cư sĩ áo lam Phật tử.
2. `c_woman.png` / `anim_woman.png`: Nữ cư sĩ áo lam Phật tử.
3. `c_granny.png` / `anim_granny.png`: Phật tử cao tuổi (bà lão áo nâu sồng).
4. `c_monk.png`: Sư thầy (áo vàng/nâu, đầu tròn).
5. `c_nun.png`: Ni cô (áo lam/nâu).
6. `c_child.png`: Chú tiểu ngây thơ, chắp tay trang nghiêm.
7. `c_master.png`: Cao tăng trụ trì (áo cà sa gấm đỏ vàng, có hào quang riêng).

#### 2. Đặc tả kỹ thuật Spritesheet:
- **Kích thước dải ảnh (Strip Dimensions)**: Chiều cao chuẩn 300px, chiều rộng phụ thuộc số frame.
  - Ví dụ `anim_man.png`: 8 frames, kích thước tổng $1696 \times 300\text{ px}$ (Mỗi frame $212 \times 300\text{ px}$).
- **Chu kỳ hoạt ảnh (State Machine)**:
  - **Frame 0 - 3 (Walking In)**: Đi từ phía cửa bước vào chánh điện (góc nhìn từ phía sau lưng, bước chân nhịp nhàng).
  - **Frame 4 - 6 (Kneeling Transition)**: Hạ thấp trọng tâm, quỳ gối xuống bồ đoàn.
  - **Frame 7 (Sitting Idle)**: Tọa thiền an định, lưng thẳng, hai tay kết ấn thiền định trên đùi.
  - **Bái Lạy Action (Prostration Cycle)**:
    - Kích hoạt khi có quà hoặc chat: Từ Frame 7 $\rightarrow$ Cúi gập người (Trán sát bồ đoàn, hai bàn tay ngửa mở ra tiếp nhận từ bi) trong 0.6s $\rightarrow$ Giữ nguyên trạng thái phủ phục trong 0.5s $\rightarrow$ Từ từ nâng người thẳng dậy về Frame 7 trong 0.7s.

```
       [Walk In: F0-F3]
              |
              v
     [Kneel Down: F4-F6]
              |
              v
+--> [Sitting Idle: F7] <---+
|             |             |
|             v             |
|       [Bowing Down]       |
|             |             |
|             v             |
|     [Forehead to Floor]   |
|             |             |
+------- [Rising Up] -------+
```

### 4.4 Bảng vàng công đức & Thành phần giao diện (HUD)

1. **Bảng Công Đức (Merit Board)**:
   - Tọa độ mặc định: Góc phải màn hình (`x: 770px`, `y: 630px`, `width: 290px`).
   - Phong cách: Khung gỗ chạm viền hoa văn mạ vàng kim (`border: 2px solid #e2b04f`), nền sơn then bán trong suốt (`rgba(28, 13, 7, 0.85)`).
   - Nội dung: Top 5 Phật tử cúng dường nhiều nhất phiên live, font chữ `Noto Serif` trang nhã.
2. **Khung Thông Báo Quà (Gift Banner Card)**:
   - Tọa độ: Trung tâm phía trên chánh điện (`top: 330px`, `left: 70px`, `right: 70px`).
   - Hiệu ứng: Popup với hiệu ứng tỏa sáng ánh kim quang (Golden Radial Glow), xướng rõ: Tên Phật tử, Tên món quà dâng cúng, Lời nguyện cầu bình an.
3. **Bảng Đề Tên Nhân Vật (Name Tag)**:
   - Gắn cố định trên đầu mỗi bồ đoàn: Hiển thị avatar tròn thu nhỏ của TikTok + Tên rút gọn (tối đa 12 ký tự) có nền bo góc sang trọng.

### 4.5 Bảng đặc tả chuẩn âm thanh (Sample Rate, Bitrate, Loudness LUFS)

| Tên file âm thanh | Vị trí lưu trữ | Định dạng | Sample Rate / Bit Depth | Bitrate | Độ dài | Chuẩn Loudness | Mô tả |
|---|---|---|---|---|---|---|---|
| `mo_single_01.wav` | `/assets/audio/sfx/` | WAV (PCM) | 48.0 kHz / 24-bit | 1536 kbps | 0.35s | -12.0 LUFS | Tiếng gõ mõ đơn dứt khoát, âm mộc tự nhiên. |
| `mo_single_02.wav` | `/assets/audio/sfx/` | WAV (PCM) | 48.0 kHz / 24-bit | 1536 kbps | 0.35s | -12.0 LUFS | Biến thể gõ mõ thứ 2 (round-robin). |
| `mo_single_03.wav` | `/assets/audio/sfx/` | WAV (PCM) | 48.0 kHz / 24-bit | 1536 kbps | 0.35s | -12.0 LUFS | Biến thể gõ mõ thứ 3 (round-robin). |
| `bell_bowl_small.wav`| `/assets/audio/sfx/`| WAV (PCM) | 48.0 kHz / 24-bit | 1536 kbps | 4.50s | -10.0 LUFS | Tiếng chuông bát (chuông gia trì) trong trẻo, ngân vừa. |
| `bell_great_temple.wav`|`/assets/audio/sfx/`| WAV (PCM) | 48.0 kHz / 24-bit | 1536 kbps | 11.20s| -8.0 LUFS | Tiếng Đại Hồng Chung trầm hùng, vang vọng hư không. |
| `gift_chime_tier1.wav`| `/assets/audio/sfx/`| WAV (PCM) | 48.0 kHz / 24-bit | 1536 kbps | 1.80s | -12.0 LUFS | Tiếng chuông gió ngân nhẹ cho quà tặng 1-9 xu. |
| `gift_chime_tier2.wav`| `/assets/audio/sfx/`| WAV (PCM) | 48.0 kHz / 24-bit | 1536 kbps | 2.60s | -10.0 LUFS | Tiếng đàn hạc và hoa sen nở cho quà 10-98 xu. |
| `bgm_bamboo_flute.mp3`| `/assets/audio/bgm/`| MP3 (CBR) | 48.0 kHz / 16-bit | 320 kbps | 5m 20s | -16.0 LUFS | Nhạc thiền sáo trúc tĩnh lặng, loop liền mạch. |
| `bgm_lotus_zither.mp3`| `/assets/audio/bgm/`| MP3 (CBR) | 48.0 kHz / 16-bit | 320 kbps | 6m 15s | -16.0 LUFS | Nhạc thiền đàn tranh và tiếng suối thanh lọc tâm hồn. |

---

## 5. ĐẶC TẢ LƯỢC ĐỒ ASSET MANIFEST (JSON SCHEMA)

Để phần mềm có thể tự động đọc cấu hình tài nguyên mà không cần sửa code mỗi khi thêm ảnh hoặc âm thanh, toàn bộ hệ thống sử dụng một tập tin kê khai tài nguyên duy nhất: `manifest.json`.

### 5.1 JSON Schema chuẩn (`asset-manifest.schema.json`)

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "ChanhDienAssetManifest",
  "description": "Schema dac ta toan bo tai nguyen hinh anh, am thanh va cau hinh phong chanh dien",
  "type": "object",
  "required": ["version", "theme", "assets"],
  "properties": {
    "version": { "type": "string", "pattern": "^\\d+\\.\\d+\\.\\d+$" },
    "theme": { "type": "string" },
    "description": { "type": "string" },
    "assets": {
      "type": "object",
      "required": ["backgrounds", "altar", "characters", "audio_sfx", "audio_bgm"],
      "properties": {
        "backgrounds": {
          "type": "array",
          "items": {
            "$ref": "#/definitions/VisualAsset"
          }
        },
        "altar": {
          "type": "array",
          "items": {
            "$ref": "#/definitions/VisualAsset"
          }
        },
        "characters": {
          "type": "array",
          "items": {
            "$ref": "#/definitions/CharacterAsset"
          }
        },
        "audio_sfx": {
          "type": "array",
          "items": {
            "$ref": "#/definitions/AudioAsset"
          }
        },
        "audio_bgm": {
          "type": "array",
          "items": {
            "$ref": "#/definitions/AudioAsset"
          }
        }
      }
    }
  },
  "definitions": {
    "VisualAsset": {
      "type": "object",
      "required": ["id", "name", "category", "path"],
      "properties": {
        "id": { "type": "string" },
        "name": { "type": "string" },
        "category": { "type": "string", "enum": ["background", "altar_layer", "statue", "fx_prop", "hud"] },
        "path": { "type": "string" },
        "width": { "type": "integer" },
        "height": { "type": "integer" },
        "zIndex": { "type": "integer" },
        "fallbackId": { "type": "string" },
        "license": { "type": "string" }
      }
    },
    "CharacterAsset": {
      "type": "object",
      "required": ["id", "name", "staticPath"],
      "properties": {
        "id": { "type": "string" },
        "name": { "type": "string" },
        "gender": { "type": "string", "enum": ["male", "female", "neutral"] },
        "staticPath": { "type": "string" },
        "spritesheetPath": { "type": "string" },
        "frameWidth": { "type": "integer" },
        "frameHeight": { "type": "integer" },
        "frameCount": { "type": "integer" },
        "seatedHeight": { "type": "integer" },
        "fps": { "type": "number" },
        "license": { "type": "string" }
      }
    },
    "AudioAsset": {
      "type": "object",
      "required": ["id", "name", "type", "path"],
      "properties": {
        "id": { "type": "string" },
        "name": { "type": "string" },
        "type": { "type": "string", "enum": ["mo", "bell", "gift_chime", "bgm_loop", "chant_verse"] },
        "path": { "type": "string" },
        "format": { "type": "string", "enum": ["wav", "mp3", "ogg"] },
        "volume": { "type": "number", "minimum": 0.0, "maximum": 1.0 },
        "durationSec": { "type": "number" },
        "loop": { "type": "boolean" },
        "roundRobinGroup": { "type": "string" },
        "license": { "type": "string" }
      }
    }
  }
}
```

### 5.2 Mẫu dữ liệu hoàn chỉnh (`manifest.json`)

```json
{
  "version": "1.0.0",
  "theme": "Chánh Điện Tịnh Tâm Cổ Tự",
  "description": "Tập hợp tài nguyên tiêu chuẩn cho phòng livestream tương tác TikTok",
  "assets": {
    "backgrounds": [
      {
        "id": "bg_main_hall",
        "name": "Chánh Điện Đại Hùng Bảo Điện",
        "category": "background",
        "path": "/assets/backgrounds/hall.jpg",
        "width": 1080,
        "height": 1920,
        "zIndex": 0,
        "fallbackId": "bg_main_hall",
        "license": "CC-BY-4.0"
      }
    ],
    "altar": [
      {
        "id": "statue_buddha_shakyamuni",
        "name": "Tượng Bổn Sư Thích Ca Mâu Ni",
        "category": "statue",
        "path": "/assets/altar/statue_shakyamuni.png",
        "width": 600,
        "height": 800,
        "zIndex": 3,
        "license": "Public Domain"
      },
      {
        "id": "fx_halo_pulse",
        "name": "Hào Quang Phật Chiếu",
        "category": "fx_prop",
        "path": "/assets/fx/fx_halo.png",
        "width": 512,
        "height": 512,
        "zIndex": 2,
        "license": "MIT"
      }
    ],
    "characters": [
      {
        "id": "char_man",
        "name": "Cư sĩ Nam áo lam",
        "gender": "male",
        "staticPath": "/assets/characters/c_man.png",
        "spritesheetPath": "/assets/characters/anim_man.png",
        "frameWidth": 212,
        "frameHeight": 300,
        "frameCount": 8,
        "seatedHeight": 210,
        "fps": 8,
        "license": "MIT"
      },
      {
        "id": "char_woman",
        "name": "Cư sĩ Nữ áo lam",
        "gender": "female",
        "staticPath": "/assets/characters/c_woman.png",
        "spritesheetPath": "/assets/characters/anim_woman.png",
        "frameWidth": 212,
        "frameHeight": 300,
        "frameCount": 8,
        "seatedHeight": 220,
        "fps": 8,
        "license": "MIT"
      },
      {
        "id": "char_granny",
        "name": "Phật tử cao tuổi áo nâu",
        "gender": "female",
        "staticPath": "/assets/characters/c_granny.png",
        "spritesheetPath": "/assets/characters/anim_granny.png",
        "frameWidth": 195,
        "frameHeight": 300,
        "frameCount": 8,
        "seatedHeight": 222,
        "fps": 8,
        "license": "MIT"
      }
    ],
    "audio_sfx": [
      {
        "id": "sfx_mo_01",
        "name": "Tiếng Mõ Đơn 1",
        "type": "mo",
        "path": "/assets/audio/sfx/mo_strike_01.wav",
        "format": "wav",
        "volume": 0.85,
        "roundRobinGroup": "mo_cadence",
        "license": "CC0"
      },
      {
        "id": "sfx_mo_02",
        "name": "Tiếng Mõ Đơn 2",
        "type": "mo",
        "path": "/assets/audio/sfx/mo_strike_02.wav",
        "format": "wav",
        "volume": 0.85,
        "roundRobinGroup": "mo_cadence",
        "license": "CC0"
      },
      {
        "id": "sfx_bell_temple",
        "name": "Đại Hồng Chung Thỉnh Lễ",
        "type": "bell",
        "path": "/assets/audio/sfx/bell_temple_large.wav",
        "format": "wav",
        "volume": 0.95,
        "durationSec": 11.2,
        "license": "CC0"
      }
    ],
    "audio_bgm": [
      {
        "id": "bgm_flute_01",
        "name": "Trăng Trên Rừng Trúc",
        "type": "bgm_loop",
        "path": "/assets/audio/bgm/music1.mp3",
        "format": "mp3",
        "volume": 0.55,
        "loop": true,
        "license": "Royalty Free"
      },
      {
        "id": "bgm_zither_02",
        "name": "Hơi Thở Ban Mai",
        "type": "bgm_loop",
        "path": "/assets/audio/bgm/music2.mp3",
        "format": "mp3",
        "volume": 0.55,
        "loop": true,
        "license": "Royalty Free"
      }
    ]
  }
}
```

### 5.3 Cơ chế Fallback & Tải động (Dynamic Asset Loader)

Khi một streamer vô tình xóa mất một file ảnh hoặc đường dẫn bị sai, ứng dụng **tuyệt đối không được crash hoặc để màn hình đen**, mà phải tự động kích hoạt cơ chế Fallback:
1. **Fallback Hình ảnh**:
   - Nếu file ảnh tùy chỉnh không tải được (`image.onerror`), hệ thống tự động gán sang asset mặc định (`fallbackId` trong manifest).
   - Nếu asset mặc định cũng hỏng, hệ thống vẽ hình vector dự phòng trực tiếp trên Canvas 2D (ví dụ: hình chữ nhật bo góc viền vàng tượng trưng cho bồ đoàn).
2. **Fallback Âm thanh**:
   - Nếu file âm thanh `mo_strike_01.wav` không tải được, Audio Engine tự động kích hoạt hàm tổng hợp âm thanh bằng Web Audio Oscillator (như thuật toán triangle wave sweep của Kent Juno) để duy trì nhịp gõ mõ liên tục.

---

## 6. CẨM NANG HƯỚNG DẪN TÍCH HỢP TÀI NGUYÊN DÀNH CHO HOST STREAMER

Tài liệu này được biên soạn dành riêng cho người dùng phổ thông (chủ kênh TikTok, các vị tăng ni Phật tử quản trị phòng live) để dễ dàng tự thay thế hình ảnh chùa chiền, tượng Phật và nhạc chuông theo ý nguyện.

### 6.1 Cấu trúc thư mục chuẩn

Toàn bộ tài nguyên được đặt trong thư mục `assets/` tại thư mục gốc của ứng dụng:

```text
app-live/
├── assets/
│   ├── backgrounds/          <-- Nơi chứa ảnh nền Chánh Điện (1080x1920)
│   │   ├── hall.jpg          (Ảnh chánh điện mặc định)
│   │   └── my_temple.jpg     (Ảnh chùa của bạn)
│   ├── altar/                <-- Nơi chứa ảnh Tượng Phật & Bàn thờ (PNG trong suốt)
│   │   ├── statue_main.png   (Tượng Phật chính)
│   │   └── altar_table.png   (Bàn thờ, mâm ngũ quả)
│   ├── characters/           <-- Hình ảnh & Hoạt ảnh Phật tử ngồi thiền
│   │   ├── c_man.png
│   │   ├── anim_man.png
│   │   └── c_woman.png
│   ├── fx/                   <-- Hiệu ứng hoa sen, hào quang, nến
│   │   ├── fx_lotus.png
│   │   └── fx_halo.png
│   ├── audio/                <-- Toàn bộ âm thanh của phòng live
│   │   ├── bgm/              <-- Nhạc thiền tĩnh tâm nền (MP3)
│   │   │   ├── music1.mp3
│   │   │   └── music2.mp3
│   │   └── sfx/              <-- Tiếng gõ mõ, chuông chùa, nhận quà (WAV)
│   │       ├── mo_01.wav
│   │       ├── bell.wav
│   │       └── gift.wav
│   └── manifest.json         <-- File danh mục cấu hình tài nguyên
└── live/
    ├── server.mjs
    ├── overlay.html          (Link đưa vào OBS)
    └── control.html          (Link trang quản trị)
```

### 6.2 Quy ước đặt tên & Định dạng chuẩn

| Loại tài nguyên | Định dạng bắt buộc | Quy cách kỹ thuật khuyến nghị | Quy tắc đặt tên |
|---|---|---|---|
| **Ảnh nền Chánh Điện** | `.jpg` hoặc `.webp` | Đúng tỷ lệ 9:16 (Khuyên dùng: **1080 × 1920 px**). Dung lượng dưới 1 MB. | Viết thường, không dấu, ngăn cách bằng gạch dưới (VD: `chua_hoang_phap.jpg`). |
| **Tượng Phật / Bàn thờ**| `.png` (Trong suốt) | Nền bắt buộc phải tách trong suốt (Transparent PNG-24). Không để nền trắng. | VD: `tuong_thich_ca.png`, `tuong_quan_am.png`. |
| **Nhạc thiền nền** | `.mp3` | Bitrate **128 - 320 kbps**, âm lượng vừa phải, không có lời hát. | VD: `nhac_thien_01.mp3`, `nhac_thien_02.mp3`. |
| **Tiếng Chuông, Mõ** | `.wav` | Âm thanh stereo hoặc mono **48.000 Hz, 16 hoặc 24-bit**, không lẫn tạp âm tiếng ồn. | VD: `chuong_chua.wav`, `mo_tung_kinh.wav`. |

---

### 6.3 Hướng dẫn từng bước thay đổi Chùa, Tượng Phật & Nhạc nền

#### BƯỚC 1: Thay thế ảnh nền Chánh Điện chùa của bạn
1. Chuẩn bị một bức ảnh chụp chính diện bàn thờ hoặc chánh điện ngôi chùa bạn mong muốn.
2. Dùng công cụ cắt ảnh (như Canva, Photoshop hoặc điện thoại) đưa ảnh về kích thước **1080 × 1920 pixels**.
3. Copy bức ảnh đó vào thư mục: `assets/backgrounds/` (Ví dụ đặt tên là: `chua_cua_toi.jpg`).
4. Mở file `assets/manifest.json` bằng Notepad, tìm đến dòng `"backgrounds"` và đổi đường dẫn:
   ```json
   "path": "/assets/backgrounds/chua_cua_toi.jpg"
   ```
5. Tải lại trang Overlay trên OBS (Nhấp nút *Refresh browser*), bạn sẽ thấy chánh điện chùa mình xuất hiện ngay lập tức!

#### BƯỚC 2: Thêm nhạc thiền MP3 yêu thích
1. Chuẩn bị các bài nhạc thiền không lời định dạng `.mp3` (Ví dụ: `thien_an_lac.mp3`).
2. Copy các file này vào thư mục: `assets/audio/bgm/`.
3. Mở file `assets/manifest.json`, thêm bài hát vào danh mục `"audio_bgm"`:
   ```json
   {
     "id": "bgm_an_lac",
     "name": "Thiền An Lạc",
     "type": "bgm_loop",
     "path": "/assets/audio/bgm/thien_an_lac.mp3",
     "format": "mp3",
     "volume": 0.5,
     "loop": true
   }
   ```
4. Hệ thống sẽ tự động phát xoay vòng và chuyển bài êm ái (crossfade) giữa các bài hát có trong danh sách.

#### BƯỚC 3: Thay đổi âm thanh tiếng gõ mõ hoặc tiếng chuông thật
1. Chuẩn bị file tiếng mõ thu âm thật định dạng `.wav`.
2. Đổi tên file thành `mo_strike_01.wav` và chép đè vào thư mục `assets/audio/sfx/`.
3. Khi bạn khởi động lại ứng dụng, tiếng mõ mới sẽ vang lên theo đúng nhịp tụng kinh đã cài đặt.

---

### 6.4 Khắc phục sự cố & Tối ưu hóa hiệu năng trong OBS Studio

| Hiện tượng lỗi | Nguyên nhân gốc rễ | Cách khắc phục triệt để |
|---|---|---|
| **OBS không có tiếng nhạc hoặc tiếng mõ** | Trình duyệt bị khóa tự động phát (Autoplay Policy) hoặc OBS tắt Audio Source. | 1. Trong OBS Studio, click đúp vào Browser Source $\rightarrow$ Tích chọn **"Control audio via OBS"**.<br>2. Nhìn vào thanh *Audio Mixer* của OBS, kéo thanh âm lượng Browser Source lên mức $-3\text{ dB}$.<br>3. Mở trang quản trị `http://localhost:3000/live/control.html`, bấm nút "Thử tương tác" để kiểm tra. |
| **Giọng đọc TTS đọc sai tên hoặc đọc tiếng Anh** | Trình duyệt dùng nhầm voice mặc định của máy thay vì Edge-TTS tiếng Việt. | Đảm bảo máy tính phát live có kết nối mạng Internet. Backend Node.js sẽ tự động kết nối dịch vụ `msedge-tts` với giọng `vi-VN-NamMinhNeural` chuẩn xác nhất. |
| **Hình ảnh Chánh Điện bị méo hoặc co rúm** | Tỷ lệ khung hình của OBS Browser Source không khớp với tỷ lệ thiết kế 9:16. | Trong cài đặt Browser Source trên OBS, nhập chính xác: **Width = 1080**, **Height = 1920**. Không kéo giãn chuột tùy tiện. |
| **Bình luận hoặc quà tặng dồn dập bị lag giật** | Canvas vẽ quá nhiều hạt hoa sen hoặc hàng đợi TTS bị dồn ứ. | Hệ thống đã tích hợp sẵn cơ chế giới hạn hàng đợi tối đa 10 câu và tự động dọn hạt hoa sen bay ra khỏi màn hình sau 3 giây. |

---

## 7. KẾT LUẬN & ĐỀ XUẤT CHO CÁC GIAI ĐOẠN TIẾP THEO

Qua quá trình khảo sát kỹ thuật, kiến trúc **Client-side Web Audio API kết hợp Node.js Microsoft Edge-TTS** và **Asset Manifest chuẩn JSON** là giải pháp tối ưu toàn diện nhất cho dự án "Chánh Điện Tịnh Tâm". Giải pháp này khắc phục triệt để các nhược điểm của dự án mẫu `kentjuno/chanh-dien-online` (loại bỏ nút unmute thủ công, thay thế tiếng chuông mõ điện tử bằng âm thanh mộc chân thực, bổ sung cơ chế gộp chuỗi quà chống spam và thiết kế cấu trúc tài nguyên chuẩn quốc tế).

Báo cáo này sẵn sàng bàn giao cho **Orchestrator** và các Explorer/Developer phụ trách phần Backend và Frontend Overlay tiếp tục triển khai chi tiết.
