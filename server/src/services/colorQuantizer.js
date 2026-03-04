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
  if (pixels.length === 0) return { palette: [], assignments: [], counts: [] };
  if (k >= pixels.length) {
    // More colors requested than pixels — each pixel is its own color
    return {
      palette: pixels.map(p => [...p]),
      assignments: pixels.map((_, i) => i),
      counts: pixels.map(() => 1),
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

// Yarn weight categories for filtering suggestions by gauge
// 'worsted' = 18-20 st/4in, 'dk' = 21-24, 'fingering' = 25+, 'bulky' = ≤17
const YARN_DATABASE = [
  // Neutrals — worsted weight (Red Heart Super Saver, Caron Simply Soft)
  { rgb: [0, 0, 0], name: 'Black', suggestion: 'Red Heart Super Saver — Black', weight: 'worsted' },
  { rgb: [30, 30, 30], name: 'Charcoal', suggestion: 'Caron Simply Soft — Charcoal Heather', weight: 'worsted' },
  { rgb: [128, 128, 128], name: 'Gray', suggestion: 'Red Heart Super Saver — Gray Heather', weight: 'worsted' },
  { rgb: [220, 215, 210], name: 'Silver', suggestion: 'Caron Simply Soft — Soft Gray Heather', weight: 'worsted' },
  { rgb: [255, 255, 255], name: 'White', suggestion: 'Red Heart Super Saver — White', weight: 'worsted' },
  { rgb: [245, 235, 220], name: 'Cream', suggestion: 'Red Heart Super Saver — Aran', weight: 'worsted' },
  // Neutrals — fingering weight (Knit Picks Palette)
  { rgb: [80, 80, 80], name: 'Dark Gray', suggestion: 'Knit Picks Palette — Cobblestone Heather', weight: 'fingering' },
  { rgb: [180, 180, 180], name: 'Light Gray', suggestion: 'Knit Picks Palette — Mist', weight: 'fingering' },
  { rgb: [210, 190, 160], name: 'Oatmeal', suggestion: 'Knit Picks Palette — Camel Heather', weight: 'fingering' },
  // Reds
  { rgb: [180, 20, 20], name: 'Cherry Red', suggestion: 'Red Heart Super Saver — Cherry Red', weight: 'worsted' },
  { rgb: [220, 40, 40], name: 'Bright Red', suggestion: 'Red Heart Super Saver — Hot Red', weight: 'worsted' },
  { rgb: [140, 15, 15], name: 'Burgundy', suggestion: 'Red Heart Super Saver — Burgundy', weight: 'worsted' },
  { rgb: [100, 10, 10], name: 'Wine', suggestion: 'Knit Picks Palette — Hollyberry', weight: 'fingering' },
  { rgb: [200, 60, 60], name: 'Tomato', suggestion: 'Caron Simply Soft — Harvest Red', weight: 'worsted' },
  // Oranges
  { rgb: [230, 120, 30], name: 'Pumpkin', suggestion: 'Red Heart Super Saver — Pumpkin', weight: 'worsted' },
  { rgb: [200, 90, 20], name: 'Rust', suggestion: 'Knit Picks Palette — Masala', weight: 'fingering' },
  { rgb: [240, 150, 60], name: 'Tangerine', suggestion: 'Red Heart Super Saver — Carrot', weight: 'worsted' },
  { rgb: [180, 80, 30], name: 'Burnt Orange', suggestion: 'Caron Simply Soft — Autumn Red', weight: 'worsted' },
  { rgb: [210, 140, 90], name: 'Peach', suggestion: 'Caron Simply Soft — Light Country Peach', weight: 'worsted' },
  // Yellows / Golds
  { rgb: [220, 180, 50], name: 'Gold', suggestion: 'Caron Simply Soft — Autumn Maize', weight: 'worsted' },
  { rgb: [250, 220, 50], name: 'Bright Yellow', suggestion: 'Red Heart Super Saver — Bright Yellow', weight: 'worsted' },
  { rgb: [240, 200, 80], name: 'Sunflower', suggestion: 'Red Heart Super Saver — Cornmeal', weight: 'worsted' },
  { rgb: [180, 150, 40], name: 'Mustard', suggestion: 'Knit Picks Palette — Semolina', weight: 'fingering' },
  { rgb: [250, 240, 150], name: 'Pale Yellow', suggestion: 'Red Heart Super Saver — Pale Yellow', weight: 'worsted' },
  // Greens
  { rgb: [30, 120, 50], name: 'Forest Green', suggestion: 'Red Heart Super Saver — Paddy Green', weight: 'worsted' },
  { rgb: [50, 180, 80], name: 'Spring Green', suggestion: 'Red Heart Super Saver — Spring Green', weight: 'worsted' },
  { rgb: [100, 140, 60], name: 'Olive', suggestion: 'Knit Picks Palette — Thyme', weight: 'fingering' },
  { rgb: [0, 80, 40], name: 'Dark Green', suggestion: 'Red Heart Super Saver — Hunter Green', weight: 'worsted' },
  { rgb: [150, 200, 100], name: 'Sage', suggestion: 'Caron Simply Soft — Sage', weight: 'worsted' },
  { rgb: [50, 150, 100], name: 'Emerald', suggestion: 'Knit Picks Palette — Grass', weight: 'fingering' },
  { rgb: [180, 210, 160], name: 'Mint', suggestion: 'Caron Simply Soft — Soft Green', weight: 'worsted' },
  // Teals / Cyans
  { rgb: [0, 130, 130], name: 'Teal', suggestion: 'Knit Picks Palette — Tranquil', weight: 'fingering' },
  { rgb: [50, 180, 180], name: 'Aqua', suggestion: 'Red Heart Super Saver — Aruba Sea', weight: 'worsted' },
  { rgb: [100, 200, 200], name: 'Light Teal', suggestion: 'Caron Simply Soft — Robin Egg', weight: 'worsted' },
  { rgb: [0, 90, 90], name: 'Dark Teal', suggestion: 'Knit Picks Palette — Marine Heather', weight: 'fingering' },
  // Blues
  { rgb: [30, 60, 160], name: 'Royal Blue', suggestion: 'Red Heart Super Saver — Royal Blue', weight: 'worsted' },
  { rgb: [70, 130, 200], name: 'Medium Blue', suggestion: 'Red Heart Super Saver — Delft Blue', weight: 'worsted' },
  { rgb: [20, 30, 80], name: 'Navy', suggestion: 'Red Heart Super Saver — Soft Navy', weight: 'worsted' },
  { rgb: [100, 150, 220], name: 'Cornflower', suggestion: 'Caron Simply Soft — Cobalt Blue', weight: 'worsted' },
  { rgb: [150, 190, 230], name: 'Baby Blue', suggestion: 'Red Heart Super Saver — Light Blue', weight: 'worsted' },
  { rgb: [40, 90, 180], name: 'Sapphire', suggestion: 'Knit Picks Palette — Jay', weight: 'fingering' },
  { rgb: [180, 200, 240], name: 'Periwinkle', suggestion: 'Caron Simply Soft — Lavender Blue', weight: 'worsted' },
  // Purples
  { rgb: [100, 40, 150], name: 'Purple', suggestion: 'Caron Simply Soft — Iris', weight: 'worsted' },
  { rgb: [60, 20, 100], name: 'Dark Purple', suggestion: 'Red Heart Super Saver — Purple', weight: 'worsted' },
  { rgb: [160, 80, 200], name: 'Violet', suggestion: 'Red Heart Super Saver — Medium Purple', weight: 'worsted' },
  { rgb: [180, 140, 200], name: 'Lavender', suggestion: 'Caron Simply Soft — Orchid', weight: 'worsted' },
  { rgb: [80, 30, 70], name: 'Plum', suggestion: 'Knit Picks Palette — Eggplant', weight: 'fingering' },
  // Pinks
  { rgb: [230, 100, 150], name: 'Hot Pink', suggestion: 'Red Heart Super Saver — Shocking Pink', weight: 'worsted' },
  { rgb: [240, 170, 190], name: 'Pink', suggestion: 'Red Heart Super Saver — Pretty in Pink', weight: 'worsted' },
  { rgb: [200, 60, 100], name: 'Raspberry', suggestion: 'Knit Picks Palette — Serrano', weight: 'fingering' },
  { rgb: [250, 200, 210], name: 'Blush', suggestion: 'Caron Simply Soft — Soft Pink', weight: 'worsted' },
  { rgb: [180, 50, 80], name: 'Rose', suggestion: 'Caron Simply Soft — Rubine Red', weight: 'worsted' },
  // Browns
  { rgb: [140, 90, 50], name: 'Brown', suggestion: 'Red Heart Super Saver — Coffee', weight: 'worsted' },
  { rgb: [90, 50, 20], name: 'Dark Brown', suggestion: 'Caron Simply Soft — Chocolate', weight: 'worsted' },
  { rgb: [180, 130, 80], name: 'Tan', suggestion: 'Red Heart Super Saver — Buff', weight: 'worsted' },
  { rgb: [210, 170, 120], name: 'Camel', suggestion: 'Knit Picks Palette — Suede Heather', weight: 'fingering' },
  { rgb: [120, 70, 40], name: 'Chestnut', suggestion: 'Knit Picks Palette — Suede', weight: 'fingering' },
  { rgb: [160, 120, 90], name: 'Taupe', suggestion: 'Caron Simply Soft — Taupe', weight: 'worsted' },
  // Bulky weight
  { rgb: [0, 0, 0], name: 'Black', suggestion: 'Lion Brand Wool-Ease Thick & Quick — Black', weight: 'bulky' },
  { rgb: [255, 255, 255], name: 'White', suggestion: 'Lion Brand Wool-Ease Thick & Quick — Fisherman', weight: 'bulky' },
  { rgb: [128, 128, 128], name: 'Gray', suggestion: 'Lion Brand Wool-Ease Thick & Quick — Oxford Grey', weight: 'bulky' },
  { rgb: [180, 20, 20], name: 'Cranberry', suggestion: 'Lion Brand Wool-Ease Thick & Quick — Cranberry', weight: 'bulky' },
  { rgb: [20, 30, 80], name: 'Navy', suggestion: 'Lion Brand Wool-Ease Thick & Quick — Navy', weight: 'bulky' },
  { rgb: [30, 120, 50], name: 'Pine', suggestion: 'Lion Brand Wool-Ease Thick & Quick — Pine', weight: 'bulky' },
  { rgb: [140, 90, 50], name: 'Barley', suggestion: 'Lion Brand Wool-Ease Thick & Quick — Barley', weight: 'bulky' },
  { rgb: [100, 40, 150], name: 'Eggplant', suggestion: 'Lion Brand Wool-Ease Thick & Quick — Eggplant', weight: 'bulky' },
  // DK weight (Berroco Vintage DK)
  { rgb: [0, 0, 0], name: 'Cast Iron', suggestion: 'Berroco Vintage DK — Cast Iron', weight: 'dk' },
  { rgb: [255, 255, 255], name: 'Snow Day', suggestion: 'Berroco Vintage DK — Snow Day', weight: 'dk' },
  { rgb: [128, 128, 128], name: 'Smoke', suggestion: 'Berroco Vintage DK — Smoke', weight: 'dk' },
  { rgb: [180, 20, 20], name: 'Cardinal', suggestion: 'Berroco Vintage DK — Cardinal', weight: 'dk' },
  { rgb: [30, 60, 160], name: 'Azure', suggestion: 'Berroco Vintage DK — Azure', weight: 'dk' },
  { rgb: [30, 120, 50], name: 'Spruce', suggestion: 'Berroco Vintage DK — Spruce', weight: 'dk' },
  { rgb: [220, 180, 50], name: 'Gold', suggestion: 'Berroco Vintage DK — Gold', weight: 'dk' },
  { rgb: [100, 40, 150], name: 'Violet', suggestion: 'Berroco Vintage DK — Violet', weight: 'dk' },
  // Skin tones
  { rgb: [240, 210, 180], name: 'Light Peach', suggestion: 'Red Heart Super Saver — Light Peach', weight: 'worsted' },
  { rgb: [200, 160, 120], name: 'Warm Beige', suggestion: 'Caron Simply Soft — Bone', weight: 'worsted' },
  { rgb: [160, 110, 70], name: 'Warm Brown', suggestion: 'Red Heart Super Saver — Cafe Latte', weight: 'worsted' },
];

/**
 * Map stitch gauge to a yarn weight category for filtering yarn suggestions.
 */
function gaugeToWeight(stitchGauge) {
  if (!stitchGauge || stitchGauge <= 14) return 'bulky';
  if (stitchGauge <= 20) return 'worsted';
  if (stitchGauge <= 23) return 'dk';
  if (stitchGauge <= 27) return 'fingering'; // sport-weight uses fingering yarn entries
  return 'fingering';
}

/**
 * Suggest yarn color names based on RGB values.
 * Uses Euclidean distance in RGB space to find the closest real yarn color.
 * Filters by yarn weight when stitchGauge is provided to avoid mixing incompatible weights.
 * Accepts an optional `usedSuggestions` set to avoid duplicates across a palette.
 */
export function suggestYarnColor(rgb, usedSuggestions, stitchGauge) {
  const targetWeight = gaugeToWeight(stitchGauge);

  // Sort all yarn entries by distance to the target color
  const ranked = YARN_DATABASE
    .map(entry => ({
      ...entry,
      dist: colorDistSq(rgb, entry.rgb),
    }))
    .sort((a, b) => a.dist - b.dist);

  // First pass: try to find a match in the correct weight
  if (usedSuggestions) {
    for (const entry of ranked) {
      if (entry.weight === targetWeight && !usedSuggestions.has(entry.suggestion)) {
        usedSuggestions.add(entry.suggestion);
        return { name: entry.name, suggestion: entry.suggestion };
      }
    }
  }

  // Second pass: fall back to any weight if no weight-matched option is available
  if (usedSuggestions) {
    for (const entry of ranked) {
      if (!usedSuggestions.has(entry.suggestion)) {
        usedSuggestions.add(entry.suggestion);
        return { name: entry.name, suggestion: entry.suggestion };
      }
    }
  }

  // Final fallback: just use the closest match
  return { name: ranked[0].name, suggestion: ranked[0].suggestion };
}
