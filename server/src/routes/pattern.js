/**
 * Pattern API routes: upload, analyze, generate preview, download PDF
 */
import { Router } from 'express';
import multer from 'multer';
import { validateUpload, sanitizeAndSave, deleteImage } from '../services/imageValidator.js';
import { generatePattern } from '../services/patternGenerator.js';
import { generatePdf } from '../services/pdfGenerator.js';
import { analyzeImage } from '../services/imageAnalyzer.js';
import { removeImageBackground } from '../services/backgroundRemoval.js';
import { config, getMaxFileSize, buildAffiliateUrl } from '../services/config.js';
import { uploadRateLimiter } from '../middleware/security.js';
import { trackEvent } from '../services/analytics.js';

const router = Router();

// Multer configured for memory storage — we validate before writing to disk
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: getMaxFileSize() },
});

// In-memory session store for patterns (keyed by pattern ID) — bounded to prevent memory exhaustion
const MAX_STORE_SIZE = 1000;
const patternStore = new Map();

function addToStore(id, entry) {
  if (patternStore.size >= MAX_STORE_SIZE) {
    // Evict oldest entry
    const oldest = patternStore.keys().next().value;
    const evicted = patternStore.get(oldest);
    if (evicted?.imagePath) deleteImage(evicted.imagePath);
    if (evicted?.bgRemovedPath) deleteImage(evicted.bgRemovedPath);
    patternStore.delete(oldest);
  }
  patternStore.set(id, entry);
}

// Concurrency semaphore for CPU-intensive processing
let activeJobs = 0;

function acquireSlot() {
  if (activeJobs >= config.maxConcurrentJobs) return false;
  activeJobs++;
  return true;
}
function releaseSlot() {
  activeJobs = Math.max(0, activeJobs - 1);
}

// Clean up old patterns every 5 minutes
const cleanupInterval = setInterval(() => {
  const now = Date.now();
  const TTL = 30 * 60 * 1000;
  for (const [id, entry] of patternStore) {
    if (now - entry.createdAt > TTL && !entry.processing) {
      if (entry.imagePath) deleteImage(entry.imagePath);
      if (entry.bgRemovedPath) deleteImage(entry.bgRemovedPath);
      patternStore.delete(id);
    }
  }
}, 5 * 60 * 1000);

/** Stop the cleanup interval for graceful shutdown. */
export function stopCleanup() {
  clearInterval(cleanupInterval);
}

/**
 * POST /api/upload
 * Upload an image, validate it, return session ID + analysis suggestions.
 */
