import { useState, useEffect } from "react";
import { jsPDF } from "jspdf";

// MUST be your deployed /exec URL
const WEB_APP_URL =
  "https://script.google.com/macros/s/AKfycbxNr0GJ1v7_SA_T7FMvLgaO2Zjfcmu6ms35n35VEJ1UfyJEOXNkw2Lj4CSdzKmsCBa7Ig/exec";

// Enhanced QR code generation with multiple fallbacks
const generateQRCode = async (url) => {
  const services = [
    `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(url)}`,
    `https://quickchart.io/qr?text=${encodeURIComponent(url)}&size=300&margin=4`,
    `https://chart.googleapis.com/chart?chs=300x300&cht=qr&chl=${encodeURIComponent(url)}&chld=L|1`
  ];

  for (let serviceUrl of services) {
    try {
      console.log(`Trying QR service: ${serviceUrl}`);
      const response = await fetch(serviceUrl);
      if (response.ok) {
        const blob = await response.blob();
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.readAsDataURL(blob);
        });
      }
    } catch (e) {
      console.warn(`QR service failed: ${serviceUrl}`, e);
      continue;
    }
  }
  
  throw new Error('All QR code services are currently unavailable');
};

// Convert image URL to data URL with better error handling
const toDataURL = (src) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL("image/png"));
      } catch (error) {
        reject(new Error("Canvas conversion failed: " + error.message));
      }
    };
    img.onerror = () => reject(new Error("Failed to load QR image"));
    img.src = src;
  });

function Emoji({ children, size = 18, mr = 0, ml = 0 }) {
  return (
    <span style={{ fontSize: size, lineHeight: 1, marginRight: mr, marginLeft: ml }}>
      {children}
    </span>
  );
}

const DEPT_OPTIONS = [
  // Production Flow
  "Cutting",
  "Stitching",
  "Finishing",
  "Quality",
  "Packing",
  "Store",

  // Textile & Fabric Processing
  "Knitting",
  "Weaving",
  "Dyeing",
  "Washing",
  "Bleaching",
  "Printing",

  // Embellishments
  "Embroidery",
  "Handwork",
  "Applique",

  // Material & Production Support
  "Fabric Store",
  "Accessories Store",
  "Sampling",
  "Pattern Making",
  "CAD",
  "Merchandising",
  "Production",
  "Maintenance",
  "Cutting Room",
  "Trimming",

  // Logistics & Others
  "Dispatch",
  "HR",
  "Accounts",
  "Admin",
  "Security",
  "jacket",

  // Misc
  "Other"
];

const UOM_OPTIONS = [
  // ========== LENGTH / LINEAR ==========
  "M",      // Meters
  "CM",     // Centimeters
  "MM",     // Millimeters
  "KM",     // Kilometers
  "IN",     // Inches
  "FT",     // Feet
  "YD",     // Yards
  "MI",     // Miles

  // ========== FABRIC & TEXTILE SPECIFIC ==========
  "ROLL",   // Rolls
  "BALE",   // Bales
  "BUNDLE", // Bundles
  "THAN",   // Thans
  "PKT",    // Packs
  "BOLT",   // Bolts
  "PIECE",  // Piece (for fabric cuts)
  "CUT",    // Cut lengths
  
  // ========== WEIGHT ==========
  "KG",     // Kilograms
  "GM",     // Grams
  "MG",     // Milligrams
  "TON",    // Metric Tons
  "LBS",    // Pounds
  "OZ",     // Ounces

  // ========== QUANTITY / COUNT ==========
  "PCS",    // Pieces
  "UNIT",   // Units
  "PAIR",   // Pairs
  "SET",    // Sets
  "DOZEN",  // Dozens
  "GROSS",  // Gross (144 units)
  "REAM",   // Reams (paper/thread)
  "COUNT",  // Count (for small items)
  "EA",     // Each
  "NO",     // Number

  // ========== AREA ==========
  "SQM",    // Square Meters
  "SQCM",   // Square Centimeters
  "SQFT",   // Square Feet
  "SQIN",   // Square Inches
  "SQYD",   // Square Yards
  "ACRE",   // Acres
  "HECTARE", // Hectares

  // ========== VOLUME ==========
  "L",      // Liters
  "ML",     // Milliliters
  "CC",     // Cubic Centimeters
  "M3",     // Cubic Meters
  "GAL",    // Gallons
  "CBM",    // Cubic Meters (shipping)

  // ========== TIME ==========
  "HR",     // Hours
  "MIN",    // Minutes
  "DAY",    // Days
  "WK",     // Weeks
  "MONTH",  // Months
  "YR",     // Years

  // ========== TEXTILE TRIMS & ACCESSORIES ==========
  "CONE",   // Cones
  "CARD",   // Cards
  "SHEET",  // Sheets
  "SHT",    // Sheets (short)
  "STRIP",  // Strips
  "POLY",   // Polybags
  "BOX",    // Boxes
  "CARTON", // Cartons
  "PACK",   // Packs
  "TUBE",   // Tubes
  "SPOOL",  // Spools
  "REEL",   // Reels
  "BOBBIN", // Bobbins
  "HANK",   // Hanks (yarn)

  // ========== ELECTRICAL / HARDWARE ==========
  "MTR",    // Meter (electrical wire)
  "COIL",   // Coils
  "LOT",    // Lots
  "KIT",    // Kits
  "ASSY",   // Assembly

  // ========== PACKAGING ==========
  "BAG",    // Bags
  "SACK",   // Sacks
  "DRUM",   // Drums
  "CAN",    // Cans
  "JAR",    // Jars
  "BOTTLE", // Bottles
  "TIN",    // Tins
  "CASE",   // Cases
  "CRATE",  // Crates
  "PALLET", // Pallets

  // ========== FINISHED GOODS ==========
  "GARMENT", // Garments
  "SHIRT",   // Shirts
  "PANT",    // Pants
  "DRESS",   // Dresses
  "JACKET",  // Jackets
  "SUIT",    // Suits

  // ========== CHEMICAL / LIQUID ==========
  "LTR",    // Liters (chemicals)
  "KG/L",   // Kilograms per liter
  "BOTTLE", // Bottles (chemicals)
  "DRUM",   // Drums (chemicals)
  "CANISTER", // Canisters

  // ========== RETAIL / WHOLESALE ==========
  "DISPLAY",  // Display units
  "RACK",     // Racks
  "STAND",    // Stands
  "MANNEQUIN", // Mannequins

  // ========== CONSTRUCTION / BUILDING ==========
  "SLAB",     // Slabs
  "BAR",      // Bars (steel)
  "ROD",      // Rods
  "PLATE",    // Plates
  "BEAM",     // Beams
  "BLOCK",    // Blocks

  // ========== SOFTWARE / DIGITAL ==========
  "LICENSE",  // Licenses
  "USER",     // Users
  "SEAT",     // Seats
  "SERVER",   // Servers
  "DOMAIN",   // Domains

  // ========== TEXTILE MANUFACTURING ==========
  "PATTERN",  // Pattern
  "SAMPLE",   // Sample
  "SWATCH",   // Swatch
  "PANEL",    // Panel
  "PLY",      // Ply (fabric layers)
  "LAYER",    // Layers
  "RUN",      // Production runs

  // ========== RIBBONS & TAPES ==========
  "REEL",     // Reels (ribbon)
  "SPOOL",    // Spools (thread)
  "YARD",     // Yards (ribbon)
  "ROLL",     // Rolls (tape)

  // ========== BUTTONS & FASTENERS ==========
  "GROSS",    // Gross (buttons)
  "DOZEN",    // Dozen (buttons)
  "PKT",      // Packets (buttons)
  "CARD",     // Cards (buttons)

  // ========== ZIPPERS & DORI ==========
  "PIECE",    // Pieces (zippers)
  "METER",    // Meters (zipper tape)
  "DOZEN",    // Dozen (zipper sliders)

  // ========== THREAD ==========
  "CONE",     // Cones (thread)
  "SPOOL",    // Spools (thread)
  "REEL",     // Reels (thread)
  "TUBE",     // Tubes (thread)

  // ========== LABELS & TAGS ==========
  "ROLL",     // Rolls (labels)
  "SHEET",    // Sheets (tags)
  "PKT",      // Packets (labels)
  "REEL",     // Reels (label tape)

  // ========== INTERNATIONAL STANDARDS ==========
  "CTN",      // Carton (shipping)
  "PLT",      // Pallet
  "SKU",      // Stock Keeping Unit
  "BATCH",    // Batch
  "LOT",      // Lot number

  // ========== SERVICE UNITS ==========
  "HOUR",     // Hour (services)
  "DAY",      // Day (rental)
  "PROJECT",  // Project basis
  "SERVICE",  // Service unit

  // ========== METRIC PREFIXES ==========
  "MM",       // Millimeter
  "CM",       // Centimeter
  "DM",       // Decimeter
  "M",        // Meter
  "DAM",      // Decameter
  "HM",       // Hectometer
  "KM",       // Kilometer

  // ========== CATCH-ALL ==========
  "OTHER",
  "VARIOUS",
  "MIXED",
  "ASSORTED",
  "CUSTOM"
];

