/**
 * Server configuration with defaults and validation.
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
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
  rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '30', 10),
  csrfSecret: process.env.CSRF_SECRET || 'dev-secret-change-in-production',
  isDev: (process.env.NODE_ENV || 'development') === 'development',

  // Bounded input constraints
  minGridWidth: 10,
  maxGridWidth: 200,
  minColors: 2,
  maxColors: 12,
  minGauge: 5,
  maxGauge: 60,
};

export function getMaxFileSize() {
  return config.maxFileSizeMB * 1024 * 1024;
}
