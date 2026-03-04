import { useState, useEffect, useRef } from 'react';
import PremiumBadge from './PremiumBadge.jsx';

const GAUGE_PRESETS = [
  { label: 'Bulky (3 st/in)', stitchGauge: 12, rowGauge: 17 },
  { label: 'Worsted (4.5 st/in)', stitchGauge: 18, rowGauge: 24 },
  { label: 'DK (5.5 st/in)', stitchGauge: 22, rowGauge: 30 },
  { label: 'Sport (6 st/in)', stitchGauge: 24, rowGauge: 32 },
  { label: 'Fingering (7 st/in)', stitchGauge: 28, rowGauge: 40 },
  { label: 'Custom', stitchGauge: null, rowGauge: null },
];

const WIDTH_OPTIONS = [30, 40, 60, 80, 100, 120, 150, 200];

const PROJECT_TYPES = [
  { value: 'blanket', label: 'Blanket / Afghan' },
  { value: 'scarf', label: 'Scarf / Cowl' },
  { value: 'pillow', label: 'Pillow / Cushion' },
  { value: 'wallHanging', label: 'Wall Hanging / Tapestry' },
  { value: 'sweaterBack', label: 'Sweater — Back Panel' },
  { value: 'sweaterChestLeft', label: 'Sweater — Chest Patch (Left)' },
  { value: 'sweaterChestRight', label: 'Sweater — Chest Patch (Right)' },
  { value: 'toteBag', label: 'Tote Bag' },
];