const RGP_TYPES = ["Fabric", "Tools", "Machine", "Sample", "Other"];

// Updated RGP PDF Generator - Only QTY1 in total calculation
function generateRgpPDF({ payload, options = {} }) {
  const { qrEntryImage = null, qrReturnImage = null, qrSide = 96 } = options;
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  doc.setFont("helvetica", "normal");
  doc.setLineWidth(0.6);

  // ---- helpers
  const page = { w: doc.internal.pageSize.getWidth(), h: doc.internal.pageSize.getHeight(), m: 40, gap: 12 };
  const setSize = (s) => doc.setFontSize(s);
  const bold = () => doc.setFont(undefined, "bold");
  const normal = () => doc.setFont(undefined, "normal");
  const text = (t, x, y, opt = {}) => doc.text(String(t ?? ""), x, y, opt);
  const rtext = (t, x, y, opt = {}) => text(t, x, y, { align: "right", ...opt });
  const line = (x1, y1, x2, y2) => doc.line(x1, y1, x2, y2);
  const wrap = (str, w) => doc.splitTextToSize(String(str || ""), w);
  const roundRect = (x, y, w, h, r = 7, style = "S") =>
    doc.roundedRect ? doc.roundedRect(x, y, w, h, r, r, style) : doc.rect(x, y, w, h, style);

  // ---- frame & pagination
  const drawFrame = () => roundRect(16, 16, page.w - 32, page.h - 32, 8, "S");
  let y = page.m;

  const SIG_H = 92;
  const QR_TITLE_H = 18;
  const QR_SIDE = qrSide || 96;
  const BOTTOM_QR_H = QR_TITLE_H + 8 + QR_SIDE + 10;
  const RESERVED_BOTTOM = 18 + 8 + BOTTOM_QR_H + 12 + SIG_H + 8;

  const needSpace = (h, withHeader = false) => {
    const usableBottom = page.h - page.m - RESERVED_BOTTOM;
    if (y + h > usableBottom) {
      doc.addPage();
      drawFrame();
      y = page.m;
      if (withHeader) {
        setSize(13);
        bold();
        text("RETURNABLE GATE PASS", page.m, y);
        normal();
        line(page.m, y + 6, page.w - page.m, y + 6);
        y += 18;
      }
      return true;
    }
    return false;
  };

  // ---- Title
  drawFrame();
  setSize(20);
  bold();
  text("RETURNABLE GATE PASS", page.w / 2, y, { align: "center" });
  normal();
  line(page.m, y + 6, page.w - page.m, y + 6);
  y += 26;

  // =========================
  // TOP ROW:
  // [ RGP DETAILS (wide) ] [ PARTY INFO (narrow) ] [ GATE ENTRY — SCAN ]
  // =========================
  (function topRow() {
    const innerW = page.w - 2 * page.m;

    // assign custom ratios
    const rRGP = 0.44, rParty = 0.26, rGate = 0.30;

    // convert to pixel widths
    const wAvail = innerW - page.gap * 2;
    const wRGP = Math.floor(wAvail * rRGP);
    const wParty = Math.floor(wAvail * rParty);
    const wGate = wAvail - wRGP - wParty;

    const x1 = page.m;
    const x2 = x1 + wRGP + page.gap;
    const x3 = x2 + wParty + page.gap;

    // RGP DETAILS (left / wider)
    const metaPad = 12, lblW = 84;
    const mRows = [
      ["RGP #", (payload.rgpNo || "").replace(/\s+/g, "")],
      ["Date", payload.date || ""],
      ["Type", payload.rgpType || ""],
      ...(payload.expectedReturnDate ? [["Expected Return", payload.expectedReturnDate]] : []),
      ...(payload.vehicleNo ? [["Vehicle No", payload.vehicleNo]] : []),
      ...(payload.authorizedBy ? [["Authorized By", payload.authorizedBy]] : []),
    ];
    const metaH = 22 + mRows.length * 16 + 16;

    // PARTY INFO (middle / narrower)
    const partyPad = 12;
    const partyBodyW = wParty - partyPad * 2;
    const partyLines = [
      payload.vendor || "",
      ...wrap(payload.partyAddress || "", partyBodyW),
      ...(payload.partyPhone ? [`Phone: ${payload.partyPhone}`] : []),
      ...(payload.partyContact ? [`Contact: ${payload.partyContact}`] : []),
    ];
    const partyH = 22 + partyLines.filter(Boolean).length * 12 + 16;

    // GATE ENTRY (right) — QR
    const gateH = QR_TITLE_H + 8 + QR_SIDE + 10;

    const blockH = Math.max(metaH, partyH, gateH);
    needSpace(blockH);

    // Draw RGP DETAILS
    roundRect(x1, y, wRGP, blockH, 7, "S");
    setSize(10);
    bold(); text("RGP DETAILS", x1 + 12, y + 14); normal();
    line(x1 + 12, y + 18, x1 + wRGP - 12, y + 18);
    let my = y + 30;
    mRows.forEach(([label, value]) => {
      bold(); text(`${label}:`, x1 + metaPad, my);
      normal(); text(value || "", x1 + metaPad + lblW, my, { maxWidth: wRGP - metaPad * 2 - lblW });
      my += 16;
    });

    // Draw PARTY INFO
    roundRect(x2, y, wParty, blockH, 7, "S");
    setSize(10);
    bold(); text("PARTY / VENDOR", x2 + 12, y + 14); normal();
    line(x2 + 12, y + 18, x2 + wParty - 12, y + 18);
    let py = y + 30;
    partyLines.forEach((ln) => { if (ln) { text(ln, x2 + partyPad, py); py += 12; } });

    // Draw GATE ENTRY SCANNER
    roundRect(x3, y, wGate, blockH, 7, "S");
    setSize(10);
    bold(); text("GATE ENTRY — SCAN", x3 + 12, y + 14); normal();
    line(x3 + 12, y + 18, x3 + wGate - 12, y + 18);
    if (qrEntryImage) {
      const qx = x3 + 12 + (wGate - 24 - QR_SIDE) / 2;
      const qy = y + 18 + 10;
      try { doc.addImage(qrEntryImage, "PNG", qx, qy, QR_SIDE, QR_SIDE); } catch {}
    }

    y += blockH + 16;
  })();

  // =========================
  // ITEMS TABLE WITH LOT NUMBER
  // =========================
  (function drawTable() {
    const x0 = page.m, innerW = page.w - 2 * page.m;
    setSize(10); normal();

    // Process entries for display - Only QTY1 in total calculation
    const rows = (payload.entries || []).map((r, i) => {
      const qty1 = (+r.qty1 || 0).toLocaleString();
      const qty2 = (+r.qty2 || 0).toLocaleString();
      // CHANGED: Only QTY1 goes into total calculation
      const totalQty = (+r.qty1 || 0);
      return { 
        ...r, 
        _i: i + 1,
        _qty1Str: qty1,
        _qty2Str: qty2,
        _totalQty: totalQty,
        _totalQtyStr: totalQty.toLocaleString()
      };
    });

    const measureMax = (arr, key) => arr.reduce((m, r) => Math.max(m, doc.getTextWidth(String(r[key] || ""))), 0);
    
    // Define minimum column widths - added lot number column
    const MIN = { 
      line: 28,
      lotNo: 45, // NEW: Lot Number column
      department: 80, 
      description: 120, 
      purpose: 70,
      uom: 45, 
      qty1: 40, 
      qty2: 40,
      totalQty: 45
    };

    const qty1W = Math.max(MIN.qty1, measureMax(rows, "_qty1Str") + 14);
    const qty2W = Math.max(MIN.qty2, measureMax(rows, "_qty2Str") + 14);
    const totalQtyW = Math.max(MIN.totalQty, measureMax(rows, "_totalQtyStr") + 16);
    const lotNoW = Math.max(MIN.lotNo, measureMax(rows, "lotNo") + 10); // NEW: Lot number width

    const lineW = MIN.line, depW = MIN.department, purposeW = MIN.purpose, uomW = MIN.uom;
    const used = lineW + lotNoW + depW + purposeW + uomW + qty1W + qty2W + totalQtyW; // Added lotNoW
    const descW = Math.max(MIN.description, innerW - used);
    const diff = innerW - (used + descW);
    const adjTotalQtyW = totalQtyW + diff;

    // Updated columns array with lot number
    const cols = [
      { key: "line", title: "#", w: lineW, align: "right" },
      { key: "lotNo", title: "LOT NO.", w: lotNoW }, // NEW: Lot Number column
      { key: "department", title: "DEPARTMENT", w: depW },
      { key: "description", title: "DESCRIPTION", w: descW },
      { key: "purpose", title: "PURPOSE", w: purposeW },
      { key: "uom", title: "UOM", w: uomW, align: "center" },
      { key: "qty1", title: "QTY 1", w: qty1W, align: "right" },
      { key: "qty2", title: "BAGS", w: qty2W, align: "right" },
      { key: "totalQty", title: "T.QTY", w: adjTotalQtyW, align: "right" },
    ];
    const xs = [x0]; cols.forEach((c, i) => xs.push(xs[i] + c.w));

    const headerH = 26, baseH = 20;

    const drawHeader = () => {
      needSpace(headerH, true);
      doc.rect(x0, y, innerW, headerH);
      setSize(10); bold();
      cols.forEach((c, i) => {
        const cx = c.align === "right" ? xs[i + 1] - 6 : c.align === "center" ? (xs[i] + xs[i + 1]) / 2 : xs[i] + 6;
        const opt = c.align === "right" ? { align: "right" } : c.align === "center" ? { align: "center" } : {};
        text(c.title, cx, y + 17, opt);
        if (i > 0) line(xs[i], y, xs[i], y + headerH);
      });
      normal(); y += headerH;
    };

    const drawRow = (r, idx) => {
      const descLines = doc.splitTextToSize(r.itemDesc || r.description || "", cols[3].w - 8);
      const purposeLines = doc.splitTextToSize(r.purpose || "", cols[4].w - 8);
      const rowH = Math.max(baseH, Math.max(descLines.length, purposeLines.length) * 12 + 8);
      needSpace(rowH, true);
      doc.rect(x0, y, innerW, rowH);
      for (let i = 1; i < xs.length - 1; i++) line(xs[i], y, xs[i], y + rowH);
      const yy = y + 12;
      
      rtext(r._i, xs[1] - 6, yy);
      text(r.lotNo || "", xs[1] + 6, yy); // NEW: Display lot number
      text(r.department || "", xs[2] + 6, yy);
      
      // Description (multi-line)
      descLines.forEach((ln, j) => text(ln, xs[3] + 6, yy + j * 12));
      
      // Purpose (multi-line)
      purposeLines.forEach((ln, j) => text(ln, xs[4] + 6, yy + j * 12));
      
      text(r.uom || "", (xs[5] + xs[6]) / 2, yy, { align: "center" });
      rtext(r._qty1Str, xs[7] - 6, yy);
      rtext(r._qty2Str, xs[8] - 6, yy);
      rtext(r._totalQtyStr, xs[9] - 6, yy);
      y += rowH;
      return r._totalQty;
    };

    drawHeader();
    let totalQuantity = 0; 
    rows.forEach((r, i) => { totalQuantity += drawRow(r, i); });
    
    // Total row
    const totalH = 26;
    needSpace(totalH, true);
    doc.rect(x0, y, innerW, totalH);
    line(xs[xs.length - 2], y, xs[xs.length - 2], y + totalH);
    setSize(11); bold();
    text("TOTAL QUANTITY", x0 + 8, y + 17);
    rtext(totalQuantity.toLocaleString(), xs[9] - 8, y + 17); // Updated index for total quantity
    normal(); y += totalH;
  })();

  // =========================
  // BOTTOM:
  // left = MATERIAL RETURN — SCAN (QR inside)
  // right (spans 2 cols) = REMARKS
  // =========================
  (function bottomBlocks() {
    const innerW = page.w - 2 * page.m;
    const colW = (innerW - page.gap * 2) / 3;
    const x1 = page.m, x2 = x1 + colW + page.gap, x3 = x2 + colW + page.gap;

    const sigTop = page.h - page.m - SIG_H;
    const blockTop = sigTop - 12 - BOTTOM_QR_H;

    // Left small box: MATERIAL RETURN SCAN + QR
    roundRect(x1, blockTop, colW, BOTTOM_QR_H, 7, "S");
    setSize(10);
    bold(); text("MATERIAL RETURN", x1 + 10, blockTop + 14); normal();
    line(x1 + 10, blockTop + 18, x1 + colW - 10, blockTop + 18);
    if (qrReturnImage) {
      const qx = x1 + 10 + (colW - 20 - QR_SIDE) / 2;
      const qy = blockTop + 18 + 10;
      try { doc.addImage(qrReturnImage, "PNG", qx, qy, QR_SIDE, QR_SIDE); } catch {}
    }

    // Wide right box (spans two columns): REMARKS
    const bigW = colW * 2 + page.gap;
    roundRect(x2, blockTop, bigW, BOTTOM_QR_H, 7, "S");
    setSize(10);
    bold(); text("REMARKS", x2 + 10, blockTop + 14); normal();
    line(x2 + 10, blockTop + 18, x2 + bigW - 10, blockTop + 18);
    
    // Add remarks text if available
    if (payload.remarks) {
      const remarkLines = wrap(payload.remarks, bigW - 20);
      let ry = blockTop + 30;
      remarkLines.forEach((line) => {
        text(line, x2 + 10, ry);
        ry += 12;
      });
    }

    // Signatures (3 equal)
    [x1, x2, x3].forEach((x) => roundRect(x, sigTop, colW, SIG_H, 7, "S"));
    bold();
    text("ISSUED BY", x1 + 10, sigTop + 16);
    text("RECEIVED BY", x2 + 10, sigTop + 16);
    text("SECURITY", x3 + 10, sigTop + 16);
    normal();

    const writeSig = (x, showName) => {
      const baseY = sigTop + SIG_H - 26;
      text("Signature", x + 10, baseY - 10);
      line(x + 10, baseY - 8, x + colW - 10, baseY - 8);
      text("Name:", x + 10, baseY + 2);
      if (showName && payload.authorizedBy) text(payload.authorizedBy, x + 46, baseY + 2);
      text("Date:", x + 10, baseY + 14);
    };
    writeSig(x1, true); // Issued By - show authorized name
    writeSig(x2, false); // Received By - blank
    writeSig(x3, false); // Security - blank
  })();

  return doc;
}

