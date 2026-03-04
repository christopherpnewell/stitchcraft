/**
 * Pattern generator: takes a sanitized image and produces a knitting pattern grid.
 * Handles stitch aspect ratio correction, quantization, and optional cleanup.
 */
import sharp from 'sharp';
import { kMeansQuantize, rgbToHex, suggestYarnColor } from './colorQuantizer.js';

/**
 * @typedef {Object} PatternConfig
 * @property {number} widthStitches - Number of stitches wide (columns)
 * @property {number} numColors - Number of colors (2-12)
 * @property {number} stitchGauge - Stitches per 4 inches (e.g., 20)
 * @property {number} rowGauge - Rows per 4 inches (e.g., 28)
 * @property {boolean} [cleanup] - Remove isolated single-stitch color islands
 */

/**
 * @typedef {Object} KnittingPattern
 * @property {number[][]} grid - 2D array [row][col] of color indices
 * @property {Object[]} palette - Array of { rgb, hex, label, yarnSuggestion }
 * @property {number} widthStitches
 * @property {number} heightRows
 * @property {number} stitchGauge
 * @property {number} rowGauge
 * @property {number} finishedWidthInches
 * @property {number} finishedHeightInches
 * @property {number[]} colorPercentages - Percentage of total stitches per color
 */

/**
 * Generate a knitting pattern from an image file.
 * @param {string} imagePath - Path to the sanitized image
 * @param {PatternConfig} config
 * @returns {Promise<KnittingPattern>}
 */
export async function generatePattern(imagePath, config) {
  const {
    widthStitches,
    numColors,
    stitchGauge = 20,
    rowGauge = 28,
    cleanup = true,
  } = config;

  // Calculate stitch aspect ratio: width:height of one stitch
  // If gauge is 20st x 28rows per 4in, one stitch = 4/20 = 0.2in wide, 4/28 = 0.143in tall
  // Aspect ratio (w/h) = (4/stitchGauge) / (4/rowGauge) = rowGauge / stitchGauge
  const stitchAspectRatio = rowGauge / stitchGauge; // > 1 means wider than tall

  // Get original image dimensions
  const metadata = await sharp(imagePath).metadata();
  const imgAspect = metadata.width / metadata.height;

  // Calculate grid height accounting for stitch aspect ratio
  // Each stitch cell is stitchAspectRatio times as wide as it is tall
  // So for the image to look correct, we need:
  // heightRows = widthStitches / (imgAspect * stitchAspectRatio)
  const heightRows = Math.round(widthStitches / (imgAspect * stitchAspectRatio));

  // Resize image to grid dimensions
  // We resize to widthStitches x heightRows — each pixel becomes one stitch
  const { data, info } = await sharp(imagePath)
    .resize(widthStitches, heightRows, {
      fit: 'fill',
      kernel: sharp.kernel.lanczos3,
    })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  // Extract pixel data as array of [r, g, b]
  const pixels = [];
  for (let i = 0; i < data.length; i += 3) {
    pixels.push([data[i], data[i + 1], data[i + 2]]);
  }

  // Color quantize
  const { palette, assignments, counts } = kMeansQuantize(pixels, numColors);

  // Build the grid (2D array, row 0 = bottom of chart = first row knitted)
  // We store top-to-bottom in the array, but the PDF will render bottom-to-top
  const grid = [];
  for (let row = 0; row < heightRows; row++) {
    const gridRow = [];
    for (let col = 0; col < widthStitches; col++) {
      gridRow.push(assignments[row * widthStitches + col]);
    }
    grid.push(gridRow);
  }

  // Optional cleanup: remove isolated single-stitch color islands
  if (cleanup) {
    cleanupIsolatedStitches(grid, heightRows, widthStitches);
  }

  // Recalculate color counts after cleanup
  const finalCounts = new Array(palette.length).fill(0);
  for (const row of grid) {
    for (const colorIdx of row) {
      finalCounts[colorIdx]++;
    }
  }
  const totalStitches = widthStitches * heightRows;

  // Build palette info
  const paletteInfo = palette.map((rgb, i) => {
    const yarn = suggestYarnColor(rgb);
    return {
      rgb,
      hex: rgbToHex(rgb[0], rgb[1], rgb[2]),
      label: i === 0 ? 'MC' : `CC${i}`,
      colorName: yarn.name,
      yarnSuggestion: yarn.suggestion,
    };
  });

  // Calculate finished dimensions
  const finishedWidthInches = (widthStitches / stitchGauge) * 4;
  const finishedHeightInches = (heightRows / rowGauge) * 4;

  // Color percentages and estimated yardage
  const colorPercentages = finalCounts.map(c => Math.round((c / totalStitches) * 1000) / 10);

  // Rough yardage estimate: ~1.5 yards per stitch for worsted weight
  // This is very approximate — varies by yarn weight and stitch type
  const yardsPerStitch = 0.015; // ~1.5 yards per 100 stitches
  const colorYardages = finalCounts.map(c => Math.ceil(c * yardsPerStitch));

  return {
    grid,
    palette: paletteInfo,
    widthStitches,
    heightRows,
    stitchGauge,
    rowGauge,
    finishedWidthInches: Math.round(finishedWidthInches * 10) / 10,
    finishedHeightInches: Math.round(finishedHeightInches * 10) / 10,
    colorPercentages,
    colorYardages,
    totalStitches,
  };
}

/**
 * Replace isolated single-stitch color islands with the most common neighbor color.
 * A stitch is "isolated" if none of its 4 cardinal neighbors share its color.
 */
function cleanupIsolatedStitches(grid, rows, cols) {
  let changed = true;
  let passes = 0;
  const maxPasses = 3;

  while (changed && passes < maxPasses) {
    changed = false;
    passes++;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const currentColor = grid[r][c];
        const neighbors = [];

        if (r > 0) neighbors.push(grid[r - 1][c]);
        if (r < rows - 1) neighbors.push(grid[r + 1][c]);
        if (c > 0) neighbors.push(grid[r][c - 1]);
        if (c < cols - 1) neighbors.push(grid[r][c + 1]);

        // Check if isolated (no cardinal neighbor has same color)
        const hasMatch = neighbors.some(n => n === currentColor);
        if (!hasMatch && neighbors.length > 0) {
          // Replace with most common neighbor color
          const freq = {};
          for (const n of neighbors) {
            freq[n] = (freq[n] || 0) + 1;
          }
          let bestColor = neighbors[0];
          let bestCount = 0;
          for (const [color, count] of Object.entries(freq)) {
            if (count > bestCount) {
              bestCount = count;
              bestColor = parseInt(color);
            }
          }
          grid[r][c] = bestColor;
          changed = true;
        }
      }
    }
  }
}
