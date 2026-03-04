/**
 * PDF generator for knitting patterns.
 * Produces professional, paginated charts with color legend,
 * stitch counts, gauge notes, color usage summary, and
 * project-specific construction instructions.
 */
import PDFDocument from 'pdfkit';
import { getYardsPerStitch } from './patternGenerator.js';

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

// Project type labels and construction data
const PROJECT_INFO = {
  blanket: {
    label: 'Blanket / Afghan',
    description: 'Full colorwork blanket panel.',
  },
  scarf: {
    label: 'Scarf / Cowl',
    description: 'Full-width scarf or cowl panel. Repeat lengthwise for desired length.',
  },
  pillow: {
    label: 'Pillow / Cushion',
    description: 'Front panel of a cushion cover.',
  },
  wallHanging: {
    label: 'Wall Hanging / Tapestry',
    description: 'Decorative wall hanging with hanging rod pocket.',
  },
  sweaterBack: {
    label: 'Sweater — Back Panel',
    description: 'Colorwork chart centered on the back of a sweater.',
  },
  sweaterChestLeft: {
    label: 'Sweater — Chest Patch (Left)',
    description: 'Small colorwork chart positioned on the upper-left chest.',
  },
  sweaterChestRight: {
    label: 'Sweater — Chest Patch (Right)',
    description: 'Small colorwork chart positioned on the upper-right chest.',
  },
  toteBag: {
    label: 'Tote Bag',
    description: 'Front panel of a knitted tote bag.',
  },
};

/**
 * Generate a print-ready PDF buffer for a knitting pattern.
 * @param {import('./patternGenerator.js').KnittingPattern} pattern
 * @returns {Promise<Buffer>}
 */
export async function generatePdf(pattern) {
  return new Promise((resolve, reject) => {
    const projectType = pattern.projectType || 'blanket';
    const projectInfo = PROJECT_INFO[projectType] || PROJECT_INFO.blanket;

    const doc = new PDFDocument({
      size: 'letter',
      margins: {
        top: PAGE.marginTop,
        bottom: PAGE.marginBottom,
        left: PAGE.marginLeft,
        right: PAGE.marginRight,
      },
      info: {
        Title: `Knit It — ${projectInfo.label} Pattern`,
        Author: 'Knit It',
        Subject: `${pattern.widthStitches}st × ${pattern.heightRows}rows colorwork pattern`,
      },
    });

    const chunks = [];
    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Pre-calculate total pages for "Page X of Y" footers
    const numChartPages = calculateChartPageCount(pattern);
    const totalPages = 1 + numChartPages + 1 + 1; // title + charts + legend + construction

    // === PAGE 1: Title & Pattern Info ===
    drawTitlePage(doc, pattern, projectInfo, totalPages);

    // === CHART PAGES ===
    drawChartPages(doc, pattern, totalPages);

    // === LEGEND PAGE ===
    doc.addPage();
    drawLegendPage(doc, pattern, 1 + numChartPages + 1, totalPages);

    // === CONSTRUCTION INSTRUCTIONS PAGE ===
    doc.addPage();
    drawConstructionPage(doc, pattern, projectType, projectInfo, totalPages);

    doc.end();
  });
}

// Needle size lookup by stitch gauge
const NEEDLE_SIZES = {
  12: 'US 10-11 / 6-8mm',
  18: 'US 7-9 / 4.5-5.5mm',
  22: 'US 5-7 / 3.75-4.5mm',
  24: 'US 3-5 / 3.25-3.75mm',
  28: 'US 1-3 / 2.25-3.25mm',
};

function getNeedleSize(stitchGauge) {
  return NEEDLE_SIZES[stitchGauge] || 'Match to your yarn label';
}

