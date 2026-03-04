/**
 * Knit It server — Express application entry point.
 */
import express from 'express';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';

import { config } from './services/config.js';
import { helmetMiddleware, csrfProtection } from './middleware/security.js';
import { errorHandler } from './middleware/errorHandler.js';
import patternRoutes from './routes/pattern.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

// Ensure upload and tmp directories exist
await fs.mkdir(config.uploadDir, { recursive: true });
await fs.mkdir(config.tmpDir, { recursive: true });

// Security middleware
app.use(helmetMiddleware());
app.use(cookieParser());

// Body parsing
app.use(express.json({ limit: '1mb' }));

// CSRF protection
app.use(csrfProtection());

// API routes
app.use('/api', patternRoutes);

// Serve static frontend in production
const clientDist = path.resolve(__dirname, '..', '..', 'client', 'dist');
try {
  await fs.access(clientDist);
  app.use(express.static(clientDist));
  // SPA fallback — serve index.html for all non-API routes
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(clientDist, 'index.html'));
    }
  });
} catch {
  // Client not built yet — development mode
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
