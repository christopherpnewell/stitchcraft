/**
 * Feature flag configuration for freemium model.
 * Currently everything is unlocked (beta).
 * When freemium is activated, premium features will require authentication.
 */

export const FEATURES = {
  // Free features
  basicGeneration: { tier: 'free', description: 'Generate patterns up to 100 stitches wide' },
  basicColors: { tier: 'free', description: 'Up to 8 colors' },
  pdfDownload: { tier: 'free', description: 'Download PDF pattern' },
  basicProjectTypes: { tier: 'free', description: 'Blanket, scarf, pillow, wall hanging, tote' },

  // Premium features
  widePatterns: { tier: 'premium', description: 'Stitch widths above 100' },
  manyColors: { tier: 'premium', description: 'More than 8 colors' },
  backgroundRemoval: { tier: 'premium', description: 'Background removal' },
  sweaterProjectTypes: { tier: 'premium', description: 'Sweater placement patterns' },
  constructionInstructions: { tier: 'premium', description: 'Full construction instructions in PDF' },
};

/**
 * Check if a feature is accessible.
 * During beta, everything is unlocked.
 */
export function isFeatureEnabled(featureName) {
  // Beta mode: everything unlocked
  return true;
}
