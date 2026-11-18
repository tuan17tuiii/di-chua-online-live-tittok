# Dispatch Assignment: Milestone 2 — OBS Browser Source Overlay & Web Audio Engine (R2 & R4 Frontend)

## Target Agent
- Name: worker_m2_1
- Archetype: teamwork_worker
- Working directory: c:\Users\tn018\Desktop\Person\media\tiktok\app-live\.agents\teamwork\worker_m2_1

## Mandatory References
- User Request: c:\Users\tn018\Desktop\Person\media\tiktok\app-live\.agents\teamwork\ORIGINAL_REQUEST.md (MUST READ FIRST)
- Explorer 2 Technical Blueprint: c:\Users\tn018\Desktop\Person\media\tiktok\app-live\.agents\teamwork\teamwork_explorer_impl_2\handoff.md
- WebSocket Specification: c:\Users\tn018\Desktop\Person\media\tiktok\app-live\WEBSOCKET_SPEC.md
- Architecture Breakdown: c:\Users\tn018\Desktop\Person\media\tiktok\app-live\ARCHITECTURE.md (§4, §6)
- Asset Manifest: c:\Users\tn018\Desktop\Person\media\tiktok\app-live\ASSET_MANIFEST.md & manifest.json

## Exclusive Write Ownership
You own and must implement the following files exclusively:
- `public/overlay.html`
- `public/css/overlay.css`
- `public/js/CanvasFloorEngine.js`
- `public/js/CharacterRenderer.js`
- `public/js/ParticleSystem.js`
- `public/js/WebAudioEngine.js`
- `public/js/OverlayApp.js`

## Detailed Objectives
1. Implement the complete hybrid OBS Browser Source Overlay (1080×1920 9:16 vertical) exactly according to `teamwork_explorer_impl_2/handoff.md`:
   - `public/overlay.html`: Layer 1 Canvas 2D (`#templeCanvas` 1080x1920), Layer 2 DOM HUD (`#hud-layer`: hoành phi `#plaque`, Bảng Vàng Công Đức `#merit`, count pills `#pills`, chanting banner `#chant-banner`, gift announcement banner `#gift-banner`, comment bubbles `#speech-bubbles`, nametags `#nametags`).
   - `public/css/overlay.css`: Complete CSS styling, gold foil gradients, responsive typography, speech bubble pointers, CSS transitions.
   - `public/js/CanvasFloorEngine.js`: 2.5D perspective trapezoid floor equations ($y_{\text{top}}=1215, y_{\text{bot}}=1845, X_{\text{center}}=540, \text{half}_{\text{top}}=290, \text{half}_{\text{bot}}=430$), mandatory even column constraint, 15% center walkway, cushion rendering, procedural fallback backgrounds and altars when image files are missing.
   - `public/js/CharacterRenderer.js`: 4-phase state machine (`walk`, `sitting`, `sit` idle breathing harmonic oscillation $\Delta y = \sin(t \times 1.1 + \phi) \times 2.0 \times \text{scale}$, `bowing` procedural cosine compression $y_{\text{scale}} = 1 - 0.45(1-\cos\theta)$ on frame 7), avatar LRU cache (max 150), skin NLP parser with sacred phrase exclusion (`/nam\s+mô/i`, `/phật\s+bà/i`, etc.).
   - `public/js/ParticleSystem.js`: Object-pooled particles (18 procedural smoke particles, dual-frequency candle flame flicker, dual-ring divine halo with pulse on bell/gift, falling lotus petals).
   - `public/js/WebAudioEngine.js`: 48kHz Web Audio API, autoplay resume watchdog (500ms), dual sound source (48kHz WAV samples + additive synthesis fallbacks: triangle swept mõ synthesis $620\text{Hz} \rightarrow 380\text{Hz}$ with $700\text{Hz}$ bandpass, 4-sine additive harmonic bell synthesis $216, 432, 1296, 2160\text{Hz}$), parametric look-ahead BGM ducking ($-14\text{dB}$, 400ms ramp), and in-memory Base64 Data URI decoding for TTS stream.
   - `public/js/OverlayApp.js`: Main coordinator connecting to `ws://127.0.0.1:3000/ws?role=overlay`, handling inbound events, orchestrating the 60fps canvas render loop and DOM updates.
2. Ensure ZERO hidden watermarks, zero obfuscated arrays, and zero external unverified scripts.
3. Validate HTML/JS syntax and test that all files are syntactically valid and compliant with specifications.
4. Write a comprehensive completion report in `handoff.md`.

## Mandatory Integrity Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.


## 2026-11-01T20:13:46Z
You are worker_m2_1.
Your working directory: c:\Users\tn018\Desktop\Person\media\tiktok\app-live\.agents\teamwork\worker_m2_1

Mandatory initial step: Read c:\Users\tn018\Desktop\Person\media\tiktok\app-live\.agents\teamwork\ORIGINAL_REQUEST.md before doing anything else.
Read your instructions in c:\Users\tn018\Desktop\Person\media\tiktok\app-live\.agents\teamwork\worker_m2_1\DISPATCH.md.
Also inspect the technical blueprint in c:\Users\tn018\Desktop\Person\media\tiktok\app-live\.agents\teamwork\teamwork_explorer_impl_2\handoff.md, as well as WEBSOCKET_SPEC.md, ARCHITECTURE.md, and ASSET_MANIFEST.md.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Your mission:
Implement Milestone 2: OBS Browser Source Overlay & Web Audio Engine (R2 & R4 Frontend).
Write all files under your exclusive ownership:
- public/overlay.html
- public/css/overlay.css
- public/js/CanvasFloorEngine.js
- public/js/CharacterRenderer.js
- public/js/ParticleSystem.js
- public/js/WebAudioEngine.js
- public/js/OverlayApp.js

Ensure 1080x1920 9:16 vertical CEF compliance, 2.5D trapezoid perspective floor math, 4-phase avatar state machine with procedural cosine bowing, particle VFX with object pooling, Web Audio API synthesis fallbacks, look-ahead ducking (-14dB), and 100% genuine code with zero hidden watermarks.
Write your completion report in c:\Users\tn018\Desktop\Person\media\tiktok\app-live\.agents\teamwork\worker_m2_1\handoff.md.
When finished, send a message to the orchestrator summarizing your implementation.