// Preview Modal Component
function PreviewModal({ payload, onClose, onConfirm, loading }) {
  const [previewPdfUrl, setPreviewPdfUrl] = useState(null);

  useEffect(() => {
    // Generate preview PDF
    const generatePreview = () => {
      try {
        // Create a temporary RGP number for preview
        const previewPayload = {
          ...payload,
          rgpNo: payload.rgpNo === "(auto)" ? "RGP-PREVIEW-001" : payload.rgpNo
        };

        const doc = generateRgpPDF({ 
          payload: previewPayload, 
          options: { 
            qrEntryImage: null, 
            qrReturnImage: null 
          } 
        });

        const pdfBlob = doc.output('blob');
        const pdfUrl = URL.createObjectURL(pdfBlob);
        setPreviewPdfUrl(pdfUrl);

        return () => {
          if (pdfUrl) URL.revokeObjectURL(pdfUrl);
        };
      } catch (error) {
        console.error("Failed to generate preview:", error);
      }
    };

    generatePreview();
  }, [payload]);

  return (
    <div style={modalStyles.overlay}>
      <div style={modalStyles.modal}>
        <div style={modalStyles.header}>
          <h2 style={modalStyles.title}>
            <Emoji size={20} mr={8}>👁️</Emoji>
            Preview RGP
          </h2>
          <button 
            onClick={onClose} 
            style={modalStyles.closeButton}
            disabled={loading}
          >
            <Emoji size={16}>❌</Emoji>
          </button>
        </div>

        <div style={modalStyles.previewContainer}>
          {previewPdfUrl ? (
            <iframe
              src={previewPdfUrl}
              title="RGP Preview"
              style={modalStyles.previewFrame}
            />
          ) : (
            <div style={modalStyles.loadingPreview}>
              <Emoji size={32}>⏳</Emoji>
              <p>Generating preview...</p>
            </div>
          )}
        </div>

        <div style={modalStyles.footer}>
          <button 
            onClick={onClose} 
            style={modalStyles.cancelButton}
            disabled={loading}
          >
            <Emoji size={16} mr={6}>←</Emoji> Back to Edit
          </button>
          <button 
            onClick={onConfirm} 
            style={modalStyles.confirmButton}
            disabled={loading}
          >
            <Emoji size={16} mr={6}>
              {loading ? "⏳" : "✅"}
            </Emoji>
            {loading ? "Submitting..." : "Confirm & Submit"}
          </button>
        </div>
      </div>
    </div>
  );
}

