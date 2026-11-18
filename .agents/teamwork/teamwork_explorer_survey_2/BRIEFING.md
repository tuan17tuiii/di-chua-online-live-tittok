# BRIEFING — 2026-11-01T16:10:00Z

## Mission
Comprehensive Technical Survey on OBS Browser Source Overlay & Admin Dashboard UI/UX for "Chánh Điện Tịnh Tâm" TikTok Interactive Live application.

## 🔒 My Identity
- Archetype: explorer
- Roles: frontend architect, OBS overlay specialist, UI/UX dashboard designer
- Working directory: c:\Users\tn018\Desktop\Person\media\tiktok\app-live\.agents\teamwork\teamwork_explorer_survey_2
- Original parent: ec57830e-4dc2-42ef-a9b3-b482633b54fd
- Milestone: Explorer Phase - Frontend & Admin UI/UX Survey Completed

## 🔒 Key Constraints
- Read-only investigation — do NOT implement
- Focus specifically on OBS Browser Source Overlay (HTML5 Canvas vs PixiJS vs React + Tailwind + Framer Motion) and Admin Dashboard UI/UX
- Keep files in `.agents/teamwork/teamwork_explorer_survey_2/`

## Current Parent
- Conversation ID: ec57830e-4dc2-42ef-a9b3-b482633b54fd
- Updated: 2026-11-01T16:10:00Z

## Investigation State
- **Explored paths**:
  - `ORIGINAL_REQUEST.md` (read requirements R1, R2, R3)
  - `kentjuno/chanh-dien-online` GitHub repository (inspected `README.md`, `live/overlay.html`, `live/control.html`, `live/server.mjs`)
  - OBS CEF environment constraints: Hardware acceleration, alpha transparency channel, memory leak mitigation, WebGL context loss
  - `react-web-development` skill guidelines for modular pluggable architecture
- **Key findings**:
  - Benchmark indicates **Hybrid Engine (HTML5 Canvas 2D + Lightweight DOM/CSS Overlay)** is the optimal choice for OBS Browser Source: locked 60fps, low memory footprint (~80-120MB), zero DOM node thrashing for continuous 24/7 streaming, while retaining rich typography for Vietnamese chants, leaderboard, and gift celebration banners.
  - 2.5D perspective trapezoid floor math enables smooth scaling between 24, 36, 64, and 100 slots with an open center aisle.
  - 3-tier gift celebration structure (Small: 1-9 diamonds, Medium: 10-99 diamonds, High: 100+ diamonds) seamlessly connects visual effects, sound, and Edge TTS voice xướng tên.
  - Admin Dashboard should be built using a pluggable modular structure with real-time slot matrix management, audio mixing (mõ metronome, chuông, meditation music, Edge TTS), and an integrated simulation engine (event injector & bot runner).
- **Unexplored areas**:
  - Audio and sprite assets sourcing (assigned to Explorer 3).
  - TikTok live connector protobuf/Webcast reverse engineering (assigned to Explorer 1).

## Key Decisions Made
- Recommended Hybrid Architecture (HTML5 Canvas 2D + DOM Overlay) for the OBS overlay.
- Recommended Pluggable React Modular Architecture (based on React Guild standard) for the Admin Dashboard.
- Formulated complete trapezoid perspective grid projection mathematics for 9:16 portrait and 16:9 landscape.

## Artifact Index
- `survey_frontend_admin.md` — Comprehensive technical survey report (7 major sections)
- `handoff.md` — 5-component handoff report
- `progress.md` — Liveness heartbeat and progress log
- `DISPATCH.md` — Incoming task specifications
