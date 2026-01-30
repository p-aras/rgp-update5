// PurchaseOrderForm.jsx
import { useEffect, useMemo, useState, useRef } from "react";
import { jsPDF } from "jspdf";

/** =========================
 * CONFIG
 * ========================= */
const WEB_APP_BASE =
  "https://script.google.com/macros/s/AKfycbwgTLaWyLWejtKNzIhLMlBi22XOsag4YabaQnzc5xuSIC-Bp6-QrQcjoHIqtaFXHuXWAA/exec";

const SHEET_ID = "1hy43mDxXtGVq4jeMV_NxX25Q7tnX55NnplN7eqpT74k";
const RANGE_A1 = "SHEET1!A1:C";
const API_KEY = "AIzaSyAomDFBkOySlIxKWSKGHe6ATv9gvaBr7uk";

/** =========================
 * Local Storage Keys
 * ========================= */
const LOCAL_STORAGE_KEYS = {
  SHADE_ENABLED: "po_shade_enabled",
  DESCRIPTIONS: "po_descriptions",
  SHADES: "po_shades",
  GST_ENABLED: "po_gst_enabled",
  GST_PERCENTAGE: "po_gst_percentage"
};

/** =========================
 * utils
 * ========================= */
const fmtMoney = (n) =>
  (Number.isFinite(+n) ? +n : 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

// Enhanced PO Number Generation with timestamp for guaranteed uniqueness
function makeUniquePoNumber() {
  const now = new Date();
  // Get time components in HHMMSS format
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");
  
  // Combine to create PO-HHMMSS format (e.g., PO-064859)
  return `PO-${hours}${minutes}${seconds}`;
}


const blankRow = () => ({ 
  department: "", 
  description: "", 
  shade: "", 
  uom: "", 
  qty: 0, 
  rate: 0 
});
const todayISO = () => new Date().toISOString().slice(0, 10);
const nowTime = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};
const toDate = (dateStr, timeStr) => {
  if (!dateStr) return null;
  const [h, m] = (timeStr || "00:00").split(":").map((x) => parseInt(x || "0", 10));
  const [Y, M, D] = dateStr.split("-").map((x) => parseInt(x, 10));
  return new Date(Y, (M || 1) - 1, D || 1, h || 0, m || 0, 0);
};
const humanDuration = (ms) => {
  if (ms == null) return "";
  const sign = ms < 0 ? -1 : 1;
  ms = Math.abs(ms);
  const hours = Math.floor(ms / 36e5);
  const days = Math.floor(hours / 24);
  const remH = hours % 24;
  const mins = Math.floor((ms % 36e5) / 60000);
  const parts = [];
  if (days) parts.push(`${days}d`);
  if (remH) parts.push(`${remH}h`);
  if (!days && !remH) parts.push(`${mins}m`);
  const txt = parts.join(" ");
  return sign < 0 ? `-${txt}` : txt;
};

async function fetchSheetRows(sheetId, rangeA1, apiKey) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(
    rangeA1
  )}?key=${apiKey}`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Sheets API error: ${resp.status}`);
  const data = await resp.json();
  const values = data.values || [];
  const rows = [];
  for (let i = 1; i < values.length; i++) {
    const [dept = "", item = "", rate = ""] = values[i] || [];
    const numRate = Number(rate) || 0;
    if (dept || item) rows.push({ dept: String(dept).trim(), item: String(item).trim(), rate: numRate });
  }
  return rows;
}

function downloadPdfBlob(doc, fileName) {
  const blob = doc.output("blob");
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName || "PO.pdf";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

/** QR (QuickChart) → dataURL */
async function toDataURL_QR(qrText, size = 300) {
  const src = `https://quickchart.io/qr?text=${encodeURIComponent(qrText)}&size=${size}&margin=4&ecLevel=H`;
  return await new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = img.width; c.height = img.height;
      const ctx = c.getContext("2d");
      ctx.drawImage(img, 0, 0);
      resolve(c.toDataURL("image/png"));
    };
    img.onerror = () => reject(new Error("QR image load failed"));
    img.src = src;
  });
}

/** Build PO QR URLs that match Apps Script (action=gate/receive) */
function buildPoQrUrls({ base = WEB_APP_BASE, poNo, orderDate, expectedDate, supervisorName }) {
  const enc = encodeURIComponent;
  const who = supervisorName ? `&who=${enc(supervisorName)}` : "";
  const gateUrl = `${base}?action=gate&po=${enc(poNo)}&date=${enc(orderDate || "")}${who}`;
  const recvUrl = `${base}?action=receive&po=${enc(poNo)}&rdate=${enc(expectedDate || "")}${who}`;
  return { gateUrl, recvUrl };
}

/** =========================
 * Local Storage Utilities - FIXED VERSION
 * ========================= */
function getLocalStorageItem(key, defaultValue) {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (e) {
    console.error(`Error reading ${key} from localStorage:`, e);
    return defaultValue;
  }
}

function setLocalStorageItem(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error(`Error saving ${key} to localStorage:`, e);
  }
}

// NEW: Debounced save function to prevent saving partial words
let saveDescriptionTimeout = null;
let saveShadeTimeout = null;

function saveDescriptionWithDebounce(description) {
  if (!description || !description.trim()) return;
  
  // Clear previous timeout
  if (saveDescriptionTimeout) {
    clearTimeout(saveDescriptionTimeout);
  }
  
  // Set new timeout to save after 1.5 seconds of inactivity
  saveDescriptionTimeout = setTimeout(() => {
    const trimmedValue = description.trim();
    if (trimmedValue.length < 2) return; // Don't save very short entries
    
    const savedItems = getLocalStorageItem(LOCAL_STORAGE_KEYS.DESCRIPTIONS, []);
    if (!savedItems.includes(trimmedValue)) {
      const updatedItems = [trimmedValue, ...savedItems.filter(item => item !== trimmedValue)];
      // Keep only last 50 items to avoid too many suggestions
      setLocalStorageItem(LOCAL_STORAGE_KEYS.DESCRIPTIONS, updatedItems.slice(0, 50));
    }
    saveDescriptionTimeout = null;
  }, 1500); // 1.5 second delay
}

function saveShadeWithDebounce(shade) {
  if (!shade || !shade.trim()) return;
  
  // Clear previous timeout
  if (saveShadeTimeout) {
    clearTimeout(saveShadeTimeout);
  }
  
  // Set new timeout to save after 1.5 seconds of inactivity
  saveShadeTimeout = setTimeout(() => {
    const trimmedValue = shade.trim();
    if (trimmedValue.length < 2) return; // Don't save very short entries
    
    const savedItems = getLocalStorageItem(LOCAL_STORAGE_KEYS.SHADES, []);
    if (!savedItems.includes(trimmedValue)) {
      const updatedItems = [trimmedValue, ...savedItems.filter(item => item !== trimmedValue)];
      // Keep only last 50 items to avoid too many suggestions
      setLocalStorageItem(LOCAL_STORAGE_KEYS.SHADES, updatedItems.slice(0, 50));
    }
    saveShadeTimeout = null;
  }, 1500); // 1.5 second delay
}

// Manual save function for blur event
function saveDescriptionOnBlur(description) {
  if (!description || !description.trim()) return;
  const trimmedValue = description.trim();
  if (trimmedValue.length < 2) return;
  
  const savedItems = getLocalStorageItem(LOCAL_STORAGE_KEYS.DESCRIPTIONS, []);
  if (!savedItems.includes(trimmedValue)) {
    const updatedItems = [trimmedValue, ...savedItems.filter(item => item !== trimmedValue)];
    setLocalStorageItem(LOCAL_STORAGE_KEYS.DESCRIPTIONS, updatedItems.slice(0, 50));
  }
}

function saveShadeOnBlur(shade) {
  if (!shade || !shade.trim()) return;
  const trimmedValue = shade.trim();
  if (trimmedValue.length < 2) return;
  
  const savedItems = getLocalStorageItem(LOCAL_STORAGE_KEYS.SHADES, []);
  if (!savedItems.includes(trimmedValue)) {
    const updatedItems = [trimmedValue, ...savedItems.filter(item => item !== trimmedValue)];
    setLocalStorageItem(LOCAL_STORAGE_KEYS.SHADES, updatedItems.slice(0, 50));
  }
}

/** =========================
 * PDF - UPDATED VERSION with GST support
 * ========================= */