// Modal Styles
const modalStyles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    backdropFilter: 'blur(8px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '20px',
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: '20px',
    width: '90%',
    maxWidth: '1200px',
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
    overflow: 'hidden',
  },
  header: {
    padding: '24px 32px',
    backgroundColor: '#f8fafc',
    borderBottom: '2px solid #e2e8f0',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    margin: 0,
    fontSize: '1.8rem',
    fontWeight: '700',
    color: '#00296b',
    display: 'flex',
    alignItems: 'center',
  },
  closeButton: {
    background: 'none',
    border: '2px solid #e2e8f0',
    borderRadius: '10px',
    width: '44px',
    height: '44px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    fontSize: '18px',
    transition: 'all 0.3s ease',
    color: '#64748b',
    ':hover': {
      backgroundColor: '#f1f5f9',
      borderColor: '#cbd5e1',
    },
    ':disabled': {
      opacity: 0.5,
      cursor: 'not-allowed',
    },
  },
  previewContainer: {
    flex: 1,
    padding: '24px',
    overflow: 'auto',
    backgroundColor: '#f1f5f9',
  },
  previewFrame: {
    width: '100%',
    height: '500px',
    border: 'none',
    borderRadius: '12px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
  },
  loadingPreview: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '500px',
    color: '#64748b',
    fontSize: '1.1rem',
  },
  footer: {
    padding: '24px 32px',
    backgroundColor: '#f8fafc',
    borderTop: '2px solid #e2e8f0',
    display: 'flex',
    justifyContent: 'space-between',
    gap: '16px',
  },
  cancelButton: {
    padding: '14px 28px',
    backgroundColor: 'white',
    color: '#4b5563',
    border: '2px solid #d1d5db',
    borderRadius: '12px',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    display: 'flex',
    alignItems: 'center',
    fontFamily: 'inherit',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
    ':hover:not(:disabled)': {
      backgroundColor: '#f9fafb',
      borderColor: '#9ca3af',
      transform: 'translateY(-2px)',
    },
    ':disabled': {
      opacity: 0.5,
      cursor: 'not-allowed',
    },
  },
  confirmButton: {
    padding: '14px 32px',
    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    fontSize: '1.1rem',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    display: 'flex',
    alignItems: 'center',
    fontFamily: 'inherit',
    boxShadow: '0 6px 20px rgba(16, 185, 129, 0.3)',
    ':hover:not(:disabled)': {
      transform: 'translateY(-3px)',
      boxShadow: '0 10px 25px rgba(16, 185, 129, 0.4)',
    },
    ':disabled': {
      background: 'linear-gradient(135deg, #9ca3af 0%, #6b7280 100%)',
      cursor: 'not-allowed',
      transform: 'none',
    },
  },
};

