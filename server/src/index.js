/**
 * Loominade server — Express application entry point.
 */
import express from 'express';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';

import { config } from './services/config.js';
import { helmetMiddleware, csrfProtection, permissionsPolicy, globalRateLimiter } from './middleware/security.js';
import { errorHandler } from './middleware/errorHandler.js';
import patternRoutes, { stopCleanup } from './routes/pattern.js';
import adminRoutes from './routes/admin.js';
import { closeDb, trackPageview, getCountryFromRequest } from './services/analytics.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

// Trust first proxy (e.g., nginx, Cloudflare) for correct req.ip and rate limiting
app.set('trust proxy', 1);

// Ensure upload and tmp directories exist
await fs.mkdir(config.uploadDir, { recursive: true });
await fs.mkdir(config.tmpDir, { recursive: true });

// HTTP → HTTPS redirect in production (behind a proxy that sets X-Forwarded-Proto)
if (!config.isDev) {
  app.use((req, res, next) => {
    if (req.get('x-forwarded-proto') && req.get('x-forwarded-proto') !== 'https') {
      return res.redirect(301, `https://${req.get('host')}${req.originalUrl}`);
    }
    next();
  });
}

// Global rate limiter — generous cap covering all routes including static files
app.use(globalRateLimiter());

// Security middleware
app.use(helmetMiddleware());
app.use(permissionsPolicy());
app.use(cookieParser());

// Body parsing with strict size limit
app.use(express.json({ limit: '1mb' }));

// CSRF protection
app.use(csrfProtection());

// Health check — used by Docker/orchestration and uptime monitoring
app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

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

// sitemap.xml — with static lastmod (changes only on deploy)
const SITEMAP_LASTMOD = new Date().toISOString().split('T')[0];
app.get('/sitemap.xml', (req, res) => {
  const lastmod = SITEMAP_LASTMOD;
  const urls = ['/', '/how-it-works', '/faq', '/about', '/privacy', '/terms'];
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
  app.use(express.static(clientDist, { maxAge: '7d', immutable: true }));

  // Cache index.html at startup — avoid re-reading from disk on every request
  const indexHtmlTemplate = await fs.readFile(path.join(clientDist, 'index.html'), 'utf8');

  // Route-specific meta for SEO
  const routeMeta = {
    '/': {
      title: 'Loominade — Image to Knitting Pattern Generator',
      description: 'Turn any image into a professional colorwork knitting pattern. Upload a photo, drawing, or logo and get a print-ready PDF chart with yarn suggestions, gauge notes, and construction instructions.',
    },
    '/how-it-works': {
      title: 'How It Works — Loominade',
      description: 'Learn how Loominade converts any image into a colorwork knitting pattern in three simple steps: upload, customize, and download a print-ready PDF.',
    },
    '/faq': {
      title: 'Knitting Pattern Generator FAQ | Loominade',
      description: 'Frequently asked questions about Loominade: file types, pattern width, gauge, colors, background removal, project types, privacy, and more.',
    },
    '/about': {
      title: 'About — Loominade',
      description: 'About Loominade: a free web tool that converts any image into a colorwork knitting pattern with aspect ratio correction, smart color quantization, and professional PDF output.',
    },
    '/privacy': {
      title: 'Privacy Policy — Loominade',
      description: 'Privacy policy for Loominade: what data we collect, how we use it, and information about Google AdSense cookies, Amazon affiliate links, and image handling.',
    },
    '/terms': {
      title: 'Terms of Service — Loominade',
      description: 'Terms of service for Loominade: acceptable use, intellectual property, disclaimer of warranties, and limitation of liability.',
    },
  };

  // Known SPA routes — anything else gets 404 status
  const knownRoutes = new Set(Object.keys(routeMeta));

  // SPA fallback — inject route-specific meta and ad config
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/admin')) return next();

    // Normalize path: strip trailing slashes
    const cleanPath = req.path.replace(/\/+$/, '') || '/';
    // Sanitize path for HTML injection — only allow known routes
    const safePath = knownRoutes.has(cleanPath) ? cleanPath : '/';

    // Send 404 status for unknown routes (still render the SPA for client-side handling)
    const isKnown = knownRoutes.has(cleanPath);

    let html = indexHtmlTemplate;

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

    // Inject publisher meta and ad slot config
    if (config.enableAds && config.adsensePublisherId) {
      const adConfig = `
    <meta name="adsense-publisher" content="${config.adsensePublisherId}">
    <script>window.__AD_SLOT_TOP__="${config.adSlotTop}";window.__AD_SLOT_SIDEBAR__="${config.adSlotSidebar}";</script>`;
      html = html.replace('</head>', `${adConfig}\n  </head>`);
    }

    // Track pageview
    trackPageview(cleanPath, req.headers['user-agent'] || '', getCountryFromRequest(req));

    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Cache-Control', 'no-cache');
    res.status(isKnown ? 200 : 404).send(html);
  });
} catch {
  if (config.isDev) {
    app.get('/', (req, res) => {
      res.json({ message: 'Loominade API running. Build the client with: cd client && npm run build' });
    });
  }
}

// Error handler (must be last)
app.use(errorHandler);

const server = app.listen(config.port, () => {
  console.log(`Loominade server running on port ${config.port} [${config.nodeEnv}]`);
});

// Graceful shutdown
function shutdown(signal) {
  console.log(`\n${signal} received. Shutting down gracefully...`);
  stopCleanup();
  closeDb();
  server.close(() => {
    console.log('HTTP server closed.');
    process.exit(0);
  });
  // Force exit after 5s if connections hang
  setTimeout(() => process.exit(1), 5000);
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
