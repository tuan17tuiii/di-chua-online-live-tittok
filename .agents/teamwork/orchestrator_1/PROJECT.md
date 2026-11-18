# Project: Chánh Điện Tịnh Tâm (TikTok Interactive Live)

## Architecture
- **Pattern**: 4-Tier Decoupled Architecture
  1. Event Ingestion Layer (TikTokLiveConnector + Mock Simulator + Admin Manual + Residential Proxy + Session Auth)
  2. Event Normalizer & Moderation Layer (Canonical event schema, Vietnamese sacred phrase protection & profanity filter, gift streak coalescer)
  3. Core State Manager (Dynamic 2.5D seating slots 24-100, LRU non-donor eviction + 100% donor saturation resolution, merit leaderboard, 90s prayer cache, liturgical scheduler)
  4. WebSocket Broadcaster & Client Layer (Native `ws` role-partitioned: OBS Browser Source Hybrid Engine + React Admin Dashboard)

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | TikTok Live Ingestion & Reconnect | `tiktok-live-connector` v2.5+, exponential backoff with jitter bounded <= 30s, 15s watchdog, proxy support | M1 | Survey 1, Worker 1, 2 |
| 2 | Event Normalizer & Moderation | Canonical event schema, Vietnamese profanity blacklist, Sacred phrase protection, XML escaping, gift streak coalescer | M1 | Survey 1, Worker 1, 2 |
| 3 | Core State & Seating Engine | Dynamic slot grid (24/36/64/100), LRU non-donor eviction + donor saturation resolution, merit leaderboard, 90s prayer cache | M1 | Survey 1, Worker 1, 2 |
| 4 | WebSocket Protocol & Broadcaster | Native `ws` server, roles `overlay` vs `control`, snapshot on connect, low-latency streaming (<30ms) | M1, M2 | Survey 1, 2, Worker 1, 2 |
| 5 | OBS Hybrid Display Engine | 1080x1920 9:16 Canvas 2D + DOM HUD, locked 60fps in OBS CEF, transparent alpha, 2.5D projection math with even columns & 12% margin | M2 | Survey 2, Worker 1, 2 |
| 6 | Visual VFX & Avatar Animations | Multi-layer altar, golden halo, incense smoke, floating lotuses, 4-phase avatar state machine, cosine bowing on Frame 7 | M2 | Survey 2, Worker 1, 2 |
| 7 | Web Audio & Edge-TTS Engine | Web Audio API acoustic samples, look-ahead ducking (-14dB), MS Edge TTS Nam Minh/Hoai My, in-memory Base64 Data URI stream | M3 | Survey 3, Worker 1, 2 |
| 8 | Admin Control Dashboard | React + Tailwind modular dashboard: live status, visual slot grid, audio mixer, simulation studio | M2 | Survey 2, Worker 1, 2 |
| 9 | Asset Manifest & Host Integration | Comprehensive asset catalog (29 assets), JSON Schema Draft 2020-12, Acyclic DAG fallback, 4-step convention drop-in guide | M3 | Survey 3, Worker 1, 2 |
| 10 | OBS Integration & Risk Playbook | OBS Browser Source configuration guide, audio monitoring setup, daily operating workflow, 7-risk mitigation matrix | M4 | Survey 1, 2, 3, Worker 1, 2 |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Backend Architecture & Resilience | Ingestion, normalizer, state manager, eviction logic, reconnect engine | none | DONE |
| M2 | Frontend Overlay & Admin Dashboard | OBS CEF hybrid canvas, 2.5D math, React admin modular design, WebSocket spec | M1 | DONE |
| M3 | Audio, Edge-TTS & Asset Manifest | Web Audio API, ducking, Edge-TTS priority queue, asset catalog, manifest.json & schema | M1, M2 | DONE |
| M4 | Master Technical Documentation | Complete ARCHITECTURE.md, WEBSOCKET_SPEC.md, ROADMAP.md, ASSET_MANIFEST.md, PROJECT.md | M1, M2, M3 | DONE |

## Interface Contracts
### Backend ↔ Clients (OBS Overlay & Admin)
- Handshake URL: `ws://127.0.0.1:3000/ws?role=overlay` (read-only) or `role=control` (admin commands)
- Envelopes: Server-to-Client `{ t: string, ... }`, Client-to-Server `{ t: "ctl", cmd: string, ... }`
- Core event types: `state`, `settings`, `join`, `leave`, `skin`, `chat`, `gift` (with `repeatEnd`, `comboCount`, `isCombo`), `like`, `tts` (with `dataUri` primary), `chant`, `bell`, `mo`, `tiktok`, `log`