export default function FabricRgpForm({ today = new Date(), onSubmit, onBack }) {
  const toYMD = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate()
    ).padStart(2, "0")}`;

  const [form, setForm] = useState({
    rgpNo: "(auto)",
    date: toYMD(today),
    vendor: "",
    rgpType: "Fabric",
    department: "",
    purpose: "",
    itemDesc: "",
    qty: "",
    uom: "",
    entries: [
      { lotNo: "", itemDesc: "", qty1: "", qty2: "", uom: "", department: "", purpose: "" },
    ],
    expectedReturnDate: "",
    vehicleNo: "",
    authorizedBy: "",
    remarks: "",
  });

  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [customRgpType, setCustomRgpType] = useState("");
  const [customDepartments, setCustomDepartments] = useState({});
  const [customUoms, setCustomUoms] = useState({});
  const [showPreview, setShowPreview] = useState(false);
  const [submissionComplete, setSubmissionComplete] = useState(false);

  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  // entries helpers
  const updateEntry = (idx, key, val) =>
    setForm((f) => {
      const entries = [...(f.entries || [])];
      entries[idx] = { ...entries[idx], [key]: val };
      return { ...f, entries };
    });

  const addRow = () =>
    setForm((f) => ({
      ...f,
      entries: [
        ...(f.entries || []),
        { lotNo: "", itemDesc: "", qty1: "", qty2: "", uom: "", department: "", purpose: "" },
      ],
    }));

  const removeRow = (idx) =>
    setForm((f) => {
      const entries = [...(f.entries || [])];
      entries.splice(idx, 1);
      return {
        ...f,
        entries: entries.length
          ? entries
          : [{ lotNo: "", itemDesc: "", qty1: "", qty2: "", uom: "", department: "", purpose: "" }],
      };
    });

  // required at header level
  const required = ["date", "vendor", "expectedReturnDate", "authorizedBy", "rgpType"];

  const validate = () => {
    const e = {};
    required.forEach((k) => !String(form[k] ?? "").trim() && (e[k] = "Required"));

    const entries = form.entries || [];
    if (!entries.length) {
      e.entries = "At least one item row is required";
    } else {
      const rowErrs = entries.map((row) => {
        const re = {};
        const q1 = Number(row.qty1);
        const hasQ = (Number.isFinite(q1) && q1 > 0);
        if (!row.itemDesc && !row.lotNo) re.itemDesc = "Add Description or Lot No.";
        if (!row.uom) re.uom = "UOM required";
        if (!row.department) re.department = "Department required";
        if (!String(row.purpose || "").trim()) re.purpose = "Purpose required";
        if (!hasQ) re.qty = "Qty1 must be > 0";
        return re;
      });
      if (rowErrs.some((re) => Object.keys(re).length)) e.entries = rowErrs;
    }

    if (form.expectedReturnDate && form.date && form.expectedReturnDate < form.date)
      e.expectedReturnDate = "Cannot be before Issue Date";

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // Silent refresh function
  const silentRefresh = () => {
    // Store form state in sessionStorage for persistence
    const formKey = 'rgp_form_backup_' + new Date().getTime();
    sessionStorage.setItem(formKey, JSON.stringify({
      form,
      customRgpType,
      customDepartments,
      customUoms
    }));

    // Set submission complete flag
    setSubmissionComplete(true);

    // After a short delay, refresh the page
    setTimeout(() => {
      // Clear the backup after successful submission
      sessionStorage.removeItem(formKey);
      
      // Use location.reload() for a complete silent refresh
      window.location.reload();
    }, 100);
  };

  // Check for backup data on component mount
  useEffect(() => {
    const checkForBackup = () => {
      const keys = Object.keys(sessionStorage);
      const backupKey = keys.find(key => key.startsWith('rgp_form_backup_'));
      
      if (backupKey) {
        try {
          const backup = JSON.parse(sessionStorage.getItem(backupKey));
          if (backup) {
            // Restore form state
            setForm(backup.form);
            setCustomRgpType(backup.customRgpType);
            setCustomDepartments(backup.customDepartments);
            setCustomUoms(backup.customUoms);
            
            // Show success message
            setTimeout(() => {
              alert("✅ Form submitted successfully! Data has been restored.");
            }, 500);
            
            // Clear the backup
            sessionStorage.removeItem(backupKey);
          }
        } catch (error) {
          console.error("Failed to restore backup:", error);
          sessionStorage.removeItem(backupKey);
        }
      }
    };

    checkForBackup();
  }, []);

  // Preview handler
  const handlePreview = (e) => {
    e.preventDefault();
    if (!validate()) return;
    setShowPreview(true);
  };

  // Final submission handler
  const handleFinalSubmit = async () => {
    if (submitting) return;
    
    if (!WEB_APP_URL.includes("/exec")) {
      alert("❌ WEB_APP_URL must be a deployed /exec URL");
      return;
    }

    const first = (form.entries && form.entries[0]) || {};
    const legacyQty = (Number(first.qty1) || 0) || "";

    const rgpTypeFinal = form.rgpType === "Other" ? customRgpType.trim() : form.rgpType;

    const payload = {
      date: form.date,
      vendor: form.vendor,
      rgpType: rgpTypeFinal,
      department: first.department || "",
      purpose: first.purpose || "",
      itemDesc: first.itemDesc || "",
      qty: legacyQty,
      uom: first.uom || "",
      entries: (form.entries || []).map((r) => ({
        lotNo: r.lotNo || "",
        itemDesc: r.itemDesc || "",
        qty1: r.qty1 ? Number(r.qty1) : "",
        qty2: r.qty2 ? Number(r.qty2) : "",
        uom: r.uom || "",
        department: r.department || "",
        purpose: r.purpose || "",
      })),
      expectedReturnDate: form.expectedReturnDate,
      vehicleNo: form.vehicleNo,
      authorizedBy: form.authorizedBy,
      remarks: form.remarks,
      createdAt: new Date().toISOString(),
    };

    setSubmitting(true);
    
    try {
      console.log("Submitting payload to:", WEB_APP_URL);
      
      // Test connection first
      const testResponse = await fetch(WEB_APP_URL + '?mode=status', {
        method: 'GET',
        mode: 'no-cors'
      }).catch(() => {
        throw new Error('Cannot connect to server. Please check your Apps Script deployment.');
      });

      // Submit data
      const res = await fetch(WEB_APP_URL, {
        method: "POST",
        headers: { 
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
          "Accept": "application/json"
        },
        body: "data=" + encodeURIComponent(JSON.stringify(payload)),
      });
      
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      
      const text = await res.text();
      let json;
      try {
        json = JSON.parse(text);
      } catch (parseError) {
        throw new Error('Invalid response from server');
      }
      
      if (!json.ok) {
        throw new Error(json.error || "Save failed");
      }

      const assignedRgpNo = json.rgpNo;
      console.log("RGP created successfully:", assignedRgpNo);

      const baseUrl = json.baseUrl || WEB_APP_URL;
      const entryUrl =
        json.entryUrl ||
        (json.returnUrl ? String(json.returnUrl).replace("mode=return", "mode=entry")
                        : `${baseUrl}?mode=entry&rgp=${encodeURIComponent(assignedRgpNo)}`);
      const returnUrl =
        json.returnUrl ||
        `${baseUrl}?mode=return&rgp=${encodeURIComponent(assignedRgpNo)}`;

      // Generate QR codes with enhanced error handling
      console.log("Generating QR codes...");
      let entryQR, returnQR;
      
      try {
        entryQR = await generateQRCode(entryUrl);
        console.log("Entry QR generated successfully");
      } catch (qrError) {
        console.error("Failed to generate entry QR:", qrError);
        // Continue without QR codes
      }
      
      try {
        returnQR = await generateQRCode(returnUrl);
        console.log("Return QR generated successfully");
      } catch (qrError) {
        console.error("Failed to generate return QR:", qrError);
        // Continue without QR codes
      }

      // Convert QR codes to data URLs if they are blob URLs
      let entryQRDataUrl = entryQR;
      let returnQRDataUrl = returnQR;
      
      if (entryQR && entryQR.startsWith('blob:')) {
        try {
          entryQRDataUrl = await toDataURL(entryQR);
        } catch (error) {
          console.warn("Failed to convert entry QR to data URL:", error);
        }
      }
      
      if (returnQR && returnQR.startsWith('blob:')) {
        try {
          returnQRDataUrl = await toDataURL(returnQR);
        } catch (error) {
          console.warn("Failed to convert return QR to data URL:", error);
        }
      }

      // Update form with actual RGP number
      setForm((f) => ({ ...f, rgpNo: assignedRgpNo }));

      if (onSubmit) onSubmit({ ...payload, rgpNo: assignedRgpNo });
      
      // Generate PDF with new style
      console.log("Generating PDF...");
      const pdfDoc = generateRgpPDF({ 
        payload: { ...payload, rgpNo: assignedRgpNo }, 
        options: { 
          qrEntryImage: entryQRDataUrl, 
          qrReturnImage: returnQRDataUrl 
        } 
      });
      
      const safeNo = assignedRgpNo.replace(/[^\w\-]+/g, "-");
      pdfDoc.save(`RGP-${safeNo}.pdf`);
      
      // Close preview modal
      setShowPreview(false);
      
      // Show success message briefly
      alert(`✅ RGP Created Successfully!\nRGP No: ${assignedRgpNo}\nPDF has been downloaded.`);
      
      // Trigger silent refresh
      silentRefresh();
      
    } catch (err) {
      console.error("Submit error:", err);
      alert(`❌ Error: ${err.message}\n\nData was saved to sheet but PDF generation failed.`);
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setForm({
      rgpNo: "(auto)",
      date: toYMD(today),
      vendor: "",
      rgpType: "Fabric",
      department: "",
      purpose: "",
      itemDesc: "",
      qty: "",
      uom: "",
      entries: [{ lotNo: "", itemDesc: "", qty1: "", qty2: "", uom: "", department: "", purpose: "" }],
      expectedReturnDate: "",
      vehicleNo: "",
      authorizedBy: "",
      remarks: "",
    });
    setErrors({});
    setCustomRgpType("");
    setCustomDepartments({});
    setCustomUoms({});
  };

  const handleBack = () => {
    if (typeof onBack === "function") return onBack();
    if (window.history.length > 1) window.history.back();
    else window.location.href = "/";
  };

  // Handle custom department input
  const handleDepartmentChange = (idx, value) => {
    updateEntry(idx, "department", value);
    if (value !== "Other") {
      setCustomDepartments(prev => ({ ...prev, [idx]: "" }));
    }
  };

  // Handle custom UOM input
  const handleUomChange = (idx, value) => {
    updateEntry(idx, "uom", value);
    if (value !== "Other") {
      setCustomUoms(prev => ({ ...prev, [idx]: "" }));
    }
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.headerTop}>
          <button
            type="button"
            onClick={handleBack}
            title="Go Back"
            style={styles.backButton}
          >
            <Emoji size={18} mr={6}>◀️</Emoji>
            Back
          </button>

          <div style={styles.headerCenter}>
            <h1 style={styles.headerTitle}>
              <Emoji size={28} mr={8}>🧾</Emoji>
              Returnable Gate Pass
            </h1>
            <div style={styles.subtitleUnderTitle}>
              <Emoji size={16} mr={6}>📄</Emoji>
              Material Issue & Return Tracking System
            </div>
          </div>

          <div style={styles.rgpBadge}>
            <strong><Emoji size={16} mr={6}>🔖</Emoji>RGP:</strong> {form.rgpNo}
          </div>
        </div>
      </header>

      <form onSubmit={handlePreview} style={styles.form}>
        <fieldset style={styles.fieldset}>
          <legend style={styles.legend}>
            <Emoji size={18} mr={8}>📌</Emoji>
            Issue Details
          </legend>
          <div style={styles.grid}>
            <div style={styles.formGroup}>
              <label style={styles.label}>
                <Emoji size={16} mr={6}>🆔</Emoji>
                RGP Number
              </label>
              <input 
                value={form.rgpNo} 
                readOnly 
                style={styles.input} 
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>
                <Emoji size={16} mr={6}>📅</Emoji>
                Date *
              </label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => update("date", e.target.value)}
                style={errors.date ? { ...styles.input, ...styles.inputError } : styles.input}
              />
              {errors.date && <div style={styles.error}>{errors.date}</div>}
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>
                <Emoji size={16} mr={6}>🏷️</Emoji>
                Vendor / Party *
              </label>
              <input
                value={form.vendor}
                onChange={(e) => update("vendor", e.target.value)}
                placeholder="Enter vendor name"
                style={errors.vendor ? { ...styles.input, ...styles.inputError } : styles.input}
              />
              {errors.vendor && <div style={styles.error}>{errors.vendor}</div>}
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>
                <Emoji size={16} mr={6}>🧩</Emoji>
                RGP Type *
              </label>
              <select
                value={form.rgpType}
                onChange={(e) => {
                  update("rgpType", e.target.value);
                  if (e.target.value !== "Other") setCustomRgpType("");
                }}
                style={errors.rgpType ? { ...styles.input, ...styles.inputError } : styles.input}
              >
                {RGP_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              {form.rgpType === "Other" && (
                <input
                  value={customRgpType}
                  onChange={(e) => setCustomRgpType(e.target.value)}
                  placeholder="Enter custom RGP type"
                  style={{ ...styles.input, marginTop: '8px' }}
                  required
                />
              )}
              {errors.rgpType && <div style={styles.error}>{errors.rgpType}</div>}
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>
                <Emoji size={16} mr={6}>⏳</Emoji>
                Expected Return Date *
              </label>
              <input
                type="date"
                value={form.expectedReturnDate}
                onChange={(e) => update("expectedReturnDate", e.target.value)}
                style={errors.expectedReturnDate ? { ...styles.input, ...styles.inputError } : styles.input}
              />
              {errors.expectedReturnDate && <div style={styles.error}>{errors.expectedReturnDate}</div>}
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>
                <Emoji size={16} mr={6}>🚚</Emoji>
                Vehicle Number
              </label>
              <input
                value={form.vehicleNo}
                onChange={(e) => update("vehicleNo", e.target.value)}
                placeholder="Enter vehicle number"
                style={styles.input}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>
                <Emoji size={16} mr={6}>✅</Emoji>
                Authorized By *
              </label>
              <input
                value={form.authorizedBy}
                onChange={(e) => update("authorizedBy", e.target.value)}
                placeholder="Enter authorized person"
                style={errors.authorizedBy ? { ...styles.input, ...styles.inputError } : styles.input}
              />
              {errors.authorizedBy && <div style={styles.error}>{errors.authorizedBy}</div>}
            </div>

            <div style={{ ...styles.formGroup, gridColumn: "1 / -1" }}>
              <label style={styles.label}>
                <Emoji size={16} mr={6}>📝</Emoji>
                Remarks
              </label>
              <textarea
                value={form.remarks}
                onChange={(e) => update("remarks", e.target.value)}
                placeholder="Enter any additional remarks..."
                style={styles.textarea}
                rows="3"
              />
            </div>
          </div>
        </fieldset>

        <fieldset style={styles.fieldset}>
          <legend style={styles.legend}>
            <Emoji size={18} mr={8}>📦</Emoji>
            Items (Multiple entries, per-row Dept & Purpose)
          </legend>
          
          {(form.entries || []).map((row, idx) => {
            const rowErr =
              Array.isArray(errors.entries) && errors.entries[idx]
                ? errors.entries[idx]
                : {};
            return (
              <div key={idx} style={styles.itemSection}>
                <div style={styles.itemHeader}>
                  <h3 style={styles.itemTitle}>
                    <Emoji size={18} mr={8}>🎯</Emoji>
                    Item #{idx + 1}
                  </h3>
                  <div style={styles.itemActions}>
                    <button 
                      type="button" 
                      onClick={addRow}
                      style={styles.smallButton}
                      title="Add a new row"
                    >
                      <Emoji>➕</Emoji> Add Row
                    </button>
                    <button
                      type="button"
                      onClick={() => removeRow(idx)}
                      disabled={(form.entries || []).length === 1}
                      style={{ 
                        ...styles.smallButton, 
                        ...styles.removeButton, 
                        opacity: (form.entries || []).length === 1 ? 0.5 : 1 
                      }}
                      title="Remove this row"
                    >
                      <Emoji>🗑️</Emoji> Remove
                    </button>
                  </div>
                </div>

                <div style={styles.itemGrid}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>
                      <Emoji size={14} mr={6}>🔢</Emoji>
                      Lot No.
                    </label>
                    <input
                      value={row.lotNo}
                      onChange={(e) => updateEntry(idx, "lotNo", e.target.value)}
                      placeholder="Lot number"
                      style={styles.input}
                    />
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>
                      <Emoji size={14} mr={6}>🧾</Emoji>
                      Description *
                    </label>
                    <input
                      value={row.itemDesc}
                      onChange={(e) => updateEntry(idx, "itemDesc", e.target.value)}
                      placeholder="Item description"
                      style={rowErr?.itemDesc ? { ...styles.input, ...styles.inputError } : styles.input}
                    />
                    {rowErr?.itemDesc && <div style={styles.error}>{rowErr.itemDesc}</div>}
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>
                      <Emoji size={14} mr={6}>🏭</Emoji>
                      Department *
                    </label>
                    <select
                      value={row.department}
                      onChange={(e) => handleDepartmentChange(idx, e.target.value)}
                      style={rowErr?.department ? { ...styles.input, ...styles.inputError } : styles.input}
                    >
                      <option value="">Select Department</option>
                      {DEPT_OPTIONS.map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                    {row.department === "Other" && (
                      <input
                        value={customDepartments[idx] || ""}
                        onChange={(e) => {
                          setCustomDepartments(prev => ({ ...prev, [idx]: e.target.value }));
                          updateEntry(idx, "department", e.target.value);
                        }}
                        placeholder="Enter custom department"
                        style={{ ...styles.input, marginTop: '8px' }}
                        required
                      />
                    )}
                    {rowErr?.department && <div style={styles.error}>{rowErr.department}</div>}
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>
                      <Emoji size={14} mr={6}>🎯</Emoji>
                      Purpose *
                    </label>
                    <input
                      value={row.purpose}
                      onChange={(e) => updateEntry(idx, "purpose", e.target.value)}
                      placeholder="Enter purpose"
                      style={rowErr?.purpose ? { ...styles.input, ...styles.inputError } : styles.input}
                    />
                    {rowErr?.purpose && <div style={styles.error}>{rowErr.purpose}</div>}
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>
                      <Emoji size={14} mr={6}>📏</Emoji>
                      Quantity 1 *
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={row.qty1}
                      onChange={(e) => updateEntry(idx, "qty1", e.target.value)}
                      placeholder="0.00"
                      style={styles.input}
                    />
                    {rowErr?.qty && <div style={styles.error}>{rowErr.qty}</div>}
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>
                      <Emoji size={14} mr={6}>👜</Emoji>
                      Quantity 2 (Bags)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={row.qty2}
                      onChange={(e) => updateEntry(idx, "qty2", e.target.value)}
                      placeholder="0"
                      style={styles.input}
                    />
                    <div style={styles.helperText}>Bags quantity - not included in total</div>
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>
                      <Emoji size={14} mr={6}>⚖️</Emoji>
                      UOM *
                    </label>
                    <select
                      value={row.uom}
                      onChange={(e) => handleUomChange(idx, e.target.value)}
                      style={rowErr?.uom ? { ...styles.input, ...styles.inputError } : styles.input}
                    >
                      <option value="">Select UOM</option>
                      {UOM_OPTIONS.map((u) => (
                        <option key={u} value={u}>{u}</option>
                      ))}
                    </select>
                    {row.uom === "Other" && (
                      <input
                        value={customUoms[idx] || ""}
                        onChange={(e) => {
                          setCustomUoms(prev => ({ ...prev, [idx]: e.target.value }));
                          updateEntry(idx, "uom", e.target.value);
                        }}
                        placeholder="Enter custom UOM"
                        style={{ ...styles.input, marginTop: '8px' }}
                        required
                      />
                    )}
                    {rowErr?.uom && <div style={styles.error}>{rowErr.uom}</div>}
                  </div>
                </div>
                
                {idx < (form.entries || []).length - 1 && <hr style={styles.separator} />}
              </div>
            );
          })}
        </fieldset>

        <div style={styles.actionBar}>
          <button 
            type="button" 
            onClick={handleReset} 
            disabled={submitting || submissionComplete}
            style={styles.secondaryButton}
          >
            <Emoji mr={6}>↺</Emoji> Reset Form
          </button>
          <div style={styles.actionButtons}>
            <button 
              type="submit" 
              disabled={submitting || submissionComplete}
              style={styles.previewButton}
            >
              <Emoji mr={6}>👁️</Emoji>
              Preview RGP
            </button>
            <button 
              type="button"
              onClick={handleFinalSubmit}
              disabled={submitting || submissionComplete}
              style={styles.primaryButton}
            >
              <Emoji mr={6}>
                {submitting ? "⏳" : "📄"}
              </Emoji>
              {submitting ? "Saving…" : "Save & Download PDF"}
            </button>
          </div>
        </div>
      </form>

      {showPreview && (
        <PreviewModal
          payload={form}
          onClose={() => setShowPreview(false)}
          onConfirm={handleFinalSubmit}
          loading={submitting}
        />
      )}
    </div>
  );
}

// Enhanced Professional Styles
const styles = {
  container: {
    maxWidth: "2100px",
    margin: "0 auto",
    padding: "20px",
    fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
    backgroundColor: "#ffffffff",
    minHeight: "100vh",
    lineHeight: "1.6",
  },

  // HEADER - Professional gradient
  header: {
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    color: "white",
    padding: "28px 32px",
    borderRadius: "16px",
    marginBottom: "32px",
    boxShadow: "0 12px 40px rgba(102, 126, 234, 0.25)",
    position: "relative",
    overflow: "hidden",
  },
  headerTop: {
    display: "grid",
    gridTemplateColumns: "auto 1fr auto",
    alignItems: "center",
    columnGap: "20px",
    position: "relative",
    zIndex: "2",
  },
  backButton: {
    justifySelf: "start",
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    background: "rgba(255,255,255,0.15)",
    color: "#fff",
    border: "1px solid rgba(255,255,255,0.3)",
    padding: "12px 20px",
    borderRadius: "12px",
    cursor: "pointer",
    boxShadow: "0 4px 15px rgba(0,0,0,0.1)",
    transition: "all 0.3s ease",
    fontSize: "15px",
    fontWeight: "600",
    backdropFilter: "blur(10px)",
  },
  headerCenter: {
    justifySelf: "center",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    minWidth: "0",
    textAlign: "center",
  },
  headerTitle: {
    margin: "0 0 8px 0",
    fontSize: "2.4rem",
    fontWeight: "800",
    textShadow: "0 2px 8px rgba(0,0,0,0.2)",
    display: "flex",
    alignItems: "center",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    letterSpacing: "-0.5px",
  },
  subtitleUnderTitle: {
    marginTop: "4px",
    fontSize: "1.1rem",
    fontWeight: "500",
    opacity: "0.95",
    display: "flex",
    alignItems: "center",
    background: "rgba(255,255,255,0.1)",
    padding: "6px 16px",
    borderRadius: "20px",
    backdropFilter: "blur(8px)",
  },
  rgpBadge: {
    justifySelf: "end",
    background: "rgba(255,255,255,0.2)",
    padding: "14px 22px",
    borderRadius: "14px",
    fontSize: "1rem",
    fontWeight: "700",
    border: "1px solid rgba(255,255,255,0.3)",
    backdropFilter: "blur(12px)",
    whiteSpace: "nowrap",
    boxShadow: "0 4px 15px rgba(0,0,0,0.1)",
  },

  // FORM - Clean professional design
  form: {
    backgroundColor: "white",
    padding: "40px",
    borderRadius: "20px",
    boxShadow: "0 8px 40px rgba(0,0,0,0.08)",
    border: "1px solid #e2e8f0",
  },
  fieldset: {
    border: "2px solid #f1f5f9",
    borderRadius: "16px",
    padding: "32px",
    marginBottom: "32px",
    backgroundColor: "#ffffff",
    transition: "all 0.3s ease",
  },
  legend: {
    fontSize: "1.4rem",
    fontWeight: "700",
    color: "#00296bff",
    padding: "12px 24px",
    backgroundColor: "#f8fafc",
    borderRadius: "12px",
    border: "2px solid #e2e8f0",
    display: "inline-flex",
    alignItems: "center",
    boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
    gap: "24px",
    marginTop: "20px",
  },
  itemGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: "20px",
    marginTop: "20px",
  },
  formGroup: {
    display: "flex",
    flexDirection: "column",
  },
  label: {
    marginBottom: "10px",
    fontWeight: "600",
    color: "#00296bff",
    fontSize: "0.95rem",
    display: "flex",
    alignItems: "center",
  },
  input: {
    padding: "14px 16px",
    border: "2px solid #e2e8f0",
    borderRadius: "10px",
    fontSize: "1rem",
    transition: "all 0.3s ease",
    backgroundColor: "white",
    fontFamily: "inherit",
    outline: "none",
    color: "#000000ff",
  },
  textarea: {
    padding: "14px 16px",
    border: "2px solid #e2e8f0",
    borderRadius: "10px",
    fontSize: "1rem",
    transition: "all 0.3s ease",
    backgroundColor: "white",
    resize: "vertical",
    minHeight: "100px",
    fontFamily: "inherit",
    outline: "none",
    color: "#000000ff",
    lineHeight: "1.5",
  },
  inputError: {
    borderColor: "#ef4444",
    backgroundColor: "#fef2f2",
    boxShadow: "0 0 0 3px rgba(239, 68, 68, 0.1)",
  },
  error: {
    color: "#ef4444",
    fontSize: "0.85rem",
    marginTop: "6px",
    fontWeight: "500",
    display: "flex",
    alignItems: "center",
    gap: "4px",
  },
  helperText: {
    color: "#6b7280",
    fontSize: "0.8rem",
    marginTop: "4px",
    fontStyle: "italic",
  },
  itemSection: {
    backgroundColor: "#f8fafc",
    padding: "24px",
    borderRadius: "12px",
    marginBottom: "24px",
    border: "1px solid #e2e8f0",
    transition: "all 0.3s ease",
  },
  itemHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "20px",
    flexWrap: "wrap",
    gap: "16px",
  },
  itemTitle: {
    margin: "0",
    color: "#1e293b",
    fontSize: "1.3rem",
    display: "flex",
    alignItems: "center",
    fontWeight: "700",
  },
  itemActions: {
    display: "flex",
    gap: "12px",
  },
  smallButton: {
    padding: "10px 18px",
    border: "none",
    borderRadius: "8px",
    fontSize: "0.9rem",
    cursor: "pointer",
    transition: "all 0.3s ease",
    backgroundColor: "#ffffff",
    color: "#4b5563",
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontFamily: "inherit",
    fontWeight: "600",
    boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
    border: "1px solid #e5e7eb",
  },
  removeButton: {
    backgroundColor: "#fef2f2",
    color: "#dc2626",
    border: "1px solid #fecaca",
  },
  separator: {
    border: "none",
    borderTop: "2px dashed #d1d5db",
    margin: "28px 0",
  },
  actionBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: "40px",
    paddingTop: "28px",
    borderTop: "2px solid #f1f5f9",
  },
  actionButtons: {
    display: "flex",
    gap: "16px",
  },
  previewButton: {
    padding: "16px 32px",
    background: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
    color: "white",
    border: "none",
    borderRadius: "12px",
    fontSize: "1.1rem",
    fontWeight: "700",
    cursor: "pointer",
    transition: "all 0.3s ease",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    boxShadow: "0 6px 20px rgba(59, 130, 246, 0.3)",
    fontFamily: "inherit",
    letterSpacing: "0.5px",
  },
  primaryButton: {
    padding: "16px 36px",
    background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
    color: "white",
    border: "none",
    borderRadius: "12px",
    fontSize: "1.1rem",
    fontWeight: "700",
    cursor: "pointer",
    transition: "all 0.3s ease",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    boxShadow: "0 6px 20px rgba(16, 185, 129, 0.3)",
    fontFamily: "inherit",
    letterSpacing: "0.5px",
  },
  secondaryButton: {
    padding: "16px 32px",
    backgroundColor: "#ffffff",
    color: "#4b5563",
    border: "2px solid #d1d5db",
    borderRadius: "12px",
    fontSize: "1.1rem",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.3s ease",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontFamily: "inherit",
    boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
  },
};

// Enhanced hover effects
Object.assign(styles.backButton, {
  ':hover': {
    background: "rgba(255,255,255,0.25)",
    transform: "translateY(-2px)",
    boxShadow: "0 6px 20px rgba(0,0,0,0.15)",
  }
});

Object.assign(styles.input, {
  ':focus': {
    borderColor: "#667eea",
    boxShadow: "0 0 0 3px rgba(102, 126, 234, 0.1)",
    backgroundColor: "#fafbff",
  }
});

Object.assign(styles.textarea, {
  ':focus': {
    borderColor: "#667eea",
    boxShadow: "0 0 0 3px rgba(102, 126, 234, 0.1)",
    backgroundColor: "#fafbff",
  }
});

Object.assign(styles.previewButton, {
  ':hover:not(:disabled)': {
    transform: "translateY(-3px)",
    boxShadow: "0 10px 25px rgba(59, 130, 246, 0.4)",
  },
  ':disabled': {
    background: "linear-gradient(135deg, #9ca3af 0%, #6b7280 100%)",
    cursor: "not-allowed",
    transform: "none",
    boxShadow: "none",
  }
});

Object.assign(styles.primaryButton, {
  ':hover:not(:disabled)': {
    transform: "translateY(-3px)",
    boxShadow: "0 10px 25px rgba(16, 185, 129, 0.4)",
  },
  ':disabled': {
    background: "linear-gradient(135deg, #9ca3af 0%, #6b7280 100%)",
    cursor: "not-allowed",
    transform: "none",
    boxShadow: "none",
  }
});

Object.assign(styles.secondaryButton, {
  ':hover:not(:disabled)': {
    backgroundColor: "#f9fafb",
    borderColor: "#9ca3af",
    transform: "translateY(-2px)",
    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
  },
  ':disabled': {
    backgroundColor: "#f3f4f6",
    cursor: "not-allowed",
    transform: "none",
    boxShadow: "none",
  }
});

Object.assign(styles.smallButton, {
  ':hover': {
    backgroundColor: "#f3f4f6",
    transform: "translateY(-1px)",
    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
  }
});

Object.assign(styles.removeButton, {
  ':hover:not(:disabled)': {
    backgroundColor: "#fecaca",
    transform: "translateY(-1px)",
    boxShadow: "0 4px 12px rgba(220, 38, 38, 0.2)",
  }
});

Object.assign(styles.fieldset, {
  ':hover': {
    borderColor: "#e2e8f0",
    boxShadow: "0 4px 20px rgba(0,0,0,0.05)",
  }
});

Object.assign(styles.itemSection, {
  ':hover': {
    borderColor: "#cbd5e1",
    boxShadow: "0 4px 15px rgba(0,0,0,0.05)",
  }
});