function generatePurchaseOrderPDF({ payload, options = {} }) {
  const { 
    qrGateImage = null, 
    qrRecvImage = null, 
    qrSide = 96, 
    shadeEnabled = false,
    gstEnabled = false,
    gstPercentage = 0
  } = options;
  
  const doc = new jsPDF({ unit: "pt", format: "a3" });
  doc.setFont("helvetica", "normal");
  doc.setLineWidth(0.8); // Increased line width for darker borders

  // ---- Page dimensions
  const page = { 
    w: doc.internal.pageSize.getWidth(), 
    h: doc.internal.pageSize.getHeight(), 
    m: 40, 
    gap: 12 
  };

  // ---- Helper functions
  const setSize = (s) => doc.setFontSize(s);
  const bold = () => doc.setFont(undefined, "bold");
  const normal = () => doc.setFont(undefined, "normal");
  const text = (t, x, y, opt = {}) => doc.text(String(t ?? ""), x, y, opt);
  const rtext = (t, x, y, opt = {}) => text(t, x, y, { align: "right", ...opt });
  const ctext = (t, x, y, opt = {}) => text(t, x, y, { align: "center", ...opt });
  const line = (x1, y1, x2, y2) => {
    doc.setDrawColor(0, 0, 0); // Set line color to black
    doc.line(x1, y1, x2, y2);
  };
  const wrap = (str, w) => doc.splitTextToSize(String(str || ""), w);
  const money = (n) =>
    (Number.isFinite(+n) ? +n : 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const roundRect = (x, y, w, h, r = 7, style = "S") => {
    doc.setDrawColor(0, 0, 0); // Set border color to black
    if (doc.roundedRect) {
      return doc.roundedRect(x, y, w, h, r, r, style);
    } else {
      return doc.rect(x, y, w, h, style);
    }
  };

  // Helper function to draw rectangle with black border
  const drawRect = (x, y, w, h, style = "S") => {
    doc.setDrawColor(0, 0, 0); // Set border color to black
    doc.rect(x, y, w, h, style);
  };

  // ---- Layout constants
  const SIG_H = 92;
  const QR_TITLE_H = 18;
  const QR_SIDE = qrSide || 96;
  const BOTTOM_QR_H = QR_TITLE_H + 8 + QR_SIDE + 10;
  const FOOTER_HEIGHT = BOTTOM_QR_H + 12 + SIG_H + 8;
  
  // Calculate where footer starts (top of the footer section)
  const FOOTER_START_Y = page.h - page.m - FOOTER_HEIGHT;
  
  // Space available for content (from top margin to footer start)
  const CONTENT_MAX_Y = FOOTER_START_Y - 20; // 20px buffer above footer

  let y = page.m; // Current Y position

  // ---- Function to check if we need new page for content
  const needSpaceForContent = (requiredHeight) => {
    if (y + requiredHeight > CONTENT_MAX_Y) {
      // Draw footer on current page
      drawFooterOnPage();
      
      // Add new page with border
      doc.addPage();
      doc.setDrawColor(0, 0, 0); // Set border color to black
      roundRect(16, 16, page.w - 32, page.h - 32, 8, "S"); // Draw border
      
      // Reset Y position and draw header
      y = page.m;
      drawPageHeader();
      return true;
    }
    return false;
  };

  // ---- Draw page header (title + line) on every page
  const drawPageHeader = () => {
    setSize(20);
    bold();
    text("PURCHASE ORDER", page.w / 2, y, { align: "center" });
    normal();
    line(page.m, y + 6, page.w - page.m, y + 6);
    y += 26; // Move Y down after header
  };

  // ---- Draw footer on every page
  const drawFooterOnPage = () => {
    const innerW = page.w - 2 * page.m;
    const colW = (innerW - page.gap * 2) / 3;
    const x1 = page.m, x2 = x1 + colW + page.gap, x3 = x2 + colW + page.gap;

    const sigTop = page.h - page.m - SIG_H;
    const blockTop = sigTop - 12 - BOTTOM_QR_H;

    // Left small box: MATERIAL RECEIVED SCAN + QR
    roundRect(x1, blockTop, colW, BOTTOM_QR_H, 7, "S");
    setSize(10);
    bold(); text("MATERIAL RECEIVED", x1 + 10, blockTop + 14); normal();
    line(x1 + 10, blockTop + 18, x1 + colW - 10, blockTop + 18);
    if (qrRecvImage) {
      const qx = x1 + 10 + (colW - 20 - QR_SIDE) / 2;
      const qy = blockTop + 18 + 10;
      try { doc.addImage(qrRecvImage, "PNG", qx, qy, QR_SIDE, QR_SIDE); } catch {}
    }

    // Wide right box (spans two columns): REMARKS
    const bigW = colW * 2 + page.gap;
    roundRect(x2, blockTop, bigW, BOTTOM_QR_H, 7, "S");
    setSize(10);
    bold(); ctext("REMARKS", x2 + bigW / 2, blockTop + 14); normal();
    line(x2 + 10, blockTop + 18, x2 + bigW - 10, blockTop + 18);
    
    // Add remarks text if available - PROPERLY CENTERED
    if (payload.meta?.remarks && payload.meta.remarks.trim() !== "") {
      const remarksLines = doc.splitTextToSize(payload.meta.remarks, bigW - 60); // More padding for centering
      
      // Calculate starting Y position to center vertically
      const totalTextHeight = remarksLines.length * 12;
      const boxCenterY = blockTop + BOTTOM_QR_H / 2;
      const textStartY = boxCenterY - totalTextHeight / 2 + 6; // Adjust for better centering
      
      // Ensure text doesn't start too high
      const minStartY = blockTop + 28;
      const actualStartY = Math.max(textStartY, minStartY);
      
      let ry = actualStartY;
      remarksLines.forEach(lineText => {
        if (ry < blockTop + BOTTOM_QR_H - 10) { // Ensure text stays within box
          ctext(lineText.trim(), x2 + bigW / 2, ry);
          ry += 12;
        }
      });
    } else {
      // Center "No remarks provided" both horizontally and vertically
      const boxCenterY = blockTop + BOTTOM_QR_H / 2;
      ctext("No remarks provided", x2 + bigW / 2, boxCenterY, { fontStyle: "italic", opacity: 0.5 });
    }

    // Signatures (3 equal)
    [x1, x2, x3].forEach((x) => roundRect(x, sigTop, colW, SIG_H, 7, "S"));
    bold();
    text("PREPARED BY", x1 + 10, sigTop + 16);
    text("APPROVED BY", x2 + 10, sigTop + 16);
    text("SUPPLIER'S",  x3 + 10, sigTop + 16);
    normal();

    const writeSig = (x, showName) => {
      const baseY = sigTop + SIG_H - 26;
      text("Signature", x + 10, baseY - 10);
      line(x + 10, baseY - 8, x + colW - 10, baseY - 8);
      text("Name:", x + 10, baseY + 2);
      if (showName && payload.meta?.supervisorName) text(payload.meta.supervisorName, x + 46, baseY + 2);
      text("Date:", x + 10, baseY + 14);
    };
    writeSig(x1, true);
    writeSig(x2, false);
    writeSig(x3, false);
  };

  // =========================
  // START PDF GENERATION
  // =========================
  
  // Draw border on first page with black color
  doc.setDrawColor(0, 0, 0);
  roundRect(16, 16, page.w - 32, page.h - 32, 8, "S");
  
  // Draw header on first page
  drawPageHeader();

  // =========================
  // TOP SECTION (only on first page)
  // =========================
  (function drawTopSection() {
    const innerW = page.w - 2 * page.m;
    const rPO = 0.44, rSup = 0.26, rGate = 0.30;
    const wAvail = innerW - page.gap * 2;
    const wPO = Math.floor(wAvail * rPO);
    const wSup = Math.floor(wAvail * rSup);
    const wGate = wAvail - wPO - wSup;

    const x1 = page.m;
    const x2 = x1 + wPO + page.gap;
    const x3 = x2 + wSup + page.gap;

    const metaPad = 12, lblW = 84;
    const mRows = [
      ["PO #", (payload.meta?.poNumber || "").replace(/\s+/g, "")],
      ["Order", [payload.meta?.orderDate, payload.meta?.orderTime].filter(Boolean).join(" ")],
      ...(payload.meta?.expectedDate ? [["Expected", payload.meta.expectedDate]] : []),
      ...(payload.meta?.leadTimeHuman ? [["Lead Time", payload.meta.leadTimeHuman]] : []),
      ...(payload.meta?.supervisorName ? [["Authorized By", payload.meta.supervisorName]] : []),
    ];
    const metaH = 22 + mRows.length * 16 + 16;

    const supPad = 12;
    const supBodyW = wSup - supPad * 2;
    const supLines = [
      payload.supplierName || "",
      ...wrap(payload.supplierAddress || "", supBodyW),
      ...(payload.supplierPhone ? [`Phone: ${payload.supplierPhone}`] : []),
      ...(payload.supplierEmail ? [`Email: ${payload.supplierEmail}`] : []),
    ];
    const supH = 22 + supLines.filter(Boolean).length * 12 + 16;

    const gateH = QR_TITLE_H + 8 + QR_SIDE + 10;

    const blockH = Math.max(metaH, supH, gateH);
    
    // Check if we have space for top section
    if (needSpaceForContent(blockH)) {
      return;
    }

    // Draw PO DETAILS with black border
    roundRect(x1, y, wPO, blockH, 7, "S");
    setSize(12);
    bold(); text("PO DETAILS", x1 + 12, y + 14); normal();
    line(x1 + 12, y + 18, x1 + wPO - 12, y + 18);
    let my = y + 30;
    mRows.forEach(([label, value]) => {
      bold(); text(`${label}:`, x1 + metaPad, my);
      normal(); text(value || "", x1 + metaPad + lblW, my, { maxWidth: wPO - metaPad * 2 - lblW });
      my += 16;
    });

    // Draw SUPPLIER INFO with black border
    roundRect(x2, y, wSup, blockH, 7, "S");
    setSize(12);
    bold(); text("SUPPLIER", x2 + 12, y + 14); normal();
    line(x2 + 12, y + 18, x2 + wSup - 12, y + 18);
    let sy = y + 30;
    supLines.forEach((ln) => { if (ln) { text(ln, x2 + supPad, sy); sy += 12; } });

    // Draw GATE-IN SCANNER with black border
    roundRect(x3, y, wGate, blockH, 7, "S");
    setSize(11);
    bold(); text("GATE IN — SCAN (FORM)", x3 + 12, y + 14); normal();
    line(x3 + 12, y + 18, x3 + wGate - 12, y + 18);
    if (qrGateImage) {
      const qx = x3 + 12 + (wGate - 24 - QR_SIDE) / 2;
      const qy = y + 18 + 10;
      try { doc.addImage(qrGateImage, "PNG", qx, qy, QR_SIDE, QR_SIDE); } catch {}
    }

    y += blockH + 16;
  })();

  // =========================
  // TABLE SECTION - SIMPLIFIED COLUMN CALCULATION
  // =========================
// =========================
// TABLE SECTION - FIXED VERSION with proper shade column handling
// =========================
(function drawTable() {
  const x0 = page.m, innerW = page.w - 2 * page.m;
  setSize(11); normal();

  const rows = (payload.rows || []).map((r, i) => {
    const qStr = (+r.qty || 0).toLocaleString();
    const rateStr = money(+r.rate || 0);
    const amt = (+r.qty || 0) * (+r.rate || 0);
    const amtStr = money(amt);
    return { ...r, _i: i, _qtyStr: qStr, _rateStr: rateStr, _amtStr: amtStr };
  });

  // Calculate totals for width estimation
  let totalSum = rows.reduce((sum, r) => sum + ((+r.qty || 0) * (+r.rate || 0)), 0);
  const gstAmount = gstEnabled ? (totalSum * gstPercentage) / 100 : 0;
  const grandTotal = totalSum + gstAmount;
  
  // DYNAMIC COLUMN WIDTH CALCULATION - Works for both with and without shade
  // Base widths that work well for A3 (larger page)
  const BASE_WIDTHS = {
    line: 40,        // Line number
    department: 120, // Department
    description: 250, // Description (will be adjusted)
    shade: 120,      // Shade column (only if enabled)
    uom: 70,         // Unit of measure
    qty: 80,         // Quantity
    rate: 90,        // Rate
    amount: 110      // Amount
  };
  
  // Define columns based on shadeEnabled
  let cols;
  if (shadeEnabled) {
    cols = [
      { key: "line", title: "#", w: BASE_WIDTHS.line, align: "right" },
      { key: "department", title: "DEPARTMENT", w: BASE_WIDTHS.department },
      { key: "description", title: "DESCRIPTION", w: BASE_WIDTHS.description },
      { key: "shade", title: "SHADE", w: BASE_WIDTHS.shade },
      { key: "uom", title: "UOM", w: BASE_WIDTHS.uom, align: "center" },
      { key: "qty", title: "QTY", w: BASE_WIDTHS.qty, align: "right" },
      { key: "rate", title: "RATE", w: BASE_WIDTHS.rate, align: "right" },
      { key: "amount", title: "AMOUNT", w: BASE_WIDTHS.amount, align: "right" },
    ];
  } else {
    cols = [
      { key: "line", title: "#", w: BASE_WIDTHS.line, align: "right" },
      { key: "department", title: "DEPARTMENT", w: BASE_WIDTHS.department },
      { key: "description", title: "DESCRIPTION", w: BASE_WIDTHS.description },
      { key: "uom", title: "UOM", w: BASE_WIDTHS.uom, align: "center" },
      { key: "qty", title: "QTY", w: BASE_WIDTHS.qty, align: "right" },
      { key: "rate", title: "RATE", w: BASE_WIDTHS.rate, align: "right" },
      { key: "amount", title: "AMOUNT", w: BASE_WIDTHS.amount, align: "right" },
    ];
  }
  
  // Calculate total fixed width
  let totalFixedWidth = cols.reduce((sum, col) => sum + col.w, 0);
  
  // Calculate available width for description column adjustment
  const widthDiff = innerW - totalFixedWidth;
  
  // Adjust description width to fit available space
  const descColIndex = cols.findIndex(col => col.key === "description");
  if (descColIndex >= 0 && widthDiff !== 0) {
    // Adjust description column width
    cols[descColIndex].w = Math.max(150, cols[descColIndex].w + widthDiff);
    
    // Recalculate total width after adjustment
    totalFixedWidth = cols.reduce((sum, col) => sum + col.w, 0);
  }
  
  // Re-check if we still fit within page (should always fit after adjustment)
  if (totalFixedWidth > innerW) {
    // If still too wide, reduce description width
    const overflow = totalFixedWidth - innerW;
    if (descColIndex >= 0) {
      cols[descColIndex].w = Math.max(100, cols[descColIndex].w - overflow);
    }
  }
  
  // Calculate column X positions
  const xs = [x0];
  let cumulativeX = x0;
  for (let i = 0; i < cols.length; i++) {
    cumulativeX += cols[i].w;
    xs.push(cumulativeX);
  }

  const headerH = 30, baseH = 24;

  // Draw table header
  const drawTableHeader = () => {
    if (needSpaceForContent(headerH)) {
      // We're on a new page now
    }
    
    // Draw table header with black border
    doc.setDrawColor(0, 0, 0);
    drawRect(x0, y, innerW, headerH);
    setSize(12); bold();
    cols.forEach((c, i) => {
      const cx = c.align === "right" ? xs[i + 1] - 10 : 
                 c.align === "center" ? (xs[i] + xs[i + 1]) / 2 : 
                 xs[i] + 10;
      const opt = c.align === "right" ? { align: "right" } : 
                  c.align === "center" ? { align: "center" } : 
                  {};
      text(c.title, cx, y + 20, opt);
      if (i > 0) {
        doc.setDrawColor(0, 0, 0);
        line(xs[i], y, xs[i], y + headerH);
      }
    });
    normal(); 
    y += headerH;
  };

  // Draw single row
  const drawTableRow = (r, idx) => {
    const descColIndex = cols.findIndex(col => col.key === "description");
    const shadeColIndex = shadeEnabled ? cols.findIndex(col => col.key === "shade") : -1;
    
    const descWidth = descColIndex >= 0 ? cols[descColIndex].w - 20 : 0;
    const shadeWidth = shadeColIndex >= 0 ? cols[shadeColIndex].w - 20 : 0;
    
    const descLines = doc.splitTextToSize(r.description || "", descWidth);
    const shadeLines = shadeEnabled ? doc.splitTextToSize(r.shade || "", shadeWidth) : [];
    
    const rowH = Math.max(baseH, descLines.length * 14 + 10, shadeLines.length * 14 + 10);
    
    if (needSpaceForContent(rowH)) {
      drawTableHeader();
    }
    
    // Draw row with black border
    doc.setDrawColor(0, 0, 0);
    drawRect(x0, y, innerW, rowH);
    for (let i = 1; i < xs.length - 1; i++) {
      doc.setDrawColor(0, 0, 0);
      line(xs[i], y, xs[i], y + rowH);
    }
    const yy = y + 16;
    
    // Draw cell contents
    let colIndex = 0;
    
    // Line #
    rtext(r.line ?? idx + 1, xs[colIndex + 1] - 10, yy);
    colIndex++;
    
    // Department
    text(r.department || "", xs[colIndex] + 10, yy);
    colIndex++;
    
    // Description
    descLines.forEach((ln, j) => text(ln, xs[colIndex] + 10, yy + j * 14));
    colIndex++;
    
    // Shade (if enabled)
    if (shadeEnabled) {
      if (shadeLines.length > 0) {
        shadeLines.forEach((ln, j) => text(ln, xs[colIndex] + 10, yy + j * 14));
      } else {
        text(r.shade || "", xs[colIndex] + 10, yy);
      }
      colIndex++;
    }
    
    // UOM
    text(r.uom || "", (xs[colIndex] + xs[colIndex + 1]) / 2, yy, { align: "center" });
    colIndex++;
    
    // Quantity
    rtext(r._qtyStr, xs[colIndex + 1] - 10, yy);
    colIndex++;
    
    // Rate
    rtext(r._rateStr, xs[colIndex + 1] - 10, yy);
    colIndex++;
    
    // Amount
    rtext(r._amtStr, xs[colIndex + 1] - 10, yy);
    
    y += rowH;
    return (+r.qty || 0) * (+r.rate || 0);
  };

  // Draw initial table header
  drawTableHeader();
  
  // Reset totalSum calculation
  totalSum = 0;
  rows.forEach((r, i) => {
    totalSum += drawTableRow(r, i);
  });
  
  // Draw total rows with GST calculation
  const finalGstAmount = gstEnabled ? (totalSum * gstPercentage) / 100 : 0;
  const finalGrandTotal = totalSum + finalGstAmount;
  
  // Find the amount column index for drawing lines
  const amountColIndex = cols.findIndex(col => col.key === "amount");
  const rateColIndex = cols.findIndex(col => col.key === "rate");
  
  // Subtotal row
  const subtotalH = 26;
  if (needSpaceForContent(subtotalH + (gstEnabled ? 26 : 0) + 30)) {
    drawTableHeader();
  }
  
  doc.setDrawColor(0, 0, 0);
  drawRect(x0, y, innerW, subtotalH);
  
  // Draw vertical line before amount column
  if (rateColIndex >= 0) {
    doc.setDrawColor(0, 0, 0);
    line(xs[rateColIndex], y, xs[rateColIndex], y + subtotalH);
  }
  
  setSize(12); bold();
  text("SUBTOTAL", x0 + 10, y + 18);
  rtext(money(totalSum), xs[xs.length - 1] - 10, y + 18);
  normal(); 
  y += subtotalH;
  
  // GST row (if enabled)
  if (gstEnabled) {
    doc.setDrawColor(0, 0, 0);
    drawRect(x0, y, innerW, subtotalH);
    
    // Draw vertical line before amount column
    if (rateColIndex >= 0) {
      doc.setDrawColor(0, 0, 0);
      line(xs[rateColIndex], y, xs[rateColIndex], y + subtotalH);
    }
    
    setSize(12); bold();
    text(`GST ${gstPercentage}%`, x0 + 10, y + 18);
    rtext(money(finalGstAmount), xs[xs.length - 1] - 10, y + 18);
    normal(); 
    y += subtotalH;
  }
  
  // Grand Total row
  const totalH = 30;
  doc.setDrawColor(0, 0, 0);
  drawRect(x0, y, innerW, totalH);
  
  // Draw vertical line before amount column
  if (rateColIndex >= 0) {
    doc.setDrawColor(0, 0, 0);
    line(xs[rateColIndex], y, xs[rateColIndex], y + totalH);
  }
  
  setSize(14); bold();
  text(gstEnabled ? "GRAND TOTAL" : "TOTAL", x0 + 10, y + 20);
  rtext(money(finalGrandTotal), xs[xs.length - 1] - 12, y + 20);
  normal(); 
  y += totalH;
})();

  // =========================
  // FINAL FOOTER
  // =========================
  drawFooterOnPage();

  return doc;
}

/** =========================
 * POST helper — strict ok/json.ok handling + 429 backoff
 * ========================= */
async function postPOToSheet(webAppUrl, payload, { maxRetries = 3 } = {}) {
  const body = "data=" + encodeURIComponent(JSON.stringify(payload));
  let attempt = 0,
    delay = 400;
  while (true) {
    attempt++;
    try {
      const res = await fetch(webAppUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
        mode: "cors",
        body,
      });
      const json = await res.json().catch(() => null);

      if (res.status === 429 && attempt <= maxRetries) {
        await new Promise((r) => setTimeout(r, delay));
        delay *= 2;
        continue;
      }

      if (!res.ok) {
        return { ok: false, status: res.status, json };
      }
      if (!json?.ok) {
        return { ok: false, status: json?.code || res.status, json };
      }
      return { ok: true, json };
    } catch (err) {
      if (attempt <= maxRetries) {
        await new Promise((r) => setTimeout(r, delay));
        delay *= 2;
        continue;
      }
      return { ok: false, error: String(err) };
    }
  }
}

