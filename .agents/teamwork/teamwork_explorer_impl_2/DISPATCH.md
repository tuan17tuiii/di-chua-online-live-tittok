# Dispatch Assignment: OBS Overlay & Audio Engine Exploration (R2 & R4)

## Target Agent
- Name: teamwork_explorer_impl_2
- Archetype: teamwork_explorer
- Working directory: c:\Users\tn018\Desktop\Person\media\tiktok\app-live\.agents\teamwork\teamwork_explorer_impl_2

## Mandatory References
- User Request: c:\Users\tn018\Desktop\Person\media\tiktok\app-live\.agents\teamwork\ORIGINAL_REQUEST.md (MUST READ FIRST)
- Architecture Breakdown: c:\Users\tn018\Desktop\Person\media\tiktok\app-live\ARCHITECTURE.md (§4, §6)
- WebSocket Protocol: c:\Users\tn018\Desktop\Person\media\tiktok\app-live\WEBSOCKET_SPEC.md
- Roadmap & Technical Plan: c:\Users\tn018\Desktop\Person\media\tiktok\app-live\ROADMAP.md (§2, §4)
- Asset Manifest & Integration: c:\Users\tn018\Desktop\Person\media\tiktok\app-live\ASSET_MANIFEST.md & manifest.json

## Objectives
1. Read ORIGINAL_REQUEST.md and examine specifications for R2 (OBS Browser Source Overlay 1080x1920 9:16 vertical CEF, HTML5 Canvas 2D + DOM text HUD, altar, statue, cushions, trapezoid 2.5D floor perspective math, character states & animations: walk, sit breathing idle, bowing prostration, comment bubbles anchored above seated avatars, floating lotus/gift particles, merit leaderboard) and R4 Frontend Audio (Web Audio API synthesis fallbacks for bell & mõ under autoplay policies, audio ducking -14dB during announcements).
2. Detail the exact frontend directory layout (`public/overlay.html`, `public/css/overlay.css`, `public/js/...`), canvas rendering loop, coordinate transformations, asset preloading, and fallback rendering when images/audio files are missing.
3. Verify zero watermark, high performance (<120MB RAM, 60fps), and zero browser autoplay lock.
4. Produce a detailed handoff report in `handoff.md` with concrete implementation blueprints for workers.

## 2026-11-01T20:03:30Z
You are teamwork_explorer_impl_2.
Your working directory: c:\Users\tn018\Desktop\Person\media\tiktok\app-live\.agents\teamwork\teamwork_explorer_impl_2
Mandatory initial step: Read c:\Users\tn018\Desktop\Person\media\tiktok\app-live\.agents\teamwork\ORIGINAL_REQUEST.md before doing anything else.
Read your instructions in c:\Users\tn018\Desktop\Person\media\tiktok\app-live\.agents\teamwork\teamwork_explorer_impl_2\DISPATCH.md.
Also inspect ARCHITECTURE.md (§4, §6), WEBSOCKET_SPEC.md, ROADMAP.md (§2, §4), ASSET_MANIFEST.md, and manifest.json in c:\Users\tn018\Desktop\Person\media\tiktok\app-live.

Your mission:
Investigate requirements and technical specifications for R2 (Web-based OBS Browser Source Overlay 1080x1920 9:16 vertical) and R4 Frontend Audio (Web Audio API oscillator fallbacks & audio ducking).
Provide a complete implementation blueprint covering:
1. Public overlay directory layout (`public/overlay.html`, `public/css/overlay.css`, `public/js/OverlayApp.js`, `public/js/CanvasFloorEngine.js`, `public/js/CharacterRenderer.js`, `public/js/ParticleSystem.js`, `public/js/WebAudioEngine.js`).
2. HTML5 Canvas 2D engine math: 1080x1920 9:16 vertical, transparent background, 2.5D perspective trapezoid floor equations (y_top=1215, y_bot=1845, x_bounds), scaling factors, z-sorting.
3. Character 4-phase state machine (walk, sitting, sit breathing idle, bowing prostration), avatar positioning, nametag & comment bubble DOM rendering anchored above seated avatars.
4. Particle system (incense smoke, flickering candle lights, lotus particles, merit golden plaque HUD).
5. Web Audio API sound engine: loading 48kHz audio assets with synthetic oscillator fallback for bell and mõ sounds when files are missing or blocked by browser autoplay policy, and parametric look-ahead ducking (-14dB).
6. Performance safeguards: memory usage < 120MB, 60fps stable, zero hidden watermarks.

Write your detailed findings to c:\Users\tn018\Desktop\Person\media\tiktok\app-live\.agents\teamwork\teamwork_explorer_impl_2\handoff.md.
When finished, send a message to the orchestrator summarizing your findings and referencing the handoff file.
