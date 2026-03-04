/**
 * Knit It server — Express application entry point.
 */
import express from 'express';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';

import { config } from './services/config.js';
import { helmetMiddleware, csrfProtection, permissionsPolicy } from './middleware/security.js';
import { errorHandler } from './middleware/errorHandler.js';
import patternRoutes from './routes/pattern.js';
import adminRoutes from './routes/admin.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

// Ensure upload and tmp directories exist
await fs.mkdir(config.uploadDir, { recursive: true });
await fs.mkdir(config.tmpDir, { recursive: true });

// Security middleware
app.use(helmetMiddleware());
app.use(permissionsPolicy());
app.use(cookieParser());

// Body parsing with strict size limit
app.use(express.json({ limit: '1mb' }));

// CSRF protection
app.use(csrfProtection());

// ads.txt for AdSense verification
if (config.enableAds && config.adsensePublisherId) {
  app.get('/ads.txt', (req, res) => {
    res.type('text/plain').send(`google.com, ${config.adsensePublisherId}, DIRECT, f08c47fec0942fa0\n`);
  });
}

// API routes
app.use('/api', patternRoutes);

// Admin dashboard (Basic Auth protected)
app.use('/admin', adminRoutes);

// Serve static frontend in production
const clientDist = path.resolve(__dirname, '..', '..', 'client', 'dist');
try {
  await fs.access(clientDist);
  app.use(express.static(clientDist));

  // SPA fallback — inject ad config into the HTML
  app.get('*', async (req, res) => {
    if (req.path.startsWith('/api')) return;

    let html = await fs.readFile(path.join(clientDist, 'index.html'), 'utf8');

    // Inject AdSense script and config if ads are enabled
    if (config.enableAds && config.adsensePublisherId) {
      const adScript = `
    <meta name="adsense-publisher" content="${config.adsensePublisherId}">
    <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${config.adsensePublisherId}" crossorigin="anonymous"></script>
    <script>window.__AD_SLOT_TOP__="${config.adSlotTop}";window.__AD_SLOT_SIDEBAR__="${config.adSlotSidebar}";</script>`;
      html = html.replace('</head>', `${adScript}\n  </head>`);
    } else {
      // No ads — define empty slots so the component renders nothing
      const noAdScript = `<script>window.__AD_SLOT_TOP__="";window.__AD_SLOT_SIDEBAR__="";</script>`;
      html = html.replace('</head>', `${noAdScript}\n  </head>`);
    }

    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  });
} catch {
  if (config.isDev) {
    app.get('/', (req, res) => {
      res.json({ message: 'Knit It API running. Build the client with: cd client && npm run build' });
    });
  }
}

// Error handler (must be last)
app.use(errorHandler);

app.listen(config.port, () => {
  console.log(`Knit It server running on port ${config.port} [${config.nodeEnv}]`);
});
