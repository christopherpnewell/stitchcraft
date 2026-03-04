import { useRef, useEffect, useState, useMemo } from 'react';

export default function PatternPreview({ pattern }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [zoom, setZoom] = useState(1);
  const [containerWidth, setContainerWidth] = useState(600);

  // Observe container width for responsive sizing
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
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

    canvas.width = layout.totalWidth * dpr;
    canvas.height = layout.totalHeight * dpr;
    canvas.style.width = `${layout.totalWidth}px`;
    canvas.style.height = `${layout.totalHeight}px`;
    ctx.scale(dpr, dpr);

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

  if (!pattern || !layout) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-800">Pattern Preview</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setZoom(z => Math.max(0.25, z - 0.25))}
            className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 font-bold"
          >
            -
          </button>
          <span className="text-sm text-gray-500 w-12 text-center">{Math.round(zoom * 100)}%</span>
          <button
            onClick={() => setZoom(z => Math.min(4, z + 0.25))}
            className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 font-bold"
          >
            +
          </button>
          <button
            onClick={() => setZoom(1)}
            className="px-2 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-xs text-gray-600"
          >
            Fit
          </button>
        </div>
      </div>

      <div
        ref={containerRef}
        className="overflow-auto border border-gray-200 rounded-xl bg-white shadow-inner"
        style={{ maxHeight: '65vh' }}
      >
        <canvas ref={canvasRef} className="block" />
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
