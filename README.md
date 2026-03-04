# StitchCraft — Image to Knitting Pattern Generator

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
# Build the client
npm run build

# Start the server (serves the built client)
npm start
```

### Docker

```bash
# Build and run
docker compose up --build

# Or with a custom CSRF secret
CSRF_SECRET=$(openssl rand -hex 32) docker compose up --build
```

App will be at http://localhost:3000.

## Architecture

```
├── server/
│   └── src/
│       ├── index.js                 # Express entry point
│       ├── middleware/
│       │   ├── security.js          # Helmet, rate limiting, CSRF
│       │   └── errorHandler.js      # Global error handler
│       ├── routes/
│       │   └── pattern.js           # Upload, generate, download endpoints
│       └── services/
│           ├── config.js            # Server configuration
│           ├── imageValidator.js     # Magic byte validation, EXIF stripping
│           ├── colorQuantizer.js     # K-means++ color quantization
│           ├── patternGenerator.js   # Image → knitting grid pipeline
│           └── pdfGenerator.js       # Grid → professional PDF output
├── client/
│   └── src/
│       ├── App.jsx                  # Main application shell
│       ├── hooks/
│       │   └── usePattern.js        # Upload/generate/download state management
│       └── components/
│           ├── ImageUpload.jsx      # Drag-and-drop image upload
│           ├── PatternConfig.jsx    # Grid size, colors, gauge settings
│           ├── PatternPreview.jsx   # Canvas-rendered chart preview
│           └── ColorLegend.jsx      # Color table with yarn suggestions
├── Dockerfile                       # Multi-stage production build
└── docker-compose.yml
```

## How It Works

1. **Upload**: Image is validated by file extension AND magic bytes, re-encoded through Sharp to strip EXIF data and neutralize payloads, saved with a UUID filename to an isolated temp directory.

2. **Generate**: The image is resized to the target grid dimensions, accounting for stitch aspect ratio (knit stitches are wider than tall — e.g., at a gauge of 18st × 24rows per 4", each stitch is 1.33× as wide as it is tall). Colors are reduced via k-means++ clustering. An optional cleanup pass removes isolated single-stitch color islands that would be impractical to knit.

3. **Download**: A multi-page PDF is generated with PDFKit containing a title/info page, paginated chart pages (with overlap rows for continuity), and a color legend page with symbols, hex values, usage percentages, estimated yardage, and yarn brand suggestions.

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/upload` | Upload an image. Returns `{ id }` |
| `POST` | `/api/generate` | Generate pattern. Body: `{ id, widthStitches, numColors, stitchGauge, rowGauge, cleanup }` |
| `GET` | `/api/download/:id` | Download PDF pattern |

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server port |
| `NODE_ENV` | `development` | Environment mode |
| `UPLOAD_DIR` | `./uploads` | Temp directory for uploaded images |
| `TMP_DIR` | `./tmp` | Temp directory for processing |
| `MAX_FILE_SIZE_MB` | `10` | Max upload size in MB |
| `RATE_LIMIT_WINDOW_MS` | `900000` | Rate limit window (15 min) |
| `RATE_LIMIT_MAX_REQUESTS` | `30` | Max requests per window |
| `CSRF_SECRET` | `dev-secret...` | CSRF token secret (change in production) |

## Security

- File type validation by magic bytes, not just Content-Type headers
- All uploads re-encoded through Sharp (strips EXIF, GPS data, embedded payloads)
- UUID filenames — original filenames never used server-side
- Uploads stored outside webroot, deleted after PDF download
- Helmet with strict CSP (no inline scripts)
- Double-submit CSRF protection
- Rate limiting on processing endpoints
- Server-side input validation with bounded ranges
- No stack traces or internal paths exposed to clients
- HSTS headers configured
- No analytics, tracking, or third-party scripts
