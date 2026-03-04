/**
 * Anonymized usage analytics.
 * Append-only SQLite log — no PII, no images, no IP tracking.
 * Fire-and-forget: never blocks user requests.
 */
import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.ANALYTICS_DB_PATH
  ? path.resolve(process.env.ANALYTICS_DB_PATH)
  : path.resolve(__dirname, '..', '..', 'analytics.db');

/** Maximum age for analytics events (90 days). */
const RETENTION_DAYS = 90;

let db;

function getDb() {
  if (!db) {
    db = new DatabaseSync(DB_PATH);
    db.exec(`
      CREATE TABLE IF NOT EXISTS events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_type TEXT NOT NULL,
        data TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_events_type ON events(event_type);
      CREATE INDEX IF NOT EXISTS idx_events_date ON events(created_at);
    `);
    // Purge old events beyond retention period
    try {
      const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();
      db.prepare('DELETE FROM events WHERE created_at < ?').run(cutoff);
    } catch { /* best-effort */ }
  }
  return db;
}

/**
 * Log an analytics event. Fire-and-forget.
 */
export function trackEvent(eventType, data = {}) {
  try {
    const d = getDb();
    const stmt = d.prepare('INSERT INTO events (event_type, data) VALUES (?, ?)');
    stmt.run(eventType, JSON.stringify(data));
  } catch {
    // Never fail user requests due to analytics
  }
}

/**
 * Close the analytics database for graceful shutdown.
 */
export function closeDb() {
  try {
    if (db) {
      db.close();
      db = null;
    }
  } catch { /* best-effort */ }
}

/**
 * Get analytics summary for admin dashboard.
 */
export function getAnalyticsSummary(days = 30) {
  try {
    const d = getDb();
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    const totalGenerations = d.prepare(
      `SELECT COUNT(*) as count FROM events WHERE event_type = 'generate' AND created_at >= ?`
    ).get(since);

    const totalDownloads = d.prepare(
      `SELECT COUNT(*) as count FROM events WHERE event_type = 'download' AND created_at >= ?`
    ).get(since);

    const totalUploads = d.prepare(
      `SELECT COUNT(*) as count FROM events WHERE event_type = 'upload' AND created_at >= ?`
    ).get(since);

    const affiliateClicks = d.prepare(
      `SELECT COUNT(*) as count FROM events WHERE event_type = 'affiliate_click' AND created_at >= ?`
    ).get(since);

    // Project type distribution
    const projectTypes = d.prepare(`
      SELECT json_extract(data, '$.projectType') as projectType, COUNT(*) as count
      FROM events WHERE event_type = 'generate' AND created_at >= ?
      GROUP BY projectType ORDER BY count DESC
    `).all(since);

    // Width distribution
    const widthDist = d.prepare(`
      SELECT json_extract(data, '$.widthStitches') as width, COUNT(*) as count
      FROM events WHERE event_type = 'generate' AND created_at >= ?
      GROUP BY width ORDER BY count DESC LIMIT 10
    `).all(since);

    // Color count distribution
    const colorDist = d.prepare(`
      SELECT json_extract(data, '$.numColors') as colors, COUNT(*) as count
      FROM events WHERE event_type = 'generate' AND created_at >= ?
      GROUP BY colors ORDER BY count DESC
    `).all(since);

    // Feature toggle usage
    const bgRemovalCount = d.prepare(`
      SELECT COUNT(*) as count FROM events
      WHERE event_type = 'generate' AND json_extract(data, '$.removeBackground') = 1 AND created_at >= ?
    `).get(since);

    const enhanceDetailCount = d.prepare(`
      SELECT COUNT(*) as count FROM events
      WHERE event_type = 'generate' AND json_extract(data, '$.enhanceDetail') = 1 AND created_at >= ?
    `).get(since);

    const cleanupCount = d.prepare(`
      SELECT COUNT(*) as count FROM events
      WHERE event_type = 'generate' AND json_extract(data, '$.cleanup') = 1 AND created_at >= ?
    `).get(since);

    // Daily generation counts (last 30 days)
    const dailyGenerations = d.prepare(`
      SELECT date(created_at) as day, COUNT(*) as count
      FROM events WHERE event_type = 'generate' AND created_at >= ?
      GROUP BY day ORDER BY day DESC LIMIT 30
    `).all(since);

    return {
      period: `Last ${days} days`,
      totals: {
        uploads: totalUploads?.count || 0,
        generations: totalGenerations?.count || 0,
        downloads: totalDownloads?.count || 0,
        affiliateClicks: affiliateClicks?.count || 0,
        downloadRate: totalGenerations?.count
          ? Math.round((totalDownloads?.count / totalGenerations?.count) * 1000) / 10
          : 0,
      },
      projectTypes,
      widthDistribution: widthDist,
      colorDistribution: colorDist,
      featureUsage: {
        backgroundRemoval: bgRemovalCount?.count || 0,
        enhanceDetail: enhanceDetailCount?.count || 0,
        smoothStitches: cleanupCount?.count || 0,
      },
      dailyGenerations,
    };
  } catch (err) {
    console.error('Analytics query error:', err);
    return {
      error: 'Analytics query failed',
      period: `Last ${days} days`,
      totals: { uploads: 0, generations: 0, downloads: 0, affiliateClicks: 0, downloadRate: 0 },
      projectTypes: [],
      widthDistribution: [],
      colorDistribution: [],
      featureUsage: { backgroundRemoval: 0, enhanceDetail: 0, smoothStitches: 0 },
      dailyGenerations: [],
    };
  }
}