export default function PatternConfig({ onGenerate, status, suggestions, onSettingsChange }) {
  const [widthStitches, setWidthStitches] = useState(60);
  const [numColors, setNumColors] = useState(6);
  const [gaugePreset, setGaugePreset] = useState(1);
  const [stitchGauge, setStitchGauge] = useState(18);
  const [rowGauge, setRowGauge] = useState(24);
  const [cleanup, setCleanup] = useState(true);
  const [removeBackground, setRemoveBackground] = useState(false);
  const [enhanceDetail, setEnhanceDetail] = useState(false);
  const [projectType, setProjectType] = useState('blanket');
  const [settingsChanged, setSettingsChanged] = useState(false);
  const lastGeneratedConfig = useRef(null);

  const getCurrentConfig = () => ({
    widthStitches, numColors, stitchGauge, rowGauge, cleanup, removeBackground, enhanceDetail, projectType,
  });

  const checkIfChanged = (overrides = {}) => {
    if (!lastGeneratedConfig.current) return;
    const current = { ...getCurrentConfig(), ...overrides };
    const changed = JSON.stringify(current) !== JSON.stringify(lastGeneratedConfig.current);
    setSettingsChanged(changed);
    onSettingsChange?.(changed);
  };

  // Apply suggestions when they arrive from upload
  useEffect(() => {
    if (!suggestions) return;
    const newWidth = suggestions.suggestedWidth || 60;
    const newColors = suggestions.suggestedColors || 6;
    const newBgRemoval = suggestions.suggestedBackgroundRemoval ? true : removeBackground;
    setWidthStitches(newWidth);
    setNumColors(newColors);
    if (suggestions.suggestedBackgroundRemoval) setRemoveBackground(true);
    // Snapshot suggested config as the "last generated" baseline so initial auto-generate is clean
    lastGeneratedConfig.current = {
      widthStitches: newWidth,
      numColors: newColors,
      stitchGauge, rowGauge, cleanup,
      removeBackground: newBgRemoval,
      enhanceDetail, projectType,
    };
  }, [suggestions]);

  useEffect(() => {
    const preset = GAUGE_PRESETS[gaugePreset];
    if (preset.stitchGauge !== null) {
      setStitchGauge(preset.stitchGauge);
      setRowGauge(preset.rowGauge);
      checkIfChanged({ stitchGauge: preset.stitchGauge, rowGauge: preset.rowGauge });
    }
  }, [gaugePreset]);

  const isCustomGauge = GAUGE_PRESETS[gaugePreset].stitchGauge === null;
  const isGenerating = status === 'generating';

  const handleWidthKeyDown = (e, index) => {
    let nextIndex;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      nextIndex = (index + 1) % WIDTH_OPTIONS.length;
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      nextIndex = (index - 1 + WIDTH_OPTIONS.length) % WIDTH_OPTIONS.length;
    } else {
      return;
    }
    setWidthStitches(WIDTH_OPTIONS[nextIndex]);
    checkIfChanged({ widthStitches: WIDTH_OPTIONS[nextIndex] });
    e.currentTarget.parentElement.children[nextIndex]?.focus();
  };

  const handleGenerate = () => {
    const config = { widthStitches, numColors, stitchGauge, rowGauge, cleanup, removeBackground, enhanceDetail, projectType };
    lastGeneratedConfig.current = config;
    setSettingsChanged(false);
    onSettingsChange?.(false);
    onGenerate(config);
  };

  const stitchAR = rowGauge / stitchGauge;
  const stitchWidthIn = 4 / stitchGauge;
  const stitchHeightIn = 4 / rowGauge;

  return (
    <div className="space-y-5">
      <h2 className="text-lg font-semibold text-gray-800">Pattern Settings</h2>

      {/* Grid Width */}
      <div>
        <span id="width-label" className="block text-sm font-medium text-gray-700 mb-1.5">
          Width (stitches)
        </span>
        <div role="radiogroup" aria-labelledby="width-label" className="flex flex-wrap gap-2">
          {WIDTH_OPTIONS.map((w, idx) => (
            <button
              key={w}
              role="radio"
              aria-checked={widthStitches === w}
              tabIndex={widthStitches === w ? 0 : -1}
              onClick={() => { setWidthStitches(w); checkIfChanged({ widthStitches: w }); }}
              onKeyDown={(e) => handleWidthKeyDown(e, idx)}
              className={`
                px-3 py-1.5 min-h-[44px] rounded-lg text-sm font-medium transition-colors relative
                focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-1
                ${widthStitches === w
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }
              `}
            >
              {w}{w > 100 && <span className="text-[8px] text-amber-500 ml-0.5" aria-hidden="true">*</span>}
            </button>
          ))}
        </div>
        {widthStitches > 100 && (
          <div className="mt-1"><PremiumBadge /></div>
        )}
        <p className="text-xs text-gray-500 mt-1">
          Wider = more detail, but takes longer to knit
        </p>
      </div>

      {/* Number of Colors */}
      <div>
        <label htmlFor="numColors" className="block text-sm font-medium text-gray-700 mb-1.5">
          Colors: <span className="text-brand-600 font-semibold">{numColors}</span>
        </label>
        <input
          id="numColors"
          type="range"
          min={2}
          max={12}
          value={numColors}
          aria-valuetext={`${numColors} colors`}
          onChange={e => { const v = parseInt(e.target.value, 10); setNumColors(v); checkIfChanged({ numColors: v }); }}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-brand-600"
        />
        <div className="flex justify-between text-xs text-gray-500">
          <span>2 (simple)</span>
          <span>12 (detailed)</span>
        </div>
        {numColors > 8 && (
          <div className="mt-1"><PremiumBadge /></div>
        )}
      </div>

      {/* Gauge Preset */}
      <div>
        <label htmlFor="gaugePreset" className="block text-sm font-medium text-gray-700 mb-1.5">
          Yarn Weight / Gauge
        </label>
        <select
          id="gaugePreset"
          value={gaugePreset}
          onChange={e => setGaugePreset(parseInt(e.target.value, 10))}
          // checkIfChanged is called via the gaugePreset useEffect
          className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
        >
          {GAUGE_PRESETS.map((p, i) => (
            <option key={p.label} value={i}>{p.label}</option>
          ))}
        </select>
      </div>

      {/* Custom Gauge */}
      {isCustomGauge && (
        <div className="grid grid-cols-2 gap-3 p-3 bg-gray-50 rounded-lg">
          <div>
            <label htmlFor="customStitchGauge" className="block text-xs font-medium text-gray-600 mb-1">Stitches per 4&quot;</label>
            <input id="customStitchGauge" type="number" min={5} max={60} value={stitchGauge}
              onChange={e => { const v = parseInt(e.target.value, 10) || 18; setStitchGauge(v); checkIfChanged({ stitchGauge: v }); }}
              className="w-full px-2 py-1.5 rounded border border-gray-300 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
            />
          </div>
          <div>
            <label htmlFor="customRowGauge" className="block text-xs font-medium text-gray-600 mb-1">Rows per 4&quot;</label>
            <input id="customRowGauge" type="number" min={5} max={60} value={rowGauge}
              onChange={e => { const v = parseInt(e.target.value, 10) || 24; setRowGauge(v); checkIfChanged({ rowGauge: v }); }}
              className="w-full px-2 py-1.5 rounded border border-gray-300 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
            />
          </div>
        </div>
      )}

      {/* Project Type */}
      <div>
        <label htmlFor="projectType" className="block text-sm font-medium text-gray-700 mb-1.5">
          Project Type
        </label>
        <select
          id="projectType"
          value={projectType}
          onChange={e => { setProjectType(e.target.value); checkIfChanged({ projectType: e.target.value }); }}
          className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
        >
          {PROJECT_TYPES.map(pt => (
            <option key={pt.value} value={pt.value}>{pt.label}</option>
          ))}
        </select>
        <p className="text-xs text-gray-500 mt-1">
          Adds project-specific construction instructions to your PDF
        </p>
        {projectType.startsWith('sweater') && (
          <div className="mt-1"><PremiumBadge /></div>
        )}
        {projectType === 'scarf' && (widthStitches / stitchGauge) * 4 > 12 && (
          <p className="text-xs text-amber-600 mt-1">
            Note: At this width, your scarf would be {((widthStitches / stitchGauge) * 4).toFixed(1)}" wide. Most scarves are 6–12" wide. Consider reducing width.
          </p>
        )}
      </div>

      {/* Stitch aspect ratio */}
      <div className="text-xs text-gray-600 bg-gray-50 p-2.5 rounded-lg">
        <span className="font-medium">Stitch ratio:</span>{' '}
        {stitchWidthIn.toFixed(3)}" wide x {stitchHeightIn.toFixed(3)}" tall
        (ratio {stitchAR.toFixed(2)}:1)
        {stitchAR > 1 && ' — stitches are wider than tall'}
      </div>

      {/* Processing toggles */}
      <div className="space-y-2.5">
        <Toggle checked={cleanup} onChange={v => { setCleanup(v); checkIfChanged({ cleanup: v }); }}
          label="Smooth isolated stitches"
          hint="Removes hard-to-knit single-stitch color islands"
        />
        <div>
          <Toggle checked={removeBackground} onChange={v => { setRemoveBackground(v); checkIfChanged({ removeBackground: v }); }}
            label="Remove background"
            hint="Works best with photos that have a clear subject against a distinct background"
          />
          {removeBackground && <div className="ml-[1.625rem] mt-0.5"><PremiumBadge /></div>}
        </div>
        <Toggle checked={enhanceDetail} onChange={v => { setEnhanceDetail(v); checkIfChanged({ enhanceDetail: v }); }}
          label="Enhance detail"
          hint="Boosts contrast and sharpness to retain shapes at low resolution"
        />
      </div>

      {/* Generate Button */}
      <button
        onClick={handleGenerate}
        disabled={isGenerating || (!settingsChanged && lastGeneratedConfig.current !== null)}
        className={`
          w-full py-3 rounded-xl text-white font-semibold text-base
          transition-all duration-200 shadow-sm
          focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2
          ${isGenerating || (!settingsChanged && lastGeneratedConfig.current !== null)
            ? isGenerating ? 'bg-gray-400 cursor-wait' : 'bg-gray-300 cursor-not-allowed'
            : 'bg-brand-600 hover:bg-brand-700 hover:shadow-md active:scale-[0.98]'
          }
        `}
      >
        {isGenerating ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
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

function Toggle({ checked, onChange, label, hint }) {
  return (
    <label className="flex items-start gap-2.5 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500 mt-0.5"
      />
      <div>
        <span className="text-sm text-gray-700">{label}</span>
        {hint && <p className="text-xs text-gray-500 leading-tight">{hint}</p>}
      </div>
    </label>
  );
}
