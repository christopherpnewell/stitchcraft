/**
 * Background removal service using @imgly/background-removal-node.
 * Removes background from photographs, replacing it with a solid color.
 */
import { removeBackground } from '@imgly/background-removal-node';
import sharp from 'sharp';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

/**
 * Remove the background from an image file.
 * The background is replaced with the most common edge color from the original
 * (approximating the background color) so it becomes a clean solid fill.
 *
 * @param {string} inputPath - Path to the input image (PNG)
 * @param {string} outputDir - Directory for the output file
 * @returns {Promise<string>} Path to the processed image
 */
export async function removeImageBackground(inputPath, outputDir) {
  // Read the original image to sample edge colors for fill
  const originalBuffer = await sharp(inputPath).raw().toBuffer({ resolveWithObject: true });
  const fillColor = sampleEdgeColor(originalBuffer.data, originalBuffer.info);

  // Run background removal — returns a Blob
  const inputBuffer = await sharp(inputPath).png().toBuffer();
  const blob = await removeBackground(inputBuffer, {
    output: { format: 'image/png' },
  });

  // Convert Blob to Buffer
  const arrayBuffer = await blob.arrayBuffer();
  const resultBuffer = Buffer.from(arrayBuffer);

  // Composite: place the foreground (with alpha) over the solid fill color
  const outputId = uuidv4();
  const outputPath = path.join(outputDir, `${outputId}.png`);

  const { width, height } = await sharp(resultBuffer).metadata();

  // Create solid color background
  const background = await sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: fillColor[0], g: fillColor[1], b: fillColor[2] },
    },
  }).png().toBuffer();

  // Composite foreground over background
  await sharp(background)
    .composite([{ input: resultBuffer, blend: 'over' }])
    .png()
    .toFile(outputPath);

  return outputPath;
}

/**
 * Sample the most common color along the image edges (top/bottom/left/right 2px).
 * This approximates the background color for fill replacement.
 */
function sampleEdgeColor(data, info) {
  const { width, height, channels } = info;
  const edgePixels = [];
  const border = 2;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (y < border || y >= height - border || x < border || x >= width - border) {
        const i = (y * width + x) * channels;
        edgePixels.push([data[i], data[i + 1], data[i + 2]]);
      }
    }
  }

  if (edgePixels.length === 0) return [255, 255, 255];

  // Simple average of edge pixels (good enough for background fill)
  const sum = [0, 0, 0];
  for (const p of edgePixels) {
    sum[0] += p[0];
    sum[1] += p[1];
    sum[2] += p[2];
  }

  return [
    Math.round(sum[0] / edgePixels.length),
    Math.round(sum[1] / edgePixels.length),
    Math.round(sum[2] / edgePixels.length),
  ];
}
