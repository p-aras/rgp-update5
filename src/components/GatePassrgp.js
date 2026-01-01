import React, { useEffect, useMemo, useRef, useState } from "react";

/* ──────────────────────────────────────────────────────────────────────────
   Config
────────────────────────────────────────────────────────────────────────── */
const HARDCODED_API_KEY = "AIzaSyAomDFBkOySlIxKWSKGHe6ATv9gvaBr7uk";
const DEFAULT_SPREADSHEET_ID = "1BZ-ufmxeqa9XdU-jkuIgeNxHvhnYKjWj4UpnI3bHJKo";
const DEFAULT_RANGE = "Fabric_RGP_Logs!A1:J"; // includes header row at A1

// ✅ Hard whitelist — only these columns are ever read/used
const ALLOWED_COLUMNS = [
  "Timestamp",
  "Type",
  "RGP No",
  "StatusAfter",
  "ReturnedQty",
  "Name",
  "Latitude",
  "Longitude",
  "Remarks",
  // "UserAgent",
];

/* ──────────────────────────────────────────────────────────────────────────
   Utils
────────────────────────────────────────────────────────────────────────── */
function buildSheetsUrl({ spreadsheetId, range, apiKey }) {
  const keyToUse = apiKey || HARDCODED_API_KEY;
  const idToUse = spreadsheetId || DEFAULT_SPREADSHEET_ID;
  const rangeToUse = range || DEFAULT_RANGE;
  const base = `https://sheets.googleapis.com/v4/spreadsheets/${idToUse}/values/${encodeURIComponent(
    rangeToUse
  )}`;
  const params = new URLSearchParams({ key: keyToUse });
  return `${base}?${params.toString()}`;
}

// 👉 Convert rows while keeping ONLY ALLOWED_COLUMNS (others are ignored)
function rowsToObjects(values) {
  if (!values || values.length === 0) return [];
  const [header, ...rows] = values;
  const indexByHeader = {};
  header.forEach((h, i) => {
    indexByHeader[String(h)] = i;
  });

  return rows.map((r) => {
    const obj = {};
    ALLOWED_COLUMNS.forEach((col) => {
      const idx = indexByHeader[col];
      obj[col] = idx !== undefined ? (r[idx] ?? "") : "";
    });
    return obj;
  });
}

function parseDateLoose(s) {
  if (!s) return null;
  const ddmmyyyy = /^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})$/;
  const m = String(s).match(ddmmyyyy);
  if (m) {
    const d = parseInt(m[1], 10);
    const mo = parseInt(m[2], 10) - 1;
    const y = parseInt(m[3].length === 2 ? `20${m[3]}` : m[3], 10);
    const dt = new Date(y, mo, d);
    return isNaN(dt.getTime()) ? null : dt;
  }
  const iso = new Date(s);
  return isNaN(iso.getTime()) ? null : iso;
}

/** Parse RGP numbers like "RGP/2025/0002" (or "RGP-2025-2", "2025/2", etc.) */
function parseRgpNo(value) {
  if (!value) return { year: 0, seq: 0 };
  const s = String(value);
  const nums = s.match(/\d+/g) || [];
  if (nums.length >= 2) {
    const year = parseInt(nums[nums.length - 2], 10) || 0;
    const seq = parseInt(nums[nums.length - 1], 10) || 0;
    return { year, seq };
  }
  if (nums.length === 1) return { year: 0, seq: parseInt(nums[0], 10) || 0 };
  return { year: 0, seq: 0 };
}

