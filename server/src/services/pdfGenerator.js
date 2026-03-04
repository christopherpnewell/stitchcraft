/**
 * PDF generator for knitting patterns.
 * Produces professional, paginated charts with color legend,
 * stitch counts, gauge notes, and color usage summary.
 */
import PDFDocument from 'pdfkit';

// Chart symbols to overlay on colored cells for B&W printing
const SYMBOLS = [
  '', // MC gets no symbol (just solid color)
  '/', '\\', 'X', 'O', '+', '-', '=', '*', '#', '~', '^',
];

// Page layout constants (in points, 72pt = 1 inch)
const PAGE = {
  width: 612,   // Letter width
  height: 792,  // Letter height
  marginTop: 54,
  marginBottom: 54,
  marginLeft: 54,
  marginRight: 54,
};

const CONTENT_WIDTH = PAGE.width - PAGE.marginLeft - PAGE.marginRight;
const CONTENT_HEIGHT = PAGE.height - PAGE.marginTop - PAGE.marginBottom;

/**
 * Generate a print-ready PDF buffer for a knitting pattern.
 * @param {import('./patternGenerator.js').KnittingPattern} pattern
 * @returns {Promise<Buffer>}
 */
export async function generatePdf(pattern) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'letter',
      margins: {
        top: PAGE.marginTop,
        bottom: PAGE.marginBottom,
        left: PAGE.marginLeft,
        right: PAGE.marginRight,
      },
      info: {
        Title: 'StitchCraft Knitting Pattern',
        Author: 'StitchCraft',
        Subject: `${pattern.widthStitches}st × ${pattern.heightRows}rows colorwork pattern`,
      },
    });

    const chunks = [];
    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // === PAGE 1: Title & Pattern Info ===
    drawTitlePage(doc, pattern);

    // === CHART PAGES ===
    drawChartPages(doc, pattern);

    // === FINAL PAGE: Legend & Summary ===
    doc.addPage();
    drawLegendPage(doc, pattern);

    doc.end();
  });
}

function drawTitlePage(doc, pattern) {
  const cx = PAGE.width / 2;

  // Title
  doc.fontSize(28).font('Helvetica-Bold')
    .text('StitchCraft', PAGE.marginLeft, PAGE.marginTop, {
      width: CONTENT_WIDTH,
      align: 'center',
    });

  doc.moveDown(0.3);
  doc.fontSize(14).font('Helvetica')
    .text('Colorwork Knitting Pattern', { width: CONTENT_WIDTH, align: 'center' });

  doc.moveDown(2);

  // Pattern summary box
  const boxY = doc.y;
  const boxHeight = 220;
  doc.roundedRect(PAGE.marginLeft, boxY, CONTENT_WIDTH, boxHeight, 8)
    .lineWidth(1).stroke('#ddd');

  let y = boxY + 16;
  const leftCol = PAGE.marginLeft + 20;
  const rightCol = PAGE.marginLeft + CONTENT_WIDTH / 2 + 10;

  doc.fontSize(11).font('Helvetica-Bold');

  // Left column
  drawInfoRow(doc, leftCol, y, 'Dimensions:', `${pattern.widthStitches} stitches × ${pattern.heightRows} rows`);
  y += 24;
  drawInfoRow(doc, leftCol, y, 'Colors:', `${pattern.palette.length}`);
  y += 24;
  drawInfoRow(doc, leftCol, y, 'Gauge:', `${pattern.stitchGauge} sts × ${pattern.rowGauge} rows = 4" / 10cm`);
  y += 24;
  drawInfoRow(doc, leftCol, y, 'Finished Size:', `${pattern.finishedWidthInches}" × ${pattern.finishedHeightInches}" (${cmFromInches(pattern.finishedWidthInches)} × ${cmFromInches(pattern.finishedHeightInches)} cm)`);
  y += 24;
  drawInfoRow(doc, leftCol, y, 'Total Stitches:', `${pattern.totalStitches.toLocaleString()}`);

  // Color mini-swatches in the summary
  y += 36;
  doc.fontSize(10).font('Helvetica-Bold')
    .text('Color Palette:', leftCol, y);
  y += 18;

  const swatchSize = 14;
  const swatchGap = 6;
  let sx = leftCol;

  for (const color of pattern.palette) {
    if (sx + swatchSize + 60 > PAGE.marginLeft + CONTENT_WIDTH - 20) {
      sx = leftCol;
      y += swatchSize + 8;
    }
    doc.rect(sx, y, swatchSize, swatchSize).fill(color.hex);
    doc.rect(sx, y, swatchSize, swatchSize).lineWidth(0.5).stroke('#999');
    doc.fontSize(8).font('Helvetica').fillColor('#333')
      .text(color.label, sx + swatchSize + 3, y + 2, { width: 50 });
    sx += swatchSize + 40 + swatchGap;
  }

  doc.fillColor('#000');

  // Reading instructions
  const instrY = boxY + boxHeight + 24;
  doc.fontSize(11).font('Helvetica-Bold')
    .text('How to Read This Chart', PAGE.marginLeft, instrY);

  doc.moveDown(0.5);
  doc.fontSize(9).font('Helvetica').fillColor('#444');
  const instructions = [
    '• Each square on the chart represents one stitch. Columns = stitches, rows = rows.',
    '• Row 1 is at the bottom of the chart. Read odd rows (RS) right to left, even rows (WS) left to right.',
    '• Numbers along the sides mark every 5th row. Numbers along the bottom mark every 10th stitch.',
    '• Each color has both a color fill and a symbol, so the chart is usable in both color and B&W printing.',
    '• MC = Main Color (most used). CC1, CC2, etc. = Contrast Colors.',
    `• Chart cells are drawn at the correct stitch aspect ratio for the specified gauge (${pattern.stitchGauge}st × ${pattern.rowGauge}rows per 4").`,
  ];

  for (const line of instructions) {
    doc.text(line, PAGE.marginLeft + 10, doc.y, { width: CONTENT_WIDTH - 20 });
    doc.moveDown(0.2);
  }

  doc.fillColor('#000');
}