function drawTitlePage(doc, pattern, projectInfo, totalPages) {
  // Title
  doc.fontSize(28).font('Helvetica-Bold')
    .text('Knit It', PAGE.marginLeft, PAGE.marginTop, {
      width: CONTENT_WIDTH,
      align: 'center',
    });

  doc.moveDown(0.3);
  doc.fontSize(14).font('Helvetica')
    .text(`${projectInfo.label} — Colorwork Pattern`, { width: CONTENT_WIDTH, align: 'center' });

  doc.moveDown(0.2);
  doc.fontSize(9).font('Helvetica').fillColor('#666')
    .text(projectInfo.description, { width: CONTENT_WIDTH, align: 'center' });
  doc.fillColor('#000');

  doc.moveDown(1.5);

  // Pattern summary box
  const boxY = doc.y;
  const boxHeight = 250;
  doc.roundedRect(PAGE.marginLeft, boxY, CONTENT_WIDTH, boxHeight, 8)
    .lineWidth(1).stroke('#ddd');

  let y = boxY + 16;
  const leftCol = PAGE.marginLeft + 20;

  doc.fontSize(11).font('Helvetica-Bold');

  drawInfoRow(doc, leftCol, y, 'Project:', projectInfo.label);
  y += 22;
  drawInfoRow(doc, leftCol, y, 'Dimensions:', `${pattern.widthStitches} stitches x ${pattern.heightRows} rows`);
  y += 22;
  drawInfoRow(doc, leftCol, y, 'Colors:', `${pattern.palette.length}`);
  y += 22;
  drawInfoRow(doc, leftCol, y, 'Gauge:', `${pattern.stitchGauge} sts x ${pattern.rowGauge} rows = 4" / 10cm`);
  y += 22;
  drawInfoRow(doc, leftCol, y, 'Needle Size:', getNeedleSize(pattern.stitchGauge));
  y += 22;
  drawInfoRow(doc, leftCol, y, 'Finished Size:', `${pattern.finishedWidthInches}" x ${pattern.finishedHeightInches}" (${cmFromInches(pattern.finishedWidthInches)} x ${cmFromInches(pattern.finishedHeightInches)} cm)`);
  y += 22;
  drawInfoRow(doc, leftCol, y, 'Total Stitches:', `${pattern.totalStitches.toLocaleString()}`);

  // Color mini-swatches in the summary
  y += 30;
  doc.fontSize(10).font('Helvetica-Bold')
    .text('Color Palette:', leftCol, y);
  y += 16;

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

  // Table of Contents
  const tocY = boxY + boxHeight + 16;
  doc.fontSize(11).font('Helvetica-Bold')
    .text('Table of Contents', PAGE.marginLeft, tocY);
  doc.moveDown(0.3);
  doc.fontSize(9).font('Helvetica').fillColor('#444');

  const numChartPages = totalPages - 3; // total minus title, legend, construction
  doc.text(`Page 1 .............. Pattern Info & Instructions`, PAGE.marginLeft + 10, doc.y, { width: CONTENT_WIDTH - 20 });
  doc.moveDown(0.15);
  doc.text(`Pages 2-${1 + numChartPages} .......... Chart`, PAGE.marginLeft + 10, doc.y, { width: CONTENT_WIDTH - 20 });
  doc.moveDown(0.15);
  doc.text(`Page ${2 + numChartPages} ............. Color Legend`, PAGE.marginLeft + 10, doc.y, { width: CONTENT_WIDTH - 20 });
  doc.moveDown(0.15);
  doc.text(`Page ${3 + numChartPages} ............. Construction Guide`, PAGE.marginLeft + 10, doc.y, { width: CONTENT_WIDTH - 20 });
  doc.fillColor('#000');

  // Gauge swatch section
  doc.moveDown(1);
  doc.fontSize(11).font('Helvetica-Bold')
    .text('Before You Begin — Gauge Swatch', PAGE.marginLeft, doc.y);
  doc.moveDown(0.4);
  doc.fontSize(9).font('Helvetica').fillColor('#444');
  doc.text(
    `Make a gauge swatch before you begin. Cast on 24 stitches and work 24 rows in stockinette stitch (knit RS rows, purl WS rows). Measure the centre 4" x 4" of the swatch. You should get ${pattern.stitchGauge} stitches and ${pattern.rowGauge} rows per 4". If your swatch is larger than 4", go down one needle size. If smaller, go up one needle size. Your finished piece dimensions depend on matching this gauge exactly.`,
    PAGE.marginLeft + 10, doc.y, { width: CONTENT_WIDTH - 20 }
  );
  doc.fillColor('#000');

  // How to Read This Chart
  doc.moveDown(1);
  doc.fontSize(11).font('Helvetica-Bold')
    .text('How to Read This Chart', PAGE.marginLeft, doc.y);

  doc.moveDown(0.4);
  doc.fontSize(9).font('Helvetica').fillColor('#444');
  const instructions = [
    '• Each square on the chart represents one stitch. Columns = stitches, rows = rows.',
    '• Row 1 is at the bottom of the chart.',
    '• For circular knitting: read every row from right to left.',
    '• For flat knitting: read RS (odd) rows right to left, WS (even) rows left to right.',
    '• Numbers along the right side mark every 5th row. Numbers along the bottom mark every 10th stitch.',
    '• Each color has both a color fill and a symbol, so the chart is usable in both color and B&W printing.',
    `• Chart cells are drawn at the correct stitch aspect ratio for the specified gauge (${pattern.stitchGauge}st x ${pattern.rowGauge}rows per 4").`,
  ];

  for (const line of instructions) {
    doc.text(line, PAGE.marginLeft + 10, doc.y, { width: CONTENT_WIDTH - 20 });
    doc.moveDown(0.15);
  }
  doc.fillColor('#000');

  // Abbreviations table
  doc.moveDown(0.8);
  doc.fontSize(11).font('Helvetica-Bold')
    .text('Abbreviations', PAGE.marginLeft, doc.y);
  doc.moveDown(0.3);

  const abbrevs = [
    ['MC', 'Main Color (most used color)'],
    ['CC1, CC2...', 'Contrast Color 1, 2, etc.'],
    ['RS', 'Right Side (public-facing side)'],
    ['WS', 'Wrong Side (back of work)'],
    ['st(s)', 'Stitch(es)'],
    ['CO', 'Cast On'],
    ['BO', 'Bind Off (cast off)'],
    ['k', 'Knit'],
    ['p', 'Purl'],
    ['rep', 'Repeat'],
  ];

  doc.fontSize(8).font('Helvetica');
  const abbrColLeft = PAGE.marginLeft + 10;
  const abbrColRight = PAGE.marginLeft + 100;

  for (const [term, meaning] of abbrevs) {
    const abbrY = doc.y;
    doc.font('Helvetica-Bold').fillColor('#333').text(term, abbrColLeft, abbrY, { width: 85, lineBreak: false });
    doc.font('Helvetica').fillColor('#555').text(meaning, abbrColRight, abbrY, { width: CONTENT_WIDTH - 110 });
    doc.moveDown(0.05);
  }
  doc.fillColor('#000');

  // Page footer
  drawPageFooter(doc, 1, totalPages);
}