/** =========================
 * COMPONENT
 * ========================= */
export default function PurchaseOrderForm({
  company = {
    name: "StitchPro Pvt. Ltd.",
    address: "Plot 42, Industrial Area, Jaipur, RJ",
    gstin: "08AABCS1234F1Z2",
    phone: "+91 98765 43210",
    email: "accounts@stitchpro.example",
  },
  poCountSoFar = 0,
  onSave = (po) => console.log("SAVE →", po),
  onSubmitForApproval = (po) => console.log("SUBMIT →", po),
}) {
  const [poNumber, setPoNumber] = useState(makeUniquePoNumber());
  const [orderDate, setOrderDate] = useState(todayISO());
  const [orderTime, setOrderTime] = useState(nowTime());
  const [expectedDate, setExpectedDate] = useState("");
  const [expectedTime, setExpectedTime] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [rows, setRows] = useState([blankRow()]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSupervisorDialog, setShowSupervisorDialog] = useState(false);
  const [supervisorName, setSupervisorName] = useState("");
  const [remarks, setRemarks] = useState("");
  
  // New state for shade feature
  const [shadeEnabled, setShadeEnabled] = useState(() => 
    getLocalStorageItem(LOCAL_STORAGE_KEYS.SHADE_ENABLED, false)
  );
  const [savedDescriptions, setSavedDescriptions] = useState(() => 
    getLocalStorageItem(LOCAL_STORAGE_KEYS.DESCRIPTIONS, [])
  );
  const [savedShades, setSavedShades] = useState(() => 
    getLocalStorageItem(LOCAL_STORAGE_KEYS.SHADES, [])
  );
  
  // New state for GST feature
  const [gstEnabled, setGstEnabled] = useState(() => 
    getLocalStorageItem(LOCAL_STORAGE_KEYS.GST_ENABLED, false)
  );
  const [gstPercentage, setGstPercentage] = useState(() => 
    getLocalStorageItem(LOCAL_STORAGE_KEYS.GST_PERCENTAGE, 18)
  );
  const [showGstDialog, setShowGstDialog] = useState(false);

  const [sheetRows, setSheetRows] = useState([]);
  const [loadingSheet, setLoadingSheet] = useState(false);
  const [sheetError, setSheetError] = useState("");

  const printableRef = useRef(null);

const UOM_OPTIONS = [
  // Count
  "PCS","SET","PAIR","DOZEN","GROSS","NOS","UNIT",

  // Weight
  "MG","GRAM","KG","QUINTAL","TON",

  // Length
  "MM","CM","MTR","INCH","FEET","YARD","KM",

  // Area
  "SQMM","SQCM","SQM","SQFT","SQYD","SFT",

  // Volume
  "ML","LTR","KL","CC","CUM",

  // Packaging
  "ROLL","BUNDLE","BOX","PACK","BAG","SACK","CARTON","PALLET",

  // Fabric / Garment specific
  "MTRS","KGS","CONES","HANK","BALE",

  // Time / Work
  "SEC","MIN","HOUR","DAY","WEEK","MONTH",

  // Job / Service
  "JOB","SHIFT","LOT","ORDER","LOAD"
];


  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoadingSheet(true);
        const data = await fetchSheetRows(SHEET_ID, RANGE_A1, API_KEY);
        if (mounted) setSheetRows(data);
      } catch (err) {
        if (mounted) setSheetError(err?.message || "Failed to load sheet.");
      } finally {
        if (mounted) setLoadingSheet(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Save shade enabled state to localStorage
  useEffect(() => {
    setLocalStorageItem(LOCAL_STORAGE_KEYS.SHADE_ENABLED, shadeEnabled);
  }, [shadeEnabled]);

  // Save GST state to localStorage
  useEffect(() => {
    setLocalStorageItem(LOCAL_STORAGE_KEYS.GST_ENABLED, gstEnabled);
    setLocalStorageItem(LOCAL_STORAGE_KEYS.GST_PERCENTAGE, gstPercentage);
  }, [gstEnabled, gstPercentage]);

  // Load saved descriptions and shades on mount
  useEffect(() => {
    setSavedDescriptions(getLocalStorageItem(LOCAL_STORAGE_KEYS.DESCRIPTIONS, []));
    setSavedShades(getLocalStorageItem(LOCAL_STORAGE_KEYS.SHADES, []));
  }, []);

  const departments = useMemo(() => {
    const set = new Set(sheetRows.map((r) => r.dept).filter(Boolean));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [sheetRows]);

  const itemsByDept = useMemo(() => {
    const map = new Map();
    sheetRows.forEach(({ dept, item }) => {
      if (!dept || !item) return;
      if (!map.has(dept)) map.set(dept, new Set());
      map.get(dept).add(item);
    });
    const obj = {};
    for (const [k, v] of map.entries()) obj[k] = Array.from(v).sort((a, b) => a.localeCompare(b));
    return obj;
  }, [sheetRows]);

  const rateByItem = useMemo(() => {
    const m = new Map();
    sheetRows.forEach(({ item, rate }) => {
      if (!item) return;
      m.set(item, Number(rate) || 0);
    });
    return m;
  }, [sheetRows]);

  const rowAmount = (r) => (+r.qty || 0) * (+r.rate || 0);

  const totals = useMemo(() => {
    let sub = 0;
    rows.forEach((r) => (sub += rowAmount(r)));
    const gstAmount = gstEnabled ? (sub * gstPercentage) / 100 : 0;
    const grandTotal = sub + gstAmount;
    return { 
      sub, 
      discountTotal: 0, 
      taxTotal: 0, 
      gstAmount,
      gstPercentage: gstEnabled ? gstPercentage : 0,
      gross: sub,
      payable: grandTotal, 
      grandTotal,
      roundAdj: 0 
    };
  }, [rows, gstEnabled, gstPercentage]);

  const orderDT    = toDate(orderDate, orderTime);
  const expectedDT = toDate(expectedDate, expectedTime);
  const leadMs     = orderDT && expectedDT ? expectedDT - orderDT : null;
  const leadHuman  = humanDuration(leadMs);

  const updateRow = (idx, patch) => {
    setRows((prev) => {
      const next = [...prev];
      const old = next[idx];
      let updated = { ...old, ...patch };
      next[idx] = updated;
      return next;
    });
  };

  const addRow = () => setRows((r) => [...r, blankRow()]);
  const removeRow = (idx) =>
    setRows((r) => (r.length === 1 ? [blankRow()] : r.filter((_, i) => i !== idx)));

  const validate = () => {
    const errs = [];
    if (!WEB_APP_BASE.includes("/exec")) errs.push("WEB_APP_BASE must be a deployed /exec URL.");
    if (!poNumber.trim()) errs.push("PO Number is required.");
    if (!supplierName.trim()) errs.push("Supplier is required.");
    
    // CHANGED: Removed rate validation - allow zero rates and manual entries
    const hasValidLine = rows.some(
      (r) => r.department && r.description && (+r.qty || 0) > 0
    );
    if (!hasValidLine)
      errs.push("At least one line with Department, Item, and Qty > 0 is required.");
    if (orderDT && expectedDT && expectedDT < orderDT)
      errs.push("Expected Material Date/Time cannot be before Order Date/Time.");
    return errs;
  };

  const makePayload = (extraMeta = {}) => ({
    meta: {
      poNumber,
      orderDate: orderDate || null,
      orderTime: orderTime || null,
      expectedDate: expectedDate || null,
      expectedTime: expectedTime || null,
      orderDateTimeISO: orderDT ? orderDT.toISOString() : null,
      expectedDateTimeISO: expectedDT ? expectedDT.toISOString() : null,
      leadTimeMs: leadMs,
      leadTimeHuman: leadHuman || null,
      supervisorName: extraMeta.supervisorName || null,
      remarks: remarks || "",
      createdAt: new Date().toISOString(),
      shadeEnabled,
      gstEnabled,
      gstPercentage: gstEnabled ? gstPercentage : 0,
    },
    company,
    supplierName,
    rows: rows.map((r, i) => ({
      line: i + 1,
      department: r.department,
      description: r.description,
      shade: r.shade || "", // Include shade in rows
      uom: r.uom,
      qty: +r.qty || 0,
      rate: +r.rate || 0,
      amount: rowAmount(r),
    })),
    totals,
    notes: "",
  });

  async function handleSave() {
    const errs = validate();
    if (errs.length) return alert(errs.join("\n"));
    const payload = makePayload();
    const res = await postPOToSheet(WEB_APP_BASE, payload);
    if (!res.ok) {
      const msg =
        res.json?.error ||
        (res.status === 409 ? "Duplicate PO number. Please change PO Number." : "") ||
        res.error ||
        `HTTP ${res.status || "?"}`;
      return alert(`Could not save PO.\n${msg}`);
    }
    onSave(payload);
    alert(`Saved PO ${payload.meta.poNumber} to Google Sheet ✅`);
    
    // ✅ Optional: Reset form after save too
    resetForm();
  }

  const handleOpenSubmitDialog = () => {
    const errs = validate();
    if (errs.length) return alert(errs.join("\n"));
    setShowSupervisorDialog(true);
  };

  /** SUBMIT: save to sheet → build QR (action=gate/receive) → PDF */
  async function handleConfirmSubmit() {
    if (isSubmitting) return;
    const name = (supervisorName || "").trim();
    if (!name) return alert("Please enter Supervisor Name.");

    setIsSubmitting(true);
    setShowSupervisorDialog(false);

    try {
      const payload = makePayload({ supervisorName: name });
      const res = await postPOToSheet(WEB_APP_BASE, payload);
      if (!res.ok) {
        const msg =
          res.json?.error ||
          (res.status === 409 ? "Duplicate PO number. Please change PO Number." : "") ||
          `HTTP ${res.status || "?"}`;
        throw new Error(msg);
      }

      const poNo = payload.meta.poNumber;

      const { gateUrl, recvUrl } = buildPoQrUrls({
        base: WEB_APP_BASE,
        poNo,
        orderDate: payload.meta.orderDate,
        expectedDate: payload.meta.expectedDate,
        supervisorName: name,
      });

      const [gateQR, recvQR] = await Promise.all([
        toDataURL_QR(gateUrl, 320),
        toDataURL_QR(recvUrl, 320),
      ]);

      const doc = generatePurchaseOrderPDF({
        payload,
        options: { 
          qrGateImage: gateQR, 
          qrRecvImage: recvQR, 
          qrSide: 96,
          shadeEnabled,
          gstEnabled,
          gstPercentage: gstEnabled ? gstPercentage : 0
        },
      });
      downloadPdfBlob(doc, `${payload.meta.poNumber}.pdf`);
      onSubmitForApproval(payload);
      
      // ✅ RESET ALL FIELDS AFTER SUCCESSFUL SUBMISSION
      resetForm();
      
    } catch (e) {
      alert(e.message || String(e));
    } finally {
      setIsSubmitting(false);
    }
  }

  // ✅ ADD THIS FUNCTION: Reset all fields to blank
  const resetForm = () => {
    setPoNumber(makeUniquePoNumber()); // Generate new PO number
    setOrderDate(todayISO()); // Reset to today's date
    setOrderTime(nowTime()); // Reset to current time
    setExpectedDate(""); // Blank expected date
    setExpectedTime(""); // Blank expected time
    setSupplierName(""); // Blank supplier name
    setRows([blankRow()]); // Reset to one blank row
    setSupervisorName(""); // Blank supervisor name
    setRemarks(""); // Reset remarks
  };

  /** PDF preview without saving — uses action=gate/receive URLs */
  async function handleDownloadPdf() {
    const payload = makePayload();
    const poNo = payload.meta.poNumber;

    const { gateUrl, recvUrl } = buildPoQrUrls({
      base: WEB_APP_BASE,
      poNo,
      orderDate: payload.meta.orderDate,
      expectedDate: payload.meta.expectedDate,
      supervisorName, // optional
    });

    const [gateQR, recvQR] = await Promise.all([
      toDataURL_QR(gateUrl, 320),
      toDataURL_QR(recvUrl, 320),
    ]);

    const doc = generatePurchaseOrderPDF({ 
      payload, 
      options: { 
        qrGateImage: gateQR, 
        qrRecvImage: recvQR, 
        qrSide: 96,
        shadeEnabled,
        gstEnabled,
        gstPercentage: gstEnabled ? gstPercentage : 0
      } 
    });
    downloadPdfBlob(doc, `${poNumber}.pdf`);
  }

  // Regenerate PO Number with new timestamp
  const regeneratePoNumber = () => {
    setPoNumber(makeUniquePoNumber());
  };

  // Toggle shade feature
  const toggleShadeEnabled = () => {
    const newState = !shadeEnabled;
    setShadeEnabled(newState);
    
    // If disabling shade, clear shade values from all rows
    if (!newState) {
      setRows(rows.map(row => ({ ...row, shade: "" })));
    }
  };

  // Toggle GST feature
  const handleGstToggle = () => {
    if (!gstEnabled) {
      setShowGstDialog(true);
    } else {
      setGstEnabled(false);
    }
  };

  const handleGstConfirm = () => {
    if (!gstPercentage || gstPercentage <= 0 || gstPercentage > 100) {
      alert("Please enter a valid GST percentage between 0.01 and 100");
      return;
    }
    setGstEnabled(true);
    setShowGstDialog(false);
  };

  // Handle description input change with debouncing
  const handleDescriptionChange = (idx, value) => {
    updateRow(idx, { description: value });
    saveDescriptionWithDebounce(value);
  };

  // Handle shade input change with debouncing
  const handleShadeChange = (idx, value) => {
    updateRow(idx, { shade: value });
    saveShadeWithDebounce(value);
  };

  // Handle back navigation
  const handleBackNavigation = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      // If there's no history, redirect to home or previous page
      window.location.href = "/";
    }
  };

  function UomSelect({ value, onChange, disabled }) {
    const UOMS = UOM_OPTIONS;
    const hasCustom = value && !UOMS.includes(String(value).toUpperCase());
    return (
      <select
        className="uom-select"
        value={hasCustom ? "__custom__" : value || ""}
        onChange={(e) => {
          const v = e.target.value;
          if (v === "__custom__") {
            const entered = window.prompt("Enter custom UOM", value || "");
            if (entered && entered.trim()) onChange(entered.trim().toUpperCase());
            else onChange("");
          } else onChange(v);
        }}
        disabled={disabled}
      >
        <option value="">Select UOM</option>
        {UOMS.map((u) => (
          <option key={u} value={u}>
            {u}
          </option>
        ))}
        <option value="__custom__">{hasCustom ? value : "Custom…"}</option>
      </select>
    );
  }

  return (
    <div className="modern-po">
      <style>{`
        .modern-po {
          min-height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 0;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          position: relative;
          overflow-x: hidden;
        }

        .modern-po::before {
          content: '';
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          height: 300px;
          background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
          z-index: 0;
        }

        .po-container {
          max-width: 2100px;
          margin: 0 auto;
          background: white;
          border-radius: 24px;
          box-shadow: 
            0 25px 50px -12px rgba(0, 0, 0, 0.25),
            0 0 0 1px rgba(255, 255, 255, 0.1);
          overflow: hidden;
          position: relative;
          z-index: 1;
          margin-top: 40px;
          margin-bottom: 40px;
        }

        .po-header {
          background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
          color: white;
          padding: 32px 40px;
          position: relative;
          overflow: hidden;
        }

        .po-header::before {
          content: '';
          position: absolute;
          top: 0;
          right: 0;
          width: 200px;
          height: 200px;
          background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 70%);
          border-radius: 50%;
        }

        .header-content {
          position: relative;
          z-index: 2;
        }

        .po-title {
          font-size: 32px;
          font-weight: 800;
          margin-bottom: 8px;
          background: linear-gradient(135deg, #fff 0%, #e0e7ff 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .po-subtitle {
          font-size: 16px;
          opacity: 0.9;
          font-weight: 500;
        }

        .po-content {
          padding: 0;
        }

        .content-grid {
          display: grid;
          grid-template-columns: 300px 1fr;
          min-height: 800px;
        }

        .sidebar {
          background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);
          border-right: 1px solid #e2e8f0;
          padding: 32px 24px;
        }

        .nav-section {
          margin-bottom: 32px;
        }

        .nav-title {
          font-size: 12px;
          font-weight: 700;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .nav-title::before {
          content: '';
          width: 3px;
          height: 12px;
          background: #4f46e5;
          border-radius: 2px;
        }

        .nav-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          border-radius: 12px;
          color: #475569;
          font-weight: 500;
          transition: all 0.2s ease;
          cursor: pointer;
          margin-bottom: 8px;
        }

        .nav-item:hover {
          background: rgba(99, 102, 241, 0.1);
          color: #4f46e5;
          transform: translateX(4px);
        }

        .nav-item.active {
          background: #4f46e5;
          color: white;
          box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);
        }

        .nav-icon {
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .main-content {
          padding: 32px 40px;
          background: #ffffff;
        }

        .section-card {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 20px;
          padding: 32px;
          margin-bottom: 24px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          transition: all 0.3s ease;
        }

        .section-card:hover {
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
          transform: translateY(-2px);
        }

        .section-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 24px;
        }

        .section-icon {
          width: 48px;
          height: 48px;
          background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 20px;
        }

        .section-title {
          font-size: 20px;
          font-weight: 700;
          color: #1e293b;
        }

        .section-subtitle {
          font-size: 14px;
          color: #64748b;
          margin-top: 4px;
        }

        .form-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 20px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .form-label {
          font-size: 14px;
          font-weight: 600;
          color: #374151;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .form-label::before {
          content: '';
          width: 4px;
          height: 4px;
          background: #4f46e5;
          border-radius: 50%;
        }

        .form-input, .form-select, .form-textarea {
          padding: 14px 16px;
          border: 2px solid #f1f5f9;
          border-radius: 12px;
          font-size: 15px;
          transition: all 0.2s ease;
          background: #f8fafc;
          font-family: inherit;
        }

        .form-textarea {
          min-height: 100px;
          resize: vertical;
        }

        .form-input:focus, .form-select:focus, .form-textarea:focus {
          outline: none;
          border-color: #4f46e5;
          background: white;
          box-shadow: 0 0 0 4px rgba(79, 70, 229, 0.1);
          transform: translateY(-1px);
        }

        .po-number-group {
          display: flex;
          gap: 12px;
          align-items: flex-start;
        }

        .regenerate-btn {
          padding: 14px 16px;
          background: #f1f5f9;
          border: 2px solid #e2e8f0;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .regenerate-btn:hover {
          background: #4f46e5;
          border-color: #4f46e5;
          color: white;
          transform: scale(1.05);
        }

        .total-card {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
          border-radius: 16px;
          padding: 24px;
          margin-bottom: 24px;
          box-shadow: 0 8px 25px rgba(16, 185, 129, 0.3);
        }

        .total-label {
          font-size: 14px;
          font-weight: 600;
          opacity: 0.9;
          margin-bottom: 8px;
        }

        .total-amount {
          font-size: 32px;
          font-weight: 800;
        }

        .gst-breakdown {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 16px;
          margin-top: 12px;
        }

        .gst-line {
          display: flex;
          justify-content: space-between;
          margin-bottom: 8px;
          font-size: 14px;
        }

        .gst-line.total {
          font-weight: 700;
          font-size: 16px;
          border-top: 1px solid rgba(255, 255, 255, 0.2);
          padding-top: 12px;
          margin-top: 12px;
        }

        .table-container {
          border-radius: 16px;
          border: 1px solid #e2e8f0;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .items-table {
          width: 100%;
          border-collapse: collapse;
          min-width: 1000px;
        }

        .items-table th {
          background: #f8fafc;
          padding: 16px 12px;
          text-align: left;
          font-size: 12px;
          font-weight: 700;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          border-bottom: 1px solid #e2e8f0;
        }

        .items-table td {
          padding: 16px 12px;
          border-bottom: 1px solid #f1f5f9;
          background: white;
          transition: all 0.2s ease;
        }

        .items-table tr:hover td {
          background: #f8fafc;
        }

        .items-table tr:last-child td {
          border-bottom: none;
        }

        .items-table input, .items-table select {
          width: 100%;
          padding: 12px;
          border: 2px solid #f1f5f9;
          border-radius: 8px;
          font-size: 14px;
          background: white;
          transition: all 0.2s ease;
        }

        .items-table input:focus, .items-table select:focus {
          outline: none;
          border-color: #4f46e5;
          box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
        }

        .uom-select {
          min-width: 100px;
        }

        .remove-btn {
          background: #fef2f2;
          color: #dc2626;
          border: none;
          border-radius: 8px;
          padding: 8px 12px;
          cursor: pointer;
          font-size: 14px;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .remove-btn:hover {
          background: #dc2626;
          color: white;
          transform: scale(1.1);
        }

        .table-actions {
          display: flex;
          gap: 12px;
          margin-top: 20px;
        }

        .btn {
          padding: 14px 24px;
          border: none;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          text-decoration: none;
        }

        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none !important;
        }

        .btn-primary {
          background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
          color: white;
          box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);
        }

        .btn-primary:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(79, 70, 229, 0.4);
        }

        .btn-secondary {
          background: #f8fafc;
          color: #374151;
          border: 2px solid #e2e8f0;
        }

        .btn-secondary:hover:not(:disabled) {
          background: #f1f5f9;
          transform: translateY(-1px);
        }

        .btn-success {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
        }

        .btn-success:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(16, 185, 129, 0.4);
        }

        .btn-danger {
          background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
          color: white;
          box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
        }

        .btn-danger:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(239, 68, 68, 0.4);
        }

        .actions-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
          margin-top: 24px;
        }

        .status-indicator {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          background: #f0f9ff;
          color: #0369a1;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 600;
          border: 1px solid #bae6fd;
        }

        .shade-toggle, .gst-toggle {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          margin-bottom: 12px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .shade-toggle:hover, .gst-toggle:hover {
          background: #f1f5f9;
          border-color: #cbd5e1;
        }

        .shade-toggle.active, .gst-toggle.active {
          background: #4f46e5;
          border-color: #4f46e5;
          color: white;
        }

        .shade-toggle-switch, .gst-toggle-switch {
          position: relative;
          width: 44px;
          height: 24px;
          background: #cbd5e1;
          border-radius: 12px;
          transition: all 0.3s ease;
        }

        .shade-toggle.active .shade-toggle-switch,
        .gst-toggle.active .gst-toggle-switch {
          background: rgba(255, 255, 255, 0.3);
        }

        .shade-toggle-switch::after, .gst-toggle-switch::after {
          content: '';
          position: absolute;
          top: 2px;
          left: 2px;
          width: 20px;
          height: 20px;
          background: white;
          border-radius: 50%;
          transition: all 0.3s ease;
        }

        .shade-toggle.active .shade-toggle-switch::after,
        .gst-toggle.active .gst-toggle-switch::after {
          transform: translateX(20px);
          background: #4f46e5;
        }

        .shade-toggle-label, .gst-toggle-label {
          font-size: 14px;
          font-weight: 600;
        }

        .saved-count, .gst-percentage {
          font-size: 12px;
          color: #64748b;
          margin-left: auto;
          background: white;
          padding: 2px 8px;
          border-radius: 10px;
          border: 1px solid #e2e8f0;
        }

        .shade-toggle.active .saved-count,
        .gst-toggle.active .gst-percentage {
          background: rgba(255, 255, 255, 0.2);
          border-color: rgba(255, 255, 255, 0.3);
          color: white;
        }

        .clear-saved-btn {
          padding: 6px 12px;
          background: #fef2f2;
          color: #dc2626;
          border: 1px solid #fecaca;
          border-radius: 8px;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.2s ease;
          margin-left: 8px;
        }

        .clear-saved-btn:hover {
          background: #dc2626;
          color: white;
        }

        .suggestions-info {
          font-size: 12px;
          color: #64748b;
          margin-top: 4px;
          font-style: italic;
        }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
          backdrop-filter: blur(8px);
        }

        .modal-content {
          background: white;
          border-radius: 20px;
          padding: 32px;
          max-width: 440px;
          width: 100%;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
          animation: modalSlideIn 0.3s ease-out;
        }

        @keyframes modalSlideIn {
          from {
            opacity: 0;
            transform: translateY(-20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .modal-title {
          font-size: 20px;
          font-weight: 700;
          margin-bottom: 8px;
          color: #1e293b;
        }

        .modal-subtitle {
          color: #64748b;
          margin-bottom: 24px;
          font-size: 14px;
        }

        .modal-actions {
          display: flex;
          gap: 12px;
          margin-top: 24px;
          justify-content: flex-end;
        }

        .gst-input-container {
          margin: 20px 0;
        }

        .gst-input-group {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .gst-input {
          flex: 1;
          padding: 12px 16px;
          border: 2px solid #e2e8f0;
          border-radius: 8px;
          font-size: 16px;
          text-align: center;
        }

        .gst-percent-symbol {
          font-size: 16px;
          font-weight: 600;
          color: #4f46e5;
        }

        .gst-presets {
          display: flex;
          gap: 8px;
          margin-top: 12px;
        }

        .gst-preset-btn {
          flex: 1;
          padding: 8px;
          background: #f1f5f9;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s ease;
          text-align: center;
          font-size: 14px;
        }

        .gst-preset-btn:hover {
          background: #4f46e5;
          color: white;
          border-color: #4f46e5;
        }

        .print-only { display: none; }

        @media (max-width: 1024px) {
          .content-grid {
            grid-template-columns: 1fr;
          }
          .sidebar {
            display: none;
          }
        }

        @media (max-width: 768px) {
          .po-container {
            margin: 20px;
            border-radius: 16px;
          }
          .main-content {
            padding: 24px;
          }
          .section-card {
            padding: 24px;
          }
          .form-grid {
            grid-template-columns: 1fr;
          }
          .actions-grid {
            grid-template-columns: 1fr;
          }
          .items-table {
            min-width: 1200px;
          }
        }
      `}</style>

      <div className="po-container" ref={printableRef}>
        {/* Header */}
        <header className="po-header">
          <div className="header-content">
            <h1 className="po-title">Purchase Order</h1>
            <p className="po-subtitle">Create and manage supplier purchase orders with ease</p>
          </div>
        </header>

        <div className="po-content">
          <div className="content-grid">
            {/* Sidebar Navigation */}
            <div className="sidebar">
              {/* Added Back Button Section */}
              <div className="nav-section">
                <div className="nav-title">Navigation</div>
                <div className="nav-item" onClick={handleBackNavigation}>
                  <div className="nav-icon">←</div>
                  <span>Go Back</span>
                </div>
                <div className="nav-item active">
                  <div className="nav-icon">📋</div>
                  <span>PO Details</span>
                </div>
                <div className="nav-item">
                  <div className="nav-icon">📦</div>
                  <span>Items & Pricing</span>
                </div>
                <div className="nav-item">
                  <div className="nav-icon">⚡</div>
                  <span>Quick Actions</span>
                </div>
              </div>

              <div className="nav-section">
                <div className="nav-title">Information</div>
                <div style={{ padding: '12px 16px', background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Total Items</div>
                  <div style={{ fontSize: '18px', fontWeight: '700', color: '#1e293b' }}>{rows.length}</div>
                </div>
              </div>

              <div className="nav-section">
                <div className="nav-title">Features</div>
                <div 
                  className={`nav-item ${shadeEnabled ? 'active' : ''}`} 
                  onClick={toggleShadeEnabled}
                >
                  <div className="nav-icon">🎨</div>
                  <span>Shade Column</span>
                  <span style={{ 
                    marginLeft: 'auto', 
                    fontSize: '12px', 
                    background: shadeEnabled ? 'white' : '#e2e8f0',
                    color: shadeEnabled ? '#4f46e5' : '#64748b',
                    padding: '2px 8px',
                    borderRadius: '10px'
                  }}>
                    {shadeEnabled ? 'ON' : 'OFF'}
                  </span>
                </div>
                <div 
                  className={`nav-item ${gstEnabled ? 'active' : ''}`} 
                  onClick={handleGstToggle}
                >
                  <div className="nav-icon">💰</div>
                  <span>GST Included</span>
                  <span style={{ 
                    marginLeft: 'auto', 
                    fontSize: '12px', 
                    background: gstEnabled ? 'white' : '#e2e8f0',
                    color: gstEnabled ? '#4f46e5' : '#64748b',
                    padding: '2px 8px',
                    borderRadius: '10px'
                  }}>
                    {gstEnabled ? `${gstPercentage}%` : 'OFF'}
                  </span>
                </div>
                <div className="nav-item" onClick={() => {
                  const descCount = savedDescriptions.length;
                  const shadeCount = savedShades.length;
                  alert(`Saved Suggestions:\n\nDescriptions: ${descCount} items\nShades: ${shadeCount} items\n\nThese will appear in dropdowns when typing.`);
                }}>
                  <div className="nav-icon">💾</div>
                  <span>Saved Suggestions</span>
                  <span style={{ 
                    marginLeft: 'auto', 
                    fontSize: '12px', 
                    background: '#e0e7ff',
                    color: '#4f46e5',
                    padding: '2px 8px',
                    borderRadius: '10px'
                  }}>
                    {savedDescriptions.length + savedShades.length}
                  </span>
                </div>
              </div>

              <div className="nav-section">
                <div className="nav-title">Actions</div>
                <div className="nav-item" onClick={handleSave}>
                  <div className="nav-icon">💾</div>
                  <span>Save Draft</span>
                </div>
                <div className="nav-item" onClick={handleDownloadPdf}>
                  <div className="nav-icon">📄</div>
                  <span>Download PDF</span>
                </div>
                <div className="nav-item" onClick={handleOpenSubmitDialog}>
                  <div className="nav-icon">🚀</div>
                  <span>Submit PO</span>
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="main-content">
              {/* Basic Information Card */}
              <div className="section-card">
                <div className="section-header">
                  <div className="section-icon">📋</div>
                  <div>
                    <div className="section-title">Basic Information</div>
                    <div className="section-subtitle">Enter purchase order details and supplier information</div>
                  </div>
                </div>

                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">PO Number</label>
                    <div className="po-number-group">
                      <input
                        type="text"
                        className="form-input"
                        value={poNumber}
                        onChange={(e) => setPoNumber(e.target.value)}
                        style={{ flex: 1 }}
                      />
                      <button 
                        className="regenerate-btn" 
                        onClick={regeneratePoNumber}
                        title="Generate new PO number"
                      >
                        🔄
                      </button>
                    </div>
                    <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                        Format: PO-HHMMSS
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Supplier Name</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Enter supplier name"
                      value={supplierName}
                      onChange={(e) => setSupplierName(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Order Date</label>
                    <input
                      type="date"
                      className="form-input"
                      value={orderDate}
                      onChange={(e) => setOrderDate(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Order Time</label>
                    <input
                      type="time"
                      className="form-input"
                      value={orderTime}
                      onChange={(e) => setOrderTime(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Expected Date</label>
                    <input
                      type="date"
                      className="form-input"
                      value={expectedDate}
                      onChange={(e) => setExpectedDate(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Expected Time</label>
                    <input
                      type="time"
                      className="form-input"
                      value={expectedTime}
                      onChange={(e) => setExpectedTime(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Lead Time</label>
                    <div className="form-input" style={{ background: "#f8fafc", color: "#64748b", display: 'flex', alignItems: 'center' }}>
                      {leadHuman || "—"}
                      {leadHuman && <span style={{ marginLeft: 'auto', fontSize: '12px', color: '#4f46e5' }}>⏱️</span>}
                    </div>
                  </div>

                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="form-label">Remarks</label>
                    <textarea
                      className="form-textarea"
                      placeholder="Enter any special instructions, notes, or remarks for this purchase order"
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      rows={3}
                    />
                    <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                      These remarks will appear in the PDF under the "REMARKS" section
                    </div>
                  </div>
                </div>
              </div>

              {/* Items Section */}
              <div className="section-card">
                <div className="section-header">
                  <div className="section-icon">📦</div>
                  <div>
                    <div className="section-title">Items & Pricing</div>
                    <div className="section-subtitle">Add items, quantities, and pricing information</div>
                  </div>
                </div>

                {/* Feature Toggles */}
                <div className="feature-toggles" style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
                  {/* Shade Toggle */}
                  <div 
                    className={`shade-toggle ${shadeEnabled ? 'active' : ''}`}
                    onClick={toggleShadeEnabled}
                    style={{ flex: 1 }}
                  >
                    <div className="shade-toggle-switch"></div>
                    <span className="shade-toggle-label">
                      {shadeEnabled ? 'Shade Column Enabled' : 'Enable Shade Column'}
                    </span>
                    <span className="saved-count">
                      {shadeEnabled ? `${savedShades.length} saved` : 'OFF'}
                    </span>
                  </div>

                  {/* GST Toggle */}
                  <div 
                    className={`gst-toggle ${gstEnabled ? 'active' : ''}`}
                    onClick={handleGstToggle}
                    style={{ flex: 1 }}
                  >
                    <div className="gst-toggle-switch"></div>
                    <span className="gst-toggle-label">
                      {gstEnabled ? 'GST Included' : 'Add GST'}
                    </span>
                    <span className="gst-percentage">
                      {gstEnabled ? `${gstPercentage}%` : 'OFF'}
                    </span>
                  </div>
                </div>

                {savedDescriptions.length > 0 && (
                  <div className="suggestions-info">
                    📝 You have {savedDescriptions.length} saved descriptions. They will appear as suggestions when typing.
                  </div>
                )}
                {shadeEnabled && savedShades.length > 0 && (
                  <div className="suggestions-info">
                    🎨 You have {savedShades.length} saved shades. They will appear as suggestions when typing.
                  </div>
                )}

                {/* Total Display */}
                <div className="total-card">
                  <div className="total-label">TOTAL AMOUNT</div>
                  <div className="total-amount">₹{fmtMoney(totals.grandTotal)}</div>
                  
                  {gstEnabled && (
                    <div className="gst-breakdown">
                      <div className="gst-line">
                        <span>Subtotal:</span>
                        <span>₹{fmtMoney(totals.gross)}</span>
                      </div>
                      <div className="gst-line">
                        <span>GST ({gstPercentage}%):</span>
                        <span>₹{fmtMoney(totals.gstAmount)}</span>
                      </div>
                      <div className="gst-line total">
                        <span>Grand Total:</span>
                        <span>₹{fmtMoney(totals.grandTotal)}</span>
                      </div>
                    </div>
                  )}
                </div>

                {loadingSheet && (
                  <div className="status-indicator" style={{ marginBottom: '16px' }}>
                    <span>🔄</span>
                    Loading price list...
                  </div>
                )}
                {sheetError && (
                  <div className="status-indicator" style={{ background: "#fef2f2", color: "#dc2626", borderColor: "#fecaca", marginBottom: '16px' }}>
                    <span>⚠️</span>
                    Error: {sheetError}
                  </div>
                )}

                <div className="table-container">
                  <table className="items-table">
                    <thead>
                      <tr>
                        <th style={{ width: "40px" }}>#</th>
                        <th style={{ width: "160px" }}>Department</th>
                        <th>Description</th>
                        {shadeEnabled && <th style={{ width: "120px" }}>Shade</th>}
                        <th style={{ width: "100px" }}>UOM</th>
                        <th style={{ width: "100px" }}>Qty</th>
                        <th style={{ width: "120px" }}>Rate (₹)</th>
                        <th style={{ width: "120px", textAlign: "right" }}>Amount (₹)</th>
                        <th style={{ width: "60px" }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r, idx) => {
                        const amount = rowAmount(r);
                        const items = r.department ? itemsByDept[r.department] || [] : [];
                        return (
                          <tr key={idx}>
                            <td style={{ fontWeight: '600', color: '#64748b' }}>{idx + 1}</td>
                            <td>
                              <select
                                className="form-select"
                                value={r.department}
                                onChange={(e) => updateRow(idx, { department: e.target.value })}
                              >
                                <option value="">Select Department</option>
                                {departments.map((d) => (
                                  <option key={d} value={d}>
                                    {d}
                                  </option>
                                ))}
                                <option value="Other">Other (Manual Entry)</option>
                              </select>
                            </td>
                            <td>
                              <input
                                type="text"
                                className="form-input"
                                placeholder="Enter item description"
                                value={r.description}
                                onChange={(e) => handleDescriptionChange(idx, e.target.value)}
                                list={`desc-${idx}`}
                                onBlur={(e) => {
                                  saveDescriptionOnBlur(e.target.value);
                                  setSavedDescriptions(getLocalStorageItem(LOCAL_STORAGE_KEYS.DESCRIPTIONS, []));
                                }}
                              />
                              <datalist id={`desc-${idx}`}>
                                {savedDescriptions.map((desc, i) => (
                                  <option key={`desc-${i}`} value={desc} />
                                ))}
                                {items.map((it) => (
                                  <option key={it} value={it} />
                                ))}
                              </datalist>
                            </td>
                            {shadeEnabled && (
                              <td>
                                <input
                                  type="text"
                                  className="form-input"
                                  placeholder="Enter shade"
                                  value={r.shade}
                                  onChange={(e) => handleShadeChange(idx, e.target.value)}
                                  list={`shade-${idx}`}
                                  onBlur={(e) => {
                                    saveShadeOnBlur(e.target.value);
                                    setSavedShades(getLocalStorageItem(LOCAL_STORAGE_KEYS.SHADES, []));
                                  }}
                                />
                                <datalist id={`shade-${idx}`}>
                                  {savedShades.map((shade, i) => (
                                    <option key={`shade-${i}`} value={shade} />
                                  ))}
                                </datalist>
                              </td>
                            )}
                            <td>
                              <UomSelect value={r.uom} onChange={(val) => updateRow(idx, { uom: val })} />
                            </td>
                            <td>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={r.qty}
                                onChange={(e) => updateRow(idx, { qty: e.target.value })}
                              />
                            </td>
                            <td>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={r.rate}
                                onChange={(e) => updateRow(idx, { rate: e.target.value })}
                                placeholder="0.00"
                              />
                            </td>
                            <td style={{ textAlign: "right", fontWeight: "700", color: amount > 0 ? "#059669" : "#64748b" }}>
                              ₹{fmtMoney(amount)}
                            </td>
                            <td>
                              <button className="remove-btn" onClick={() => removeRow(idx)} title="Remove line">
                                ✕
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="table-actions">
                  <button className="btn btn-secondary" onClick={addRow}>
                    <span>+</span>
                    Add New Line
                  </button>
                  <button className="btn btn-danger" onClick={() => setRows([blankRow()])}>
                    <span>🗑️</span>
                    Clear All
                  </button>
                  <button 
                    className="btn btn-secondary" 
                    onClick={() => {
                      if (window.confirm('Clear all saved descriptions and shades?')) {
                        localStorage.removeItem(LOCAL_STORAGE_KEYS.DESCRIPTIONS);
                        localStorage.removeItem(LOCAL_STORAGE_KEYS.SHADES);
                        setSavedDescriptions([]);
                        setSavedShades([]);
                        alert('All saved suggestions cleared!');
                      }
                    }}
                  >
                    <span>🗑️</span>
                    Clear Saved Suggestions
                  </button>
                </div>
              </div>

              {/* Actions Section */}
              <div className="section-card">
                <div className="section-header">
                  <div className="section-icon">⚡</div>
                  <div>
                    <div className="section-title">Quick Actions</div>
                    <div className="section-subtitle">Save, download, or submit your purchase order</div>
                  </div>
                </div>

                <div className="actions-grid">
                  <button className="btn btn-secondary" onClick={regeneratePoNumber}>
                    <span>🔄</span>
                    New PO Number
                  </button>
                  <button className="btn btn-secondary" onClick={handleSave}>
                    <span>💾</span>
                    Save Draft
                  </button>
                  <button className="btn btn-success" onClick={handleDownloadPdf}>
                    <span>📄</span>
                    Preview
                  </button>
                  <button className="btn btn-primary" onClick={handleOpenSubmitDialog} disabled={isSubmitting}>
                    <span>{isSubmitting ? "⏳" : "🚀"}</span>
                    {isSubmitting ? "Submitting..." : "Submit for Approval"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Print Section */}
        <section className="print-only" style={{ padding: "20px", borderTop: "1px solid #e5e7eb" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              fontSize: "12px",
            }}
          >
            <div>
              <div style={{ fontWeight: 700, marginBottom: "4px" }}>{company.name}</div>
              <div style={{ color: "#64748b", marginBottom: "4px" }}>{company.address}</div>
              {company.gstin && <div style={{ marginBottom: "2px" }}>GSTIN: {company.gstin}</div>}
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontWeight: 700, marginBottom: "4px" }}>PO #: {poNumber}</div>
              <div style={{ marginBottom: "2px" }}>
                Order: {orderDate}
                {orderTime ? ` ${orderTime}` : ""}
              </div>
              {expectedDate && (
                <div style={{ marginBottom: "2px" }}>
                  Expected: {expectedDate}
                  {expectedTime ? ` ${expectedTime}` : ""}
                </div>
              )}
              {leadHuman && <div style={{ marginBottom: "2px" }}>Lead Time: {leadHuman}</div>}
              {supervisorName && <div style={{ marginBottom: "2px" }}>Supervisor: {supervisorName}</div>}
              {remarks && <div style={{ marginBottom: "2px", maxWidth: "200px" }}>Remarks: {remarks}</div>}
              <div style={{ marginBottom: "2px" }}>Supplier: {supplierName}</div>
              <div style={{ fontWeight: 700 }}>Total: ₹{fmtMoney(totals.grandTotal)}</div>
              {gstEnabled && (
                <div style={{ fontSize: "11px", color: "#64748b" }}>
                  (Includes GST {gstPercentage}%: ₹{fmtMoney(totals.gstAmount)})
                </div>
              )}
            </div>
          </div>
        </section>
      </div>

      {/* Supervisor Modal */}
      {showSupervisorDialog && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 className="modal-title">Supervisor Approval</h3>
            <p className="modal-subtitle">
              Enter supervisor name for approval and PDF generation
            </p>
            <div className="form-group">
              <input
                type="text"
                className="form-input"
                placeholder="Enter supervisor name"
                value={supervisorName}
                onChange={(e) => setSupervisorName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowSupervisorDialog(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleConfirmSubmit} disabled={isSubmitting}>
                {isSubmitting ? "Submitting..." : "Confirm & Download PDF"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GST Dialog */}
      {showGstDialog && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 className="modal-title">Add GST</h3>
            <p className="modal-subtitle">
              Enter GST percentage to be included in the total amount
            </p>
            
            <div className="gst-input-container">
              <div className="gst-input-group">
                <input
                  type="number"
                  className="gst-input"
                  value={gstPercentage}
                  onChange={(e) => setGstPercentage(parseFloat(e.target.value) || 0)}
                  min="0.01"
                  max="100"
                  step="0.01"
                  autoFocus
                />
                <span className="gst-percent-symbol">%</span>
              </div>
              
              <div className="gst-presets">
                <button 
                  className="gst-preset-btn" 
                  onClick={() => setGstPercentage(5)}
                >
                  5%
                </button>
                <button 
                  className="gst-preset-btn" 
                  onClick={() => setGstPercentage(12)}
                >
                  12%
                </button>
                <button 
                  className="gst-preset-btn" 
                  onClick={() => setGstPercentage(18)}
                >
                  18%
                </button>
                <button 
                  className="gst-preset-btn" 
                  onClick={() => setGstPercentage(28)}
                >
                  28%
                </button>
              </div>
            </div>
            
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowGstDialog(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleGstConfirm}>
                Add GST
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}