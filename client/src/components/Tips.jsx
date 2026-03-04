import { useState, useMemo } from 'react';

const TIPS = [
  { text: 'Photos with simple backgrounds convert better. Try the "Remove background" option for pet photos.', context: 'photo' },
  { text: 'Try 80-100 stitches wide for detailed images. Simpler graphics look great at 40-60.', context: 'general' },
  { text: 'Fewer colors = easier to knit but less detail. Start with 6 and adjust.', context: 'general' },
  { text: '"Enhance detail" sharpens edges before converting — great for photographs.', context: 'photo' },
  { text: 'Use the zoom controls on the preview to inspect individual stitches before downloading.', context: 'general' },
  { text: 'Print your pattern at actual size. The PDF is designed for letter/A4 paper.', context: 'general' },
  { text: 'Use stitch markers every 10 stitches to stay on track with complex colorwork.', context: 'knitting' },
  { text: 'Read every row of the chart left to right as displayed — the chart is pre-oriented for you.', context: 'knitting' },
  { text: 'Check your gauge swatch before starting! Finished dimensions depend on matching the pattern gauge.', context: 'knitting' },
  { text: 'For intarsia (large color blocks), use separate yarn lengths. For Fair Isle (repeating patterns), carry yarns across the back.', context: 'knitting' },
];

export default function Tips() {
  const [dismissed, setDismissed] = useState(false);

  // Pick one random tip on mount
  const tip = useMemo(() => TIPS[Math.floor(Math.random() * TIPS.length)], []);

  if (dismissed) return null;

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-3">
      <div className="text-amber-500 mt-0.5 flex-shrink-0">
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
        </svg>
      </div>
      <p className="text-sm text-amber-800 flex-1 leading-snug">{tip.text}</p>
      <button
        onClick={() => setDismissed(true)}
        className="text-amber-400 hover:text-amber-600 p-1 transition-colors flex-shrink-0"
        title="Dismiss"
        aria-label="Dismiss tip"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
