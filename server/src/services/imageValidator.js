/**
 * Image validation: checks file type by magic bytes, enforces size limits,
 * sanitizes filenames, and re-encodes images to strip payloads/EXIF.
 */
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs/promises';
import { config } from './config.js';

// Magic byte signatures for allowed image types
const SIGNATURES = {
  jpeg: [
    { bytes: [0xff, 0xd8, 0xff], offset: 0 },
  ],
  png: [
    { bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], offset: 0 },
  ],
  webp: [
    // RIFF....WEBP
    { bytes: [0x52, 0x49, 0x46, 0x46], offset: 0, also: { bytes: [0x57, 0x45, 0x42, 0x50], offset: 8 } },
  ],
  gif: [
    { bytes: [0x47, 0x49, 0x46, 0x38], offset: 0 }, // GIF87a or GIF89a
  ],
};

const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * Check if buffer matches a magic byte signature
 */
function matchesSignature(buffer, sig) {
  for (let i = 0; i < sig.bytes.length; i++) {
    if (buffer[sig.offset + i] !== sig.bytes[i]) return false;
  }
  if (sig.also) {
    for (let i = 0; i < sig.also.bytes.length; i++) {
      if (buffer[sig.also.offset + i] !== sig.also.bytes[i]) return false;
    }
  }
  return true;
}

/**
 * Detect image type from buffer using magic bytes
 */
function detectImageType(buffer) {
  for (const [type, sigs] of Object.entries(SIGNATURES)) {
    for (const sig of sigs) {
      if (matchesSignature(buffer, sig)) return type;
    }
  }
  return null;
}

/**
 * Validate an uploaded file:
 * - Check extension
 * - Check file size
 * - Check magic bytes
 * Returns { valid: true, detectedType } or { valid: false, error }
 */
export function validateUpload(file) {
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: 'File exceeds 10MB size limit' };
  }

  // Check extension
  const ext = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return { valid: false, error: 'File type not allowed. Use JPEG, PNG, WebP, or GIF.' };
  }

  // Check magic bytes
  const detectedType = detectImageType(file.buffer);
  if (!detectedType) {
    return { valid: false, error: 'File content does not match a valid image format' };
  }

  return { valid: true, detectedType };
}

/**
 * Re-encode an image through Sharp to:
 * - Strip all EXIF/metadata
 * - Neutralize any embedded payloads
 * - Normalize to PNG for processing
 * Returns path to the clean re-encoded file
 */
export async function sanitizeAndSave(buffer, uploadDir) {
  const id = uuidv4();
  const outputPath = path.join(uploadDir, `${id}.png`);

  await sharp(buffer)
    .rotate() // auto-rotate based on EXIF before stripping
    .png()
    .toFile(outputPath);

  return { id, path: outputPath };
}

/**
 * Delete a processed image file. Validates the path is within the upload directory
 * to prevent path traversal attacks.
 */
export async function deleteImage(filePath) {
  try {
    const resolved = path.resolve(filePath);
    const uploadResolved = path.resolve(config.uploadDir);
    if (!resolved.startsWith(uploadResolved + path.sep)) {
      console.error('Attempted to delete file outside upload directory:', resolved);
      return;
    }
    await fs.unlink(resolved);
  } catch {
    // File may already be deleted, ignore
  }
}
