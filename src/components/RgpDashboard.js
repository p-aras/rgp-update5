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
  counts = { fabric: 0, pending: 0, partial: 0, closed: 0, overdue: 0, details: 0, history: 0, po: 0, poAsPerLotShade: 0 },
  onScan = () => {},
  onNavigate = () => {},
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
  const [viewMode, setViewMode] = useState("grid");

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
        color: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
        bgColor: "#eff6ff",
        animation: "bounce",
        badge: "📦",
        description: "Manage fabric materials and stock levels",
        info: "Complete RGP management including pending, partial, closed, and overdue requests",
        stats: { total: 156, active: 23, completed: 133 }
      },
      {
        key: "purchase",
        title: "Purchase Order",
        icon: "🛒",
        color: "linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)",
        bgColor: "#f0f9ff",
        animation: "tada",
        badge: "PO",
        description: "Generate and manage purchase orders",
        info: "Create POs from approved items, view by lot, and manage PO workflows",
        stats: { total: 89, pending: 12, approved: 77 }
      },
      {
        key: "zip",
        title: "ZIP Order",
        icon: "🧾",
        color: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
        bgColor: "#eff6ff",
        animation: "pulse",
        badge: "ZIP",
        description: "ZIP PO management and tracking",
        info: "Manage ZIP purchase orders with supervisor details and approval workflows",
        stats: { total: 45, pending: 8, approved: 37 }
      },
      {
        key: "dori",
        title: "DORI Order",
        icon: "🎗️",
        color: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)",
        bgColor: "#f0f9ff",
        animation: "pulse",
        badge: "DORI",
        description: "Manage DORI thread and cord orders",
        info: "Create and track DORI thread orders with analytics and PO management",
        stats: { total: 34, pending: 5, completed: 29 }
      },
      {
        key: "poReport",
        title: "PO Report",
        icon: "📊",
        color: "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)",
        bgColor: "#f5f3ff",
        animation: "pulse",
        badge: "📈",
        description: "Comprehensive PO reports and analytics",
        info: "Generate, download, and analyze purchase order reports with detailed metrics and insights",
        stats: { total: 124, generated: 89, pending: 35 }
      },
      {
        key: "rateList",
        title: "Rate List",
        icon: "💰",
        color: "linear-gradient(135deg, #f97316 0%, #ea580c 100%)",
        bgColor: "#fff7ed",
        animation: "pulse",
        badge: "₹",
        description: "View and manage product/service rates",
        info: "Comprehensive rate list containing all product pricing, service charges, and applicable taxes with historical rate tracking and approval workflow",
        stats: { total: 245, active: 189, pending: 56 }
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
          color: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
          bgColor: "#eff6ff",
          animation: "bounce",
          badge: "📦",
          description: "Manage fabric materials and stock levels",
          info: "This card contains information about fabric inventory management for RGP processing including available stock and material tracking.",
          progress: 75,
          lastUpdated: "2 min ago"
        },
        {
          key: "pending",
          title: "Pending RGP",
          count: counts.pending ?? 0,
          icon: "⏳",
          path: "/rgp/pending",
          color: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
          bgColor: "#fffbeb",
          animation: "spin",
          badge: "🔄",
          description: "Review and approve pending requests",
          info: "This card contains information about pending RGP requests that are awaiting approval and administrative review.",
          progress: 30,
          lastUpdated: "5 min ago"
        },
        {
          key: "partial",
          title: "Partial RGP",
          count: counts.partial ?? 0,
          icon: "🎯",
          path: "/rgp/partial",
          color: "linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)",
          bgColor: "#f0f9ff",
          animation: "wobble",
          badge: "📊",
          description: "Monitor partially completed requests",
          info: "This card contains information about partially completed RGP requests that are currently in progress.",
          progress: 50,
          lastUpdated: "10 min ago"
        },
        {
          key: "closed",
          title: "Closed RGP",
          count: counts.closed ?? 0,
          icon: "🎉",
          path: "/rgp/closed",
          color: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
          bgColor: "#f0fdf4",
          animation: "tada",
          badge: "✅",
          description: "View completed requests history",
          info: "This card contains information about successfully closed and completed RGP requests with full documentation.",
          progress: 100,
          lastUpdated: "1 hour ago"
        },
        {
          key: "overdue",
          title: "Overdue RGP",
          count: counts.overdue ?? 0,
          icon: "🚨",
          path: "/rgp/overdue",
          color: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
          bgColor: "#fef2f2",
          animation: "pulse",
          badge: "⚠️",
          description: "Track overdue and delayed requests",
          info: "This card contains information about overdue RGP requests that require immediate attention and resolution.",
          progress: 15,
          lastUpdated: "Just now"
        },
        {
          key: "details",
          title: "GatePass Detail",
          count: counts.details ?? 0,
          icon: "🧾",
          path: "/rgp/details",
          color: "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)",
          bgColor: "#f5f3ff",
          animation: "pulse",
          badge: "ℹ️",
          description: "See item-wise RGP details & history",
          info: "Detailed gate pass records: items, quantities, parties, checkpoints, and audit history.",
          progress: 60,
          lastUpdated: "30 min ago"
        },
        {
          key: "history",
          title: "RGP Material History",
          count: counts.history ?? 0,
          icon: "🗂️",
          path: "/rgp/history",
          color: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
          bgColor: "#eff6ff",
          animation: "pulse",
          badge: "📚",
          description: "Browse material movement logs over time",
          info: "Chronological item-wise movement: issues, returns, adjustments, and notes across all RGPs.",
          progress: 85,
          lastUpdated: "15 min ago"
        },
      ],
      purchase: [
        {
          key: "po",
          title: "Purchase Order",
          count: counts.po ?? 0,
          icon: "🛒",
          path: "/rgp/purchase-order",
          color: "linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)",
          bgColor: "#f0f9ff",
          animation: "tada",
          badge: "PO",
          description: "Generate POs from approved items",
          info: "Create and print supplier POs with auto-filled lines from RGP, taxes/terms, and sign-off metadata.",
          progress: 70,
          lastUpdated: "20 min ago"
        },
        {
          key: "poAsPerLot",
          title: "PO (as per Lot)",
          count: counts.poAsPerLot ?? 0,
          icon: "📦",
          path: "/rgp/po-as-per-lot",
          color: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
          bgColor: "#eff6ff",
          animation: "pulse",
          badge: "PO",
          description: "View Purchase Orders grouped/filtered by Lot",
          info: "See POs created for each Lot, with quick links to related Lot details, receive actions, and PO download/print.",
          progress: 45,
          lastUpdated: "25 min ago"
        },
        {
          key: "poAsPerLotShade",
          title: "PO (as per Lot Shade)",
          count: counts.poAsPerLotShade ?? 0,
          icon: "🎨",
          path: "/rgp/po-as-per-lot-shade",
          color: "linear-gradient(135deg, #ec4899 0%, #db2777 100%)",
          bgColor: "#fdf2f8",
          animation: "pulse",
          badge: "🎨",
          description: "Purchase Orders organized by Lot and Shade",
          info: "Advanced PO management with shade-wise categorization, color matching, and quality control tracking for fabric lots.",
          progress: 35,
          lastUpdated: "40 min ago",
          shades: ["Red", "Blue", "Green", "Yellow"],
          totalLots: 12
        },
      ],
      zip: [
        {
          key: "puneetZipPO",
          title: "Puneet ZIP PO",
          count: counts.puneetZipPO ?? 0,
          icon: "🧾",
          path: "/rgp/puneet-zip-po",
          color: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
          bgColor: "#eff6ff",
          animation: "pulse",
          badge: "ZIP",
          description: "POs prepared for Puneet (ZIP)",
          info: "View and download ZIP POs grouped by Lot.",
          progress: 80,
          lastUpdated: "1 hour ago"
        },
        {
          key: "ZipPODashboard",
          title: "Dashboard ZIP PO",
          count: counts.puneetZipPO ?? 0,
          icon: "📊",
          path: "/rgp/zip-po-dashboard",
          color: "linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)",
          bgColor: "#f0f9ff",
          animation: "pulse",
          badge: "ZIP",
          description: "ZIP PO Prepared By Supervisor detail",
          info: "View and download ZIP POs grouped by Lot.",
          progress: 65,
          lastUpdated: "50 min ago"
        },
        {
          key: "approvalPanel",
          title: "Approval ZIP PO",
          count: counts.puneetZipPO ?? 0,
          icon: "✅",
          path: "/rgp/zip-po-approval",
          color: "linear-gradient(135deg, #2563eb 0%, #1e40af 100%)",
          bgColor: "#eff6ff",
          animation: "pulse",
          badge: "ZIP",
          description: "ZIP PO Prepared By Supervisor detail",
          info: "View and download ZIP POs grouped by Lot.",
          progress: 25,
          lastUpdated: "2 hours ago"
        },
      ],
      dori: [
        {
          key: "doriOrder",
          title: "DORI Order",
          count: counts.doriOrder ?? 0,
          icon: "🎗️",
          path: "/rgp/dori-order",
          color: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)",
          bgColor: "#f0f9ff",
          animation: "pulse",
          badge: "DORI",
          description: "Manage DORI thread and cord orders",
          info: "Create and track DORI thread orders with specifications, quantities, and supplier details for garment production.",
          progress: 55,
          lastUpdated: "35 min ago"
        },
        {
          key: "dashboardDoriPO",
          title: "Dashboard DORI PO",
          count: counts.dashboardDoriPO ?? 0,
          icon: "📊",
          path: "/rgp/dashboard-dori-po",
          color: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
          bgColor: "#eff6ff",
          animation: "pulse",
          badge: "DORI",
          description: "DORI PO analytics and overview",
          info: "Comprehensive dashboard for DORI purchase orders with analytics, tracking, and performance metrics.",
          progress: 90,
          lastUpdated: "5 min ago"
        },
      ],
      poReport: [
        {
          key: "poSummary",
          title: "PO Summary Report",
          count: 45,
          icon: "📈",
          path: "/rgp/po-summary",
          color: "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)",
          bgColor: "#f5f3ff",
          animation: "pulse",
          badge: "📊",
          description: "Comprehensive PO summary across all categories",
          info: "View aggregated PO data including total value, quantities, supplier performance, and completion rates across all PO types.",
          progress: 95,
          lastUpdated: "1 hour ago"
        },
      ],
      rateList: [
        {
          key: "productRates",
          title: "Product Rate List",
          count: 156,
          icon: "🏷️",
          path: "/rate-list/products",
          color: "linear-gradient(135deg, #f97316 0%, #ea580c 100%)",
          bgColor: "#fff7ed",
          animation: "pulse",
          badge: "₹",
          description: "View all product pricing and rates",
          info: "Complete product rate list with current and historical pricing, vendor-specific rates, and bulk discount structures.",
          progress: 85,
          lastUpdated: "1 hour ago"
        },
        {
          key: "serviceRates",
          title: "Service Rate List",
          count: 42,
          icon: "⚙️",
          path: "/rate-list/services",
          color: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
          bgColor: "#fffbeb",
          animation: "spin",
          badge: "🛠️",
          description: "Service charges and labor rates",
          info: "Comprehensive service rate list including labor charges, service fees, maintenance costs, and contractor rates.",
          progress: 70,
          lastUpdated: "2 hours ago"
        },
        {
          key: "taxRates",
          title: "Tax Rate List",
          count: 28,
          icon: "📊",
          path: "/rate-list/taxes",
          color: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
          bgColor: "#f0fdf4",
          animation: "tada",
          badge: "🧾",
          description: "Applicable tax rates and slabs",
          info: "Current tax rates including GST, VAT, customs duties, and other applicable taxes with effective dates and jurisdictions.",
          progress: 100,
          lastUpdated: "30 min ago"
        },
        {
          key: "vendorRates",
          title: "Vendor Rate List",
          count: 89,
          icon: "🤝",
          path: "/rate-list/vendors",
          color: "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)",
          bgColor: "#f5f3ff",
          animation: "pulse",
          badge: "🏪",
          description: "Vendor-specific pricing agreements",
          info: "Rate list per vendor including negotiated rates, contract pricing, and special offers with validity periods.",
          progress: 60,
          lastUpdated: "45 min ago"
        },
        {
          key: "historicalRates",
          title: "Historical Rate List",
          count: 524,
          icon: "📅",
          path: "/rate-list/history",
          color: "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)",
          bgColor: "#eef2ff",
          animation: "wobble",
          badge: "📜",
          description: "Track rate changes over time",
          info: "Complete historical archive of all rate changes with effective dates, approval history, and trend analysis.",
          progress: 95,
          lastUpdated: "15 min ago"
        },
        {
          key: "approvalPending",
          title: "Pending Rate Approvals",
          count: 12,
          icon: "⏳",
          path: "/rate-list/pending-approvals",
          color: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
          bgColor: "#fef2f2",
          animation: "pulse",
          badge: "⚠️",
          description: "Rate changes awaiting approval",
          info: "Rate change requests that require review and approval from authorized personnel before becoming effective.",
          progress: 40,
          lastUpdated: "Just now"
        }
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
    <div style={{ 
      minHeight: "100vh",
      background: "#ffffff",
      color: "#1f2937",
      fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial",
      fontSize: "14px",
      lineHeight: "1.6",
      padding: "20px"
    }}>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        
        .rgp-loading {
          position: fixed; top: 0; left: 0; width: 100%; height: 4px;
          background: linear-gradient(90deg, #3b82f6, #2563eb, #1d4ed8, #3b82f6);
          background-size: 200% 100%;
          animation: loading-shimmer 1.2s infinite; z-index: 1000; display: none;
          box-shadow: 0 2px 8px rgba(59, 130, 246, 0.4);
        }
        .rgp-loading.active { display: block; }
        @keyframes loading-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

        .rgp-container { 
          max-width: 2200px; 
          width: 100%; 
          margin: 0 auto; 
          padding: 0 20px;
        }

        /* Header */
        .rgp-header {
          background: #ffffff;
          border-radius: 16px;
          padding: 24px 32px;
          margin-bottom: 24px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
          border: 1px solid #e5e7eb;
          position: relative;
        }

        .rgp-header h1 {
          font-size: 28px;
          font-weight: 800;
          color: #1f2937;
          margin-bottom: 8px;
          letter-spacing: -0.5px;
        }

        .rgp-header p {
          color: #6b7280;
          font-size: 16px;
          font-weight: 500;
          line-height: 1.5;
        }

        /* Breadcrumb and Back Button */
        .rgp-breadcrumb {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-top: 16px;
          padding-top: 16px;
          border-top: 1px solid #e5e7eb;
        }
        
        .rgp-back-btn {
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          color: #374151;
          padding: 10px 20px;
          border-radius: 40px;
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s ease;
          display: inline-flex;
          align-items: center;
          gap: 10px;
          box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
        }
        
        .rgp-back-btn:hover {
          background: #f3f4f6;
          border-color: #d1d5db;
          transform: translateY(-1px);
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }

        .rgp-back-btn:active {
          transform: translateY(0);
        }

        .rgp-breadcrumb span {
          color: #9ca3af;
          font-size: 14px;
        }

        .rgp-breadcrumb .rgp-current-category {
          color: #3b82f6;
          font-weight: 600;
        }

        /* Dashboard Controls */
        .rgp-dashboard-controls {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          margin: 20px 0 24px;
          flex-wrap: wrap;
        }

        .rgp-view-toggle {
          display: flex;
          gap: 8px;
          background: #ffffff;
          padding: 4px;
          border-radius: 40px;
          box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
          border: 1px solid #e5e7eb;
        }

        .rgp-view-btn {
          padding: 8px 20px;
          border: none;
          background: transparent;
          border-radius: 32px;
          font-weight: 600;
          font-size: 14px;
          color: #6b7280;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .rgp-view-btn.active {
          background: #3b82f6;
          color: #ffffff;
          box-shadow: 0 4px 6px -1px rgba(59, 130, 246, 0.3);
        }

        .rgp-stats-summary {
          display: flex;
          gap: 16px;
          background: #ffffff;
          padding: 8px 24px;
          border-radius: 40px;
          box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
          border: 1px solid #e5e7eb;
        }

        .rgp-stat-item {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #374151;
          font-weight: 600;
          font-size: 14px;
        }

        .rgp-stat-value {
          color: #3b82f6;
          font-size: 18px;
          font-weight: 700;
        }

        /* Terms Box */
        .rgp-terms-box {
          background: #ffffff;
          border-radius: 16px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          border: 1px solid #e5e7eb;
          overflow: hidden;
          margin-bottom: 32px;
        }

        .rgp-terms-head {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
          padding: 16px 20px;
          background: #f9fafb;
          border-bottom: 1px solid #e5e7eb;
        }

        .rgp-terms-title {
          font-weight: 700;
          font-size: 16px;
          color: #1f2937;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .rgp-terms-actions {
          margin-left: auto;
          display: flex;
          gap: 10px;
        }

        .rgp-ghost-btn {
          background: #ffffff;
          border: 1px solid #e5e7eb;
          color: #374151;
          padding: 8px 20px;
          border-radius: 30px;
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .rgp-ghost-btn:hover {
          background: #f3f4f6;
          border-color: #d1d5db;
        }

        .rgp-ticker-wrap {
          position: relative;
          overflow: hidden;
          border-bottom: 1px solid #e5e7eb;
          background: #ffffff;
        }

        .rgp-ticker {
          display: inline-flex;
          gap: 24px;
          padding: 14px 20px;
          white-space: nowrap;
          animation: rgp-ticker-scroll 35s linear infinite;
        }

        .rgp-ticker:hover {
          animation-play-state: paused;
        }

        @keyframes rgp-ticker-scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }

        .rgp-pill {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          background: #f3f4f6;
          color: #1f2937;
          border: 1px solid #e5e7eb;
          padding: 8px 18px;
          border-radius: 40px;
          font-weight: 500;
          font-size: 13px;
        }

        .rgp-pill b {
          color: #3b82f6;
          background: #ffffff;
          padding: 2px 8px;
          border-radius: 20px;
          margin-left: 4px;
          font-size: 12px;
        }

        .rgp-terms-body {
          padding: 20px;
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: 16px;
          background: #ffffff;
        }

        .rgp-term-card {
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 16px;
          background: #ffffff;
          transition: all 0.2s ease;
        }

        .rgp-term-card:hover {
          border-color: #3b82f6;
          box-shadow: 0 10px 15px -3px rgba(59, 130, 246, 0.1);
        }

        .rgp-term-title {
          font-weight: 700;
          color: #1f2937;
          margin-bottom: 8px;
          font-size: 15px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .rgp-term-text {
          color: #6b7280;
          font-weight: 500;
          font-size: 13px;
          line-height: 1.5;
        }

        /* Card Grid */
        .rgp-card-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
          gap: 20px;
          margin-top: 20px;
        }

        .rgp-card-grid.compact {
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        }

        .rgp-card {
          border: 1px solid #e5e7eb;
          background: #ffffff;
          border-radius: 16px;
          padding: 0;
          cursor: pointer;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          transition: all 0.2s ease;
          position: relative;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          height: 100%;
          text-align: left;
          width: 100%;
        }

        .rgp-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 20px 25px -5px rgba(59, 130, 246, 0.2);
          border-color: #3b82f6;
        }

        .rgp-card.active {
          transform: scale(0.98);
          border-color: #3b82f6;
          box-shadow: 0 10px 15px -3px rgba(59, 130, 246, 0.3);
        }

        .rgp-card-main {
          padding: 24px;
          position: relative;
          z-index: 2;
          flex: 1;
          display: flex;
          flex-direction: column;
        }

        .rgp-card-header {
          display: flex;
          align-items: flex-start;
          gap: 16px;
          margin-bottom: 16px;
        }

        .rgp-card-icon {
          width: 70px;
          height: 70px;
          border-radius: 16px;
          display: grid;
          place-items: center;
          background: #f9fafb;
          border: 2px solid #ffffff;
          font-size: 32px;
          transition: all 0.2s ease;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
          position: relative;
          flex-shrink: 0;
        }

        .rgp-card-badge {
          position: absolute;
          top: -8px;
          right: -8px;
          background: #ffffff;
          border-radius: 30px;
          padding: 4px 10px;
          font-size: 11px;
          font-weight: 700;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          border: 2px solid;
        }

        .rgp-card:hover .rgp-card-icon {
          transform: scale(1.1) rotate(3deg);
        }

        .rgp-card-info {
          flex: 1;
        }

        .rgp-card-title {
          font-weight: 700;
          font-size: 18px;
          color: #1f2937;
          margin-bottom: 4px;
          line-height: 1.2;
        }

        .rgp-card-description {
          color: #6b7280;
          font-size: 13px;
          margin-bottom: 8px;
          line-height: 1.4;
        }

        .rgp-card-count {
          font-size: 22px;
          font-weight: 800;
          color: #3b82f6;
          display: inline-block;
        }

        /* Progress Bar */
        .rgp-card-progress {
          margin: 16px 0;
        }

        .rgp-progress-bar {
          height: 6px;
          background: #e5e7eb;
          border-radius: 20px;
          overflow: hidden;
          margin-bottom: 6px;
        }

        .rgp-progress-fill {
          height: 100%;
          border-radius: 20px;
          transition: width 0.5s ease;
        }

        .rgp-progress-stats {
          display: flex;
          justify-content: space-between;
          font-size: 12px;
          color: #6b7280;
        }

        /* Shade Tags */
        .rgp-shade-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin: 12px 0;
        }

        .rgp-shade-tag {
          background: #f3f4f6;
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 600;
          color: #374151;
          border: 1px solid #e5e7eb;
        }

        .rgp-card-info-text {
          background: #f9fafb;
          padding: 16px;
          border-radius: 12px;
          border-left: 4px solid;
          margin-top: auto;
        }

        .rgp-card-info-content {
          font-size: 13px;
          color: #4b5563;
          line-height: 1.5;
          font-weight: 500;
        }

        .rgp-card-meta {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 16px;
          font-size: 11px;
          color: #9ca3af;
        }

        .rgp-card-arrow {
          opacity: 0;
          transform: translateX(-10px);
          transition: all 0.2s ease;
          color: #3b82f6;
          font-size: 18px;
          margin-top: 16px;
          align-self: flex-end;
        }

        .rgp-card:hover .rgp-card-arrow {
          opacity: 1;
          transform: translateX(0);
        }

        /* Animation Classes */
        .emoji-pulse { animation: emoji-pulse 2s infinite; }
        .emoji-bounce { animation: emoji-bounce 2s infinite; }
        .emoji-spin { animation: emoji-spin 3s infinite linear; }
        .emoji-wobble { animation: emoji-wobble 2s infinite; }
        .emoji-tada { animation: emoji-tada 2s infinite; }

        @keyframes emoji-pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.2); } }
        @keyframes emoji-bounce { 
          0%, 20%, 53%, 80%, 100% { transform: translate3d(0,0,0); } 
          40%, 43% { transform: translate3d(0,-8px,0); } 
          70% { transform: translate3d(0,-4px,0); } 
          90% { transform: translate3d(0,-2px,0); } 
        }
        @keyframes emoji-spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        @keyframes emoji-wobble { 
          0%, 100% { transform: rotate(0); } 
          25% { transform: rotate(-5deg); } 
          75% { transform: rotate(5deg); } 
        }
        @keyframes emoji-tada { 
          0% { transform: scale(1); } 
          10%, 20% { transform: scale(0.9) rotate(-4deg); } 
          30%, 50%, 70%, 90% { transform: scale(1.2) rotate(4deg); } 
          40%, 60%, 80% { transform: scale(1.2) rotate(-4deg); } 
          100% { transform: scale(1) rotate(0); }
        }

        /* Responsive */
        @media (max-width: 768px) {
          .rgp-header { padding: 20px; }
          .rgp-header h1 { font-size: 24px; }
          .rgp-dashboard-controls { flex-direction: column; align-items: stretch; }
          .rgp-view-toggle { justify-content: center; }
          .rgp-stats-summary { justify-content: center; flex-wrap: wrap; }
          .rgp-card-grid { grid-template-columns: 1fr; }
          .rgp-terms-head { flex-direction: column; align-items: flex-start; }
          .rgp-terms-actions { margin-left: 0; width: 100%; }
          .rgp-ghost-btn { width: 100%; }
        }

        @media (max-width: 480px) {
          .rgp-card-header { flex-direction: column; align-items: center; text-align: center; }
          .rgp-card-icon { margin-bottom: 10px; }
          .rgp-breadcrumb { flex-wrap: wrap; }
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
        {/* Header */}
        <section className="rgp-header">
          <h1>RGP Management SYSTEM</h1>
          <p>Monitor and manage your Request Gate Pass system efficiently with real-time tracking and comprehensive overview</p>
          
          {/* Dashboard Controls */}
          <div className="rgp-dashboard-controls">
            <div className="rgp-view-toggle">
              <button 
                className={`rgp-view-btn ${viewMode === 'grid' ? 'active' : ''}`}
                onClick={() => setViewMode('grid')}
              >
                <EmojiIcon symbol="📱" size={14} /> Grid View
              </button>
              <button 
                className={`rgp-view-btn ${viewMode === 'compact' ? 'active' : ''}`}
                onClick={() => setViewMode('compact')}
              >
                <EmojiIcon symbol="📋" size={14} /> Compact View
              </button>
            </div>
            
            <div className="rgp-stats-summary">
              <div className="rgp-stat-item">
                <EmojiIcon symbol="📊" size={14} />
                <span>Total: <span className="rgp-stat-value">324</span></span>
              </div>
              <div className="rgp-stat-item">
                <EmojiIcon symbol="⏳" size={14} />
                <span>Pending: <span className="rgp-stat-value">48</span></span>
              </div>
            </div>
          </div>

          {/* Breadcrumb with Back Button */}
          {selectedCategory && (
            <div className="rgp-breadcrumb">
              <button className="rgp-back-btn" onClick={handleBackToMain}>
                <EmojiIcon symbol="←" size={16} /> Back to Main Menu
              </button>
              <span>›</span>
              <span className="rgp-current-category">
                {mainCategories.find(cat => cat.key === selectedCategory)?.title}
              </span>
            </div>
          )}
        </section>

        {/* Terms & Regulations Box */}
        <section className="rgp-terms-box">
          <div className="rgp-terms-head">
            <div className="rgp-terms-title">
              <EmojiIcon symbol="📜" size={20} label="Terms" animate animationType="pulse" />
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
                  <EmojiIcon symbol="✅" size={14} />
                  <span>{h}</span>
                  <b>Important</b>
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
                    <EmojiIcon symbol="🔖" size={14} /> {t.title}
                  </div>
                  <div className="rgp-term-text">{t.text}</div>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* Cards Section */}
        <section className="rgp-cards-section">
          <div className={`rgp-card-grid ${viewMode}`}>
            {currentCards.map((c) => (
              <button
                key={c.key}
                onClick={() => {
                  if (!selectedCategory) {
                    handleCategorySelect(c.key);
                  } else {
                    setActiveCard(c.key);
                    go(c.path);
                  }
                }}
                className={`rgp-card ${activeCard === c.key ? "active" : ""}`}
              >
                <div className="rgp-card-main">
                  <div className="rgp-card-header">
                    <div className="rgp-card-icon" style={{ background: c.bgColor }}>
                      <EmojiIcon
                        symbol={c.icon}
                        size={32}
                        animate={activeCard === c.key}
                        animationType={c.animation}
                      />
                      <div className="rgp-card-badge" style={{ borderColor: c.color }}>{c.badge}</div>
                    </div>
                    <div className="rgp-card-info">
                      <div className="rgp-card-title">{c.title}</div>
                      <div className="rgp-card-description">{c.description}</div>
                      {c.count !== undefined && (
                        <div className="rgp-card-count">{c.count} Items</div>
                      )}
                    </div>
                  </div>

                  {/* Progress Bar for sub-cards */}
                  {c.progress !== undefined && (
                    <div className="rgp-card-progress">
                      <div className="rgp-progress-bar">
                        <div 
                          className="rgp-progress-fill" 
                          style={{ width: `${c.progress}%`, background: c.color }}
                        />
                      </div>
                      <div className="rgp-progress-stats">
                        <span>Progress</span>
                        <span>{c.progress}%</span>
                      </div>
                    </div>
                  )}

                  {/* Shade tags for PO as per Lot Shade */}
                  {c.shades && (
                    <div className="rgp-shade-tags">
                      {c.shades.map((shade, idx) => (
                        <span key={idx} className="rgp-shade-tag">{shade}</span>
                      ))}
                      {c.totalLots && <span className="rgp-shade-tag">{c.totalLots} Lots</span>}
                    </div>
                  )}

                  <div className="rgp-card-info-text" style={{ borderLeftColor: c.color }}>
                    <div className="rgp-card-info-content">{c.info}</div>
                  </div>

                  <div className="rgp-card-meta">
                    {c.lastUpdated && (
                      <span>
                        <EmojiIcon symbol="🕐" size={11} /> {c.lastUpdated}
                      </span>
                    )}
                  </div>

                  <EmojiIcon symbol="→" size={18} className="rgp-card-arrow" label="View Details" />
                </div>
              </button>
            ))}
          </div> 
        </section>
      </main>
    </div>
  );
}