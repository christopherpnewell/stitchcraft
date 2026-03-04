/**
 * Image analysis for smart settings suggestions.
 * Analyzes uploaded images to recommend optimal pattern settings.
 */
import sharp from 'sharp';

/**
 * Analyze an image and return recommended pattern settings.
 * @param {string} imagePath - Path to the sanitized image
 * @returns {Promise<Object>} Suggested settings
 */
export async function analyzeImage(imagePath) {
  const image = sharp(imagePath);
  const metadata = await image.metadata();
  const { width, height } = metadata;

  // Downsample to a manageable size for analysis (max 200px wide)
  const analysisWidth = Math.min(width, 200);
  const analysisHeight = Math.round(analysisWidth * (height / width));

  const { data } = await image
    .resize(analysisWidth, analysisHeight, { fit: 'fill' })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  // Extract pixels
  const pixels = [];
  for (let i = 0; i < data.length; i += 3) {
    pixels.push([data[i], data[i + 1], data[i + 2]]);
  }

  const complexity = estimateComplexity(pixels, analysisWidth, analysisHeight);
  const colorCount = estimateColorCount(pixels);
  const hasDistinctBackground = detectDistinctBackground(pixels, analysisWidth, analysisHeight);

  // Suggest stitch width based on complexity
  let suggestedWidth;
  if (complexity < 0.15) {
    suggestedWidth = 40; // Very simple (logos, icons)
  } else if (complexity < 0.3) {
    suggestedWidth = 60;
  } else if (complexity < 0.5) {
    suggestedWidth = 80;
  } else if (complexity < 0.7) {
    suggestedWidth = 100;
  } else {
    suggestedWidth = 120; // Very detailed (photographs)
  }

  // Suggest color count based on actual color variety
  let suggestedColors;
  if (colorCount < 3) {
    suggestedColors = 2;
  } else if (colorCount < 6) {
    suggestedColors = Math.min(colorCount, 4);
  } else if (colorCount < 15) {
    suggestedColors = 6;
  } else if (colorCount < 30) {
    suggestedColors = 8;
  } else {
    suggestedColors = 10;
  }

  return {
    suggestedWidth,
    suggestedColors,
    suggestedBackgroundRemoval: hasDistinctBackground,
    complexity: Math.round(complexity * 100),
    imageType: complexity < 0.2 ? 'graphic' : complexity < 0.5 ? 'illustration' : 'photograph',
  };
}

/**
 * Estimate image complexity using edge density.
 * Returns 0-1 where 0 is simple and 1 is very complex.
 */
function estimateComplexity(pixels, width, height) {
  let edgeCount = 0;
  const threshold = 30; // RGB distance threshold for "edge"

  for (let y = 0; y < height - 1; y++) {
    for (let x = 0; x < width - 1; x++) {
      const i = y * width + x;
      const right = i + 1;
      const below = i + width;

      // Check horizontal edge
      const dh = Math.abs(pixels[i][0] - pixels[right][0]) +
                 Math.abs(pixels[i][1] - pixels[right][1]) +
                 Math.abs(pixels[i][2] - pixels[right][2]);

      // Check vertical edge
      const dv = Math.abs(pixels[i][0] - pixels[below][0]) +
                 Math.abs(pixels[i][1] - pixels[below][1]) +
                 Math.abs(pixels[i][2] - pixels[below][2]);

      if (dh > threshold || dv > threshold) edgeCount++;
    }
  }

  return edgeCount / ((width - 1) * (height - 1));
}

/**
 * Estimate the number of perceptually distinct colors.
 * Groups colors into buckets and counts non-empty ones.
 */
function estimateColorCount(pixels) {
  // Quantize to 4-bit per channel (16 levels) to count distinct color regions
  const buckets = new Set();
  for (const [r, g, b] of pixels) {
    const key = `${r >> 4},${g >> 4},${b >> 4}`;
    buckets.add(key);
  }
  return buckets.size;
}

/**
 * Detect if the image has a distinct, uniform background.
 * Checks if edges (border pixels) have low color variance compared to the center.
 */
function detectDistinctBackground(pixels, width, height) {
  const border = 3;
  const edgeColors = [];
  const centerColors = [];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const px = pixels[y * width + x];
      if (y < border || y >= height - border || x < border || x >= width - border) {
        edgeColors.push(px);
      } else if (
        x > width * 0.25 && x < width * 0.75 &&
        y > height * 0.25 && y < height * 0.75
      ) {
        centerColors.push(px);
      }
    }
  }

  if (edgeColors.length === 0 || centerColors.length === 0) return false;

  // Calculate variance of edge colors
  const edgeVariance = colorVariance(edgeColors);
  const centerVariance = colorVariance(centerColors);

  // Edge colors are uniform (low variance) AND different from center = likely has background
  const edgeMean = colorMean(edgeColors);
  const centerMean = colorMean(centerColors);
  const meanDist = Math.sqrt(
    (edgeMean[0] - centerMean[0]) ** 2 +
    (edgeMean[1] - centerMean[1]) ** 2 +
    (edgeMean[2] - centerMean[2]) ** 2
  );

  return edgeVariance < 2000 && meanDist > 40;
}

function colorMean(pixels) {
  const sum = [0, 0, 0];
  for (const p of pixels) {
    sum[0] += p[0]; sum[1] += p[1]; sum[2] += p[2];
  }
  return [sum[0] / pixels.length, sum[1] / pixels.length, sum[2] / pixels.length];
}

function colorVariance(pixels) {
  const mean = colorMean(pixels);
  let variance = 0;
  for (const p of pixels) {
    variance += (p[0] - mean[0]) ** 2 + (p[1] - mean[1]) ** 2 + (p[2] - mean[2]) ** 2;
  }
  return variance / pixels.length;
}