function drawInfoRow(doc, x, y, label, value) {
  doc.fontSize(10).font('Helvetica-Bold').text(label, x, y, { continued: true });
  doc.font('Helvetica').text(' ' + value);
}

function drawPageFooter(doc, pageNum, totalPages) {
  doc.fontSize(7).font('Helvetica').fillColor('#999')
    .text(
      `Page ${pageNum} of ${totalPages}`,
      PAGE.marginLeft, PAGE.height - PAGE.marginBottom + 10,
      { width: CONTENT_WIDTH, align: 'center' }
    );
  doc.fillColor('#000');
}

function getChartLayout(pattern) {
  const { widthStitches, heightRows, stitchGauge, rowGauge } = pattern;
  const stitchAR = rowGauge / stitchGauge;
  const axisLabelWidth = 30;
  const axisLabelHeight = 20;
  const chartAreaWidth = CONTENT_WIDTH - axisLabelWidth;
  const chartAreaHeight = CONTENT_HEIGHT - axisLabelHeight - 50; // extra space for mini key

  let cellWidth = Math.min(12, chartAreaWidth / widthStitches);
  let cellHeight = cellWidth / stitchAR;
  const minCellSize = 4;
  if (cellWidth < minCellSize) cellWidth = minCellSize;
  cellHeight = cellWidth / stitchAR;

  const colsPerPage = Math.floor(chartAreaWidth / cellWidth);
  const rowsPerPage = Math.floor(chartAreaHeight / cellHeight);
  const overlapRows = 2;
  const overlapCols = 2;
  const effectiveRowsPerPage = rowsPerPage - overlapRows;
  const effectiveColsPerPage = colsPerPage - overlapCols;
  const numPageCols = Math.ceil(widthStitches / effectiveColsPerPage);
  const numPageRows = Math.ceil(heightRows / effectiveRowsPerPage);

  return { stitchAR, axisLabelWidth, axisLabelHeight, chartAreaWidth, chartAreaHeight,
    cellWidth, cellHeight, colsPerPage, rowsPerPage, effectiveRowsPerPage, effectiveColsPerPage,
    numPageCols, numPageRows };
}