function resolveRgpNoKey(keys = []) {
  const lc = (s) => String(s || "").toLowerCase().trim();
  const direct = keys.find((k) =>
    ["rgp no", "rgp no.", "rgp number", "rgp#", "rgp"].includes(lc(k))
  );
  if (direct) return direct;
  const fuzzy = keys.find(
    (k) =>
      lc(k).includes("rgp") &&
      (lc(k).includes("no") || lc(k).includes("number") || lc(k).includes("#"))
  );
  return fuzzy || "RGP No";
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function formatTodayStamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(
    d.getHours()
  )}-${pad(d.getMinutes())}`;
}

function norm(v) {
  return String(v ?? "").toLowerCase().trim();
}

/* ──────────────────────────────────────────────────────────────────────────
   Component
────────────────────────────────────────────────────────────────────────── */
export default function GatePassRgp({
  spreadsheetId = DEFAULT_SPREADSHEET_ID,
  apiKey = HARDCODED_API_KEY,
  range = DEFAULT_RANGE,
  // keep for compatibility but unused for filtering now
  statusField = "StatusAfter",
  dateField = "Timestamp",
  pageSize = 10,
  onBack,
  homeHref,
}) {
  const [rawRows, setRawRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // sort state
  const [sortKey, setSortKey] = useState("");
  const [sortDir, setSortDir] = useState("desc");
  const [page, setPage] = useState(1);
  const abortRef = useRef(null);

  // NEW: filter state
  const [filterType, setFilterType] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [filterName, setFilterName] = useState("ALL");
  const [globalQuery, setGlobalQuery] = useState("");

  const url = useMemo(() => {
    try {
      return buildSheetsUrl({ spreadsheetId, range, apiKey });
    } catch {
      return "";
    }
  }, [spreadsheetId, range, apiKey]);

  useEffect(() => {
    fetchRows();
    return () => abortRef.current?.abort?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  async function fetchRows() {
    setLoading(true);
    setError("");
    setPage(1);
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      const res = await fetch(url, { signal: ctrl.signal });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(
          `Google Sheets API error ${res.status}: ${text?.slice(0, 200)}`
        );
      }
      const json = await res.json();
      const rows = rowsToObjects(json.values || []);
      setRawRows(rows);
    } catch (err) {
      if (err?.name === "AbortError") return;
      setError(
        err?.message ||
          "Failed to load data. Ensure your sheet is public and the API key is valid."
      );
    } finally {
      setLoading(false);
    }
  }

  function handleBack() {
    if (typeof onBack === "function") {
      try {
        onBack();
      } catch {}
      return;
    }
    if (typeof window !== "undefined" && window.history && window.history.length > 1) {
      window.history.back();
      return;
    }
    if (homeHref) window.location.href = homeHref;
  }

  // Headers are strictly the allowed list
  const allKeys = useMemo(() => ALLOWED_COLUMNS, []);
  const RGP_NO_KEY = useMemo(() => resolveRgpNoKey(allKeys), [allKeys]);

  useEffect(() => {
    if (!sortKey && RGP_NO_KEY) setSortKey(RGP_NO_KEY);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [RGP_NO_KEY]);

  // NEW: unique dropdown options (sorted, stable)
  const typeOptions = useMemo(() => {
    return ["ALL", ...Array.from(new Set(rawRows.map(r => r["Type"] || "")))
      .filter(Boolean)
      .sort((a,b) => String(a).localeCompare(String(b)))];
  }, [rawRows]);

  const statusOptions = useMemo(() => {
    return ["ALL", ...Array.from(new Set(rawRows.map(r => r["StatusAfter"] || "")))
      .filter(Boolean)
      .sort((a,b) => String(a).localeCompare(String(b)))];
  }, [rawRows]);

  const nameOptions = useMemo(() => {
    return ["ALL", ...Array.from(new Set(rawRows.map(r => r["Name"] || "")))
      .filter(Boolean)
      .sort((a,b) => String(a).localeCompare(String(b)))];
  }, [rawRows]);

  // 🔎 Global search compares across all ALLOWED_COLUMNS (case-insensitive, substring)
  const matchesGlobal = (row) => {
    const q = norm(globalQuery);
    if (!q) return true;
    return ALLOWED_COLUMNS.some((c) => norm(row[c]).includes(q));
  };

  // ✅ Filtering (applied before sorting + pagination)
  const filtered = useMemo(() => {
    return rawRows.filter((r) => {
      const okType = filterType === "ALL" || norm(r["Type"]) === norm(filterType);
      const okStatus = filterStatus === "ALL" || norm(r["StatusAfter"]) === norm(filterStatus);
      const okName = filterName === "ALL" || norm(r["Name"]) === norm(filterName);
      const okGlobal = matchesGlobal(r);
      return okType && okStatus && okName && okGlobal;
    });
  }, [rawRows, filterType, filterStatus, filterName, globalQuery]);

  // Sorting (on filtered rows)
  const sorted = useMemo(() => {
    let x = [...filtered];
    if (!sortKey) return x;

    return x.sort((a, b) => {
      const av = a[sortKey] ?? "";
      const bv = b[sortKey] ?? "";

      if (sortKey === RGP_NO_KEY) {
        const aN = parseRgpNo(av);
        const bN = parseRgpNo(bv);
        const cmpYear = aN.year - bN.year;
        const cmpSeq = aN.seq - bN.seq;
        const res = cmpYear !== 0 ? cmpYear : cmpSeq;
        return sortDir === "asc" ? res : -res;
      }

      if (sortKey === dateField) {
        const ad = parseDateLoose(av)?.getTime() ?? 0;
        const bd = parseDateLoose(bv)?.getTime() ?? 0;
        return sortDir === "asc" ? ad - bd : bd - ad;
      }

      return sortDir === "asc"
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av));
    });
  }, [filtered, sortKey, sortDir, RGP_NO_KEY, dateField]);

  // Table columns = allowed columns (fixed order)
  const columns = allKeys;

  // Pagination
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const pageRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, page, pageSize]);

  function toggleSort(key) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  // Export the current filtered+sorted view
  const visibleDataForExport = useMemo(() => {
    return sorted.map((row) => {
      const o = {};
      columns.forEach((c) => (o[c] = row[c] ?? ""));
      return o;
    });
  }, [sorted, columns]);

  async function exportExcel() {
    try {
      const XLSX = (await import("xlsx")).default || (await import("xlsx"));
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(visibleDataForExport);
      XLSX.utils.book_append_sheet(wb, ws, "RGP Logs (Filtered)");
      const filename = `RGP_Logs_Filtered_${formatTodayStamp()}.xlsx`;
      XLSX.writeFile(wb, filename);
    } catch (err) {
      console.error(err);
      const csv = [
        columns.join(","),
        ...visibleDataForExport.map((r) =>
          columns
            .map((c) => {
              const v = String(r[c] ?? "");
              const needsQuote = /[",\n]/.test(v);
              return needsQuote ? `"${v.replace(/"/g, '""')}"` : v;
            })
            .join(",")
        ),
      ].join("\n");
      downloadBlob(
        new Blob([csv], { type: "text/csv;charset=utf-8" }),
        `RGP_Logs_Filtered_${formatTodayStamp()}.csv`
      );
      alert("XLSX export library not found. Exported CSV instead (opens in Excel).");
    }
  }

  function pdfSafe(input) {
    if (input == null) return "";
    let s = String(input);
    const map = {
      "“": '"', "”": '"', "„": '"', "‟": '"',
      "‘": "'", "’": "'", "‚": "'", "‛": "'",
      "–": "-", "—": "-", "-": "-", "•": "-",
      "…": "...", "→": "->", "←": "<-", "↔": "<->", "⇒": "=>", "⇐": "<=",
      "▲": "^", "▼": "v", "▶": ">", "◀": "<",
    };
    s = s.replace(/["“”„‟‘’‚‛–—-•…→←↔⇒⇐▲▼▶◀]/g, (ch) => map[ch] || "");
    s = s.replace(/[^\x00-\x7E]/g, "");
    s = s.replace(/\s+/g, " ").trim();
    return s;
  }

  async function exportPDF() {
    try {
      const jsPDFModule = await import("jspdf");
      const autoTableModule = await import("jspdf-autotable");
      const jsPDF = jsPDFModule.jsPDF || jsPDFModule.default || jsPDFModule;

      const orientation = columns.length > 8 ? "landscape" : "portrait";
      const doc = new jsPDF({ orientation, unit: "pt", format: "A3" });

      const margin = 40;
      const inner = 18;
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();

      const BORDER = [221, 226, 233];
      const TITLE_BG = [14, 165, 233];
      const SUBTITLE = [71, 85, 105];
      const HEAD_BG = [241, 245, 249];
      const ALT_ROW_BG = [250, 250, 250];
      const GRID = [226, 232, 240];
      const TEXT_MUTED = [100, 116, 139];

      doc.setProperties({
        title: "RGP Logs (Filtered) Report",
        subject: "Filtered RGP logs export",
        keywords: "RGP, report, export, PDF",
        creator: "RGP Logs Dashboard",
      });

      const drawPageChrome = (pageNumber, totalPages) => {
        doc.setDrawColor(...BORDER);
        doc.setLineWidth(1);
        doc.roundedRect(margin / 2, margin / 2, pageW - margin, pageH - margin, 8, 8);

        const titleH = 56;
        doc.setFillColor(...TITLE_BG);
        doc.setTextColor(255, 255, 255);
        doc.rect(margin, margin, pageW - margin * 2, titleH, "F");

        doc.setFontSize(18);
        doc.setFont("helvetica", "bold");
        doc.text("RGP Logs — Filtered View", margin + inner, margin + 22 + inner / 2);

        doc.setFontSize(10);
        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "normal");
        const exportedAt = pdfSafe(new Date().toLocaleString());
        doc.text(`Exported: ${exportedAt}`, pageW - margin - inner, margin + 22 + inner / 2, {
          align: "right",
        });

        doc.setFontSize(9);
        doc.setTextColor(...TEXT_MUTED);
        const footerY = pageH - margin + 18;
        doc.text(`Page ${pageNumber} / ${totalPages}`, pageW - margin, footerY, { align: "right" });
        doc.text("Generated by RGP Logs Dashboard", margin, footerY);
      };

      const safeColumns = columns.map(pdfSafe);
      const head = [safeColumns];
      const body = visibleDataForExport.map((r) => safeColumns.map((c) => pdfSafe(r[c])));

      drawPageChrome(1, 1);

      autoTableModule.default(doc, {
        head,
        body,
        startY: margin + 56 + 18,
        theme: "grid",
        styles: {
          fontSize: 9,
          cellPadding: 6,
          lineColor: GRID,
          lineWidth: 0.6,
          valign: "top",
        },
        headStyles: {
          fillColor: HEAD_BG,
          textColor: 0,
          fontStyle: "bold",
          lineColor: GRID,
          lineWidth: 0.8,
        },
        alternateRowStyles: { fillColor: ALT_ROW_BG },
        margin: { left: margin + inner, right: margin + inner },
        didAddPage: () => {
          const currentPage = doc.internal.getNumberOfPages();
          drawPageChrome(currentPage, currentPage);
        },
      });

      const totalPages = doc.internal.getNumberOfPages();
      for (let p = 1; p <= totalPages; p++) {
        doc.setPage(p);
        drawPageChrome(p, totalPages);
      }

      const filename = `RGP_Logs_Filtered_${formatTodayStamp()}.pdf`;
      doc.save(filename);
    } catch (err) {
      console.error(err);
      alert("PDF export libraries (jspdf, jspdf-autotable) not found. Please add them or use Excel/CSV export.");
    }
  }

  function resetFilters() {
    setFilterType("ALL");
    setFilterStatus("ALL");
    setFilterName("ALL");
    setGlobalQuery("");
    setPage(1);
  }

  /* ────────────────────────────────────────────────────────────────────────
     UI
  ──────────────────────────────────────────────────────────────────────── */
  return (
    <div className="rgp-shell">
      <style jsx>{`
        .rgp-shell { width: 100%; max-width: 2200px; margin: 0 auto; padding: 16px clamp(16px, 3vw, 24px); font-family: 'Inter', ui-sans-serif, system-ui, -apple-system, sans-serif; color: #0f172a; background: linear-gradient(135deg, #ffffffff 0%, #f1f5f9 100%); min-height: 100vh; }
        .rgp-header { position: sticky; top: 0; z-index: 10; display: grid; grid-template-columns: 1fr auto; align-items: center; gap: 16px; padding: 20px 24px; margin-bottom: 16px; border: 1px solid rgba(255, 255, 255, 0.2); background: linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(248, 250, 252, 0.9) 100%); backdrop-filter: blur(12px); border-radius: 20px; box-shadow: 0 8px 32px rgba(15, 23, 42, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.6); }
        .rgp-title { margin: 0; font-weight: 800; letter-spacing: -0.02em; background: linear-gradient(135deg, #0e12e9ff 0%, #3b82f6 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; font-size: clamp(24px, 2.5vw, 32px); }
        .rgp-actions { display: flex; gap: 10px; flex-wrap: wrap; }
        .btn { display: inline-flex; align-items: center; gap: 8px; height: 42px; padding: 0 18px; border-radius: 12px; border: 1px solid rgba(226, 232, 240, 0.8); background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%); font-size: 13px; font-weight: 600; color: #475569; cursor: pointer; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); box-shadow: 0 2px 8px rgba(2, 6, 23, 0.04), inset 0 1px 0 rgba(255, 255, 255, 0.8); position: relative; overflow: hidden; }
        .btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 25px rgba(2, 6, 23, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.8); border-color: #cbd5e1; color: #0f172a; }
        .btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .btn-primary { background: linear-gradient(135deg, #0ea5e9 0%, #3b82f6 100%); color: white; border-color: transparent; box-shadow: 0 4px 16px rgba(14, 165, 233, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2); }
        .table-wrap { overflow: auto; border: 1px solid rgba(255, 255, 255, 0.3); border-radius: 18px; background: rgba(255, 255, 255, 0.7); box-shadow: 0 8px 32px rgba(15, 23, 42, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.6); backdrop-filter: blur(12px); position: relative; }
        table { width: 100%; border-collapse: separate; border-spacing: 0; font-size: 13px; background: transparent; }
        thead th { position: sticky; top: 0; z-index: 5; background: linear-gradient(135deg, #0b4681ff 0%, #054688ff 100%); color: #ffffffff; text-align: left; font-weight: 700; padding: 16px 14px; border: 1.5px solid #e2e8f0; white-space: nowrap; cursor: pointer; user-select: none; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; }
        tbody td { padding: 14px; border: 1px solid #f1f5f9; white-space: nowrap; color: #000000ff; font-weight: 500; }
        .status-pill { display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 20px; font-size: 11px; font-weight: 700; text-transform: uppercase; border: 1px solid; }
        .status-active { background: linear-gradient(135deg, #ecfeff 0%, #cffafe 100%); color: #0e7490; border-color: rgba(6, 182, 212, 0.3); }
        .status-partial { background: linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%); color: #9a3412; border-color: rgba(251, 146, 60, 0.3); }
        .pagination { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-top: 20px; padding: 16px; background: rgba(255, 255, 255, 0.7); border-radius: 16px; }
 .filters { display: grid; grid-template-columns: 1fr 1fr 1fr 2fr auto; gap: 10px; padding: 12px 14px; background: rgba(255,255,255,0.8); border: 1px solid #e2e8f0; border-radius: 14px; margin-bottom: 16px; }
  .filter-field { display:flex; flex-direction:column; gap:6px; }
  .filter-label { font-size: 12px; font-weight: 700; color:#334155; letter-spacing: .02em; }
  .select, .search { height: 40px; border-radius: 10px; border: 1px solid #e2e8f0; background: #ffffff; padding: 0 12px; font-weight: 600; color: #334155; }
        /* NEW: filter bar */
        .filters { display: grid; grid-template-columns: 1fr 1fr 1fr 2fr auto; gap: 10px; padding: 12px 14px; background: rgba(255,255,255,0.8); border: 1px solid #e2e8f0; border-radius: 14px; margin-bottom: 16px; }
        .select, .search { height: 40px; border-radius: 10px; border: 1px solid #e2e8f0; background: #ffffff; padding: 0 12px; font-weight: 600; color: #334155; }
        .search { width: 100%; }
        .chip { display:inline-flex; align-items:center; gap:6px; padding:6px 10px; background:#eef2ff; color:#312e81; border:1px solid #c7d2fe; border-radius:12px; font-weight:700; font-size:12px; }
        .chips { display:flex; gap:8px; flex-wrap:wrap; margin-top:6px; }
        .page-btn { height: 36px; padding: 0 16px; border-radius: 10px; border: 1px solid #e2e8f0; background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%); cursor: pointer; font-weight: 600; color: #475569; }
      `}</style>

      {/* Header */}
      <div className="rgp-header">
        <div>
          <h2 className="rgp-title">📋 RGP ENTRY AND RETURN RECORD — All Records</h2>
          <div className="chips">
            <span className="chip">🎯 Filters: Type {filterType}, Status {filterStatus}, Name {filterName}</span>
            {globalQuery ? <span className="chip">🔎 “{globalQuery}”</span> : <span className="chip">🔎 No global search</span>}
          </div>
        </div>
        <div className="rgp-actions">
          <button className="btn" type="button" onClick={handleBack} title="Go Back">
            <span>⬅️</span> Back
          </button>
          <button className="btn" onClick={fetchRows} disabled={loading} title="Refresh">
            <span>{loading ? "⏳" : "🔄"}</span> {loading ? "Refreshing…" : "Refresh"}
          </button>
          <button className="btn" onClick={resetFilters} title="Clear filters">
            ♻️ Reset Filters
          </button>
          <button className="btn" onClick={exportExcel} title="Download Excel">
            <span>📊</span> Excel
          </button>
          <button className="btn btn-primary" onClick={exportPDF} title="Download PDF">
            <span>📄</span> PDF Report
          </button>
        </div>
      </div>

      {/* NEW: Filters Bar */}
      {/* NEW: Filters Bar (labeled) */}
<div className="filters" role="region" aria-label="RGP table filters">
  <div className="filter-field">
    <label htmlFor="filter-type" className="filter-label">Type</label>
    <select
      id="filter-type"
      className="select"
      value={filterType}
      onChange={(e) => { setFilterType(e.target.value); setPage(1); }}
      title="Filter by Type"
      aria-label="Filter by Type"
    >
      {typeOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
    </select>
  </div>

  <div className="filter-field">
    <label htmlFor="filter-status" className="filter-label">StatusAfter</label>
    <select
      id="filter-status"
      className="select"
      value={filterStatus}
      onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
      title="Filter by StatusAfter"
      aria-label="Filter by StatusAfter"
    >
      {statusOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
    </select>
  </div>

  <div className="filter-field">
    <label htmlFor="filter-name" className="filter-label">Name</label>
    <select
      id="filter-name"
      className="select"
      value={filterName}
      onChange={(e) => { setFilterName(e.target.value); setPage(1); }}
      title="Filter by Name"
      aria-label="Filter by Name"
    >
      {nameOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
    </select>
  </div>

  <div className="filter-field" style={{gridColumn: "auto / span 1"}}>
    <label htmlFor="global-search" className="filter-label">Global Search (all columns)</label>
    <input
      id="global-search"
      className="search"
      type="search"
      placeholder="Type to search across all columns…"
      value={globalQuery}
      onChange={(e) => { setGlobalQuery(e.target.value); setPage(1); }}
      title="Global search"
      aria-label="Global search across all columns"
    />
  </div>

  <div className="filter-field" style={{alignSelf: "end"}}>
    <button
      className="btn"
      onClick={() => { setFilterType("ALL"); setFilterStatus("ALL"); setFilterName("ALL"); setGlobalQuery(""); setPage(1); }}
      title="Clear all filters"
      aria-label="Clear all filters"
    >
      Clear
    </button>
  </div>
</div>


      {/* Table */}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              {columns.map((k) => (
                <th key={k} onClick={() => toggleSort(k)} title="Click to sort">
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    {k}
                    {sortKey === k && (
                      <span style={{ fontSize: 10, opacity: 0.7 }}>
                        {sortDir === "asc" ? "⬆️" : "⬇️"}
                      </span>
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length || 1} style={{ padding: 32, textAlign: "center", opacity: 0.7 }}>
                  ⏳ Loading RGP Data…
                </td>
              </tr>
            ) : pageRows.length === 0 ? (
              <tr>
                <td colSpan={columns.length || 1} style={{ padding: 32, textAlign: "center", opacity: 0.7 }}>
                  📭 No records match current filters.
                </td>
              </tr>
            ) : (
              pageRows.map((row, idx) => (
                <tr key={idx}>
                  {columns.map((k) => {
                    const val = row[k];
                    if (k === "StatusAfter") {
                      const v = String(val || "");
                      const isActive = v.toLowerCase() === "active";
                      const isPartial = v.toLowerCase() === "partial";
                      return (
                        <td key={k}>
                          <span
                            className={`status-pill ${
                              isActive ? "status-active" : isPartial ? "status-partial" : ""
                            }`}
                          >
                            {isActive ? "🟢" : isPartial ? "🟡" : "⚪️"} {v || "-"}
                          </span>
                        </td>
                      );
                    }
                    return <td key={k}>{String(val ?? "")}</td>;
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="pagination">
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span>📊</span>
          <span>
            <b>{sorted.length}</b> item{sorted.length === 1 ? "" : "s"} after filters
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            className="page-btn"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            ◀️ Prev
          </button>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            Page <b>{page}</b> of {totalPages}
          </span>
          <button
            className="page-btn"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            Next ▶️
          </button>
        </div>
      </div>
    </div>
  );
}
