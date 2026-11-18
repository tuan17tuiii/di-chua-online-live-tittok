# Explorer Fix 3 Context: Verification Harness Binary Audit Remediation Blueprint
Upgrade scripts/verify_assets.mjs to eliminate self-certification by parsing binary image headers (PNG IHDR, JPG SOF0) and verifying spritesheetPath.
