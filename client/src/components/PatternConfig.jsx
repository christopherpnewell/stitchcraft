import { useState, useEffect } from 'react';

const GAUGE_PRESETS = [
  { label: 'Bulky (3 st/in)', stitchGauge: 12, rowGauge: 16 },
  { label: 'Worsted (4.5 st/in)', stitchGauge: 18, rowGauge: 24 },
  { label: 'DK (5.5 st/in)', stitchGauge: 22, rowGauge: 30 },
  { label: 'Sport (6 st/in)', stitchGauge: 24, rowGauge: 32 },
  { label: 'Fingering (7 st/in)', stitchGauge: 28, rowGauge: 36 },
  { label: 'Custom', stitchGauge: null, rowGauge: null },
];

const WIDTH_OPTIONS = [30, 40, 60, 80, 100, 120, 150, 200];

export default function PatternConfig({ onGenerate, status }) {
  const [widthStitches, setWidthStitches] = useState(60);
  const [numColors, setNumColors] = useState(6);
  const [gaugePreset, setGaugePreset] = useState(1); // Worsted default
  const [stitchGauge, setStitchGauge] = useState(18);
  const [rowGauge, setRowGauge] = useState(24);
  const [cleanup, setCleanup] = useState(true);

  useEffect(() => {
    const preset = GAUGE_PRESETS[gaugePreset];
    if (preset.stitchGauge !== null) {
      setStitchGauge(preset.stitchGauge);
      setRowGauge(preset.rowGauge);
    }
  }, [gaugePreset]);

  const isCustomGauge = GAUGE_PRESETS[gaugePreset].stitchGauge === null;
  const isGenerating = status === 'generating';

  const handleGenerate = () => {
    onGenerate({
      widthStitches,
      numColors,
      stitchGauge,
      rowGauge,
      cleanup,
    });
  };

  // Calculate stitch aspect ratio info
  const stitchAR = rowGauge / stitchGauge;
  const stitchWidthIn = 4 / stitchGauge;
  const stitchHeightIn = 4 / rowGauge;

  return (
    <div className="space-y-5">
      <h3 className="text-lg font-semibold text-gray-800">Pattern Settings</h3>

      {/* Grid Width */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Width (stitches)
        </label>
        <div className="flex flex-wrap gap-2">
          {WIDTH_OPTIONS.map(w => (
            <button
              key={w}
              onClick={() => setWidthStitches(w)}
              className={`
                px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
                ${widthStitches === w
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }
              `}
            >
              {w}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-1">
          Wider = more detail, but takes longer to knit
        </p>
      </div>

      {/* Number of Colors */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Colors: <span className="text-brand-600 font-semibold">{numColors}</span>
        </label>
        <input
          type="range"
          min={2}
          max={12}
          value={numColors}
          onChange={e => setNumColors(parseInt(e.target.value, 10))}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-brand-600"
        />
        <div className="flex justify-between text-xs text-gray-400">
          <span>2 (simple)</span>
          <span>12 (detailed)</span>
        </div>
      </div>

      {/* Gauge Preset */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Yarn Weight / Gauge
        </label>
        <select
          value={gaugePreset}
          onChange={e => setGaugePreset(parseInt(e.target.value, 10))}
          className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
        >
          {GAUGE_PRESETS.map((p, i) => (
            <option key={i} value={i}>{p.label}</option>
          ))}
        </select>
      </div>

      {/* Custom Gauge Inputs */}
      {isCustomGauge && (
        <div className="grid grid-cols-2 gap-3 p-3 bg-gray-50 rounded-lg">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Stitches per 4"
            </label>
            <input
              type="number"
              min={5}
              max={60}
              value={stitchGauge}
              onChange={e => setStitchGauge(parseInt(e.target.value, 10) || 18)}
              className="w-full px-2 py-1.5 rounded border border-gray-300 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Rows per 4"
            </label>
            <input
              type="number"
              min={5}
              max={60}
              value={rowGauge}
              onChange={e => setRowGauge(parseInt(e.target.value, 10) || 24)}
              className="w-full px-2 py-1.5 rounded border border-gray-300 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
            />
          </div>
        </div>
      )}

      {/* Stitch aspect ratio display */}
      <div className="text-xs text-gray-500 bg-gray-50 p-2.5 rounded-lg">
        <span className="font-medium">Stitch ratio:</span>{' '}
        {stitchWidthIn.toFixed(3)}" wide × {stitchHeightIn.toFixed(3)}" tall
        (ratio {stitchAR.toFixed(2)}:1)
        {stitchAR > 1 && ' — stitches are wider than tall'}
      </div>

      {/* Cleanup toggle */}
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={cleanup}
          onChange={e => setCleanup(e.target.checked)}
          className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500"
        />
        <span className="text-sm text-gray-700">
          Smooth isolated stitches
        </span>
        <span className="text-xs text-gray-400">(removes hard-to-knit single-stitch color islands)</span>
      </label>

      {/* Generate Button */}
      <button
        onClick={handleGenerate}
        disabled={isGenerating}
        className={`
          w-full py-3 rounded-xl text-white font-semibold text-base
          transition-all duration-200 shadow-sm
          ${isGenerating
            ? 'bg-gray-400 cursor-wait'
            : 'bg-brand-600 hover:bg-brand-700 hover:shadow-md active:scale-[0.98]'
          }
        `}
      >
        {isGenerating ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Generating Pattern...
          </span>
        ) : (
          'Generate Pattern'
        )}
      </button>
    </div>
  );
}
