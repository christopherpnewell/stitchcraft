/**
 * Global error handler — never expose internals to the client.
 */
import { config } from '../services/config.js';

export function errorHandler(err, req, res, _next) {
  // Log the full error server-side
  console.error(`[${new Date().toISOString()}] Error:`, {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
  });

  // Multer-specific errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: `File exceeds the ${config.maxFileSizeMB}MB size limit` });
  }
  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({ error: 'Unexpected file field' });
  }

  // Generic error — never expose details
  const statusCode = err.statusCode || 500;
  const message = statusCode === 500
    ? 'An internal error occurred. Please try again.'
    : err.message;

  res.status(statusCode).json({ error: message });
}
