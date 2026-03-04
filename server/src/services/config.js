/**
 * Server configuration with defaults and validation.
 * All config comes from environment variables — no hardcoded secrets.
 */
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverRoot = path.resolve(__dirname, '..', '..');

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  uploadDir: path.resolve(serverRoot, process.env.UPLOAD_DIR || './uploads'),
  tmpDir: path.resolve(serverRoot, process.env.TMP_DIR || './tmp'),
  maxFileSizeMB: parseInt(process.env.MAX_FILE_SIZE_MB || '10', 10),
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10), // 1 minute
  rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '10', 10), // 10/min
  csrfSecret: process.env.CSRF_SECRET || 'dev-secret-change-in-production',
  isDev: (process.env.NODE_ENV || 'development') === 'development',
  processingTimeoutMs: parseInt(process.env.PROCESSING_TIMEOUT_MS || '30000', 10),
  maxConcurrentJobs: parseInt(process.env.MAX_CONCURRENT_JOBS || '3', 10),

  // Bounded input constraints
  minGridWidth: 20,
  maxGridWidth: 300,
  minColors: 2,
  maxColors: 16,
  minGauge: 5,
  maxGauge: 60,

  // AdSense (optional)
  adsensePublisherId: process.env.ADSENSE_PUBLISHER_ID || '',
  enableAds: process.env.ENABLE_ADS === 'true',
  adSlotTop: process.env.AD_SLOT_TOP || '',
  adSlotSidebar: process.env.AD_SLOT_SIDEBAR || '',

  // Affiliate links (optional)
  enableAffiliates: process.env.ENABLE_AFFILIATES === 'true',
  affiliateTag: process.env.AFFILIATE_TAG || '',

  // Site URL for sitemap / canonical (no trailing slash)
  siteUrl: (process.env.SITE_URL || 'https://knitit.app').replace(/\/+$/, ''),
};

// Fail startup in production if CSRF secret is the insecure default
if (!config.isDev && config.csrfSecret === 'dev-secret-change-in-production') {
  throw new Error('CSRF_SECRET must be set to a unique random value in production. Aborting.');
}

export function getMaxFileSize() {
  return config.maxFileSizeMB * 1024 * 1024;
}

/**
 * Build an Amazon affiliate search URL for a yarn name.
 * Returns null if affiliates are disabled.
 */
export function buildAffiliateUrl(yarnName) {
  if (!config.enableAffiliates || !config.affiliateTag) return null;
  const query = encodeURIComponent(yarnName);
  return `https://www.amazon.com/s?k=${query}&tag=${encodeURIComponent(config.affiliateTag)}`;
}
