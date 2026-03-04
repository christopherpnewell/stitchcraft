/**
 * K-means color quantization optimized for knitting patterns.
 * No dithering — produces clean, solid color regions.
 */

/**
 * Euclidean distance squared between two RGB colors
 */
function colorDistSq(a, b) {
  const dr = a[0] - b[0];
  const dg = a[1] - b[1];
  const db = a[2] - b[2];
  return dr * dr + dg * dg + db * db;
}

/**
 * Initialize centroids using k-means++ for better convergence
 */
function initCentroids(pixels, k) {
  const centroids = [];
  // Pick first centroid randomly
  const first = pixels[Math.floor(Math.random() * pixels.length)];
  centroids.push([...first]);

  for (let c = 1; c < k; c++) {
    // Compute distance from each pixel to nearest existing centroid
    const distances = new Float64Array(pixels.length);
    let totalDist = 0;

    for (let i = 0; i < pixels.length; i++) {
      let minDist = Infinity;
      for (const centroid of centroids) {
        const d = colorDistSq(pixels[i], centroid);
        if (d < minDist) minDist = d;
      }
      distances[i] = minDist;
      totalDist += minDist;
    }

    // Weighted random selection
    let r = Math.random() * totalDist;
    for (let i = 0; i < pixels.length; i++) {
      r -= distances[i];
      if (r <= 0) {
        centroids.push([...pixels[i]]);
        break;
      }
    }

    // Fallback if rounding caused us to miss
    if (centroids.length <= c) {
      centroids.push([...pixels[Math.floor(Math.random() * pixels.length)]]);
    }
  }

  return centroids;
}

/**
 * Run k-means clustering on pixel data
 * @param {number[][]} pixels - Array of [r, g, b] values
 * @param {number} k - Number of clusters
 * @param {number} maxIter - Maximum iterations
 * @returns {{ palette: number[][], assignments: number[] }}
 */
export function kMeansQuantize(pixels, k, maxIter = 30) {
  if (pixels.length === 0) return { palette: [], assignments: [] };
  if (k >= pixels.length) {
    // More colors requested than pixels — each pixel is its own color
    return {
      palette: pixels.map(p => [...p]),
      assignments: pixels.map((_, i) => i),
    };
  }

  let centroids = initCentroids(pixels, k);
  let assignments = new Int32Array(pixels.length);

  for (let iter = 0; iter < maxIter; iter++) {
    let changed = false;

    // Assignment step: assign each pixel to nearest centroid
    for (let i = 0; i < pixels.length; i++) {
      let minDist = Infinity;
      let minIdx = 0;
      for (let c = 0; c < centroids.length; c++) {
        const d = colorDistSq(pixels[i], centroids[c]);
        if (d < minDist) {
          minDist = d;
          minIdx = c;
        }
      }
      if (assignments[i] !== minIdx) {
        assignments[i] = minIdx;
        changed = true;
      }
    }

    if (!changed) break;

    // Update step: recalculate centroids
    const sums = centroids.map(() => [0, 0, 0]);
    const counts = new Int32Array(centroids.length);

    for (let i = 0; i < pixels.length; i++) {
      const c = assignments[i];
      sums[c][0] += pixels[i][0];
      sums[c][1] += pixels[i][1];
      sums[c][2] += pixels[i][2];
      counts[c]++;
    }

    for (let c = 0; c < centroids.length; c++) {
      if (counts[c] > 0) {
        centroids[c] = [
          Math.round(sums[c][0] / counts[c]),
          Math.round(sums[c][1] / counts[c]),
          Math.round(sums[c][2] / counts[c]),
        ];
      }
    }
  }

  // Sort palette by usage (most used first) — MC gets the most-used color
  const counts = new Int32Array(centroids.length);
  for (const a of assignments) counts[a]++;

  const sortedIndices = Array.from({ length: centroids.length }, (_, i) => i)
    .sort((a, b) => counts[b] - counts[a]);

  const indexMap = new Int32Array(centroids.length);
  for (let i = 0; i < sortedIndices.length; i++) {
    indexMap[sortedIndices[i]] = i;
  }

  return {
    palette: sortedIndices.map(i => centroids[i]),
    assignments: Array.from(assignments).map(a => indexMap[a]),
    counts: sortedIndices.map(i => counts[i]),
  };
}

/**
 * Convert an RGB color to a hex string
 */
export function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
}

/**
 * Suggest yarn color names based on RGB values.
 * Maps to common yarn brand colors.
 */
export function suggestYarnColor(rgb) {
  const [r, g, b] = rgb;
  const hue = rgbToHsl(r, g, b)[0];
  const sat = rgbToHsl(r, g, b)[1];
  const light = rgbToHsl(r, g, b)[2];

  // Very dark
  if (light < 15) return { name: 'Black', suggestion: 'Red Heart Super Saver — Black' };
  // Very light
  if (light > 90) return { name: 'White', suggestion: 'Red Heart Super Saver — White' };
  // Very low saturation = gray
  if (sat < 10) {
    if (light < 40) return { name: 'Charcoal', suggestion: 'Caron Simply Soft — Charcoal Heather' };
    if (light < 60) return { name: 'Gray', suggestion: 'Red Heart Super Saver — Gray Heather' };
    return { name: 'Light Gray', suggestion: 'Knit Picks Palette — Mist' };
  }

  // Color families based on hue
  if (hue < 15 || hue >= 345) return { name: 'Red', suggestion: 'Red Heart Super Saver — Cherry Red' };
  if (hue < 35) return { name: 'Orange', suggestion: 'Red Heart Super Saver — Pumpkin' };
  if (hue < 55) return { name: 'Gold', suggestion: 'Caron Simply Soft — Autumn Maize' };
  if (hue < 75) return { name: 'Yellow', suggestion: 'Red Heart Super Saver — Bright Yellow' };
  if (hue < 150) return { name: 'Green', suggestion: 'Red Heart Super Saver — Spring Green' };
  if (hue < 195) return { name: 'Teal', suggestion: 'Knit Picks Palette — Tranquil' };
  if (hue < 250) return { name: 'Blue', suggestion: 'Red Heart Super Saver — Royal Blue' };
  if (hue < 290) return { name: 'Purple', suggestion: 'Caron Simply Soft — Iris' };
  if (hue < 345) return { name: 'Pink', suggestion: 'Red Heart Super Saver — Pretty in Pink' };

  return { name: 'Unknown', suggestion: '' };
}

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l * 100];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return [h * 360, s * 100, l * 100];
}
