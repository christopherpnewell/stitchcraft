/**
 * Background removal service using sharp.
 * Detects the dominant background color from image edges and replaces
 * similar-colored regions with a solid fill, preserving the foreground subject.
 *
 * This approach works well for images with relatively uniform backgrounds
 * (single color, gradient, or outdoor/indoor scenes with consistent tone).
 */
import sharp from 'sharp';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

/**
 * Remove the background from an image file.
 * Detects background color from edge pixels, creates an alpha mask
 * by color distance, then composites the foreground over a solid fill.
 *
 * @param {string} inputPath - Path to the input image (PNG)
 * @param {string} outputDir - Directory for the output file
 * @returns {Promise<string>} Path to the processed image
 */
export async function removeImageBackground(inputPath, outputDir) {
  // Read image as raw pixel data
  const { data, info } = await sharp(inputPath)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;

  // Sample edge pixels to determine background color
  const bgColor = sampleEdgeColor(data, width, height, channels);

  // Create alpha mask: pixels similar to background get transparent
  const threshold = 55; // Color distance threshold
  const alphaData = Buffer.alloc(width * height * 4);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const srcIdx = (y * width + x) * channels;
      const dstIdx = (y * width + x) * 4;

      const r = data[srcIdx];
      const g = data[srcIdx + 1];
      const b = data[srcIdx + 2];

      // Euclidean distance to background color
      const dist = Math.sqrt(
        (r - bgColor[0]) ** 2 +
        (g - bgColor[1]) ** 2 +
        (b - bgColor[2]) ** 2
      );

      // Soft edge: smooth transition near threshold
      let alpha;
      if (dist < threshold * 0.6) {
        alpha = 0; // Definitely background
      } else if (dist > threshold) {
        alpha = 255; // Definitely foreground
      } else {
        // Smooth transition
        alpha = Math.round(((dist - threshold * 0.6) / (threshold * 0.4)) * 255);
      }

      alphaData[dstIdx] = r;
      alphaData[dstIdx + 1] = g;
      alphaData[dstIdx + 2] = b;
      alphaData[dstIdx + 3] = alpha;
    }
  }

  // Morphological cleanup: erode then dilate to remove noise at edges
  const cleanedAlpha = cleanupMask(alphaData, width, height);

  // Fill color: use white for clean knitting pattern background
  const fillColor = { r: 255, g: 255, b: 255 };

  // Create solid background
  const background = await sharp({
    create: {
      width,
      height,
      channels: 3,
      background: fillColor,
    },
  }).png().toBuffer();

  // Create foreground with alpha
  const foreground = await sharp(cleanedAlpha, {
    raw: { width, height, channels: 4 },
  }).png().toBuffer();

  // Composite foreground over background
  const outputId = uuidv4();
  const outputPath = path.join(outputDir, `${outputId}.png`);

  await sharp(background)
    .composite([{ input: foreground, blend: 'over' }])
    .png()
    .toFile(outputPath);

  return outputPath;
}

/**
 * Sample the dominant color along the image edges.
 * Uses median of edge pixels (more robust than mean against outliers).
 */
function sampleEdgeColor(data, width, height, channels) {
  const border = Math.max(2, Math.min(5, Math.floor(Math.min(width, height) * 0.02)));
  const rs = [], gs = [], bs = [];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (y < border || y >= height - border || x < border || x >= width - border) {
        const i = (y * width + x) * channels;
        rs.push(data[i]);
        gs.push(data[i + 1]);
        bs.push(data[i + 2]);
      }
    }
  }

  if (rs.length === 0) return [255, 255, 255];

  // Use median for robustness
  rs.sort((a, b) => a - b);
  gs.sort((a, b) => a - b);
  bs.sort((a, b) => a - b);
  const mid = Math.floor(rs.length / 2);

  return [rs[mid], gs[mid], bs[mid]];
}

/**
 * Simple morphological cleanup on the alpha channel.
 * Erode then dilate to remove small noise regions.
 */
function cleanupMask(rgba, width, height) {
  const result = Buffer.from(rgba);
  const kernel = 2; // Pixel radius for erosion/dilation

  // Extract alpha values
  const alpha = new Uint8Array(width * height);
  for (let i = 0; i < width * height; i++) {
    alpha[i] = rgba[i * 4 + 3];
  }

  // Erode: shrink foreground (remove noise at edges)
  const eroded = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let minAlpha = 255;
      for (let ky = -kernel; ky <= kernel; ky++) {
        for (let kx = -kernel; kx <= kernel; kx++) {
          const ny = y + ky, nx = x + kx;
          if (ny >= 0 && ny < height && nx >= 0 && nx < width) {
            minAlpha = Math.min(minAlpha, alpha[ny * width + nx]);
          }
        }
      }
      eroded[y * width + x] = minAlpha;
    }
  }

  // Dilate: grow foreground back (restore edges)
  const dilated = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let maxAlpha = 0;
      for (let ky = -kernel; ky <= kernel; ky++) {
        for (let kx = -kernel; kx <= kernel; kx++) {
          const ny = y + ky, nx = x + kx;
          if (ny >= 0 && ny < height && nx >= 0 && nx < width) {
            maxAlpha = Math.max(maxAlpha, eroded[ny * width + nx]);
          }
        }
      }
      dilated[y * width + x] = maxAlpha;
    }
  }

  // Write cleaned alpha back to RGBA buffer
  for (let i = 0; i < width * height; i++) {
    result[i * 4 + 3] = dilated[i];
  }

  return result;
}
