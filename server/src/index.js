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

// robots.txt
app.get('/robots.txt', (req, res) => {
  res.type('text/plain').send(`User-agent: *
Allow: /
Disallow: /api/
Disallow: /admin/

Sitemap: ${config.siteUrl}/sitemap.xml
`);
});

// sitemap.xml — with lastmod dates (the only tag Google uses)
app.get('/sitemap.xml', (req, res) => {
  const lastmod = new Date().toISOString().split('T')[0];
  const urls = ['/', '/how-it-works', '/faq', '/about'];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url>
    <loc>${config.siteUrl}${u}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${u === '/' ? 'weekly' : 'monthly'}</changefreq>
    <priority>${u === '/' ? '1.0' : '0.7'}</priority>
  </url>`).join('\n')}
</urlset>`;
  res.type('application/xml').send(xml);
});

// API routes
app.use('/api', patternRoutes);

// Admin dashboard (Basic Auth protected)
app.use('/admin', adminRoutes);

// Serve static frontend in production
const clientDist = path.resolve(__dirname, '..', '..', 'client', 'dist');
try {
  await fs.access(clientDist);
  app.use(express.static(clientDist));

  // Route-specific meta for SEO
  const routeMeta = {
    '/': {
      title: 'Knit It — Image to Knitting Pattern Generator',
      description: 'Turn any image into a professional colorwork knitting pattern. Upload a photo, drawing, or logo and get a print-ready PDF chart with yarn suggestions, gauge notes, and construction instructions.',
    },
    '/how-it-works': {
      title: 'How It Works — Knit It',
      description: 'Learn how Knit It converts any image into a colorwork knitting pattern in three simple steps: upload, customize, and download a print-ready PDF.',
    },
    '/faq': {
      title: 'Knitting Pattern Generator FAQ | Knit It',
      description: 'Frequently asked questions about Knit It: file types, pattern width, gauge, colors, background removal, project types, privacy, and more.',
    },
    '/about': {
      title: 'About — Knit It',
      description: 'About Knit It: a free web tool that converts any image into a colorwork knitting pattern with aspect ratio correction, smart color quantization, and professional PDF output.',
    },
  };

  // Known SPA routes — anything else gets 404 status
  const knownRoutes = new Set(Object.keys(routeMeta));

  // SPA fallback — inject route-specific meta and ad config
  app.get('*', async (req, res) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/admin')) return;

    // Normalize path: strip trailing slashes
    const cleanPath = req.path.replace(/\/+$/, '') || '/';
    // Sanitize path for HTML injection — only allow known routes
    const safePath = knownRoutes.has(cleanPath) ? cleanPath : '/';

    // Send 404 status for unknown routes (still render the SPA for client-side handling)
    const isKnown = knownRoutes.has(cleanPath);

    let html = await fs.readFile(path.join(clientDist, 'index.html'), 'utf8');

    // Inject route-specific meta tags
    const meta = routeMeta[safePath] || routeMeta['/'];
    html = html.replace(/<title>[^<]*<\/title>/, `<title>${meta.title}</title>`);
    html = html.replace(
      /(<meta name="description" content=")[^"]*(")/,
      `$1${meta.description}$2`
    );
    html = html.replace(
      /(<meta property="og:title" content=")[^"]*(")/,
      `$1${meta.title}$2`
    );
    html = html.replace(
      /(<meta property="og:description" content=")[^"]*(")/,
      `$1${meta.description}$2`
    );
    html = html.replace(
      /(<meta property="og:url" content=")[^"]*(")/,
      `$1${config.siteUrl}${safePath}$2`
    );
    html = html.replace(
      /(<link rel="canonical" href=")[^"]*(")/,
      `$1${config.siteUrl}${safePath}$2`
    );
    html = html.replace(
      /(<meta name="twitter:title" content=")[^"]*(")/,
      `$1${meta.title}$2`
    );
    html = html.replace(
      /(<meta name="twitter:description" content=")[^"]*(")/,
      `$1${meta.description}$2`
    );

    // Inject AdSense script and config if ads are enabled
    if (config.enableAds && config.adsensePublisherId) {
      const adScript = `
    <meta name="adsense-publisher" content="${config.adsensePublisherId}">
    <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${config.adsensePublisherId}" crossorigin="anonymous"></script>
    <script>window.__AD_SLOT_TOP__="${config.adSlotTop}";window.__AD_SLOT_SIDEBAR__="${config.adSlotSidebar}";</script>`;
      html = html.replace('</head>', `${adScript}\n  </head>`);
    } else {
      const noAdScript = `<script>window.__AD_SLOT_TOP__="";window.__AD_SLOT_SIDEBAR__="";</script>`;
      html = html.replace('</head>', `${noAdScript}\n  </head>`);
    }

    res.setHeader('Content-Type', 'text/html');
    res.status(isKnown ? 200 : 404).send(html);
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