function drawInfoRow(doc, x, y, label, value) {
  doc.fontSize(10).font('Helvetica-Bold').text(label, x, y, { continued: true });
  doc.font('Helvetica').text(' ' + value);
}

function drawChartPages(doc, pattern) {
  const { grid, palette, widthStitches, heightRows, stitchGauge, rowGauge } = pattern;

  // Calculate cell size to fit as much chart as possible per page
  // Stitch aspect ratio: width/height = rowGauge/stitchGauge
  const stitchAR = rowGauge / stitchGauge;

  // Leave room for axis labels
  const axisLabelWidth = 30;  // Row numbers on the right
  const axisLabelHeight = 20; // Stitch numbers on the bottom
  const chartAreaWidth = CONTENT_WIDTH - axisLabelWidth;
  const chartAreaHeight = CONTENT_HEIGHT - axisLabelHeight - 30; // 30 for page header

  // Calculate cell dimensions that maintain aspect ratio
  // cellWidth / cellHeight = stitchAR
  // Try to fit max columns first, then check if rows fit
  let cellWidth = Math.min(12, chartAreaWidth / widthStitches);
  let cellHeight = cellWidth / stitchAR;

  // Minimum cell size for readability
  const minCellSize = 4;
  if (cellWidth < minCellSize) cellWidth = minCellSize;
  if (cellHeight < minCellSize) cellHeight = minCellSize;
  cellHeight = cellWidth / stitchAR;

  // How many stitches (cols) and rows fit per page?
  const colsPerPage = Math.floor(chartAreaWidth / cellWidth);
  const rowsPerPage = Math.floor(chartAreaHeight / cellHeight);

  // Overlap for continuity when chart spans multiple pages
  const overlapRows = 2;
  const overlapCols = 2;

  // Calculate page grid
  const effectiveRowsPerPage = rowsPerPage - overlapRows;
  const effectiveColsPerPage = colsPerPage - overlapCols;

  const numPageCols = Math.ceil(widthStitches / effectiveColsPerPage);
  const numPageRows = Math.ceil(heightRows / effectiveRowsPerPage);

  // Draw chart in page sections
  for (let pageRow = 0; pageRow < numPageRows; pageRow++) {
    for (let pageCol = 0; pageCol < numPageCols; pageCol++) {
      doc.addPage();

      // Calculate which stitches/rows this page covers
      const startCol = pageCol * effectiveColsPerPage;
      const startRow = pageRow * effectiveRowsPerPage;
      const endCol = Math.min(startCol + colsPerPage, widthStitches);
      const endRow = Math.min(startRow + rowsPerPage, heightRows);

      const pageCols = endCol - startCol;
      const pageRows = endRow - startRow;

      // Page header
      doc.fontSize(9).font('Helvetica-Bold')
        .text(
          `Chart — Stitches ${startCol + 1}–${endCol} of ${widthStitches}, Rows ${startRow + 1}–${endRow} of ${heightRows}`,
          PAGE.marginLeft, PAGE.marginTop, { width: CONTENT_WIDTH }
        );

      const chartX = PAGE.marginLeft;
      const chartY = PAGE.marginTop + 20;

      // Draw grid cells — bottom-to-top (row 1 at bottom)
      for (let r = 0; r < pageRows; r++) {
        for (let c = 0; c < pageCols; c++) {
          const gridRow = heightRows - 1 - (startRow + (pageRows - 1 - r));
          const gridCol = startCol + c;

          if (gridRow < 0 || gridRow >= heightRows) continue;

          const colorIdx = grid[gridRow][gridCol];
          const color = palette[colorIdx];

          const x = chartX + c * cellWidth;
          const y = chartY + r * cellHeight;

          // Fill cell with color
          doc.rect(x, y, cellWidth, cellHeight).fill(color.hex);

          // Draw symbol for B&W readability
          if (colorIdx > 0 && colorIdx < SYMBOLS.length) {
            const sym = SYMBOLS[colorIdx];
            if (sym) {
              // Choose contrasting text color
              const textColor = isLightColor(color.rgb) ? '#000' : '#fff';
              const fontSize = Math.min(cellWidth * 0.7, cellHeight * 0.7, 8);
              doc.fontSize(fontSize).font('Helvetica-Bold').fillColor(textColor)
                .text(sym, x, y + (cellHeight - fontSize) / 2, {
                  width: cellWidth,
                  align: 'center',
                  lineBreak: false,
                });
            }
          }

          // Cell border
          doc.rect(x, y, cellWidth, cellHeight).lineWidth(0.25).stroke('#888');
          doc.fillColor('#000');
        }
      }

      // Row numbers on the right side (every 5 rows)
      for (let r = 0; r < pageRows; r++) {
        const absoluteRow = startRow + (pageRows - 1 - r) + 1; // 1-indexed, bottom-to-top
        if (absoluteRow % 5 === 0 || absoluteRow === 1 || absoluteRow === heightRows) {
          const y = chartY + r * cellHeight;
          doc.fontSize(6).font('Helvetica').fillColor('#333')
            .text(String(absoluteRow), chartX + pageCols * cellWidth + 3, y + (cellHeight - 6) / 2, {
              width: 25,
              lineBreak: false,
            });
        }
      }

      // Stitch numbers along the bottom (every 10 stitches)
      for (let c = 0; c < pageCols; c++) {
        const absoluteCol = startCol + c + 1; // 1-indexed
        if (absoluteCol % 10 === 0 || absoluteCol === 1 || absoluteCol === widthStitches) {
          const x = chartX + c * cellWidth;
          doc.fontSize(6).font('Helvetica').fillColor('#333')
            .text(String(absoluteCol), x - 5, chartY + pageRows * cellHeight + 3, {
              width: 20,
              align: 'center',
              lineBreak: false,
            });
        }
      }

      doc.fillColor('#000');

      // Page number
      doc.fontSize(7).font('Helvetica').fillColor('#999')
        .text(
          `Page ${pageRow * numPageCols + pageCol + 2}`,
          PAGE.marginLeft, PAGE.height - PAGE.marginBottom + 10,
          { width: CONTENT_WIDTH, align: 'center' }
        );
      doc.fillColor('#000');
    }
  }
}

