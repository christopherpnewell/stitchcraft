# Knit It — v2 Task List

## Rename
- [x] Rename all references from "StitchCraft" to "Knit It" across codebase

## Bug Fixes
- [x] 1. Fix inverted image orientation in grid pipeline
- [x] 2. Identify and fix all non-functional buttons/UI elements (all buttons functional: width selectors, color slider, gauge dropdown, toggles, generate, download, zoom, fit, start over, next tip, dismiss tip)
- [x] 3. Fix duplicate yarn suggestions — improve color-distance matching

## Enhancements
- [x] 4. Background removal toggle (server-side via @imgly/background-removal-node, cached per session)
- [x] 5. Smart settings suggestions on upload (image complexity/color analysis)
- [x] 6. Live preview updates (debounced 400ms re-generation on config changes with AbortController cancellation)
- [x] 7. Contrast & edge enhancement toggle ("Enhance detail" — unsharp mask + saturation boost)
- [x] 8. Tips & hints system (14 tips, auto-rotating, dismissable, non-intrusive)
- [ ] 9. Color priority zones (stretch goal — deferred)

## Security Hardening
- [x] 10. Full OWASP file upload compliance (magic bytes, UUID filenames, re-encoding, isolated storage, TTL cleanup)
- [x] 11. Rate limiting & abuse prevention (10 req/min per IP, 30s processing timeout, 3-job concurrency semaphore)
- [x] 12. HTTP security headers (CSP, X-Content-Type-Options, X-Frame-Options, HSTS, Referrer-Policy, Permissions-Policy)
- [x] 13. Input validation hardening (min 20 / max 300 width, min 2 / max 16 colors, bounded gauge, generic error messages)
- [x] 14. Dependency audit — moderate vuln in zod (transitive via @imgly/background-removal-node) and esbuild (transitive via vite). Both are dev/build-time only or DoS in input parsing — no critical/high vulns. Documented.
- [x] 15. Environment & secrets (.env.example complete with all vars, .env in .gitignore, no hardcoded secrets)

## Google AdSense Integration
- [x] 16. Ad placement (top banner + sidebar, responsive, placeholder when disabled, no layout disruption)
- [x] 17. CSP configuration for ads (specific Google domains allowlisted, documented relaxations)
- [x] 18. Ad configuration (ENABLE_ADS, ADSENSE_PUBLISHER_ID, AD_SLOT_TOP, AD_SLOT_SIDEBAR env vars, ads.txt served dynamically)

## Final
- [x] Update README for all new features and configuration
- [x] UAT_RESULTS.md — all tests passing
- [x] All changes committed and pushed
