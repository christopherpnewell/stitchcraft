/**
 * Pattern API routes: upload, generate preview, download PDF
 */
import { Router } from 'express';
import multer from 'multer';
import { validateUpload, sanitizeAndSave, deleteImage } from '../services/imageValidator.js';
import { generatePattern } from '../services/patternGenerator.js';
import { generatePdf } from '../services/pdfGenerator.js';
import { config, getMaxFileSize } from '../services/config.js';
import { uploadRateLimiter } from '../middleware/security.js';

const router = Router();

// Multer configured for memory storage — we validate before writing to disk
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: getMaxFileSize() },
});

// In-memory session store for patterns (keyed by pattern ID)
// In production, this would use Redis or similar
const patternStore = new Map();

// Clean up old patterns every 5 minutes
setInterval(() => {
  const now = Date.now();
  const TTL = 30 * 60 * 1000; // 30 minutes
  for (const [id, entry] of patternStore) {
    if (now - entry.createdAt > TTL) {
      if (entry.imagePath) deleteImage(entry.imagePath);
      patternStore.delete(id);
    }
  }
}, 5 * 60 * 1000);

/**
 * POST /api/upload
 * Upload an image, validate it, and return a session ID for further operations.
 */
router.post('/upload', uploadRateLimiter(), upload.single('image'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    // Validate by extension + magic bytes
    const validation = validateUpload(req.file);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    // Re-encode through Sharp (strips EXIF, neutralizes payloads)
    const { id, path: imagePath } = await sanitizeAndSave(req.file.buffer, config.uploadDir);

    // Store in session
    patternStore.set(id, {
      imagePath,
      createdAt: Date.now(),
      pattern: null,
    });

    res.json({ id, message: 'Image uploaded successfully' });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/generate
 * Generate a knitting pattern from a previously uploaded image.
 */
router.post('/generate', uploadRateLimiter(), async (req, res, next) => {
  try {
    const { id, widthStitches, numColors, stitchGauge, rowGauge, cleanup } = req.body;

    // Validate session
    if (!id || !patternStore.has(id)) {
      return res.status(404).json({ error: 'Upload session not found. Please upload an image first.' });
    }

    // Validate and bound inputs server-side
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

    const pattern = await generatePattern(session.imagePath, {
      widthStitches: width,
      numColors: colors,
      stitchGauge: sg,
      rowGauge: rg,
      cleanup: cleanup !== false,
    });

    // Store pattern in session
    session.pattern = pattern;

    // Return pattern data (without the full grid for preview — client renders it)
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
      },
    });
  } catch (err) {
    next(err);
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
    res.setHeader('Content-Disposition', `attachment; filename="StitchCraft-Pattern-${id.slice(0, 8)}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.send(pdfBuffer);

    // Clean up: delete image after download
    if (session.imagePath) {
      deleteImage(session.imagePath);
      session.imagePath = null;
    }
  } catch (err) {
    next(err);
  }
});

export default router;
