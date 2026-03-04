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

const router = Router();

// Multer configured for memory storage — we validate before writing to disk
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: getMaxFileSize() },
});

// In-memory session store for patterns (keyed by pattern ID)
const patternStore = new Map();

// Concurrency semaphore for CPU-intensive processing
const MAX_CONCURRENT = parseInt(process.env.MAX_CONCURRENT_JOBS || '3', 10);
let activeJobs = 0;
const PROCESSING_TIMEOUT_MS = parseInt(process.env.PROCESSING_TIMEOUT_MS || '30000', 10);

function acquireSlot() {
  if (activeJobs >= MAX_CONCURRENT) return false;
  activeJobs++;
  return true;
}
function releaseSlot() {
  activeJobs = Math.max(0, activeJobs - 1);
}

// Clean up old patterns every 5 minutes
setInterval(() => {
  const now = Date.now();
  const TTL = 30 * 60 * 1000;
  for (const [id, entry] of patternStore) {
    if (now - entry.createdAt > TTL) {
      if (entry.imagePath) deleteImage(entry.imagePath);
      if (entry.bgRemovedPath) deleteImage(entry.bgRemovedPath);
      patternStore.delete(id);
    }
  }
}, 5 * 60 * 1000);

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

    // Analyze image for smart suggestions
    let suggestions = null;
    try {
      suggestions = await analyzeImage(imagePath);
    } catch {
      // Analysis is best-effort — don't fail the upload
    }

    patternStore.set(id, {
      imagePath,
      bgRemovedPath: null,
      createdAt: Date.now(),
      pattern: null,
    });

    res.json({ id, message: 'Image uploaded successfully', suggestions });
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

  // Set up a processing timeout
  const timeout = setTimeout(() => {
    releaseSlot();
    if (!res.headersSent) {
      res.status(504).json({ error: 'Processing took too long. Try a smaller grid size or fewer colors.' });
    }
  }, PROCESSING_TIMEOUT_MS);

  try {
    // Only allow known fields
    const { id, widthStitches, numColors, stitchGauge, rowGauge, cleanup, removeBackground, enhanceDetail, projectType } = req.body;

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

    session.pattern = pattern;

    res.json({
      id,
      pattern: {
        grid: pattern.grid,
        palette: paletteWithLinks,
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
    next(err);
  } finally {
    clearTimeout(timeout);
    releaseSlot();
  }
});

/**
 * GET /api/download/:id
 * Download the knitting pattern as a PDF.
 */
router.get('/download/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id || !patternStore.has(id)) {
      return res.status(404).json({ error: 'Pattern not found' });
    }

    const session = patternStore.get(id);
    if (!session.pattern) {
      return res.status(400).json({ error: 'Pattern not yet generated. Generate a preview first.' });
    }

    const pdfBuffer = await generatePdf(session.pattern);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="KnitIt-Pattern-${id.slice(0, 8)}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.send(pdfBuffer);

    // Clean up images after download
    if (session.imagePath) {
      deleteImage(session.imagePath);
      session.imagePath = null;
    }
    if (session.bgRemovedPath) {
      deleteImage(session.bgRemovedPath);
      session.bgRemovedPath = null;
    }
  } catch (err) {
    next(err);
  }
});

export default router;
