import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { norm, printableDate } from './helpers';

// ================= PDF Generation Only =================
export async function generateIssuePdf(matrix, { issueDate, supervisor, selectedZips }) {
  if (!matrix) return;

  const line = 0.9;

  function filenameDatePart(d) {
    if (!d) return 'unknown';
    const dt = new Date(d);
    if (isNaN(dt)) return 'unknown';
    return `${dt.getFullYear()}${String(dt.getMonth() + 1).padStart(2,'0')}${String(dt.getDate()).padStart(2,'0')}`;
  }

  function cleanString(v) {
    return norm(v);
  }

  function parsePrice(v) {
    if (typeof v === 'number') return v;
    if (typeof v !== 'string') return 0;
    
    let cleaned = v.replace(/[^\d.]/g, '');
    const parts = cleaned.split('.');
    if (parts.length > 2) {
      cleaned = parts[0] + '.' + parts[1];
    } else if (parts.length === 1) {
      cleaned = parts[0];
    }
    
    const result = parseFloat(cleaned);
    return isNaN(result) ? 0 : result;
  }

  function formatPlainNumber(n) {
    const num = Number(n || 0);
    return num.toFixed(2);
  }

  const normalizedZips = (selectedZips || []).map(zip => ({
    zipType: cleanString(zip.zipType),
    size: cleanString(zip.size),
    color: cleanString(zip.color),
    price: parsePrice(zip.price),
    qty: Math.max(1, parseInt(zip.quantity || zip.qty) || 1),
    pieces: Math.max(1, parseInt(zip.pieces) || 1)
  }));

  const sizesRaw = matrix.sizes || [];
  const sizeLabels = sizesRaw.map(s => (s == null || s === 0 || s === '0') ? '' : String(s));
  const sizes = sizeLabels.map((label, idx) => ({ label, idx })).filter(x => x.label !== '');

  const orientation = (sizes.length + 6) > 12 ? 'landscape' : 'portrait';
  const doc = new jsPDF({ orientation, unit: 'pt', format: 'A4' });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();

  const M = 18;
  const borderPad = 6;
  doc.setDrawColor(0); doc.setTextColor(0); doc.setLineWidth(line);
  const borderX = 8, borderY = 8, borderW = W - 16, borderH = H - 16;
  doc.rect(borderX, borderY, borderW, borderH);

  const CM = M + borderPad;
  const headerTop = CM + 12;
  const contentWidth = W - (CM * 2);

  const minSectionW = 140;
  let sectionW = Math.floor(contentWidth / 3);
  if (sectionW < minSectionW) sectionW = minSectionW;
  if (sectionW * 3 > contentWidth) sectionW = Math.floor(contentWidth / 3);

  const s1X = CM, s2X = s1X + sectionW, s3X = s2X + sectionW, sectionH = 48;
  doc.setLineWidth(0.9);
  doc.rect(CM, headerTop - 6, sectionW * 3, sectionH + 12);
  doc.setLineWidth(0.6);
  doc.rect(s1X, headerTop, sectionW, sectionH);
  doc.rect(s2X, headerTop, sectionW, sectionH);
  doc.rect(s3X, headerTop, sectionW, sectionH);

  doc.setFont('helvetica', 'bold'); doc.setFontSize(14);
  let headingY = headerTop - 10; if (headingY < borderY + 12) headingY = borderY + 12;
  doc.text('ZIP ORDER', borderX + borderW / 2, headingY, { align: 'center' });

  function printLabelValue(label, value, x, y, labelFont = { style: 'bold', size: 11 }, valueFont = { style: 'normal', size: 11 }, maxValueW = null) {
    doc.setFont('helvetica', labelFont.style); doc.setFontSize(labelFont.size);
    doc.text(label, x, y);
    const pad = 6;
    const valueX = x + doc.getTextWidth(label) + pad;
    doc.setFont('helvetica', valueFont.style); doc.setFontSize(valueFont.size);
    let valText = cleanString(value);
    if (maxValueW && doc.getTextWidth(valText) > maxValueW) {
      while (valText.length && doc.getTextWidth(valText + '…') > maxValueW) valText = valText.slice(0, -1);
      valText += '…';
    }
    doc.text(valText, valueX, y);
  }

  // Header boxes content
  const s1InnerX = s1X + 8;
  let s1Y = headerTop + 16;
  printLabelValue('Date', printableDate(issueDate), s1InnerX, s1Y);
  s1Y += 20;
  printLabelValue('Item', cleanString(matrix.garmentType || matrix.style || ''), s1InnerX, s1Y);

  const s2InnerX = s2X + 8;
  let s2Y = headerTop + 16;
  printLabelValue('Fabric', cleanString(matrix.fabric || ''), s2InnerX, s2Y);
  s2Y += 18;
  printLabelValue('Priority', cleanString(matrix.priority ?? ''), s2InnerX, s2Y);

  const s3InnerX = s3X + 8;
  let s3Y = headerTop + 16;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
  const lotVal = cleanString(matrix.lotNumber || '');
  const lotLabelW = doc.getTextWidth('Lot No.');
  const lotAvailable = sectionW - (s3InnerX - s3X) - lotLabelW - 16;
  let lotToPrint = lotVal; let lotFs = 12;
  doc.setFontSize(lotFs);
  while (doc.getTextWidth(lotToPrint) > lotAvailable && lotFs > 8) { lotFs -= 0.5; doc.setFontSize(lotFs); }
  doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.text('Lot No.', s3InnerX, s3Y);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(lotFs); doc.text(lotToPrint, s3InnerX + lotLabelW + 6, s3Y);
  s3Y += 18;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.text('Supervisor: ', s3InnerX, s3Y);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
  doc.text(cleanString(supervisor ?? '________'), s3InnerX + doc.getTextWidth('Supervisor') + 20, s3Y);

  const headerBottomY = headerTop + sectionH + 6;
  const tableTop = Math.max(headerBottomY, headingY + 12) + 8;

  // Main sizes table - REMOVED "M.No" from header
  const head = [[ 'COLOR', ...sizes.map(s => s.label), 'PCS' ]];

  function getSizeCell(r, label, index) {
    if (!r) return '';
    const s = r.sizes;
    if (s && typeof s === 'object' && !Array.isArray(s) && (label in s)) return cleanString(s[label]);
    if (s && (Array.isArray(s) || (typeof s === 'object' && (index in s)))) return cleanString(s[index]);
    if (r[`size_${label}`] !== undefined) return cleanString(r[`size_${label}`]);
    if (r[`size${index}`] !== undefined) return cleanString(r[`size${index}`]);
    if (typeof s === 'string') return cleanString(s);
    if (r[label] !== undefined) return cleanString(r[label]);
    return '';
  }

  const body = (matrix.rows || []).map((r) => {
    const rowSizes = sizes.map(s => getSizeCell(r, s.label, s.idx));
    return [
      cleanString(r.color ?? ''),
      ...rowSizes,
      cleanString(r.totalPcs ?? r.total ?? r.pcs ?? '')
    ];
  });

  function getTotalForSize(label, index) {
    if (!matrix.totals) return '';
    const t = matrix.totals.sizes ?? matrix.totals.sizeTotals ?? matrix.totals;
    if (!t) return '';
    if (t[label] !== undefined) return cleanString(t[label]);
    if (t[index] !== undefined) return cleanString(t[index]);
    return '';
  }

  const footRow = [
    'TOTAL',
    ...sizes.map(s => getTotalForSize(s.label, s.idx)),
    cleanString(matrix.totals?.grand ?? matrix.totals?.total ?? '')
  ];

  const CM2 = CM;
  const available = W - (CM2 * 2);
  
  // Updated column widths: Increased color width, removed M.No width, reduced size widths
  const fixedW = { color: 120, pcs: 45 }; // Increased color from 70 to 120
  const fixedSum = Object.values(fixedW).reduce((a, b) => a + b, 0);
  const sizesCount = sizes.length;
  const desiredSizeW = 16; // Reduced from 18 to 16
  let sizeW = 0;
  if (sizesCount) {
    const candidate = Math.floor((available - fixedSum) / sizesCount);
    sizeW = candidate > desiredSizeW ? candidate : desiredSizeW;
  }
  
  const idxColor = 0, idxFirstSize = 1, idxPcs = idxFirstSize + sizesCount;
  const colStyles = {
    [idxColor]: { halign: 'left', cellWidth: fixedW.color, overflow: 'linebreak' },
    [idxPcs]: { halign: 'center', cellWidth: fixedW.pcs, overflow: 'linebreak' }
  };
  for (let i = 0; i < sizesCount; i++) colStyles[idxFirstSize + i] = { halign: 'center', cellWidth: sizeW, overflow: 'linebreak' };

  autoTable(doc, {
    head, body, foot: [footRow],
    startY: tableTop,
    theme: 'grid',
    tableWidth: available,
    styles: {
      font: 'helvetica',
      fontSize: 9,
      textColor: [0,0,0],
      lineColor: [0,0,0],
      lineWidth: line,
      cellPadding: 5,
      halign: 'center',
      valign: 'middle',
      overflow: 'linebreak'
    },
    headStyles: { fillColor: [255,255,255], textColor: [0,0,0], fontStyle: 'bold', fontSize: 10, halign: 'center' },
    footStyles: { fillColor: [255,255,255], textColor: [0,0,0], fontStyle: 'bold', fontSize: 9, halign: 'center' },
    columnStyles: colStyles,
    margin: { left: CM2, right: CM2 }
  });

  // Selected Zips table
  if (normalizedZips.length > 0) {
    const afterTableY = doc.lastAutoTable ? (doc.lastAutoTable.finalY + 24) : (tableTop + 200);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(12); 
    doc.text('SELECTED ZIPS', CM, afterTableY);
    
    const zipTableTop = afterTableY + 16;

    const zipHead = [['Zip Type', 'Size', 'Color', 'Price', 'Qty', 'Pieces', 'Total']];
    
    const zipBody = normalizedZips.map(z => [
      z.zipType,
      z.size,
      z.color,
      formatPlainNumber(z.price),
      z.qty.toString(),
      z.pieces.toString(),
      formatPlainNumber(z.price * z.qty * z.pieces)
    ]);

    const totalAmount = normalizedZips.reduce((sum, z) => sum + (z.price * z.qty * z.pieces), 0);
    const zipFoot = [[ 
      '', '', '', '', '', 'Total:', 
      formatPlainNumber(totalAmount) 
    ]];

    const zipColStyles = { 
      0: { cellWidth: 130 },
      1: { cellWidth: 45 },
      2: { cellWidth: 130 },
      3: { cellWidth: 50, halign: 'right' }, 
      4: { cellWidth: 65, halign: 'center' }, 
      5: { cellWidth: 45, halign: 'center' }, 
      6: { cellWidth: 80, halign: 'right' } 
    };

    autoTable(doc, {
      head: zipHead,
      body: zipBody,
      foot: zipFoot,
      startY: zipTableTop,
      theme: 'grid',
      tableWidth: available,
      styles: {
        font: 'helvetica',
        fontSize: 9,
        textColor: [0,0,0],
        lineColor: [0,0,0],
        lineWidth: line,
        cellPadding: 4,
        halign: 'left',
      },
      headStyles: { 
        fillColor: [240, 240, 240], 
        textColor: [0,0,0], 
        fontStyle: 'bold',
        halign: 'center'
      },
      footStyles: { 
        fillColor: [240, 240, 240], 
        textColor: [0,0,0], 
        fontStyle: 'bold',
        halign: 'right'
      },
      columnStyles: zipColStyles,
      margin: { left: CM2, right: CM2 }
    });
  }

  const fname = `Lot_${cleanString(matrix.lotNumber || 'Unknown')}_Issue_${filenameDatePart(issueDate)}.pdf`;
  doc.save(fname);
}