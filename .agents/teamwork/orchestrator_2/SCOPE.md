# Scope & Project Specification: Asset Acquisition and Population (Final Complete)
## Nền tảng Livestream Tương Tác TikTok "Chánh Điện Tịnh Tâm"

---

## 1. Feature Inventory & Asset Matrix (100% Complete & Verified)

Tất cả 29 thực thể tài nguyên (tương đương 36 tệp vật lý) theo `manifest.json`, `asset-manifest.schema.json` và `ASSET_MANIFEST.md`:

| # | Asset ID | Category | Relative Path | Dimensions / Format | Specific Attributes & Constraints | Status | Source |
|---|---|---|---|---|---|:---:|---|
| 1 | `bg_main_hall` | backgrounds | `/assets/backgrounds/hall.jpg` | 1080×1920 JPG | Chánh Điện Tịnh Tâm Cổ Tự, kiến trúc gỗ lim, đèn lồng, tôn nghiêm, 528 KB | **DONE** | manifest.json |
| 2 | `bg_zen_garden` | backgrounds | `/assets/backgrounds/zen_garden.jpg` | 1080×1920 JPG | Vườn thiền sỏi trắng, hồ sen, tre trúc, thanh tịnh, 526 KB (< 550 KB) | **DONE** | manifest.json |
| 3 | `altar_table_main` | altar | `/assets/altar/altar_table.png` | 1080×850 PNG | Bàn thờ gỗ chạm hoa sen, thếp vàng, 32-bit RGBA Alpha sạch | **DONE** | manifest.json |
| 4 | `statue_shakyamuni` | altar | `/assets/altar/statue_shakyamuni.png` | 600×800 PNG | Tượng Đức Bổn Sư Thích Ca Mâu Ni, đài sen, ấn xúc địa, Alpha | **DONE** | manifest.json:71 |
| 5 | `statue_amitabha` | altar | `/assets/altar/statue_amitabha.png` | 600×800 PNG | Tượng Đức Phật A Di Đà, ấn tiếp dẫn, hào quang, Alpha | **DONE** | manifest.json:85 |
| 6 | `statue_avalokiteshvara` | altar | `/assets/altar/statue_avalokiteshvara.png` | 550×820 PNG | Tượng Quán Thế Âm Bồ Tát, cành dương liễu, bình cam lộ, Alpha | **DONE** | manifest.json:98 |
| 7 | `altar_censer_bronze` | altar | `/assets/altar/censer_bronze.png` | 280×240 PNG | Lư hương đồng tam khí cổ kính, hoa văn mây sen, Alpha | **DONE** | manifest.json:111 |
| 8 | `altar_candle_stand` | altar | `/assets/altar/candle_stand.png` | 150×350 PNG | Cặp chân nến đồng đài sen, ngọn lửa ấm cúng, Alpha | **DONE** | manifest.json:125 |
| 9 | `cushion_lotus_mat` | altar | `/assets/altar/meditation_cushion.png` | 160×90 PNG | Bồ đoàn tọa cụ hoa sen đỏ thêu chỉ vàng, Alpha | **DONE** | manifest.json:139 |
| 10 | `char_man` (portrait) | characters | `/assets/characters/c_man.png` | 212×300 PNG | Nam Phật tử áo lam truyền thống, Alpha, neo đáy | **DONE** | manifest.json:158 |
| 11 | `char_man` (strip) | characters | `/assets/characters/anim_man.png` | 1696×300 PNG | 8 frames (212×300/frame): walk(0-3), sitting(4-6), idle(7) | **DONE** | manifest.json:159 |
| 12 | `char_woman` (portrait) | characters | `/assets/characters/c_woman.png` | 212×300 PNG | Nữ Phật tử áo dài nâu lam thanh nhã, Alpha, neo đáy | **DONE** | manifest.json:175 |
| 13 | `char_woman` (strip) | characters | `/assets/characters/anim_woman.png` | 1696×300 PNG | 8 frames (212×300/frame): walk(0-3), sitting(4-6), idle(7) | **DONE** | manifest.json:176 |
| 14 | `char_granny` (portrait) | characters | `/assets/characters/c_granny.png` | 195×300 PNG | Cụ bà phúc hậu áo tràng lam chuỗi hạt, Alpha, neo đáy | **DONE** | manifest.json:192 |
| 15 | `char_granny` (strip) | characters | `/assets/characters/anim_granny.png` | 1560×300 PNG | 8 frames (195×300/frame): walk(0-3), sitting(4-6), idle(7) | **DONE** | manifest.json:193 |
| 16 | `char_child` (portrait) | characters | `/assets/characters/c_child.png` | 180×260 PNG | Bé nhỏ / Chú tiểu tóc ba chỏm áo lam, Alpha, neo đáy | **DONE** | manifest.json:209 |
| 17 | `char_child` (strip) | characters | `/assets/characters/anim_child.png` | 1440×260 PNG | 8 frames (180×260/frame): walk(0-3), sitting(4-6), idle(7) | **DONE** | manifest.json:210 |
| 18 | `char_monk` (portrait) | characters | `/assets/characters/c_monk.png` | 212×300 PNG | Nhà sư trẻ áo nâu sồng trang nghiêm, Alpha, neo đáy | **DONE** | manifest.json:226 |
| 19 | `char_monk` (strip) | characters | `/assets/characters/anim_monk.png` | 1696×300 PNG | 8 frames (212×300/frame): walk(0-3), sitting(4-6), idle(7) | **DONE** | manifest.json:227 |
| 20 | `char_nun` (portrait) | characters | `/assets/characters/c_nun.png` | 212×300 PNG | Sư cô thanh thoát áo nâu sồng thiền môn, Alpha, neo đáy | **DONE** | manifest.json:243 |
| 21 | `char_nun` (strip) | characters | `/assets/characters/anim_nun.png` | 1696×300 PNG | 8 frames (212×300/frame): walk(0-3), sitting(4-6), idle(7) | **DONE** | manifest.json:244 |
| 22 | `char_master` (portrait) | characters | `/assets/characters/c_master.png` | 230×320 PNG | Cao tăng đại đức áo cà sa vàng uy nghi, Alpha, neo đáy | **DONE** | manifest.json:260 |
| 23 | `char_master` (strip) | characters | `/assets/characters/anim_master.png` | 1840×320 PNG | 8 frames (230×320/frame): walk(0-3), sitting(4-6), idle(7) | **DONE** | manifest.json:261 |
| 24 | `fx_halo_gold` | visual_fx | `/assets/fx/fx_halo.png` | 512×512 PNG | Hào quang Phật vàng kim tỏa sáng radial gradient, Alpha | **DONE** | manifest.json:271 |
| 25 | `fx_floating_lotus` | visual_fx | `/assets/fx/fx_lotus.png` | 128×128 PNG | Bông sen hồng nở cánh mềm mại, Alpha | **DONE** | manifest.json:285 |
| 26 | `fx_gold_petal` | visual_fx | `/assets/fx/fx_petal.png` | 64×64 PNG | Cánh hoa sen vàng hạt bụi phát sáng, Alpha | **DONE** | manifest.json:299 |
| 27 | `fx_gift_bell_flash` | visual_fx | `/assets/fx/fx_bell.png` | 256×256 PNG | Chuông vàng phát quang năng lượng cúng dường, Alpha | **DONE** | manifest.json:313 |
| 28 | `sfx_mo_01` | audio_sfx | `/assets/audio/sfx/mo_strike_01.wav` | 48kHz 24-bit Stereo WAV | Tiếng mõ gỗ đanh chắc, decay 0.35s, -12 LUFS | **DONE** | manifest.json:326 |
| 29 | `sfx_mo_02` | audio_sfx | `/assets/audio/sfx/mo_strike_02.wav` | 48kHz 24-bit Stereo WAV | Tiếng mõ gỗ trầm ấm, pitch variance +12Hz, -12 LUFS | **DONE** | manifest.json:342 |
| 30 | `sfx_mo_03` | audio_sfx | `/assets/audio/sfx/mo_strike_03.wav` | 48kHz 24-bit Stereo WAV | Tiếng mõ gỗ vang dội, pitch variance -15Hz, -12 LUFS | **DONE** | manifest.json:358 |
| 31 | `sfx_bell_bowl` | audio_sfx | `/assets/audio/sfx/bell_bowl.wav` | 48kHz 24-bit Stereo WAV | Chuông bát gia trì thanh tịnh, decay 4.8s, -10 LUFS | **DONE** | manifest.json:374 |
| 32 | `sfx_bell_great_temple` | audio_sfx | `/assets/audio/sfx/bell_temple.wav` | 48kHz 24-bit Stereo WAV | Đại hồng chung chùa cổ ngân vang, decay 11.2s, -8 LUFS | **DONE** | manifest.json:390 |
| 33 | `sfx_gift_chime_tier1` | audio_sfx | `/assets/audio/sfx/gift_tier1.wav` | 48kHz 24-bit Stereo WAV | Chuông khánh cúng dường cát tường Tier 1, decay 2.2s | **DONE** | manifest.json:406 |
| 34 | `sfx_gift_chime_tier2` | audio_sfx | `/assets/audio/sfx/gift_tier2.wav` | 48kHz 24-bit Stereo WAV | Chuông ngân diệu âm công đức viên mãn Tier 2, decay 3.5s | **DONE** | manifest.json:421 |
| 35 | `bgm_flute_peace` | audio_bgm | `/assets/audio/bgm/music1.mp3` | MP3 160kbps Stereo | Nhạc thiền sáo trúc tĩnh tâm, loop vô tận, -16 LUFS | **DONE** | manifest.json:436 |
| 36 | `bgm_zither_morning` | audio_bgm | `/assets/audio/bgm/music2.mp3` | MP3 160kbps Stereo | Nhạc thiền đàn tranh an nhiên buổi sớm, loop vô tận | **DONE** | manifest.json:452 |

---

## 2. Milestones Status Summary

| # | Milestone | Scope | Deliverables | Status |
|---|---|---|---|:---:|
| **M_VISUAL** | 2D Visual Assets Population | 2 backgrounds (1080×1920), 7 altar layers/statues (PNG alpha), 7 character portraits (PNG alpha), 7 character 8-frame spritesheets (PNG alpha), 4 visual FX (PNG alpha) | 27 physical image files in `assets/backgrounds/`, `assets/altar/`, `assets/characters/`, `assets/fx/` | **DONE (100%)** |
| **M_AUDIO** | Audio Assets Synthesis & Acquisition | 7 SFX WAV files (48kHz 24-bit PCM), 2 BGM MP3 files (loopable meditation music) | 9 physical audio files in `assets/audio/sfx/`, `assets/audio/bgm/` | **DONE (100%)** |
| **M_VERIFY** | Validation & Gate Verification | Upgraded `scripts/verify_assets.mjs` (binary parsing, dual-path check), empirical test suites, Reviewer APPROVE, Challenger APPROVE, Auditor CLEAN | 36/36 files validated, 0 missing, 0 drift, 0 defects, exit code 0 | **DONE (100%)** |
