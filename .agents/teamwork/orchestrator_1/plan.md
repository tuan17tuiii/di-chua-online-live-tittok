# Plan — Chánh Điện Tịnh Tâm Architecture, Implementation Roadmap & Asset Specifications

## Objective
Xây dựng bộ tài liệu kỹ thuật hoàn chỉnh và danh mục tài nguyên chuẩn mực cho ứng dụng TikTok Interactive Live "Chánh Điện Tịnh Tâm", đáp ứng toàn diện R1 (Phân tích kiến trúc), R2 (Kế hoạch triển khai & Tích hợp OBS), R3 (Danh mục tài nguyên & Asset Manifest).

## Milestones & Phased Execution

### Phase 0: Technical Survey (Completed)
- [x] Explorer 1: Nghiên cứu Backend, TikTokLiveConnector, Webcast Protobuf, phục hồi kết nối, bảo mật, hạn chế I/O đĩa cho TTS.
- [x] Explorer 2: Nghiên cứu OBS CEF, công nghệ hiển thị Hybrid (Canvas 2D + DOM HUD), phối cảnh 2.5D, ma trận slot lạy, Admin Dashboard React modular.
- [x] Explorer 3: Nghiên cứu Web Audio API (chuông mõ), Edge TTS tiếng Việt (`vi-VN-NamMinhNeural`), quy chuẩn asset 9:16, JSON Schema manifest, hướng dẫn tích hợp tài nguyên.

### Phase 1: Master Specification & Asset Compilation (Worker Implementation)
- [ ] Dispatch Worker to synthesize findings and compile master project documents:
  - `ARCHITECTURE.md`: Tài liệu kiến trúc 4 tầng phân lập, luồng dữ liệu, phân tích OBS CEF, Web Audio, Edge TTS.
  - `WEBSOCKET_SPEC.md`: Đặc tả chi tiết giao thức WebSocket 2 chiều (Server-to-Client và Client-to-Server) với TypeScript schemas.
  - `ROADMAP.md`: Kế hoạch triển khai kỹ thuật chia theo 5 giai đoạn, hướng dẫn cấu hình OBS Studio và chiến lược quản trị rủi ro.
  - `ASSET_MANIFEST.md` & `manifest.json`: Danh mục tài nguyên phân loại hình ảnh, hoạt ảnh, âm thanh kèm thông số chuẩn, bản quyền và hướng dẫn tích hợp.
  - `PROJECT.md`: Hồ sơ dự án tổng thể liên kết tất cả các cấu phần.

### Phase 2: Independent Review & Challenge
- [ ] Dispatch 2 Reviewers independently to verify correctness, completeness, and interface conformance.
- [ ] Dispatch 2 Challengers to test WebSocket message formats, edge cases (gift combos, disconnections, 100-slot overflow, TTS queuing), and asset schema validation.

### Phase 3: Forensic Audit
- [ ] Dispatch Forensic Auditor (`teamwork_auditor`) to verify integrity (no dummy/facade implementations, genuine schemas, real specifications, no hardcoding).

### Phase 4: Gate Evaluation & Human Reporting
- [ ] Verify all criteria pass (Clean audit, all approvals, all challenges satisfied).
- [ ] Compile comprehensive human report summarizing architecture, roadmap, and asset specifications for the user.
