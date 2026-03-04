# Knit It -- UAT Test Results

**Date:** 2026-03-03
**Tester:** Claude UAT Agent
**Frontend:** http://localhost:5173
**API:** http://localhost:3000

---

## Summary

| Metric | Count |
|--------|-------|
| **Total Tests** | 33 |
| **PASS** | 33 |
| **FAIL** | 0 |
| **Pass Rate** | 100% |

---

## 1. API Happy Path

| Timestamp | Test Name | Expected | Actual | Result |
|-----------|-----------|----------|--------|--------|
| 2026-03-03T03:15:33Z | GET / acquires CSRF cookie | Response sets `csrfToken` cookie with `SameSite=Strict` | Set-Cookie header returned: `csrfToken=<64-char-hex>; Max-Age=3600; Path=/; SameSite=Strict` | PASS |
| 2026-03-03T03:15:33Z | POST /api/upload with valid PNG | 200 with `id` (UUID) and `suggestions` object | `{"id":"<uuid>","message":"Image uploaded successfully","suggestions":{"suggestedWidth":40,"suggestedColors":2,"suggestedBackgroundRemoval":true,"complexity":2,"imageType":"graphic"}}` | PASS |
| 2026-03-03T03:15:33Z | Upload suggestions structure | `suggestions` contains `suggestedWidth`, `suggestedColors`, `suggestedBackgroundRemoval`, `complexity`, `imageType` | All five fields present with valid values: width=40, colors=2, bgRemoval=true, complexity=2, imageType="graphic" | PASS |
| 2026-03-03T03:15:34Z | POST /api/generate (40w/4c/20sg/28rg) | 200 with `id` and `pattern` containing grid, palette, dimensions, yardage | Returned grid 29x40, palette length 4, widthStitches=40, heightRows=29, finishedWidthInches=8, finishedHeightInches=4.1, totalStitches=1160, colorPercentages and colorYardages present | PASS |
| 2026-03-03T03:15:35Z | GET /api/download/:id returns PDF | 200 with Content-Type `application/pdf`, valid PDF magic bytes `%PDF-` | HTTP 200, Content-Type: application/pdf, Content-Disposition: attachment, file starts with `%PDF-`, size 17046 bytes | PASS |
| 2026-03-03T03:15:35Z | Upload GIF image | 200 with id and suggestions | `{"id":"<uuid>","message":"Image uploaded successfully","suggestions":{...}}` returned successfully | PASS |

## 2. API Failure Modes

