# Loominade — Image to Knitting Pattern Generator

Upload any image and get a professional, print-ready colorwork knitting pattern as a PDF. Handles stitch aspect ratio correctly, produces clean color-quantized charts, and includes yarn estimates.

## Quick Start

### Prerequisites

- Node.js >= 20
- npm

### Development

```bash
# Install dependencies
cd server && npm install && cd ../client && npm install && cd ..
npm install

# Copy and configure environment
cp .env.example .env

# Run both server and client in dev mode
npm run dev
```

- **Server**: http://localhost:3000 (API)
- **Client**: http://localhost:5173 (dev server, proxies API to :3000)

### Production

```bash
npm run build   # Build the client
npm start       # Start the server (serves built client)
```

### Docker

```bash
docker compose up --build

# With custom secrets and ad config:
CSRF_SECRET=$(openssl rand -hex 32) \
ENABLE_ADS=true \
ADSENSE_PUBLISHER_ID=ca-pub-XXXXXXXX \
docker compose up --build
```

App will be at http://localhost:3000.

## Features

### Core
- **Image upload** with drag-and-drop, file type validation (magic bytes + extension), and EXIF stripping
- **K-means++ color quantization** — produces faithful palettes from any image, no dithering
- **Stitch aspect ratio correction** — accounts for non-square knit stitches so the finished piece looks correct
- **Isolated stitch cleanup** — removes single-stitch color islands that are impractical to knit
- **Professional PDF output** — paginated charts with numbered axes, color legend, symbols, yarn suggestions, gauge notes, finished dimensions, and yardage estimates

### v2 Enhancements
- **Background removal** — toggle to isolate foreground subjects from backgrounds (great for pet photos)
- **Smart settings suggestions** — image analysis recommends optimal width, colors, and background removal
- **Live preview** — config changes trigger debounced re-generation (400ms) with stale request cancellation
- **Enhance detail** — contrast and sharpness boost for photographs that lose definition at low resolution
- **Tips system** — rotating knitting and app tips, non-intrusive, dismissable

### Monetization
- **Google AdSense** — env-configurable ad placements (top banner + sidebar), with `ads.txt` served dynamically
- Ads are completely disabled by default (`ENABLE_ADS=false`)

## Architecture

```
├── server/
│   └── src/
│       ├── index.js                 # Express entry point
│       ├── middleware/
│       │   ├── security.js          # Helmet, CSP, rate limiting, CSRF, Permissions-Policy
│       │   └── errorHandler.js      # Global error handler
│       ├── routes/
│       │   └── pattern.js           # Upload, generate, download endpoints
│       └── services/
│           ├── config.js            # Environment-driven configuration
│           ├── imageValidator.js     # Magic byte validation, EXIF stripping, re-encoding
│           ├── imageAnalyzer.js      # Image complexity/color analysis for smart suggestions
│           ├── backgroundRemoval.js  # @imgly/background-removal-node integration
│           ├── colorQuantizer.js     # K-means++ quantization, 60-entry yarn database
│           ├── patternGenerator.js   # Image → knitting grid pipeline
│           └── pdfGenerator.js       # Grid → professional PDF output
├── client/
│   └── src/
│       ├── App.jsx                  # Main application shell
│       ├── hooks/
│       │   └── usePattern.js        # Upload/generate/download with debounce + abort
│       └── components/
│           ├── ImageUpload.jsx      # Drag-and-drop image upload
│           ├── PatternConfig.jsx    # Settings panel (width, colors, gauge, toggles)
│           ├── PatternPreview.jsx   # Canvas-rendered chart preview with zoom
│           ├── ColorLegend.jsx      # Color table with yarn suggestions
│           ├── Tips.jsx             # Rotating tips system
│           └── AdBanner.jsx         # Google AdSense wrapper
├── Dockerfile                       # Multi-stage production build
└── docker-compose.yml
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/upload` | Upload an image. Returns `{ id, suggestions }` |
| `POST` | `/api/generate` | Generate pattern. Body: `{ id, widthStitches, numColors, stitchGauge, rowGauge, cleanup, removeBackground, enhanceDetail }` |
| `GET` | `/api/download/:id` | Download PDF pattern |

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server port |
| `NODE_ENV` | `development` | Environment mode |
| `UPLOAD_DIR` | `./uploads` | Temp directory for uploaded images |
| `TMP_DIR` | `./tmp` | Temp directory for processing |
| `MAX_FILE_SIZE_MB` | `10` | Max upload size in MB |
| `RATE_LIMIT_WINDOW_MS` | `60000` | Rate limit window (1 min) |
| `RATE_LIMIT_MAX_REQUESTS` | `10` | Max requests per window per IP |
| `PROCESSING_TIMEOUT_MS` | `30000` | Max processing time before timeout |
| `MAX_CONCURRENT_JOBS` | `3` | Max simultaneous image processing jobs |
| `CSRF_SECRET` | `dev-secret...` | CSRF token secret (change in production!) |
| `ENABLE_ADS` | `false` | Enable Google AdSense |
| `ADSENSE_PUBLISHER_ID` | *(empty)* | AdSense publisher ID (ca-pub-XXXXX) |
| `AD_SLOT_TOP` | *(empty)* | Ad slot ID for top banner |
| `AD_SLOT_SIDEBAR` | *(empty)* | Ad slot ID for sidebar |

## Security

- **File upload**: Magic byte validation (not just Content-Type), UUID filenames, re-encoding through Sharp to strip EXIF/GPS/payloads, isolated storage outside webroot with TTL cleanup
- **Rate limiting**: 10 requests/minute per IP on processing endpoints
- **Processing limits**: 30s timeout, max 3 concurrent jobs (prevents CPU DoS)
- **CSP**: Strict Content-Security-Policy; when ads are enabled, only specific Google domains are allowlisted (no blanket `unsafe-eval`)
- **Headers**: HSTS, X-Content-Type-Options: nosniff, X-Frame-Options, Referrer-Policy, Permissions-Policy (camera/mic/geo disabled)
- **CSRF**: Double-submit cookie + header verification
- **Input validation**: All inputs bounded server-side (width 20-300, colors 2-16, gauge 5-60)
- **Error handling**: Generic messages to client, full details logged server-side
- **No tracking**: No analytics or third-party scripts (except AdSense when explicitly enabled)

## Dependency Audit Notes

- **Server**: `zod` moderate vulnerability (transitive via `@imgly/background-removal-node`) — DoS via crafted input to schema parsing. Low risk since zod is used internally by the bg removal lib, not for user input validation.
- **Client**: `esbuild` moderate vulnerability (transitive via `vite`) — build-time only, not present in production output.
