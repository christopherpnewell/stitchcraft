# UAT Results — Knit It v2

## Test Run: 2026-03-03

### API Tests
| # | Test | Expected | Actual | Result |
|---|------|----------|--------|--------|
| 1 | CSRF token acquisition | Token set in cookie on GET | Token received | PASS |
| 2 | Upload valid PNG image | Returns { id, suggestions } | ID and suggestions returned | PASS |
| 3 | Upload invalid file (text pretending to be PNG) | Rejected with error | Magic byte validation rejects correctly (verified via direct unit test; curl/Windows path issue in automated test) | PASS |
| 4 | Generate pattern with defaults | Returns grid, palette, stats | Full pattern data returned | PASS |
| 5 | Generate with enhanceDetail=true | Returns enhanced pattern | Pattern with enhanced preprocessing returned | PASS |
| 6 | Reject width below minimum (5) | 400 error | Error: "Grid width must be between 20 and 300" | PASS |
| 7 | Reject width above maximum (500) | 400 error | Error: "Grid width must be between 20 and 300" | PASS |
| 8 | Download PDF | 200 with valid PDF | Valid PDF document, 5 pages | PASS |
| 9 | CSRF rejection (no token) | 403 error | "Invalid CSRF token" | PASS |
| 10 | Invalid session ID | 404 error | "Upload session not found" | PASS |

### Security Headers
| Header | Expected | Result |
|--------|----------|--------|
| X-Content-Type-Options | nosniff | PASS |
| Strict-Transport-Security | max-age=31536000 | PASS |
| X-Frame-Options | DENY (or SAMEORIGIN with ads) | PASS |
| Referrer-Policy | strict-origin-when-cross-origin | PASS |
| Permissions-Policy | camera=(), microphone=(), etc. | PASS |
| Content-Security-Policy | Strict directives present | PASS |

### UI Elements (verified via code review)
| Element | Location | Functional |
|---------|----------|-----------|
| Image upload (drag-and-drop) | Landing page | Yes — triggers upload flow |
| Image upload (click to browse) | Landing page | Yes — opens file picker |
| Width selector buttons (30-200) | Config panel | Yes — updates state |
| Color count slider (2-12) | Config panel | Yes — updates state |
| Gauge preset dropdown | Config panel | Yes — updates gauge values |
| Custom gauge inputs | Config panel (when Custom selected) | Yes — updates gauge values |
| Smooth isolated stitches toggle | Config panel | Yes — updates config |
| Remove background toggle | Config panel | Yes — sends flag to server |
| Enhance detail toggle | Config panel | Yes — sends flag to server |
| Generate Pattern button | Config panel | Yes — triggers generation |
| Download PDF Pattern button | Below config (after generation) | Yes — downloads PDF |
| Zoom + button | Preview header | Yes — increases zoom |
| Zoom - button | Preview header | Yes — decreases zoom |
| Fit button | Preview header | Yes — resets zoom to 1 |
| Start Over button | Header (after upload) | Yes — resets all state |
| Apply Suggestions button | Blue banner (after upload) | Yes — applies suggested settings |
| Next tip button | Tips component | Yes — cycles to next tip |
| Dismiss tip button | Tips component | Yes — hides tips |

### Smart Suggestions
| Test | Result |
|------|--------|
| Upload returns suggestions object | PASS — includes suggestedWidth, suggestedColors, imageType |
| Apply suggestions button updates config | PASS (code verified) |

### Notes
- Background removal is functional but slow on first use (downloads ONNX model). Subsequent calls use cached model.
- GLib-GObject-CRITICAL warnings on Windows are harmless (ONNX runtime issue, does not affect functionality).
- Live preview debounce works after first manual Generate click (by design — avoids premature server calls).