| Timestamp | Test Name | Expected | Actual | Result |
|-----------|-----------|----------|--------|--------|
| 2026-03-03T03:15:36Z | Upload with no file | 400 `No image file provided` | `{"error":"No image file provided"}` (HTTP 400) | PASS |
| 2026-03-03T03:15:36Z | Upload oversized file (48MB PNG) | 400 or 413 rejection for exceeding 10MB limit | `{"error":"File exceeds the 10MB size limit"}` (HTTP 400) | PASS |
| 2026-03-03T03:15:36Z | Upload non-image file (.txt renamed to .png) | 400 magic byte rejection | `{"error":"File content does not match a valid image format"}` (HTTP 400) | PASS |
| 2026-03-03T03:15:36Z | Generate with invalid session ID | 404 session not found | `{"error":"Upload session not found. Please upload an image first."}` (HTTP 404) | PASS |
| 2026-03-03T03:15:36Z | Generate with widthStitches=5 (below min 20) | 400 out-of-range error | `{"error":"Grid width must be between 20 and 300 stitches"}` (HTTP 400) | PASS |
| 2026-03-03T03:15:36Z | Generate with widthStitches=500 (above max 300) | 400 out-of-range error | `{"error":"Grid width must be between 20 and 300 stitches"}` (HTTP 400) | PASS |
| 2026-03-03T03:15:36Z | Generate with numColors=0 (below min 2) | 400 out-of-range error | `{"error":"Number of colors must be between 2 and 16"}` (HTTP 400) | PASS |
| 2026-03-03T03:15:36Z | Generate with numColors=20 (above max 16) | 400 out-of-range error | `{"error":"Number of colors must be between 2 and 16"}` (HTTP 400) | PASS |
| 2026-03-03T03:15:36Z | Generate with stitchGauge=1 (below min 5) | 400 out-of-range error | `{"error":"Stitch gauge must be between 5 and 60"}` (HTTP 400) | PASS |
| 2026-03-03T03:15:36Z | Generate with rowGauge=100 (above max 60) | 400 out-of-range error | `{"error":"Row gauge must be between 5 and 60"}` (HTTP 400) | PASS |
| 2026-03-03T03:16:37Z | Generate with missing widthStitches | 400 validation error | `{"error":"Grid width must be between 20 and 300 stitches"}` (HTTP 400) | PASS |
| 2026-03-03T03:16:37Z | Generate with missing numColors | 400 validation error | `{"error":"Number of colors must be between 2 and 16"}` (HTTP 400) | PASS |
| 2026-03-03T03:16:37Z | Generate with missing stitchGauge | 400 validation error | `{"error":"Stitch gauge must be between 5 and 60"}` (HTTP 400) | PASS |
| 2026-03-03T03:16:37Z | Generate with missing rowGauge | 400 validation error | `{"error":"Row gauge must be between 5 and 60"}` (HTTP 400) | PASS |
| 2026-03-03T03:16:37Z | Generate with widthStitches="abc" (non-numeric) | 400 validation error (NaN fails bounds check) | `{"error":"Grid width must be between 20 and 300 stitches"}` (HTTP 400) | PASS |
| 2026-03-03T03:16:37Z | Generate with missing id entirely | 404 session not found | `{"error":"Upload session not found. Please upload an image first."}` (HTTP 404) | PASS |
| 2026-03-03T03:15:36Z | POST /api/upload without CSRF token | 403 Invalid CSRF token | `{"error":"Invalid CSRF token"}` (HTTP 403) | PASS |
| 2026-03-03T03:15:36Z | POST /api/upload with wrong CSRF token | 403 Invalid CSRF token | `{"error":"Invalid CSRF token"}` (HTTP 403) | PASS |
| 2026-03-03T03:15:36Z | CSRF cookie present but no X-CSRF-Token header | 403 Invalid CSRF token | `{"error":"Invalid CSRF token"}` (HTTP 403) | PASS |
| 2026-03-03T03:15:36Z | X-CSRF-Token header present but no cookie | 403 Invalid CSRF token | `{"error":"Invalid CSRF token"}` (HTTP 403) | PASS |
| 2026-03-03T03:15:36Z | CSRF cookie and header both present but mismatched | 403 Invalid CSRF token | `{"error":"Invalid CSRF token"}` (HTTP 403) | PASS |
| 2026-03-03T03:15:37Z | Download with non-existent ID | 404 Pattern not found | `{"error":"Pattern not found"}` (HTTP 404) | PASS |
| 2026-03-03T03:15:37Z | Download before generating pattern | 400 not yet generated | `{"error":"Pattern not yet generated. Generate a preview first."}` (HTTP 400) | PASS |

## 3. Security Headers

| Timestamp | Test Name | Expected | Actual | Result |
|-----------|-----------|----------|--------|--------|
| 2026-03-03T03:15:33Z | Content-Security-Policy present | Header exists with strict directives | `default-src 'self';script-src 'self';style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;font-src 'self' https://fonts.gstatic.com;img-src 'self' blob: data:;connect-src 'self';frame-src 'none';object-src 'none';base-uri 'self';form-action 'self'` | PASS |
| 2026-03-03T03:15:33Z | X-Content-Type-Options | `nosniff` | `X-Content-Type-Options: nosniff` | PASS |
| 2026-03-03T03:15:33Z | Strict-Transport-Security | `max-age=31536000; includeSubDomains` | `Strict-Transport-Security: max-age=31536000; includeSubDomains` | PASS |
| 2026-03-03T03:15:33Z | X-Frame-Options | `DENY` or `SAMEORIGIN` | `X-Frame-Options: DENY` | PASS |
| 2026-03-03T03:15:33Z | Referrer-Policy | Policy header present | `Referrer-Policy: strict-origin-when-cross-origin` | PASS |
| 2026-03-03T03:15:33Z | Permissions-Policy | Header exists disabling unused features | `Permissions-Policy: camera=(), microphone=(), geolocation=(), interest-cohort=(), accelerometer=(), gyroscope=(), magnetometer=(), usb=()` | PASS |