function calculateChartPageCount(pattern) {
  const { numPageCols, numPageRows } = getChartLayout(pattern);
  return numPageCols * numPageRows;
}

function drawChartPages(doc, pattern, totalPages) {
  const { grid, palette, widthStitches, heightRows } = pattern;
  const { cellWidth, cellHeight, colsPerPage, rowsPerPage,
    effectiveRowsPerPage, effectiveColsPerPage, numPageCols, numPageRows } = getChartLayout(pattern);

  for (let pageRow = 0; pageRow < numPageRows; pageRow++) {
    for (let pageCol = 0; pageCol < numPageCols; pageCol++) {
      doc.addPage();

      const startCol = pageCol * effectiveColsPerPage;
      const startRow = pageRow * effectiveRowsPerPage;
      const endCol = Math.min(startCol + colsPerPage, widthStitches);
      const endRow = Math.min(startRow + rowsPerPage, heightRows);

      const pageCols = endCol - startCol;
      const pageRows = endRow - startRow;

      doc.fontSize(9).font('Helvetica-Bold')
        .text(
          `Chart — Stitches ${startCol + 1}–${endCol} of ${widthStitches}, Rows ${startRow + 1}–${endRow} of ${heightRows}`,
          PAGE.marginLeft, PAGE.marginTop, { width: CONTENT_WIDTH }
        );

      const chartX = PAGE.marginLeft;
      const chartY = PAGE.marginTop + 20;

      for (let r = 0; r < pageRows; r++) {
        for (let c = 0; c < pageCols; c++) {
          const gridRow = startRow + (pageRows - 1 - r);
          const gridCol = startCol + c;

          if (gridRow < 0 || gridRow >= heightRows) continue;

          const colorIdx = grid[gridRow][gridCol];
          const color = palette[colorIdx];

          const x = chartX + c * cellWidth;
          const y = chartY + r * cellHeight;

          doc.rect(x, y, cellWidth, cellHeight).fill(color.hex);

          if (colorIdx > 0 && colorIdx < SYMBOLS.length) {
            const sym = SYMBOLS[colorIdx];
            if (sym) {
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

          doc.rect(x, y, cellWidth, cellHeight).lineWidth(0.25).stroke('#888');
          doc.fillColor('#000');
        }
      }

      // Row numbers
      for (let r = 0; r < pageRows; r++) {
        const absoluteRow = startRow + (pageRows - 1 - r) + 1;
        if (absoluteRow % 5 === 0 || absoluteRow === 1 || absoluteRow === heightRows) {
          const y = chartY + r * cellHeight;
          doc.fontSize(6).font('Helvetica').fillColor('#333')
            .text(String(absoluteRow), chartX + pageCols * cellWidth + 3, y + (cellHeight - 6) / 2, {
              width: 25,
              lineBreak: false,
            });
        }
      }

      // Stitch numbers
      for (let c = 0; c < pageCols; c++) {
        const absoluteCol = startCol + c + 1;
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

      // Mini symbol/color key for colors used on this page
      const usedOnPage = new Set();
      for (let r = 0; r < pageRows; r++) {
        const gridRow = startRow + (pageRows - 1 - r);
        if (gridRow < 0 || gridRow >= heightRows) continue;
        for (let c = 0; c < pageCols; c++) {
          usedOnPage.add(grid[gridRow][startCol + c]);
        }
      }

      const keyY = chartY + pageRows * cellHeight + 16;
      let keyX = PAGE.marginLeft;
      doc.fontSize(7).font('Helvetica');
      for (const idx of [...usedOnPage].sort((a, b) => a - b)) {
        const color = palette[idx];
        if (keyX + 70 > PAGE.marginLeft + CONTENT_WIDTH) {
          keyX = PAGE.marginLeft;
          // If we'd overflow vertically, skip
        }
        doc.rect(keyX, keyY, 8, 8).fill(color.hex);
        doc.rect(keyX, keyY, 8, 8).lineWidth(0.3).stroke('#999');
        const sym = idx < SYMBOLS.length ? (SYMBOLS[idx] || '-') : '?';
        doc.fillColor('#333').text(`${sym} ${color.label}`, keyX + 10, keyY, { width: 55, lineBreak: false });
        keyX += 65;
        doc.fillColor('#000');
      }

      const chartPageNum = pageRow * numPageCols + pageCol + 2;
      drawPageFooter(doc, chartPageNum, totalPages);
    }
  }
}

function drawLegendPage(doc, pattern, pageNum, totalPages) {
  doc.fontSize(16).font('Helvetica-Bold')
    .text('Color Legend & Yarn Guide', PAGE.marginLeft, PAGE.marginTop, {
      width: CONTENT_WIDTH,
    });

  doc.moveDown(1);

  const swatchSize = 22;
  const rowHeight = 36;

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

  for (let i = 0; i < pattern.palette.length; i++) {
    if (pattern.colorYardages[i] === 0) continue;
    const color = pattern.palette[i];
    const y = doc.y;

    if (y + rowHeight > PAGE.height - PAGE.marginBottom - 40) {
      doc.addPage();
      doc.y = PAGE.marginTop;
    }

    const rowY = doc.y;

    doc.rect(cols.swatch, rowY, swatchSize, swatchSize).fill(color.hex);
    doc.rect(cols.swatch, rowY, swatchSize, swatchSize).lineWidth(0.5).stroke('#999');

    const sym = i < SYMBOLS.length ? (SYMBOLS[i] || '—') : '?';
    doc.fontSize(12).font('Helvetica-Bold').fillColor('#000')
      .text(sym, cols.symbol, rowY + 4, { width: 25, lineBreak: false });

    doc.fontSize(9).font('Helvetica-Bold').fillColor('#000')
      .text(color.label, cols.label, rowY + 6, { width: 40, lineBreak: false });

    doc.fontSize(8).font('Helvetica').fillColor('#555')
      .text(color.hex.toUpperCase(), cols.color, rowY + 7, { width: 70, lineBreak: false });

    doc.fontSize(8).font('Helvetica').fillColor('#555')
      .text(`${pattern.colorPercentages[i]}%`, cols.usage, rowY + 7, { width: 55, lineBreak: false });

    doc.fontSize(8).font('Helvetica').fillColor('#555')
      .text(`~${Math.max(1, pattern.colorYardages[i])}`, cols.yardage, rowY + 7, { width: 45, lineBreak: false });

    const yarnText = color.affiliateUrl
      ? `${color.yarnSuggestion}\n${color.affiliateUrl}`
      : color.yarnSuggestion;
    doc.fontSize(7).font('Helvetica').fillColor('#666')
      .text(yarnText, cols.yarn, rowY + 4, {
        width: CONTENT_WIDTH - (cols.yarn - PAGE.marginLeft),
        lineBreak: true,
        link: color.affiliateUrl || undefined,
      });

    doc.fillColor('#000');
    doc.y = rowY + rowHeight;
  }

  // Notes section
  doc.moveDown(2);
  doc.fontSize(11).font('Helvetica-Bold').text('Notes');
  doc.moveDown(0.5);
  doc.fontSize(8).font('Helvetica').fillColor('#555');
  doc.text('• Yardage estimates are calibrated for stranded colorwork and include a 20% safety buffer for tails, swatching, and color management.');
  doc.text('• Yarn color suggestions are approximate matches. Always compare swatches before purchasing.');
  doc.text('• This pattern was generated by Knit It. For best results, swatch with your chosen yarn to confirm gauge.');
  doc.text(`• Pattern designed for a gauge of ${pattern.stitchGauge} stitches × ${pattern.rowGauge} rows per 4 inches (10 cm).`);

  if (pattern.floatAnalysis?.hasLongFloats) {
    doc.moveDown(0.3);
    doc.fontSize(8).font('Helvetica-Bold').fillColor('#c00');
    doc.text(`⚠ Long floats detected: up to ${pattern.floatAnalysis.maxFloat} consecutive stitches in one color (${pattern.floatAnalysis.rowsWithLongFloats} of ${pattern.floatAnalysis.totalRows} rows affected).`);
    doc.font('Helvetica').fillColor('#555');
    doc.text('  Consider using catch stitches (trapping the float yarn every 3-5 stitches) to prevent snagging and maintain even tension.');
  }

  doc.fillColor('#000');
  drawPageFooter(doc, pageNum, totalPages);
}

function drawConstructionPage(doc, pattern, projectType, projectInfo, totalPages) {
  doc.fontSize(16).font('Helvetica-Bold')
    .text(`Construction Guide: ${projectInfo.label}`, PAGE.marginLeft, PAGE.marginTop, {
      width: CONTENT_WIDTH,
    });

  doc.moveDown(1);

  const totalYards = pattern.colorYardages.reduce((a, b) => a + b, 0);
  const w = pattern.finishedWidthInches;
  const h = pattern.finishedHeightInches;

  // Project-specific instructions
  const instructions = getConstructionInstructions(projectType, pattern, totalYards, w, h);

  doc.fontSize(10).font('Helvetica-Bold').text('Instructions');
  doc.moveDown(0.5);
  doc.fontSize(9).font('Helvetica').fillColor('#333');

  for (const line of instructions) {
    if (line.startsWith('##')) {
      doc.moveDown(0.5);
      doc.fontSize(10).font('Helvetica-Bold').fillColor('#000')
        .text(line.replace('## ', ''));
      doc.moveDown(0.3);
      doc.fontSize(9).font('Helvetica').fillColor('#333');
    } else {
      doc.text(line, PAGE.marginLeft + 10, doc.y, { width: CONTENT_WIDTH - 20 });
      doc.moveDown(0.15);
    }
  }

  // Materials list
  doc.moveDown(1);
  doc.fontSize(10).font('Helvetica-Bold').fillColor('#000').text('Materials');
  doc.moveDown(0.5);
  doc.fontSize(9).font('Helvetica').fillColor('#333');

  const materials = getMaterialsList(projectType, pattern, totalYards, w, h);
  for (const item of materials) {
    doc.text(`• ${item}`, PAGE.marginLeft + 10, doc.y, { width: CONTENT_WIDTH - 20 });
    doc.moveDown(0.15);
  }

  doc.fillColor('#000');

  drawPageFooter(doc, totalPages, totalPages);
}

function getConstructionInstructions(projectType, pattern, totalYards, w, h) {
  const castOn = pattern.widthStitches;
  const rows = pattern.heightRows;

  switch (projectType) {
    case 'blanket':
      return [
        `• Cast on ${castOn} stitches using long-tail cast on.`,
        `• Work the ${rows}-row colorwork chart from bottom to top.`,
        `• Bind off all stitches loosely in MC.`,
        '• Weave in all ends on the WS, working each tail along the same color where possible.',
        `• Finished dimensions: ${w}" × ${h}" (${cmFromInches(w)} × ${cmFromInches(h)} cm).`,
        '## Optional Border',
        '• Pick up stitches evenly around all four edges.',
        '• Work 4-6 rows of garter stitch in MC for a simple border.',
        '• Bind off loosely. Block to measurements.',
      ];

    case 'scarf':
      return [
        `• Cast on ${castOn} stitches using long-tail cast on.`,
        `• Work the ${rows}-row colorwork chart from bottom to top.`,
        `• Chart width = scarf width (${w}").`,
        '• For a longer scarf, repeat the chart pattern until desired length is reached.',
        '• A typical scarf is 60-70" long. You may need to repeat the chart multiple times.',
        '• Bind off all stitches loosely.',
        '## Optional Border',
        '• Add 3-4 rows of seed stitch or garter stitch at each end to prevent curling.',
        '• Consider adding fringe: cut 8" lengths, attach in groups of 3-4 along each short edge.',
      ];

    case 'pillow':
      return [
        '## Front Panel (Colorwork)',
        `• Cast on ${castOn} stitches using long-tail cast on.`,
        `• Work the ${rows}-row colorwork chart from bottom to top.`,
        '• Bind off all stitches loosely.',
        '## Back Panel (Solid)',
        `• Cast on ${castOn} stitches in MC.`,
        `• Work ${rows} rows of stockinette stitch.`,
        '• Bind off all stitches.',
        '## Assembly',
        '• Block both panels to matching dimensions.',
        '• Place panels with right sides together.',
        '• Seam three sides using mattress stitch.',
        `• Insert a ${Math.round(w) + 1}" × ${Math.round(h) + 1}" pillow form (1" larger than finished dimensions for a plump fit).`,
        '• Seam the fourth side, or add a zipper/button closure for removable cover.',
      ];

    case 'wallHanging':
      return [
        `• Cast on ${castOn} stitches using long-tail cast on.`,
        `• Work the ${rows}-row colorwork chart from bottom to top.`,
        '• Bind off all stitches loosely.',
        '## Hanging Rod Pocket',
        `• Cast on ${castOn} stitches in MC.`,
        '• Work 8-10 rows of stockinette stitch.',
        '• Bind off loosely.',
        '• Fold the pocket strip in half lengthwise and sew it to the top back of the hanging.',
        '• Insert a dowel rod or branch (cut 1-2" wider than the hanging) through the pocket.',
        '## Finishing',
        '• Block the hanging flat. Let dry completely.',
        '• Optional: add a fringe or tassel along the bottom edge.',
        '• Attach a cord or ribbon to each end of the rod for hanging.',
      ];

    case 'sweaterBack':
      return [
        '## Important Note',
        '• This is a colorwork chart panel, NOT a full sweater pattern.',
        '• Integrate this chart into your existing sweater pattern.',
        '• Adjust stitch counts to match your sweater pattern\'s gauge and width.',
        '## Placement Instructions',
        `• Chart is ${castOn} stitches wide × ${rows} rows tall.`,
        `• To center on the back panel of a sweater:`,
        `• Calculate: (total back stitches - ${castOn}) ÷ 2 = stitches on each side in MC.`,
        '• Example for a back panel of 80 stitches:',
        `•   Work ${Math.max(0, Math.floor((80 - castOn) / 2))} stitches in MC, work row 1 of chart over ${castOn} stitches, work remaining ${Math.max(0, Math.ceil((80 - castOn) / 2))} stitches in MC.`,
        '• Begin the chart at your desired row (typically after the ribbing and a few plain rows).',
        '• Work each chart row across the center stitches, maintaining MC on either side.',
      ];

    case 'sweaterChestLeft':
    case 'sweaterChestRight': {
      const side = projectType === 'sweaterChestLeft' ? 'left' : 'right';
      const sideInset = projectType === 'sweaterChestLeft' ? 'right edge' : 'left edge';
      return [
        '## Important Note',
        '• This is a small colorwork chart patch, NOT a full sweater pattern.',
        '• Integrate this chart into your existing sweater front pattern.',
        '## Placement Instructions',
        `• Chart is ${castOn} stitches wide × ${rows} rows tall.`,
        `• Position on the upper-${side} chest of the front panel.`,
        `• Offset from the ${sideInset}: approximately 2-3" (5-8 cm) inward.`,
        `• Start the chart approximately 2" (5 cm) below the shoulder seam.`,
        '• Calculate your specific stitch offset based on your gauge:',
        `•   Horizontal offset: inset stitches = (desired inches × stitches per inch)`,
        `•   Vertical offset: inset rows = (desired inches × rows per inch)`,
        `• Work background stitches in MC on either side of the chart.`,
        '• When not working chart rows, continue in MC across all stitches.',
      ];
    }

    case 'toteBag':
      return [
        '## Front Panel (Colorwork)',
        `• Cast on ${castOn} stitches using long-tail cast on.`,
        `• Work the ${rows}-row colorwork chart from bottom to top.`,
        '• Bind off all stitches.',
        '## Back Panel (Solid)',
        `• Cast on ${castOn} stitches in MC.`,
        `• Work ${rows} rows of stockinette stitch.`,
        '• Bind off all stitches.',
        '## Handles (make 2)',
        '• Cast on 8-10 stitches in MC.',
        '• Work in seed stitch or i-cord for 20-24" (50-60 cm).',
        '• Bind off.',
        '## Assembly',
        '• Block all pieces. Place front and back panels right sides together.',
        '• Seam bottom and both sides using mattress stitch.',
        '• Attach handles: pin each handle 2-3" inward from side seams on each panel.',
        '• Sew handle ends securely to the inside of the bag opening.',
        '• Optional: line the bag with fabric for structure.',
      ];

    default:
      return [
        `• Cast on ${castOn} stitches.`,
        `• Work the ${rows}-row colorwork chart.`,
        '• Bind off all stitches loosely.',
      ];
  }
}

function getMaterialsList(projectType, pattern, totalYards, w, h) {
  const yarnList = pattern.palette.map((color, i) => {
    const yards = pattern.colorYardages[i];
    return `${color.label} (${color.colorName}): ~${yards} yards — ${color.yarnSuggestion}`;
  });

  const extras = [];

  switch (projectType) {
    case 'blanket':
      extras.push(`Total yarn: ~${totalYards} yards`);
      extras.push(`Needles: size appropriate for your gauge (${pattern.stitchGauge} st / 4")`);
      extras.push('Tapestry needle for weaving in ends');
      break;
    case 'scarf':
      extras.push(`Total yarn per repeat: ~${totalYards} yards (multiply by number of repeats)`);
      extras.push('Needles: size appropriate for gauge');
      extras.push('Optional: fringe yarn (~20 yards MC)');
      break;
    case 'pillow': {
      // Back panel is roughly the same area as the front — estimate MC yardage for it
      const pillowBackYards = Math.ceil(pattern.totalStitches * getYardsPerStitch(pattern.stitchGauge) * 1.15);
      extras.push(`Total yarn: ~${totalYards + pillowBackYards} yards (includes ~${pillowBackYards} yards MC for solid back panel)`);
      extras.push(`Pillow form: ${Math.round(w) + 1}" × ${Math.round(h) + 1}" (1" larger for plump fit)`);
      extras.push('Tapestry needle for seaming and weaving in ends');
      extras.push('Optional: zipper or buttons for removable cover');
      break;
    }
    case 'wallHanging': {
      const pocketYards = Math.ceil(pattern.widthStitches * 10 * getYardsPerStitch(pattern.stitchGauge) * 1.2);
      extras.push(`Total yarn: ~${totalYards + pocketYards} yards (includes ~${pocketYards} yards MC for hanging rod pocket)`);
      extras.push(`Wooden dowel or branch: ${Math.round(w) + 2}" long`);
      extras.push('Cord or ribbon for hanging');
      break;
    }
    case 'sweaterBack':
    case 'sweaterChestLeft':
    case 'sweaterChestRight':
      extras.push(`Colorwork yarn: ~${totalYards} yards (plus your sweater pattern yarn)`);
      extras.push('Note: yarn amounts are for the chart only; sweater body yarn is separate');
      break;
    case 'toteBag': {
      const toteBackYards = Math.ceil(pattern.totalStitches * getYardsPerStitch(pattern.stitchGauge) * 1.15);
      const handleYards = 50; // ~50 yards for two handles
      extras.push(`Total yarn: ~${totalYards + toteBackYards + handleYards} yards (includes ~${toteBackYards} yards MC for back panel and ~${handleYards} yards for handles)`);
      extras.push('Tapestry needle, pins');
      extras.push('Optional: lining fabric, bag handles');
      break;
    }
  }

  return [...yarnList, '', ...extras];
}


function isLightColor(rgb) {
  return (rgb[0] * 0.299 + rgb[1] * 0.587 + rgb[2] * 0.114) > 140;
}

function cmFromInches(inches) {
  return Math.round(inches * 2.54 * 10) / 10;
}