function drawLegendPage(doc, pattern) {
  doc.fontSize(16).font('Helvetica-Bold')
    .text('Color Legend & Yarn Guide', PAGE.marginLeft, PAGE.marginTop, {
      width: CONTENT_WIDTH,
    });

  doc.moveDown(1);

  const startY = doc.y;
  const swatchSize = 22;
  const rowHeight = 36;

  // Table header
  doc.fontSize(9).font('Helvetica-Bold');
  const cols = {
    swatch: PAGE.marginLeft,
    symbol: PAGE.marginLeft + 35,
    label: PAGE.marginLeft + 60,
    color: PAGE.marginLeft + 100,
    usage: PAGE.marginLeft + 200,
    yardage: PAGE.marginLeft + 260,
    yarn: PAGE.marginLeft + 310,
  };

  doc.text('Color', cols.swatch, doc.y, { width: 40 });
  const headerY = doc.y - 11;
  doc.text('Sym', cols.symbol, headerY, { width: 30 });
  doc.text('Label', cols.label, headerY, { width: 40 });
  doc.text('Hex', cols.color, headerY, { width: 70 });
  doc.text('Usage', cols.usage, headerY, { width: 55 });
  doc.text('Yards', cols.yardage, headerY, { width: 45 });
  doc.text('Suggested Yarn', cols.yarn, headerY, { width: CONTENT_WIDTH - (cols.yarn - PAGE.marginLeft) });

  doc.moveDown(0.5);
  doc.moveTo(PAGE.marginLeft, doc.y).lineTo(PAGE.marginLeft + CONTENT_WIDTH, doc.y).lineWidth(0.5).stroke('#ccc');
  doc.moveDown(0.3);

  // Color rows
  for (let i = 0; i < pattern.palette.length; i++) {
    const color = pattern.palette[i];
    const y = doc.y;

    if (y + rowHeight > PAGE.height - PAGE.marginBottom - 40) {
      doc.addPage();
      doc.y = PAGE.marginTop;
    }

    const rowY = doc.y;

    // Color swatch
    doc.rect(cols.swatch, rowY, swatchSize, swatchSize).fill(color.hex);
    doc.rect(cols.swatch, rowY, swatchSize, swatchSize).lineWidth(0.5).stroke('#999');

    // Symbol
    const sym = i < SYMBOLS.length ? (SYMBOLS[i] || '—') : '?';
    doc.fontSize(12).font('Helvetica-Bold').fillColor('#000')
      .text(sym, cols.symbol, rowY + 4, { width: 25, lineBreak: false });

    // Label
    doc.fontSize(9).font('Helvetica-Bold').fillColor('#000')
      .text(color.label, cols.label, rowY + 6, { width: 40, lineBreak: false });

    // Hex color
    doc.fontSize(8).font('Helvetica').fillColor('#555')
      .text(color.hex.toUpperCase(), cols.color, rowY + 7, { width: 70, lineBreak: false });

    // Usage percentage
    doc.fontSize(8).font('Helvetica').fillColor('#555')
      .text(`${pattern.colorPercentages[i]}%`, cols.usage, rowY + 7, { width: 55, lineBreak: false });

    // Yardage
    doc.fontSize(8).font('Helvetica').fillColor('#555')
      .text(`~${pattern.colorYardages[i]}`, cols.yardage, rowY + 7, { width: 45, lineBreak: false });

    // Yarn suggestion
    doc.fontSize(7).font('Helvetica').fillColor('#666')
      .text(color.yarnSuggestion, cols.yarn, rowY + 4, {
        width: CONTENT_WIDTH - (cols.yarn - PAGE.marginLeft),
        lineBreak: true,
      });

    doc.fillColor('#000');
    doc.y = rowY + rowHeight;
  }

  // Notes section
  doc.moveDown(2);
  doc.fontSize(11).font('Helvetica-Bold').text('Notes');
  doc.moveDown(0.5);
  doc.fontSize(8).font('Helvetica').fillColor('#555');
  doc.text('• Yardage estimates are approximate and assume worsted weight yarn. Adjust for your yarn weight.');
  doc.text('• Yarn color suggestions are approximate matches. Always compare swatches before purchasing.');
  doc.text('• This pattern was generated by StitchCraft. For best results, swatch with your chosen yarn to confirm gauge.');
  doc.text(`• Pattern designed for a gauge of ${pattern.stitchGauge} stitches × ${pattern.rowGauge} rows per 4 inches (10 cm).`);

  doc.fillColor('#000');

  // Footer
  doc.fontSize(7).font('Helvetica').fillColor('#999')
    .text(
      'Generated by StitchCraft',
      PAGE.marginLeft, PAGE.height - PAGE.marginBottom + 10,
      { width: CONTENT_WIDTH, align: 'center' }
    );
}

function isLightColor(rgb) {
  // Perceived brightness
  return (rgb[0] * 0.299 + rgb[1] * 0.587 + rgb[2] * 0.114) > 140;
}

function cmFromInches(inches) {
  return Math.round(inches * 2.54 * 10) / 10;
}