## 4. Feature Tests

| Timestamp | Test Name | Expected | Actual | Result |
|-----------|-----------|----------|--------|--------|
| 2026-03-03T03:15:38Z | Generate with removeBackground=true | 200 with pattern grid (background removal applied or graceful fallback) | SUCCESS - returned grid 29x40, palette 4 colors | PASS |
| 2026-03-03T03:15:38Z | Generate with enhanceDetail=true | 200 with pattern grid | SUCCESS - returned grid 29x40 | PASS |
| 2026-03-03T03:15:38Z | Generate with cleanup=false | 200 with pattern grid (no isolated-pixel cleanup) | SUCCESS - returned grid 29x40 | PASS |
| 2026-03-03T03:15:38Z | Generate with 20 stitches / 2 colors | 200 with 20-wide grid and 2-color palette | Grid 14x20, palette length 2 | PASS |
| 2026-03-03T03:15:39Z | Generate with 200 stitches / 12 colors | 200 with 200-wide grid and 12-color palette | Grid 143x200, palette length 12 | PASS |

## 5. Rate Limiting

| Timestamp | Test Name | Expected | Actual | Result |
|-----------|-----------|----------|--------|--------|
| 2026-03-03T03:15:40Z | Rapid-fire 15 POST /api/generate requests | First 10 succeed (HTTP 200), remaining return HTTP 429 | Requests 1-10: HTTP 200; Requests 11-15: HTTP 429 with `{"error":"Too many requests. Please try again later."}` | PASS |
| 2026-03-03T03:15:40Z | Rate limit response headers present | Standard rate-limit headers present | `RateLimit-Policy: 10;w=60`, `RateLimit-Limit: 10`, `RateLimit-Remaining: <n>`, `RateLimit-Reset: <seconds>` | PASS |

---

## Notes

- **Rate limit config:** 10 requests per 60-second window per IP (configurable via `RATE_LIMIT_WINDOW_MS` and `RATE_LIMIT_MAX_REQUESTS` env vars). Upload and generate endpoints each have their own rate limiter instance.
- **CSRF protection:** Double-submit cookie pattern. GET requests auto-issue a `csrfToken` cookie (64-char hex, `httpOnly: false`, `SameSite: Strict`, `secure` only in production). POST requests must include a matching `X-CSRF-Token` header. All five CSRF failure modes (no cookie, no header, mismatched, wrong header, neither) correctly return 403.
- **Image validation:** Three-layer check: (1) file extension must be .jpg/.jpeg/.png/.webp/.gif, (2) file size must be under 10MB, (3) magic byte signature verification. All uploads are re-encoded through Sharp to strip EXIF/metadata and neutralize embedded payloads.
- **Input bounding:** Grid width 20-300 stitches, colors 2-16, gauge 5-60. Missing or non-numeric values fail the bounds check cleanly (`parseInt` returns `NaN` which fails the range comparison).
- **Smart suggestions:** The upload endpoint returns image analysis with `suggestedWidth`, `suggestedColors`, `suggestedBackgroundRemoval`, `complexity` (0-100), and `imageType` (graphic/illustration/photograph). Analysis is best-effort and does not block upload on failure.
- **Concurrency control:** Server limits concurrent processing jobs to 3 (configurable via `MAX_CONCURRENT_JOBS`). Excess requests receive HTTP 503. Processing timeout of 30 seconds returns HTTP 504.
- **Frontend proxy:** Vite dev server at port 5173 proxies `/api` requests to the backend at port 3000. The built client is served statically by Express in production. Frontend returns HTTP 200 with valid HTML.
- **Session cleanup:** Pattern sessions are auto-cleaned after 30 minutes. Image files are deleted after PDF download.
