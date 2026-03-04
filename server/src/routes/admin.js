/**
 * Admin dashboard route — protected by ADMIN_PASSWORD env var.
 * Serves analytics summary as HTML or JSON.
 */
import { Router } from 'express';
import { getAnalyticsSummary } from '../services/analytics.js';

const router = Router();

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';

function requireAuth(req, res, next) {
  if (!ADMIN_PASSWORD) {
    return res.status(503).json({ error: 'Admin dashboard not configured. Set ADMIN_PASSWORD env var.' });
  }

  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Basic ')) {
    res.setHeader('WWW-Authenticate', 'Basic realm="Admin"');
    return res.status(401).send('Authentication required');
  }

  const decoded = Buffer.from(auth.slice(6), 'base64').toString();
  const [, password] = decoded.split(':');
  if (password !== ADMIN_PASSWORD) {
    res.setHeader('WWW-Authenticate', 'Basic realm="Admin"');
    return res.status(401).send('Invalid credentials');
  }

  next();
}

router.use(requireAuth);

router.get('/', (req, res) => {
  const days = parseInt(req.query.days || '30', 10);
  const summary = getAnalyticsSummary(days);

  if (req.headers.accept?.includes('application/json')) {
    return res.json(summary);
  }

  // Simple HTML dashboard
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Knit It — Admin Dashboard</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 800px; margin: 2rem auto; padding: 0 1rem; color: #333; }
    h1 { color: #d92668; }
    h2 { color: #555; border-bottom: 1px solid #ddd; padding-bottom: 0.5rem; margin-top: 2rem; }
    .stat { display: inline-block; background: #f8f9fa; border-radius: 8px; padding: 1rem 1.5rem; margin: 0.5rem 0.5rem 0.5rem 0; }
    .stat .value { font-size: 2rem; font-weight: 700; color: #d92668; }
    .stat .label { font-size: 0.8rem; color: #888; }
    table { width: 100%; border-collapse: collapse; margin: 1rem 0; }
    th, td { text-align: left; padding: 0.5rem; border-bottom: 1px solid #eee; }
    th { color: #888; font-size: 0.8rem; text-transform: uppercase; }
    .privacy { background: #f0fdf4; border: 1px solid #86efac; border-radius: 8px; padding: 1rem; margin: 2rem 0; font-size: 0.85rem; }
  </style>
</head>
<body>
  <h1>Knit It Dashboard</h1>
  <p>Analytics for the last ${days} days. <a href="?days=7">7d</a> | <a href="?days=30">30d</a> | <a href="?days=90">90d</a></p>

  <div>
    <div class="stat"><div class="value">${summary.totals?.uploads || 0}</div><div class="label">Uploads</div></div>
    <div class="stat"><div class="value">${summary.totals?.generations || 0}</div><div class="label">Generations</div></div>
    <div class="stat"><div class="value">${summary.totals?.downloads || 0}</div><div class="label">Downloads</div></div>
    <div class="stat"><div class="value">${summary.totals?.downloadRate || 0}%</div><div class="label">Download Rate</div></div>
    <div class="stat"><div class="value">${summary.totals?.affiliateClicks || 0}</div><div class="label">Affiliate Clicks</div></div>
  </div>

  <h2>Project Types</h2>
  <table>
    <tr><th>Type</th><th>Count</th></tr>
    ${(summary.projectTypes || []).map(r => `<tr><td>${r.projectType || 'unknown'}</td><td>${r.count}</td></tr>`).join('')}
  </table>

  <h2>Feature Usage</h2>
  <table>
    <tr><th>Feature</th><th>Count</th></tr>
    <tr><td>Background Removal</td><td>${summary.featureUsage?.backgroundRemoval || 0}</td></tr>
    <tr><td>Enhance Detail</td><td>${summary.featureUsage?.enhanceDetail || 0}</td></tr>
    <tr><td>Smooth Stitches</td><td>${summary.featureUsage?.smoothStitches || 0}</td></tr>
  </table>

  <h2>Width Distribution</h2>
  <table>
    <tr><th>Width</th><th>Count</th></tr>
    ${(summary.widthDistribution || []).map(r => `<tr><td>${r.width} stitches</td><td>${r.count}</td></tr>`).join('')}
  </table>

  <h2>Color Distribution</h2>
  <table>
    <tr><th>Colors</th><th>Count</th></tr>
    ${(summary.colorDistribution || []).map(r => `<tr><td>${r.colors} colors</td><td>${r.count}</td></tr>`).join('')}
  </table>

  <h2>Daily Generations</h2>
  <table>
    <tr><th>Date</th><th>Count</th></tr>
    ${(summary.dailyGenerations || []).map(r => `<tr><td>${r.day}</td><td>${r.count}</td></tr>`).join('')}
  </table>

  <div class="privacy">
    <strong>Privacy:</strong> This dashboard shows aggregate, anonymized statistics only.
    No images, IP addresses, or personal information are stored.
  </div>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html');
  res.send(html);
});

export default router;
