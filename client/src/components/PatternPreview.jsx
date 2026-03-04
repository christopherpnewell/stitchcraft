import { useRef, useEffect, useState, useMemo } from 'react';

export default function PatternPreview({ pattern }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [zoom, setZoom] = useState(1);
  const [containerWidth, setContainerWidth] = useState(600);

  // Observe container width for responsive sizing (debounced with rAF)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let rafId = 0;
    const observer = new ResizeObserver(entries => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        for (const entry of entries) {
          setContainerWidth(entry.contentRect.width);
        }
      });
    });
    observer.observe(el);
    return () => { cancelAnimationFrame(rafId); observer.disconnect(); };
  }, []);

  // Calculate cell dimensions respecting stitch aspect ratio
  const layout = useMemo(() => {
    if (!pattern) return null;

    const { widthStitches, heightRows, stitchGauge, rowGauge } = pattern;
    const stitchAR = rowGauge / stitchGauge; // width/height of one stitch

    // Axis label space
    const axisRight = 35;
    const axisBottom = 20;

    // Available drawing area
    const available = containerWidth - axisRight - 2;

    // Base cell width to fit container
    let cellWidth = available / widthStitches;
    let cellHeight = cellWidth / stitchAR;

    // Apply zoom
    cellWidth *= zoom;
    cellHeight *= zoom;

    // Minimum readable size
    cellWidth = Math.max(cellWidth, 2);
    cellHeight = Math.max(cellHeight, 2);

    const chartWidth = widthStitches * cellWidth;
    const chartHeight = heightRows * cellHeight;
    const totalWidth = chartWidth + axisRight;
    const totalHeight = chartHeight + axisBottom;

    return { cellWidth, cellHeight, chartWidth, chartHeight, totalWidth, totalHeight, axisRight, axisBottom };
  }, [pattern, containerWidth, zoom]);

  // Draw the chart
  useEffect(() => {
    if (!pattern || !layout || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;

    // Clamp canvas dimensions to browser max (16384px)
    const maxDim = 16384;
    const clampedDpr = Math.min(dpr, maxDim / Math.max(layout.totalWidth, layout.totalHeight));

    canvas.width = layout.totalWidth * clampedDpr;
    canvas.height = layout.totalHeight * clampedDpr;
    canvas.style.width = `${layout.totalWidth}px`;
    canvas.style.height = `${layout.totalHeight}px`;
    ctx.scale(clampedDpr, clampedDpr);

    const { grid, palette, widthStitches, heightRows } = pattern;
    const { cellWidth, cellHeight, chartWidth } = layout;

    // Clear
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, layout.totalWidth, layout.totalHeight);

    // Draw cells — grid is stored top-to-bottom, but chart shows bottom-to-top
    for (let row = 0; row < heightRows; row++) {
      for (let col = 0; col < widthStitches; col++) {
        const gridRow = heightRows - 1 - row; // Flip: row 0 of grid = top = last chart row
        const colorIdx = grid[gridRow][col];
        const color = palette[colorIdx];

        const x = col * cellWidth;
        const y = row * cellHeight;

        ctx.fillStyle = color.hex;
        ctx.fillRect(x, y, cellWidth, cellHeight);
      }
    }

    // Draw grid lines if cells are big enough
    if (cellWidth >= 4 && cellHeight >= 4) {
      ctx.strokeStyle = 'rgba(0,0,0,0.12)';
      ctx.lineWidth = 0.5;

      for (let col = 0; col <= widthStitches; col++) {
        const x = col * cellWidth;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, heightRows * cellHeight);
        ctx.stroke();
      }

      for (let row = 0; row <= heightRows; row++) {
        const y = row * cellHeight;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(widthStitches * cellWidth, y);
        ctx.stroke();
      }

      // Thicker lines every 10 stitches/5 rows
      ctx.strokeStyle = 'rgba(0,0,0,0.3)';
      ctx.lineWidth = 1;

      for (let col = 0; col <= widthStitches; col += 10) {
        const x = col * cellWidth;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, heightRows * cellHeight);
        ctx.stroke();
      }

      for (let row = 0; row <= heightRows; row += 5) {
        const y = row * cellHeight;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(widthStitches * cellWidth, y);
        ctx.stroke();
      }
    }

    // Row numbers (right side, every 5 rows)
    if (cellHeight >= 6) {
      ctx.fillStyle = '#666';
      ctx.font = `${Math.min(10, cellHeight * 0.7)}px Inter, sans-serif`;
      ctx.textBaseline = 'middle';

      for (let row = 0; row < heightRows; row++) {
        const absoluteRow = heightRows - row; // Bottom-to-top numbering
        if (absoluteRow % 5 === 0 || absoluteRow === 1 || absoluteRow === heightRows) {
          const y = row * cellHeight + cellHeight / 2;
          ctx.fillText(String(absoluteRow), chartWidth + 4, y);
        }
      }
    }

    // Stitch numbers (bottom, every 10)
    if (cellWidth >= 6) {
      ctx.fillStyle = '#666';
      ctx.font = `${Math.min(9, cellWidth * 0.8)}px Inter, sans-serif`;
      ctx.textBaseline = 'top';
      ctx.textAlign = 'center';

      for (let col = 0; col < widthStitches; col++) {
        const absoluteCol = col + 1;
        if (absoluteCol % 10 === 0 || absoluteCol === 1 || absoluteCol === widthStitches) {
          const x = col * cellWidth + cellWidth / 2;
          ctx.fillText(String(absoluteCol), x, heightRows * cellHeight + 3);
        }
      }
    }
  }, [pattern, layout]);

  const isSweater = pattern?.projectType?.startsWith('sweater');

  if (!pattern || !layout) return null;

  return (
    <div className="space-y-3">
      {/* Sweater placement silhouette */}
      {isSweater && <SweaterSilhouette projectType={pattern.projectType} />}

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800">Pattern Preview</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setZoom(z => Math.max(0.25, z - 0.25))}
            aria-label="Zoom out"
            className="w-11 h-11 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 font-bold focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-1"
          >
            -
          </button>
          <span className="text-sm text-gray-600 w-12 text-center" aria-live="polite" aria-atomic="true">{Math.round(zoom * 100)}%</span>
          <button
            onClick={() => setZoom(z => Math.min(4, z + 0.25))}
            aria-label="Zoom in"
            className="w-11 h-11 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 font-bold focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-1"
          >
            +
          </button>
          <button
            onClick={() => setZoom(1)}
            aria-label="Reset zoom to fit"
            className="px-2 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-xs text-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-1"
          >
            Fit
          </button>
        </div>
      </div>

      <div
        ref={containerRef}
        tabIndex={0}
        role="region"
        aria-label="Scrollable pattern chart"
        className="overflow-auto border border-gray-200 rounded-xl bg-white shadow-inner focus:outline-none focus:ring-2 focus:ring-brand-500"
        style={{ maxHeight: '65vh' }}
      >
        <canvas
          ref={canvasRef}
          className="block"
          role="img"
          aria-label={`Knitting pattern chart preview: ${pattern.widthStitches} stitches wide by ${pattern.heightRows} rows tall with ${pattern.palette.length} colors`}
        />
      </div>

      {/* Pattern stats below preview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
        <StatBox label="Stitches Wide" value={pattern.widthStitches} />
        <StatBox label="Rows Tall" value={pattern.heightRows} />
        <StatBox
          label="Finished Size"
          value={`${pattern.finishedWidthInches}" × ${pattern.finishedHeightInches}"`}
        />
        <StatBox label="Total Stitches" value={pattern.totalStitches.toLocaleString()} />
      </div>
    </div>
  );
}

function StatBox({ label, value }) {
  return (
    <div className="bg-gray-50 rounded-lg py-2 px-3">
      <div className="text-lg font-semibold text-brand-700">{value}</div>
      <div className="text-xs text-gray-500">{label}</div>
    </div>
  );
}

function SweaterSilhouette({ projectType }) {
  // Simple SVG sweater outline showing where the design goes
  const isBack = projectType === 'sweaterBack';
  const isLeft = projectType === 'sweaterChestLeft';

  // Chart placement highlight
  let cx, cy, cw, ch;
  if (isBack) {
    cx = 60; cy = 55; cw = 80; ch = 60; // Centered on back
  } else if (isLeft) {
    cx = 45; cy = 40; cw = 35; ch = 30; // Upper-left chest
  } else {
    cx = 120; cy = 40; cw = 35; ch = 30; // Upper-right chest
  }

  return (
    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
      <p className="text-xs text-gray-500 mb-2 font-medium">
        Chart Placement — {isBack ? 'Back Panel' : isLeft ? 'Left Chest' : 'Right Chest'}
      </p>
      <svg viewBox="0 0 200 160" className="w-full max-w-[240px] mx-auto" fill="none" role="img" aria-label={`Sweater silhouette showing chart placement on the ${isBack ? 'back panel' : isLeft ? 'left chest' : 'right chest'}`}>
        {/* Sweater outline */}
        <path
          d="M50 20 L30 10 L10 45 L35 55 L35 140 L165 140 L165 55 L190 45 L170 10 L150 20 C140 30 130 35 100 35 C70 35 60 30 50 20Z"
          stroke="#999"
          strokeWidth="2"
          fill="#f3f4f6"
        />
        {/* Sleeves */}
        <path d="M35 55 L10 55 L10 45" stroke="#999" strokeWidth="2" fill="none" />
        <path d="M165 55 L190 55 L190 45" stroke="#999" strokeWidth="2" fill="none" />
        {/* Neckline */}
        <path d="M50 20 C60 30 70 35 100 35 C130 35 140 30 150 20" stroke="#999" strokeWidth="2" fill="none" />
        {/* Chart placement highlight */}
        <rect
          x={cx} y={cy} width={cw} height={ch}
          rx="3" ry="3"
          fill="#eb458933" stroke="#eb4589" strokeWidth="1.5"
          strokeDasharray="4 2"
        />
        <text
          x={cx + cw / 2} y={cy + ch / 2 + 3}
          textAnchor="middle" fontSize="8" fill="#d92668" fontWeight="600"
        >
          Chart
        </text>
      </svg>
    </div>
  );
}