router.post('/upload', uploadRateLimiter(), upload.single('image'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    const validation = validateUpload(req.file);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    const { id, path: imagePath } = await sanitizeAndSave(req.file.buffer, config.uploadDir);

    try {
      // Analyze image for smart suggestions
      let suggestions = null;
      try {
        suggestions = await analyzeImage(imagePath);
      } catch {
        // Analysis is best-effort — don't fail the upload
      }

      addToStore(id, {
        imagePath,
        bgRemovedPath: null,
        createdAt: Date.now(),
        pattern: null,
        processing: false,
      });

      trackEvent('upload', { imageType: suggestions?.imageType, complexity: suggestions?.complexity });
      res.json({ id, message: 'Image uploaded successfully', suggestions });
    } catch (uploadErr) {
      // Clean up the written file if subsequent steps fail
      deleteImage(imagePath);
      throw uploadErr;
    }
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/generate
 * Generate a knitting pattern from a previously uploaded image.
 */
router.post('/generate', uploadRateLimiter(), async (req, res, next) => {
  if (!acquireSlot()) {
    return res.status(503).json({ error: 'Server is busy processing other patterns. Please try again shortly.' });
  }

  let slotReleased = false;
  function safeRelease() {
    if (!slotReleased) {
      slotReleased = true;
      releaseSlot();
    }
  }

  // Set up a processing timeout
  const timeout = setTimeout(() => {
    safeRelease();
    // Clear processing lock so retries aren't blocked
    const sess = patternStore.get(req.body?.id);
    if (sess) sess.processing = false;
    if (!res.headersSent) {
      res.status(504).json({ error: 'Processing took too long. Try a smaller grid size or fewer colors.' });
    }
  }, config.processingTimeoutMs);

  try {
    // Only allow known fields
    const { id, widthStitches, numColors, stitchGauge, rowGauge, cleanup, removeBackground, enhanceDetail, projectType } = req.body;

    if (res.headersSent) return;
    if (!id || !patternStore.has(id)) {
      return res.status(404).json({ error: 'Upload session not found. Please upload an image first.' });
    }

    // Validate and bound inputs
    const width = parseInt(widthStitches, 10);
    if (isNaN(width) || width < config.minGridWidth || width > config.maxGridWidth) {
      return res.status(400).json({
        error: `Grid width must be between ${config.minGridWidth} and ${config.maxGridWidth} stitches`,
      });
    }

    const colors = parseInt(numColors, 10);
    if (isNaN(colors) || colors < config.minColors || colors > config.maxColors) {
      return res.status(400).json({
        error: `Number of colors must be between ${config.minColors} and ${config.maxColors}`,
      });
    }

    const sg = parseInt(stitchGauge, 10);
    if (isNaN(sg) || sg < config.minGauge || sg > config.maxGauge) {
      return res.status(400).json({
        error: `Stitch gauge must be between ${config.minGauge} and ${config.maxGauge}`,
      });
    }

    const rg = parseInt(rowGauge, 10);
    if (isNaN(rg) || rg < config.minGauge || rg > config.maxGauge) {
      return res.status(400).json({
        error: `Row gauge must be between ${config.minGauge} and ${config.maxGauge}`,
      });
    }

    const session = patternStore.get(id);

    // Reject concurrent generate requests for the same session
    if (session.processing) {
      return res.status(409).json({ error: 'A pattern is already being generated for this session. Please wait.' });
    }

    // Check that image files still exist (they may have been cleaned up)
    if (!session.imagePath) {
      return res.status(400).json({ error: 'Image was cleaned up. Please upload your image again.' });
    }

    session.processing = true;

    // Determine which image to use
    let processingPath = session.imagePath;

    // Background removal if requested
    if (removeBackground) {
      try {
        // Cache the bg-removed version so re-generations don't redo it
        if (!session.bgRemovedPath) {
          session.bgRemovedPath = await removeImageBackground(session.imagePath, config.uploadDir);
        }
        processingPath = session.bgRemovedPath;
      } catch (err) {
        console.error('Background removal failed, using original:', err.message);
        // Fall through to original image
      }
    }

    const pattern = await generatePattern(processingPath, {
      widthStitches: width,
      numColors: colors,
      stitchGauge: sg,
      rowGauge: rg,
      cleanup: cleanup !== false,
      enhanceDetail: enhanceDetail === true,
    });

    // Validate project type
    const validProjectTypes = ['blanket', 'scarf', 'pillow', 'wallHanging', 'sweaterBack', 'sweaterChestLeft', 'sweaterChestRight', 'toteBag'];
    const validatedProjectType = validProjectTypes.includes(projectType) ? projectType : 'blanket';

    pattern.projectType = validatedProjectType;

    // Add affiliate URLs to palette if enabled
    const paletteWithLinks = pattern.palette.map(color => ({
      ...color,
      affiliateUrl: buildAffiliateUrl(color.yarnSuggestion),
    }));

    // Store pattern with affiliate URLs for PDF generation
    pattern.palette = paletteWithLinks;
    session.pattern = pattern;

    if (res.headersSent) return;
    trackEvent('generate', {
      widthStitches: width, numColors: colors, stitchGauge: sg, rowGauge: rg,
      cleanup: cleanup !== false, removeBackground: !!removeBackground,
      enhanceDetail: !!enhanceDetail, projectType: validatedProjectType,
    });

    res.json({
      id,
      pattern: {
        grid: pattern.grid,
        palette: pattern.palette,
        widthStitches: pattern.widthStitches,
        heightRows: pattern.heightRows,
        stitchGauge: pattern.stitchGauge,
        rowGauge: pattern.rowGauge,
        finishedWidthInches: pattern.finishedWidthInches,
        finishedHeightInches: pattern.finishedHeightInches,
        colorPercentages: pattern.colorPercentages,
        colorYardages: pattern.colorYardages,
        totalStitches: pattern.totalStitches,
        projectType: validatedProjectType,
      },
    });
  } catch (err) {
    if (!res.headersSent) next(err);
  } finally {
    clearTimeout(timeout);
    safeRelease();
    // Clear per-session processing lock
    const s = patternStore.get(req.body?.id);
    if (s) s.processing = false;
  }
});

/**
 * GET /api/download/:id
 * Download the knitting pattern as a PDF.
 */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

router.get('/download/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id || !UUID_RE.test(id) || !patternStore.has(id)) {
      return res.status(404).json({ error: 'Pattern not found' });
    }

    const session = patternStore.get(id);
    if (!session.pattern) {
      return res.status(400).json({ error: 'Pattern not yet generated. Generate a preview first.' });
    }

    const pdfBuffer = await generatePdf(session.pattern);

    trackEvent('download', { projectType: session.pattern.projectType });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="KnitIt-Pattern-${id.slice(0, 8)}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.send(pdfBuffer);
  } catch (err) {
    next(err);
  }
});

// Dedicated CSRF token endpoint — safe GET that sets the cookie
router.get('/csrf', (req, res) => {
  res.json({ ok: true });
});

export default router;
