# Knit It — v3 Task List

## Phase 1: Bug Fixes
- [x] 1. Auto-generate on upload (apply suggestions + generate immediately)
- [x] 2. Remove auto-regeneration on setting changes (button-only)
- [x] 3. Fix status badge transitions (no stale "Ready to configure")
- [x] 4. Fix background removal (replaced @imgly with sharp-based approach)
- [x] 5. Simplify tips system (single static tip, X to dismiss, no carousel)

## Phase 2: New Features
- [x] 6. Project type & placement templates (blanket, scarf, pillow, wall hanging, sweater, tote)
- [x] 7. Yarn affiliate links (Amazon Associates, FTC disclosure)
- [x] 8. Freemium prep (feature flags, "Premium — free during beta" badges)
- [x] 9. Anonymized usage analytics (SQLite, admin dashboard)

## Phase 3: SEO & Discoverability
- [x] 10. JSON-LD structured data
- [x] 11. Meta tags & Open Graph
- [x] 12. Content pages (landing, how-it-works, FAQ, about) with SSR
- [x] 13. Technical SEO (sitemap.xml, robots.txt, clean URLs, CWV)

## Phase 4: Comprehensive Testing
- [x] 14. Full application testing (code review, API, UI, ADA, security, performance) → FULL_TEST_REPORT.md

## Phase 5: Expert Panel Review
- [x] 15. Five specialist sub-agents review and report → EXPERT_PANEL_REPORT.md

## Phase 6: Remediation (Phase 4 & 5 Findings)
- [x] 16. Critical security: timing-safe auth, HMAC CSRF, XSS escaping, admin rate limiting
- [x] 17. Critical backend: semaphore fix, timeout race, bounded store, path traversal check
- [x] 18. Critical domain accuracy: yardage formula, gauge presets, float analysis, chart direction
- [x] 19. Critical accessibility: keyboard upload, canvas a11y, h1 structure, skip link, inline errors
- [x] 20. High accessibility & UX: aria-live, radiogroup, nav labels, form associations, 404 route
- [x] 21. SEO: FAQ schema, sitemap lastmod, canonical normalization, 404 status, meta sanitization
- [x] 22. Yarn & color: weight-filtered suggestions, duplicate removal, dead code cleanup
- [x] 23. Performance: HTML caching, code splitting, vendor chunks, scroll-to-top, trust proxy
- [x] 24. Medium polish: contrast fixes, touch targets, canvas clamp, scarf warning, stable keys
- [x] 25. Low priority: graceful shutdown, cors removal, font preload, focus management, .env docs
