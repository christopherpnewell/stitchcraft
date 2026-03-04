/**
 * Security middleware: helmet, rate limiting, CSRF, CSP
 */
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import crypto from 'crypto';
import { config } from '../services/config.js';

/**
 * Configure helmet with strict CSP
 */
export function helmetMiddleware() {
  return helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "blob:", "data:"],
        connectSrc: ["'self'"],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
      },
    },
    strictTransportSecurity: {
      maxAge: 31536000,
      includeSubDomains: true,
    },
    crossOriginEmbedderPolicy: false, // Allow font loading
  });
}

/**
 * Rate limiter for upload/processing endpoints
 */
export function uploadRateLimiter() {
  return rateLimit({
    windowMs: config.rateLimitWindowMs,
    max: config.rateLimitMaxRequests,
    message: { error: 'Too many requests. Please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
  });
}

/**
 * Simple double-submit CSRF protection using a token cookie.
 * The server sets a random token in a cookie; the client must send it
 * back in the X-CSRF-Token header.
 */
export function csrfProtection() {
  return (req, res, next) => {
    // Skip CSRF for GET/HEAD/OPTIONS
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      // Set CSRF token cookie if not present
      if (!req.cookies?.csrfToken) {
        const token = crypto.randomBytes(32).toString('hex');
        res.cookie('csrfToken', token, {
          httpOnly: false, // Client needs to read this
          sameSite: 'strict',
          secure: !config.isDev,
          maxAge: 3600000, // 1 hour
        });
      }
      return next();
    }

    // For mutating requests, verify the token
    const cookieToken = req.cookies?.csrfToken;
    const headerToken = req.headers['x-csrf-token'];

    if (!cookieToken || !headerToken || cookieToken !== headerToken) {
      return res.status(403).json({ error: 'Invalid CSRF token' });
    }

    next();
  };
}
