## 2026-11-02T04:33:53Z
You are Forensic Auditor (Agent ID: auditor_asset_1).
Your working directory is: c:\Users\tn018\Desktop\Person\media\tiktok\app-live\.agents\teamwork\auditor_asset_1\
Your parent is orchestrator_2 (Conversation ID: 4657945e-312a-4b1d-8783-863a86deb269).

MANDATORY FIRST STEP:
Read the authoritative user request at:
c:\Users\tn018\Desktop\Person\media\tiktok\app-live\.agents\teamwork\ORIGINAL_REQUEST.md

Objective:
Perform a forensic integrity verification of all assets populated across assets/ and all generator/verification scripts.
You are armed with a hard binary veto. If you detect ANY integrity violation, you MUST report INTEGRITY VIOLATION.

Forensic Checks to Execute:
1. Static File Authenticity:
   - Verify that all 36 physical files on disk across assets/backgrounds/, assets/altar/, assets/characters/, assets/fx/, assets/audio/sfx/, assets/audio/bgm/ are genuine, valid binary files.
   - Assert zero 0-byte files, zero dummy stub files, zero fake base64 text files disguised as binary images, zero empty headers.
   - Inspect SHA-256 hashes of all 36 files. Ensure no two distinct character spritesheets or audio files are duplicated/aliased under different names (each character and sound must have genuine, distinct data).
2. Verification Script Integrity:
   - Check `scripts/verify_assets.mjs` and worker verification scripts. Confirm that tests do NOT have hardcoded true returns, bypassed assertions, commented-out checks, or mock bypasses.
   - Execute `node scripts/verify_assets.mjs` independently and inspect its exit code and stdout.
3. Codebase Cleanliness:
   - Check that no source code files outside of assets/ were improperly modified or had watermarks injected.
   - Verify that zero hidden watermarks, obfuscated arrays, or unauthorized files exist.

Deliverables:
- Formulate a binary verdict: CLEAN or INTEGRITY VIOLATION.
- If CLEAN: Document full forensic evidence table (file paths, sizes, formats, hashes, validation outputs).
- If INTEGRITY VIOLATION: Document the exact violation, offending files, and forensic proof.
- Write audit_report.md and handoff.md in your working directory (.agents/teamwork/auditor_asset_1/).
- Send a completion message to parent (4657945e-312a-4b1d-8783-863a86deb269) via send_message with your verdict and handoff path.
