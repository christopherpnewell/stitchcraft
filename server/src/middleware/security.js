/**
 * Security middleware: helmet, rate limiting, CSRF, CSP, permissions policy
 */
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import crypto from 'crypto';
import { config } from '../services/config.js';

/**
 * Configure helmet with strict CSP.
 * When ads are enabled, specific Google domains are allowlisted.
 */
export function helmetMiddleware() {
  // Base CSP directives (strict)
  const scriptSrc = ["'self'"];
  const frameSrc = ["'none'"];
  const imgSrc = ["'self'", "blob:", "data:"];
  const connectSrc = ["'self'"];
  const styleSrc = ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"];

  // Relax CSP for Google AdSense when ads are enabled
  if (config.enableAds) {
    scriptSrc.push(
      "https://pagead2.googlesyndication.com",
      "https://adservice.google.com",
      "https://www.googletagservices.com",
      "https://tpc.googlesyndication.com",
      "'unsafe-inline'", // Required by AdSense inline scripts
    );
    frameSrc.length = 0; // Remove 'none'
    frameSrc.push(
      "'self'",
      "https://googleads.g.doubleclick.net",
      "https://tpc.googlesyndication.com",
      "https://www.google.com",
    );
    imgSrc.push(
      "https://pagead2.googlesyndication.com",
      "https://www.google.com",
      "https://googleads.g.doubleclick.net",
    );
    connectSrc.push(
      "https://pagead2.googlesyndication.com",
      "https://adservice.google.com",
    );
  }

  return helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc,
        styleSrc,
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc,
        connectSrc,
        frameSrc,
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        upgradeInsecureRequests: config.isDev ? null : [],
      },
    },
    strictTransportSecurity: {
      maxAge: 31536000,
      includeSubDomains: true,
    },
    xContentTypeOptions: true, // X-Content-Type-Options: nosniff
    xFrameOptions: config.enableAds ? { action: 'sameorigin' } : { action: 'deny' },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    crossOriginEmbedderPolicy: false, // Allow font/ad loading
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  });
}

/**
 * Permissions-Policy header — disable unused browser features
 */
export function permissionsPolicy() {
  return (req, res, next) => {
    res.setHeader('Permissions-Policy',
      'camera=(), microphone=(), geolocation=(), interest-cohort=(), ' +
      'accelerometer=(), gyroscope=(), magnetometer=(), usb=()'
    );
    next();
  };
}

/**
 * Global rate limiter — covers all routes including static files.
 * Generous limit to block only abusive clients.
 */
export function globalRateLimiter() {
  return rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 200,
    message: { error: 'Too many requests. Please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => req.ip || 'unknown',
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
    keyGenerator: (req) => {
      // trust proxy is set, so req.ip already resolves X-Forwarded-For correctly
      return req.ip || 'unknown';
    },
  });
}

/**
 * HMAC-sign a CSRF token with the server-side secret.
 */
function signCsrfToken(token) {
  return crypto.createHmac('sha256', config.csrfSecret).update(token).digest('hex');
}

/**
 * Double-submit CSRF protection via HMAC-signed cookie + header matching.
 */
export function csrfProtection() {
  return (req, res, next) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      // Issue a fresh CSRF token on every GET (rotation)
      const token = crypto.randomBytes(32).toString('hex');
      const signed = token + '.' + signCsrfToken(token);
      res.cookie('csrfToken', signed, {
        httpOnly: false,
        sameSite: 'strict',
        secure: !config.isDev,
        maxAge: 3600000,
      });
      return next();
    }

    const cookieToken = req.cookies?.csrfToken;
    const headerToken = req.headers['x-csrf-token'];

    if (!cookieToken || !headerToken) {
      return res.status(403).json({ error: 'Invalid CSRF token' });
    }

    // Verify HMAC signature on cookie token
    const [cookieValue, cookieSig] = cookieToken.split('.');
    if (!cookieValue || !cookieSig) {
      return res.status(403).json({ error: 'Invalid CSRF token' });
    }
    const expectedSig = signCsrfToken(cookieValue);
    const sigBuffer = Buffer.from(cookieSig, 'hex');
    const expectedBuffer = Buffer.from(expectedSig, 'hex');
    if (sigBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
      return res.status(403).json({ error: 'Invalid CSRF token' });
    }

    // Timing-safe comparison of cookie and header tokens
    const cookieBuf = Buffer.from(cookieToken);
    const headerBuf = Buffer.from(headerToken);
    if (cookieBuf.length !== headerBuf.length || !crypto.timingSafeEqual(cookieBuf, headerBuf)) {
      return res.status(403).json({ error: 'Invalid CSRF token' });
    }

    next();
  };
}
