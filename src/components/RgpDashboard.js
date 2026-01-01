import { useMemo, useState } from "react";

/** Enhanced Emoji icon with multiple animation options */
function EmojiIcon({ symbol, size = 24, className = "", label, animate = false, animationType = "pulse" }) {
  return (
    <span
      role="img"
      aria-label={label || symbol}
      className={`${className} ${animate ? `emoji-${animationType}` : ""}`}
      style={{
        display: "inline-block",
        fontSize: size,
        lineHeight: 1,
        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.1))"
      }}
    >
      {symbol}
    </span>
  );
}

export default function RgpDashboard({
  // UPDATED: added history in defaults so the new card has a count
   counts = { fabric: 0, pending: 0, partial: 0, closed: 0, overdue: 0, details: 0, history: 0, po: 0 },
  onScan = () => {},
  onNavigate = () => {},
  /** Optional: pass custom highlights and terms */
  highlights = [
    "RGP must be approved before materials exit the gate",
    "Carry original RGP copy for verification at security",
    "Returnable items must be closed within stipulated time",
    "Overdue RGPs are subject to escalation",
  ],
  terms = [
    { title: "Approval", text: "All RGPs require departmental head approval prior to issuance. Manual signatures are valid." },
    { title: "Identification", text: "Visitors/vendors must carry a valid ID and RGP copy at all times." },
    { title: "Material Check", text: "Security shall validate item quantity, UOM, and condition at exit and re-entry." },
    { title: "Timelines", text: "Returnable RGPs must be closed within the defined due date. Extensions need written approval." },
    { title: "Damage/Loss", text: "Any loss or damage must be reported immediately with an incident note." },
    { title: "Compliance", text: "Non-adherence may lead to access restrictions and disciplinary action." },
  ],
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeCard, setActiveCard] = useState(null);
  const [showTerms, setShowTerms] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);

  const go = (path) => {
    setIsLoading(true);
    setTimeout(() => {
      onNavigate(path);
      setIsLoading(false);
    }, 300);
  };

  const handleScan = (value) => {
    if (value.trim()) {
      setIsLoading(true);
      setTimeout(() => {
        onScan(value.trim());
        setIsLoading(false);
        setSearchQuery("");
      }, 300);
    }
  };

  /** Main Category Cards */
  const mainCategories = useMemo(
    () => [
      {
        key: "returnable",
        title: "Returnable Gate Pass",
        icon: "🏭",
        color: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        bgColor: "linear-gradient(135deg, #f0f4ff 0%, #e6f0ff 100%)",
        animation: "bounce",
        badge: "📦",
        description: "Manage fabric materials and stock levels",
        info: "Complete RGP management including pending, partial, closed, and overdue requests"
      },
      {
        key: "purchase",
        title: "Purchase Order",
        icon: "🛒",
        color: "linear-gradient(135deg, #14b8a6 0%, #06b6d4 100%)",
        bgColor: "linear-gradient(135deg, #ecfeff 0%, #d1fae5 100%)",
        animation: "tada",
        badge: "PO",
        description: "Generate and manage purchase orders",
        info: "Create POs from approved items, view by lot, and manage PO workflows"
      },
      {
        key: "zip",
        title: "ZIP Order",
        icon: "🧾",
        color: "linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)",
        bgColor: "linear-gradient(135deg, #ecfeff 0%, #e0f2fe 100%)",
        animation: "pulse",
        badge: "ZIP",
        description: "ZIP PO management and tracking",
        info: "Manage ZIP purchase orders with supervisor details and approval workflows"
      },
      {
        key: "dori",
        title: "DORI Order",
        icon: "🎗️",
        color: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
        bgColor: "linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)",
        animation: "pulse",
        badge: "DORI",
        description: "Manage DORI thread and cord orders",
        info: "Create and track DORI thread orders with analytics and PO management"
      },
    ],
    []
  );

  /** Enhanced cards with RGP-specific information */
  const allCards = useMemo(
    () => ({
      returnable: [
        {
          key: "fabric",
          title: "Returnable Gate Pass",
          count: counts.fabric ?? 0,
          icon: "🏭",
          path: "/rgp/fabric",
          color: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          bgColor: "linear-gradient(135deg, #f0f4ff 0%, #e6f0ff 100%)",
          animation: "bounce",
          badge: "📦",
          description: "Manage fabric materials and stock levels",
          info: "This card contains information about fabric inventory management for RGP processing including available stock and material tracking."
        },
        {
          key: "pending",
          title: "Pending RGP",
          count: counts.pending ?? 0,
          icon: "⏳",
          path: "/rgp/pending",
          color: "linear-gradient(135deg, #f59e0b 0%, #f97316 100%)",
          bgColor: "linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)",
          animation: "spin",
          badge: "🔄",
          description: "Review and approve pending requests",
          info: "This card contains information about pending RGP requests that are awaiting approval and administrative review."
        },
        {
          key: "partial",
          title: "Partial RGP",
          count: counts.partial ?? 0,
          icon: "🎯",
          path: "/rgp/partial",
          color: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
          bgColor: "linear-gradient(135deg, #f0fdff 0%, #e6f7ff 100%)",
          animation: "wobble",
          badge: "📊",
          description: "Monitor partially completed requests",
          info: "This card contains information about partially completed RGP requests that are currently in progress."
        },
        {
          key: "closed",
          title: "Closed RGP",
          count: counts.closed ?? 0,
          icon: "🎉",
          path: "/rgp/closed",
          color: "linear-gradient(135deg, #10b981 0%, #34d399 100%)",
          bgColor: "linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)",
          animation: "tada",
          badge: "✅",
          description: "View completed requests history",
          info: "This card contains information about successfully closed and completed RGP requests with full documentation."
        },
        {
          key: "overdue",
          title: "Overdue RGP",
          count: counts.overdue ?? 0,
          icon: "🚨",
          path: "/rgp/overdue",
          color: "linear-gradient(135deg, #ef4444 0%, #f43f5e 100%)",
          bgColor: "linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)",
          animation: "pulse",
          badge: "⚠️",
          description: "Track overdue and delayed requests",
          info: "This card contains information about overdue RGP requests that require immediate attention and resolution."
        },
        {
          key: "details",
          title: "GatePass Detail",
          count: counts.details ?? 0,
          icon: "🧾",
          path: "/rgp/details",
          color: "linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)",
          bgColor: "linear-gradient(135deg, #f5f3ff 0%, #eef2ff 100%)",
          animation: "pulse",
          badge: "ℹ️",
          description: "See item-wise RGP details & history",
          info: "Detailed gate pass records: items, quantities, parties, checkpoints, and audit history."
        },
        {
          key: "history",
          title: "RGP Material History",
          count: counts.history ?? 0,
          icon: "🗂️",
          path: "/rgp/history",
          color: "linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)",
          bgColor: "linear-gradient(135deg, #ecfeff 0%, #e0f2fe 100%)",
          animation: "pulse",
          badge: "📚",
          description: "Browse material movement logs over time",
          info: "Chronological item-wise movement: issues, returns, adjustments, and notes across all RGPs."
        },
      ],
      purchase: [
        {
          key: "po",
          title: "Purchase Order",
          count: counts.po ?? 0,
          icon: "🛒",
          path: "/rgp/purchase-order",
          color: "linear-gradient(135deg, #14b8a6 0%, #06b6d4 100%)",
          bgColor: "linear-gradient(135deg, #ecfeff 0%, #d1fae5 100%)",
          animation: "tada",
          badge: "PO",
          description: "Generate POs from approved items",
          info: "Create and print supplier POs with auto-filled lines from RGP, taxes/terms, and sign-off metadata."
        },
        {
          key: "poAsPerLot",
          title: "PO (as per Lot)",
          count: counts.poAsPerLot ?? 0,
          icon: "🧾",
          path: "/rgp/po-as-per-lot",
          color: "linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)",
          bgColor: "linear-gradient(135deg, #ecfeff 0%, #e0f2fe 100%)",
          animation: "pulse",
          badge: "PO",
          description: "View Purchase Orders grouped/filtered by Lot",
          info: "See POs created for each Lot, with quick links to related Lot details, receive actions, and PO download/print."
        },
      ],
      zip: [
        {
          key: "puneetZipPO",
          title: "Puneet ZIP PO",
          count: counts.puneetZipPO ?? 0,
          icon: "🧾",
          path: "/rgp/puneet-zip-po",
          color: "linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)",
          bgColor: "linear-gradient(135deg, #ecfeff 0%, #e0f2fe 100%)",
          animation: "pulse",
          badge: "ZIP",
          description: "POs prepared for Puneet (ZIP)",
          info: "View and download ZIP POs grouped by Lot."
        },
        {
          key: "ZipPODashboard",
          title: "Dashboard ZIP PO",
          count: counts.puneetZipPO ?? 0,
          icon: "🧾",
          path: "/rgp/zip-po-dashboard",
          color: "linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)",
          bgColor: "linear-gradient(135deg, #ecfeff 0%, #e0f2fe 100%)",
          animation: "pulse",
          badge: "ZIP",
          description: "ZIP PO Prepared By Supervisor detail",
          info: "View and download ZIP POs grouped by Lot."
        },
        {
          key: "approvalPanel",
          title: "Approval ZIP PO",
          count: counts.puneetZipPO ?? 0,
          icon: "🧾",
          path: "/rgp/zip-po-approval",
          color: "linear-gradient(135deg, #06b6d4 0%, #0d203fff 100%)",
          bgColor: "linear-gradient(135deg, #ecfeff 0%, #e0f2fe 100%)",
          animation: "pulse",
          badge: "ZIP",
          description: "ZIP PO Prepared By Supervisor detail",
          info: "View and download ZIP POs grouped by Lot."
        },
      ],
      dori: [
        {
          key: "doriOrder",
          title: "DORI Order",
          count: counts.doriOrder ?? 0,
          icon: "🎗️",
          path: "/rgp/dori-order",
          color: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
          bgColor: "linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)",
          animation: "pulse",
          badge: "DORI",
          description: "Manage DORI thread and cord orders",
          info: "Create and track DORI thread orders with specifications, quantities, and supplier details for garment production."
        },
        {
          key: "dashboardDoriPO",
          title: "Dashboard DORI PO",
          count: counts.dashboardDoriPO ?? 0,
          icon: "📊",
          path: "/rgp/dashboard-dori-po",
          color: "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)",
          bgColor: "linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)",
          animation: "pulse",
          badge: "DORI",
          description: "DORI PO analytics and overview",
          info: "Comprehensive dashboard for DORI purchase orders with analytics, tracking, and performance metrics."
        },
      ]
    }),
    [counts]
  );

  const currentCards = selectedCategory ? allCards[selectedCategory] : mainCategories;

  const handleCategorySelect = (categoryKey) => {
    setSelectedCategory(categoryKey);
    setActiveCard(null);
  };

  const handleBackToMain = () => {
    setSelectedCategory(null);
    setActiveCard(null);
  };

  return (
    <div className="rgp-root">
      <style>{`
        :root {
          --bg: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
          --panel: #ffffff;
          --ink: #1e293b;
          --muted: #64748b;
          --brand: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
          --brand-hover: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
          --ring: #e2e8f0;
          --card: #ffffff;
          --card-ring: #f1f5f9;
          --shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
          --shadow-hover: 0 20px 40px -10px rgba(0, 0, 0, 0.15);
          --radius: 16px;
          --radius-lg: 20px;
          --container: min(96vw, 1280px);
          --gap: clamp(14px, 2.4vw, 24px);
          --pad: clamp(14px, 2.4vw, 24px);
          --text: clamp(14px, 1.05vw, 16px);
          --title: clamp(22px, 3vw, 40px);
          --transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { margin: 0; font-family: 'Inter', ui-sans-serif, system-ui, -apple-system, sans-serif; background: var(--bg); }

        .rgp-root {
          min-height: 100dvh;
          background: white;
          color: var(--ink);
          font: 400 var(--text)/1.6 ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial;
          padding: var(--pad);
        }

        .rgp-loading {
          position: fixed; top: 0; left: 0; width: 100%; height: 4px;
          background: linear-gradient(90deg, #6366f1, #8b5cf6, #ec4899, #6366f1);
          background-size: 200% 100%;
          animation: loading-shimmer 1.2s infinite; z-index: 1000; display: none;
          box-shadow: 0 2px 8px rgba(99, 102, 241, 0.4);
        }
        .rgp-loading.active { display: block; }
        @keyframes loading-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

        .rgp-container { max-width: 2200px; width: 100%; margin: 0 auto; padding-inline: var(--pad); }

        .rgp-paper-header {
          background: white; border-radius: var(--radius-lg);
          padding: clamp(20px, 4vh, 48px) clamp(18px, 3vw, 48px);
          margin-bottom: clamp(18px, 3vh, 36px);
          box-shadow: var(--shadow);
          border: 1px solid rgba(255, 255, 255, 0.8);
          position: relative; overflow: hidden;
        }
        .rgp-paper-header::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 6px; background: var(--brand); }

        .rgp-header-content { text-align: center; max-width: 900px; margin: 0 auto; padding-inline: min(2vw, 16px); }
        .rgp-header h1 {
          font-size: clamp(24px, 4vw, 42px); font-weight: 800;
          background: linear-gradient(135deg, #1e293b, #475569);
          -webkit-background-clip: text; background-clip: text; color: transparent;
          margin-bottom: 12px; letter-spacing: -0.5px;
        }
        .rgp-header p { color: var(--muted); font-size: clamp(14px, 1.6vw, 18px); font-weight: 500; margin-bottom: 20px; line-height: 1.5; }

        .rgp-breadcrumb {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 20px;
          font-size: 14px;
          color: var(--muted);
        }
        
        .rgp-back-btn {
          background: #f8fafc;
          border: 1px solid #e5e7eb;
          color: #334155;
          padding: 8px 16px;
          border-radius: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: var(--transition);
          display: inline-flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 20px;
        }
        
        .rgp-back-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 16px rgba(0,0,0,0.06);
          background: #f1f5f9;
        }

        .rgp-terms-box { background: white; border-radius: var(--radius-lg); box-shadow: var(--shadow); border: 1px solid var(--card-ring); overflow: hidden; margin-bottom: clamp(20px, 3vh, 40px); position: relative; }
        .rgp-terms-box::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 6px; background: linear-gradient(135deg, #22c55e 0%, #06b6d4 50%, #818cf8 100%); }
        .rgp-terms-head { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; padding: 14px 16px; background: linear-gradient(180deg, rgba(248,250,252,0.75), rgba(255,255,255,0.9)); backdrop-filter: blur(4px); border-bottom: 1px solid var(--card-ring); }
        .rgp-terms-title { font-weight: 800; letter-spacing: -0.2px; color: #0f172a; display: flex; align-items: center; gap: 10px; }
        .rgp-terms-actions { margin-left: auto; display: flex; gap: 10px; }
        .rgp-ghost-btn { background: #f8fafc; border: 1px solid #e5e7eb; color: #334155; padding: 8px 12px; border-radius: 12px; font-weight: 600; cursor: pointer; transition: var(--transition); }
        .rgp-ghost-btn:hover { transform: translateY(-1px); box-shadow: 0 6px 16px rgba(0,0,0,0.06); }

        .rgp-ticker-wrap { position: relative; overflow: hidden; border-bottom: 1px dashed #e5e7eb; background: linear-gradient(90deg, rgba(99,102,241,0.04), transparent 30%, transparent 70%, rgba(16,185,129,0.05)); }
        .rgp-ticker { display: inline-flex; gap: 20px; padding: 12px 16px; white-space: nowrap; animation: rgp-ticker-scroll 28s linear infinite; }
        .rgp-ticker:hover { animation-play-state: paused; }
        .rgp-pill { display: inline-flex; align-items: center; gap: 8px; background: #f1f5f9; color: #0f172a; border: 1px solid #e2e8f0; padding: 6px 12px; border-radius: 9999px; font-weight: 600; box-shadow: 0 4px 10px rgba(0,0,0,0.04); font-size: 12px; }
        .rgp-pill b { color: #0ea5e9; }

        @keyframes rgp-ticker-scroll { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }

        .rgp-terms-body { padding: 16px; display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; background: linear-gradient(180deg, #ffffff, #f8fafc 45%, #ffffff 100%); }
        .rgp-term-card { border: 1px solid var(--card-ring); border-radius: 14px; padding: 12px; background: #ffffff; box-shadow: 0 8px 20px rgba(2,6,23,0.04); transition: var(--transition); position: relative; overflow: hidden; }
        .rgp-term-card::after { content: ''; position: absolute; inset: 0; background: radial-gradient(600px 120px at var(--x, 0px) var(--y, 0px), rgba(99,102,241,0.05), transparent 40%); opacity: 0; transition: opacity .3s ease; }
        .rgp-term-card:hover { transform: translateY(-3px); box-shadow: var(--shadow-hover); }
        .rgp-term-card:hover::after { opacity: 1; }
        .rgp-term-title { font-weight: 800; color: #0f172a; margin-bottom: 6px; font-size: 14px; }
        .rgp-term-text { color: var(--muted); font-weight: 500; font-size: 13px; }

        .rgp-search-section { max-width: 680px; margin: 0 auto; }

        .rgp-card-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)); gap: var(--gap); }
        .rgp-card { border: 1px solid var(--card-ring); background: var(--card); border-radius: var(--radius-lg); padding: 0; cursor: pointer; box-shadow: var(--shadow); transition: var(--transition); position: relative; overflow: hidden; display: flex; flex-direction: column; height: 100%; }
        .rgp-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 6px; background: var(--card-color, var(--brand)); }
        .rgp-card:hover { transform: translateY(-6px); box-shadow: var(--shadow-hover); }
        .rgp-card.active { transform: scale(0.98); }
        .rgp-card-main { padding: clamp(16px, 2.5vw, 28px); position: relative; z-index: 2; flex: 1; display: flex; flex-direction: column; }
        .rgp-card-header { display: flex; align-items: flex-start; gap: 14px; margin-bottom: 16px; }
        .rgp-card-icon { width: clamp(60px, 12vw, 76px); height: clamp(60px, 12vw, 76px); border-radius: 16px; display: grid; place-items: center; background: var(--card-bg, #f8fafc); border: 2px solid rgba(255,255,255,0.8); font-size: clamp(26px, 2.5vw, 32px); transition: var(--transition); box-shadow: 0 6px 20px rgba(0,0,0,0.08); position: relative; flex-shrink: 0; }
        .rgp-card-badge { position: absolute; top: -6px; right: -6px; background: white; border-radius: 50%; width: 24px; height: 24px; display: grid; place-items: center; font-size: 11px; box-shadow: 0 3px 8px rgba(0,0,0,0.15); border: 2px solid var(--card-color); }
        .rgp-card:hover .rgp-card-icon { transform: scale(1.06) rotate(2deg); }
        .rgp-card-info { flex: 1; }
        .rgp-card-title { font-weight: 700; font-size: clamp(16px, 1.6vw, 20px); color: #0f172a; margin-bottom: 6px; line-height: 1.2; }
        .rgp-card-description { color: var(--muted); font-size: clamp(12px, 1.1vw, 14px); margin-bottom: 10px; line-height: 1.4; }
        .rgp-card-count { font-size: clamp(18px, 1.8vw, 24px); font-weight: 800; margin-bottom: 12px; background: linear-gradient(135deg, var(--card-color)); -webkit-background-clip: text; background-clip: text; color: transparent; }
        .rgp-card-info-text { background: rgba(248, 250, 252, 0.8); padding: 12px; border-radius: 10px; border-left: 4px solid var(--card-color); margin-top: auto; }
        .rgp-card-info-content { font-size: clamp(12px, 1.1vw, 13px); color: var(--muted); line-height: 1.5; font-weight: 500; }
        .rgp-card-arrow { opacity: 0; transform: translateX(-8px); transition: var(--transition); color: #94a3b8; font-size: 18px; margin-top: 14px; align-self: flex-end; }
        .rgp-card:hover .rgp-card-arrow { opacity: 1; transform: translateX(0); }

        .emoji-pulse { animation: emoji-pulse 2s infinite; }
        .emoji-bounce { animation: emoji-bounce 2s infinite; }
        .emoji-spin { animation: emoji-spin 3s infinite linear; }
        .emoji-wobble { animation: emoji-wobble 2s infinite; }
        .emoji-tada { animation: emoji-tada 2s infinite; }

        @keyframes emoji-pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.15); } }
        @keyframes emoji-bounce { 0%, 20%, 53%, 80%, 100% { transform: translate3d(0,0,0); } 40%, 43% { transform: translate3d(0,-6px,0); } 70% { transform: translate3d(0,-3px,0); } 90% { transform: translate3d(0,-1px,0); } }
        @keyframes emoji-spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        @keyframes emoji-wobble { 0%, 100% { transform: rotate(0); } 25% { transform: rotate(-3deg); } 75% { transform: rotate(3deg); } }
        @keyframes emoji-tada { 0% { transform: scale(1); } 10%, 20% { transform: scale(0.9) rotate(-3deg); } 30%, 50%, 70%, 90% { transform: scale(1.1) rotate(3deg); } 40%, 60%, 80% { transform: scale(1.1) rotate(-3deg); } 100% { transform: scale(1) rotate(0); }

        @media (max-width: 640px) {
          .rgp-root { padding: 10px; }
          .rgp-terms-head { padding: 12px; }
        }

        @media (prefers-reduced-motion: reduce) {
          .rgp-ticker { animation: none !important; }
          .emoji-pulse, .emoji-bounce, .emoji-spin, .emoji-wobble, .emoji-tada { animation: none !important; }
          .rgp-card:hover { transform: none; }
        }
      `}</style>

      {/* Loading bar */}
      <div className={`rgp-loading ${isLoading ? "active" : ""}`} />

      {/* Main Container */}
      <main className="rgp-container">
        {/* Paper Style Header */}
        <section className="rgp-paper-header">
          <div className="rgp-header-content">
            <h1>RGP Management Dashboard</h1>
            <p>Monitor and manage your Request Gate Pass system efficiently with real-time tracking and comprehensive overview</p>

            {/* Breadcrumb */}
            {selectedCategory && (
              <div className="rgp-breadcrumb">
                <button className="rgp-back-btn" onClick={handleBackToMain}>
                  <EmojiIcon symbol="⬅️" size={16} /> Back to Main Menu
                </button>
                <span>› {mainCategories.find(cat => cat.key === selectedCategory)?.title}</span>
              </div>
            )}
          </div>
        </section>

        {/* Terms & Regulations Paper Box */}
        <section
          className="rgp-terms-box"
          onMouseMove={(e) => {
            // radial hover highlight on cards
            const el = e.currentTarget;
            el.querySelectorAll('.rgp-term-card').forEach(card => {
              const rect = card.getBoundingClientRect();
              card.style.setProperty('--x', `${e.clientX - rect.left}px`);
              card.style.setProperty('--y', `${e.clientY - rect.top}px`);
            });
          }}
        >
          <div className="rgp-terms-head">
            <div className="rgp-terms-title">
              <EmojiIcon symbol="📜" size={22} label="Terms" animate animationType="pulse" />
              Terms & Regulations
            </div>
            <div className="rgp-terms-actions">
              <button
                className="rgp-ghost-btn"
                onClick={() => setShowTerms((s) => !s)}
                aria-expanded={showTerms}
                aria-controls="rgp-terms-body"
              >
                {showTerms ? "Hide Details" : "View Full Policy"}
              </button>
            </div>
          </div>

          {/* Running ticker of highlights */}
          <div className="rgp-ticker-wrap" title="Hover to pause">
            <div className="rgp-ticker">
              {[...highlights, ...highlights].map((h, i) => (
                <span key={i} className="rgp-pill">
                  <EmojiIcon symbol="✅" size={16} />
                  <b>Note</b> {h}
                </span>
              ))}
            </div>
          </div>

          {/* Expandable full terms */}
          {showTerms && (
            <div id="rgp-terms-body" className="rgp-terms-body">
              {terms.map((t, idx) => (
                <article className="rgp-term-card" key={idx}>
                  <div className="rgp-term-title">
                    <EmojiIcon symbol="🔖" size={16} /> {t.title}
                  </div>
                  <div className="rgp-term-text">{t.text}</div>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* Cards Section */}
        <section className="rgp-cards-section">
          <div className="rgp-card-grid">
            {currentCards.map((c) => (
              <button
                key={c.key}
                onClick={() => {
                  if (!selectedCategory) {
                    // Main category selection
                    handleCategorySelect(c.key);
                  } else {
                    // Sub-card navigation
                    setActiveCard(c.key);
                    go(c.path);
                  }
                }}
                className={`rgp-card ${activeCard === c.key ? "active" : ""}`}
                style={{ "--card-color": c.color, "--card-bg": c.bgColor }}
                onMouseEnter={() => setActiveCard(c.key)}
                onMouseLeave={() => setActiveCard(null)}
              >
                <div className="rgp-card-main">
                  <div className="rgp-card-header">
                    <div className="rgp-card-icon">
                      <EmojiIcon
                        symbol={c.icon}
                        size={28}
                        animate={activeCard === c.key}
                        animationType={c.animation}
                      />
                      <div className="rgp-card-badge">{c.badge}</div>
                    </div>
                    <div className="rgp-card-info">
                      <div className="rgp-card-title">{c.title}</div>
                      <div className="rgp-card-description">{c.description}</div>
                      {c.count !== undefined && (
                        <div className="rgp-card-count">{c.count} Items</div>
                      )}
                    </div>
                  </div>

                  <div className="rgp-card-info-text">
                    <div className="rgp-card-info-content">{c.info}</div>
                  </div>

                  <EmojiIcon symbol="➡️" size={20} className="rgp-card-arrow" label="View Details" />
                </div>
              </button>
            ))}
          </div> 
        </section>
      </main>
    </div>
  );
}