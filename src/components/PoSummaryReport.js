import React, { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from 'jspdf-autotable';

const POSummaryReport = () => {
  const [poData, setPoData] = useState([]);
  const [itemsData, setItemsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPO, setSelectedPO] = useState(null);
  const [viewMode, setViewMode] = useState("card"); // "card" or "table"
  const [showDescriptionDropdown, setShowDescriptionDropdown] = useState(false);
  const [descriptionSearchTerm, setDescriptionSearchTerm] = useState(""); // New state for description search
  
  // Filter states
  const [filters, setFilters] = useState({
    poNumber: "",
    supplier: "",
    status: "",
    supervisor: "",
    fromDate: "",
    toDate: "",
    descriptions: [] // Array for multiple description selection
  });
  
  // Unique filter options
  const [filterOptions, setFilterOptions] = useState({
    suppliers: [],
    statuses: [],
    supervisors: [],
    descriptions: []
  });

  // Replace with your actual values
  const API_KEY = "AIzaSyAomDFBkOySlIxKWSKGHe6ATv9gvaBr7uk";
  const SPREADSHEET_ID = "1hy43mDxXtGVq4jeMV_NxX25Q7tnX55NnplN7eqpT74k";
  
  const PO_SHEET_NAME = "PO_Main";
  const ITEMS_SHEET_NAME = "PO_Items";
  const PO_RANGE = `${PO_SHEET_NAME}!A:O`;
  const ITEMS_RANGE = `${ITEMS_SHEET_NAME}!A:I`;

  const processSheetData = (data, headers) => {
    const rows = data.values;
    if (!rows || rows.length === 0) return [];
    const result = [];
    for (let i = 1; i < rows.length; i++) {
      let row = {};
      headers.forEach((header, idx) => {
        row[header] = rows[i][idx] || "";
      });
      result.push(row);
    }
    return result;
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        const poUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${PO_RANGE}?key=${API_KEY}`;
        const poResponse = await fetch(poUrl);
        if (!poResponse.ok) throw new Error("Failed to fetch PO data");
        const poJson = await poResponse.json();

        const poHeaders = [
          "PO #",
          "Supplier",
          "Order Date",
          "Order Time",
          "Expected Date",
          "Expected Time",
          "Lead Time (ms)",
          "Lead Time (human)",
          "Supervisor",
          "Total Amount",
          "Status",
          "Gate In At",
          "Received At",
          "Created At",
          "Updated At",
          "REQUISITION RAISED BY",
          "AUTHORIZED BY",
        ];
        const formattedPoData = processSheetData(poJson, poHeaders);
        setPoData(formattedPoData);
        
        const itemsUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${ITEMS_RANGE}?key=${API_KEY}`;
        const itemsResponse = await fetch(itemsUrl);
        if (!itemsResponse.ok) throw new Error("Failed to fetch Items data");
        const itemsJson = await itemsResponse.json();

        const itemsHeaders = [
          "PO #",
          "Line #",
          "Department",
          "Description",
          "UOM",
          "Qty",
          "Rate",
          "Amount",
          "Created At",
        ];
        const formattedItemsData = processSheetData(itemsJson, itemsHeaders);
        setItemsData(formattedItemsData);
        
        // Extract filter options
        const suppliers = [...new Set(formattedPoData.map(po => po["Supplier"]).filter(Boolean))];
        const statuses = [...new Set(formattedPoData.map(po => po["Status"]).filter(Boolean))];
        const supervisors = [...new Set(formattedPoData.map(po => po["Supervisor"]).filter(Boolean))];
        const descriptions = [...new Set(formattedItemsData.map(item => item["Description"]).filter(Boolean))];
        
        setFilterOptions({ suppliers, statuses, supervisors, descriptions });
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const getItemsForPO = (poNumber) => {
    return itemsData.filter((item) => item["PO #"] === poNumber);
  };

  const getPOTotal = (poNumber) => {
    const items = getItemsForPO(poNumber);
    return items.reduce((sum, item) => sum + (parseFloat(item["Amount"]) || 0), 0);
  };

  // Check if PO contains any of the selected descriptions
  const hasSelectedDescriptions = (poNumber) => {
    if (filters.descriptions.length === 0) return true;
    const poItems = getItemsForPO(poNumber);
    return poItems.some(item => filters.descriptions.includes(item["Description"]));
  };

  // NEW: Check if PO contains description matching search term
  const hasMatchingDescriptionSearch = (poNumber) => {
    if (!descriptionSearchTerm.trim()) return true;
    const poItems = getItemsForPO(poNumber);
    const searchTermLower = descriptionSearchTerm.toLowerCase().trim();
    return poItems.some(item => 
      item["Description"] && 
      item["Description"].toLowerCase().includes(searchTermLower)
    );
  };

  // Filter PO Data
  const getFilteredPOData = () => {
    return poData.filter(po => {
      // PO Number filter
      if (filters.poNumber && !po["PO #"].toLowerCase().includes(filters.poNumber.toLowerCase())) {
        return false;
      }
      
      // Supplier filter
      if (filters.supplier && po["Supplier"] !== filters.supplier) {
        return false;
      }
      
      // Status filter
      if (filters.status && po["Status"] !== filters.status) {
        return false;
      }
      
      // Supervisor filter
      if (filters.supervisor && po["Supervisor"] !== filters.supervisor) {
        return false;
      }
      
      // Date range filter
      if (filters.fromDate && po["Order Date"]) {
        const orderDate = new Date(po["Order Date"]);
        const fromDate = new Date(filters.fromDate);
        if (orderDate < fromDate) return false;
      }
      
      if (filters.toDate && po["Order Date"]) {
        const orderDate = new Date(po["Order Date"]);
        const toDate = new Date(filters.toDate);
        if (orderDate > toDate) return false;
      }
      
      // Description filter (multi-select)
      if (!hasSelectedDescriptions(po["PO #"])) {
        return false;
      }
      
      // NEW: Description search filter
      if (!hasMatchingDescriptionSearch(po["PO #"])) {
        return false;
      }
      
      return true;
    });
  };

  const clearFilters = () => {
    setFilters({
      poNumber: "",
      supplier: "",
      status: "",
      supervisor: "",
      fromDate: "",
      toDate: "",
      descriptions: []
    });
    setDescriptionSearchTerm(""); // Clear description search as well
  };

  // Handle description selection
  const handleDescriptionChange = (description) => {
    setFilters(prev => {
      const currentDescriptions = [...prev.descriptions];
      if (currentDescriptions.includes(description)) {
        // Remove if already selected
        return {
          ...prev,
          descriptions: currentDescriptions.filter(d => d !== description)
        };
      } else {
        // Add if not selected
        return {
          ...prev,
          descriptions: [...currentDescriptions, description]
        };
      }
    });
  };

  // Select all descriptions
  const selectAllDescriptions = () => {
    setFilters(prev => ({
      ...prev,
      descriptions: [...filterOptions.descriptions]
    }));
  };

  // Clear all description selections
  const clearDescriptions = () => {
    setFilters(prev => ({
      ...prev,
      descriptions: []
    }));
  };

  // Export to Excel
  const exportToExcel = () => {
    const filteredData = getFilteredPOData();
    const exportData = filteredData.map((po, index) => ({
      "S.No": index + 1,
      "PO #": po["PO #"],
      "Supplier": po["Supplier"],
      "Order Date": po["Order Date"],
      "Expected Date": po["Expected Date"],
      "Status": po["Status"],
      "Supervisor": po["Supervisor"],
      "Total Amount": po["Total Amount"] || getPOTotal(po["PO #"]),
      "Items Count": getItemsForPO(po["PO #"]).length,
      "Descriptions": getItemsForPO(po["PO #"]).map(item => item["Description"]).join(", "),
      "Gate In At": po["Gate In At"] || "—",
      "Received At": po["Received At"] || "—"
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "PO Summary Report");
    
    // Auto-size columns
    const colWidths = [
      { wch: 8 },  // S.No
      { wch: 15 }, // PO #
      { wch: 25 }, // Supplier
      { wch: 12 }, // Order Date
      { wch: 12 }, // Expected Date
      { wch: 12 }, // Status
      { wch: 15 }, // Supervisor
      { wch: 15 }, // Total Amount
      { wch: 10 }, // Items Count
      { wch: 40 }, // Descriptions
      { wch: 12 }, // Gate In At
      { wch: 12 }  // Received At
    ];
    ws['!cols'] = colWidths;
    
    const fileName = `PO_Summary_Report_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  // Export to PDF
  const exportToPDF = () => {
    const filteredData = getFilteredPOData();
    const doc = new jsPDF('landscape');
    
    // Add title
    doc.setFontSize(18);
    doc.setTextColor(37, 99, 235);
    doc.text('PO Summary Report', 14, 15);
    
    // Add subtitle with date
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 25);
    doc.text(`Total POs: ${filteredData.length}`, 14, 32);
    
    // Add filter info if any filters are applied
    let filterText = "";
    if (filters.poNumber) filterText += `PO #: ${filters.poNumber} | `;
    if (filters.supplier) filterText += `Supplier: ${filters.supplier} | `;
    if (filters.status) filterText += `Status: ${filters.status} | `;
    if (filters.supervisor) filterText += `Supervisor: ${filters.supervisor} | `;
    if (filters.fromDate) filterText += `From: ${filters.fromDate} | `;
    if (filters.toDate) filterText += `To: ${filters.toDate} | `;
    if (filters.descriptions.length > 0) filterText += `Descriptions: ${filters.descriptions.join(", ")} | `;
    if (descriptionSearchTerm) filterText += `Description Search: ${descriptionSearchTerm} | `;
    if (filterText) {
      doc.setFontSize(9);
      doc.setTextColor(150, 150, 150);
      doc.text(`Filters: ${filterText.slice(0, -3)}`, 14, 40);
    }
    
    // Prepare table data
    const tableData = filteredData.map((po, index) => [
      (index + 1).toString(),
      po["PO #"],
      po["Supplier"],
      po["Order Date"],
      po["Expected Date"],
      po["Status"],
      po["Supervisor"],
      `₹${po["Total Amount"] || getPOTotal(po["PO #"])}`,
      getItemsForPO(po["PO #"]).length.toString(),
      getItemsForPO(po["PO #"]).map(item => item["Description"]).join(", ").substring(0, 50)
    ]);
    
    // Add table using autoTable
    autoTable(doc, {
      head: [['S.No', 'PO #', 'Supplier', 'Order Date', 'Expected Date', 'Status', 'Supervisor', 'Total Amount', 'Items', 'Descriptions']],
      body: tableData,
      startY: 45,
      theme: 'striped',
      headStyles: {
        fillColor: [37, 99, 235],
        textColor: 255,
        fontSize: 9,
        fontStyle: 'bold',
        halign: 'center'
      },
      bodyStyles: {
        fontSize: 8
      },
      columnStyles: {
        0: { cellWidth: 12, halign: 'center' },
        1: { cellWidth: 25 },
        2: { cellWidth: 30 },
        3: { cellWidth: 20, halign: 'center' },
        4: { cellWidth: 20, halign: 'center' },
        5: { cellWidth: 20, halign: 'center' },
        6: { cellWidth: 25 },
        7: { cellWidth: 25, halign: 'right' },
        8: { cellWidth: 15, halign: 'center' },
        9: { cellWidth: 50 }
      },
      margin: { top: 45 },
      didDrawPage: function(data) {
        const pageCount = doc.internal.getNumberOfPages();
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(
          `Page ${data.pageNumber} of ${pageCount}`,
          doc.internal.pageSize.getWidth() / 2,
          doc.internal.pageSize.getHeight() - 10,
          { align: 'center' }
        );
      }
    });
    
    doc.save(`PO_Summary_Report_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const handleExport = (format) => {
    if (format === 'excel') {
      exportToExcel();
    } else if (format === 'pdf') {
      exportToPDF();
    }
  };

  // Back navigation function
  const handleGoBack = () => {
    window.history.back();
  };

  const filteredPOData = getFilteredPOData();

  if (loading) {
    return (
      <div className="po-summary-loading-container">
        <div className="po-summary-spinner-wrapper">
          <div className="po-summary-spinner"></div>
          <div className="po-summary-spinner-inner"></div>
        </div>
        <div className="po-summary-loading-text">Loading PO Summary Report...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="po-summary-error-container">
        <div className="po-summary-error-card">
          <div className="po-summary-error-icon">⚠️</div>
          <h3 className="po-summary-error-title">Error Occurred</h3>
          <p className="po-summary-error-message">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="po-summary-retry-button"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="po-summary-app">
      {/* Header Section */}
      <div className="po-summary-header">
        <div className="po-summary-header-content">
          <div className="po-summary-header-text">
            <div className="po-summary-header-top">
              <button
                onClick={handleGoBack}
                className="po-summary-back-button"
                title="Go Back"
              >
                <svg className="po-summary-back-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back
              </button>
              <div>
                <h1 className="po-summary-title">
                  PO Summary Report
                </h1>
                <p className="po-summary-subtitle">Purchase Order Management Dashboard</p>
              </div>
            </div>
          </div>
          <div className="po-summary-stats">
            <div className="po-summary-stats-card">
              <span className="po-summary-stats-label">Total POs: </span>
              <span className="po-summary-stats-value">{poData.length}</span>
            </div>
            <div className="po-summary-stats-card">
              <span className="po-summary-stats-label">Filtered: </span>
              <span className="po-summary-stats-value">{filteredPOData.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filters Section */}
      <div className="po-summary-filters-section">
        <div className="po-summary-filters-header">
          <h3 className="po-summary-filters-title">
            <svg className="po-summary-filters-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            Filters
          </h3>
          <button onClick={clearFilters} className="po-summary-clear-filters">
            Clear All
          </button>
        </div>
        
        <div className="po-summary-filters-grid">
          <div className="po-summary-filter-group">
            <label className="po-summary-filter-label">PO Number</label>
            <input
              type="text"
              placeholder="Search PO #..."
              value={filters.poNumber}
              onChange={(e) => setFilters({...filters, poNumber: e.target.value})}
              className="po-summary-filter-input"
            />
          </div>
          
          <div className="po-summary-filter-group">
            <label className="po-summary-filter-label">Supplier</label>
            <select
              value={filters.supplier}
              onChange={(e) => setFilters({...filters, supplier: e.target.value})}
              className="po-summary-filter-select"
            >
              <option value="">All Suppliers</option>
              {filterOptions.suppliers.map(supplier => (
                <option key={supplier} value={supplier}>{supplier}</option>
              ))}
            </select>
          </div>
          
          <div className="po-summary-filter-group">
            <label className="po-summary-filter-label">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({...filters, status: e.target.value})}
              className="po-summary-filter-select"
            >
              <option value="">All Statuses</option>
              {filterOptions.statuses.map(status => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>
          
          <div className="po-summary-filter-group">
            <label className="po-summary-filter-label">Supervisor</label>
            <select
              value={filters.supervisor}
              onChange={(e) => setFilters({...filters, supervisor: e.target.value})}
              className="po-summary-filter-select"
            >
              <option value="">All Supervisors</option>
              {filterOptions.supervisors.map(supervisor => (
                <option key={supervisor} value={supervisor}>{supervisor}</option>
              ))}
            </select>
          </div>
          
          <div className="po-summary-filter-group">
            <label className="po-summary-filter-label">From Date</label>
            <input
              type="date"
              value={filters.fromDate}
              onChange={(e) => setFilters({...filters, fromDate: e.target.value})}
              className="po-summary-filter-input"
            />
          </div>
          
          <div className="po-summary-filter-group">
            <label className="po-summary-filter-label">To Date</label>
            <input
              type="date"
              value={filters.toDate}
              onChange={(e) => setFilters({...filters, toDate: e.target.value})}
              className="po-summary-filter-input"
            />
          </div>

          {/* NEW: Description Search Input */}
          <div className="po-summary-filter-group">
            <label className="po-summary-filter-label">Search Item Description</label>
            <div className="po-summary-search-wrapper">
              <input
                type="text"
                placeholder="Type to search descriptions..."
                value={descriptionSearchTerm}
                onChange={(e) => setDescriptionSearchTerm(e.target.value)}
                className="po-summary-filter-input"
              />
              {descriptionSearchTerm && (
                <button
                  onClick={() => setDescriptionSearchTerm("")}
                  className="po-summary-clear-search"
                >
                  ✕
                </button>
              )}
            </div>
            {descriptionSearchTerm && (
              <div className="po-summary-search-info">
                Showing POs containing "{descriptionSearchTerm}" in item descriptions
              </div>
            )}
          </div>

          {/* Description Multi-Select Filter */}
          <div className="po-summary-filter-group">
            <label className="po-summary-filter-label">Item Description (Multi-Select)</label>
            <div className="po-summary-multiselect-container">
              <div 
                className="po-summary-multiselect-header"
                onClick={() => setShowDescriptionDropdown(!showDescriptionDropdown)}
              >
                <div className="po-summary-multiselect-selected">
                  {filters.descriptions.length === 0 ? (
                    <span className="po-summary-placeholder">Select descriptions...</span>
                  ) : (
                    <span>{filters.descriptions.length} description(s) selected</span>
                  )}
                </div>
                <div className="po-summary-multiselect-arrow">
                  <svg className={`po-summary-arrow-icon ${showDescriptionDropdown ? 'rotate' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
              
              {showDescriptionDropdown && (
                <div className="po-summary-multiselect-dropdown">
                  <div className="po-summary-multiselect-actions">
                    <button onClick={selectAllDescriptions} className="po-summary-select-all-btn">
                      Select All
                    </button>
                    <button onClick={clearDescriptions} className="po-summary-clear-all-btn">
                      Clear All
                    </button>
                  </div>
                  <div className="po-summary-multiselect-options">
                    {/* Filter descriptions based on search term */}
                    {filterOptions.descriptions
                      .filter(desc => !descriptionSearchTerm || desc.toLowerCase().includes(descriptionSearchTerm.toLowerCase()))
                      .map(description => (
                        <label key={description} className="po-summary-multiselect-option">
                          <input
                            type="checkbox"
                            checked={filters.descriptions.includes(description)}
                            onChange={() => handleDescriptionChange(description)}
                          />
                          <span>{description}</span>
                        </label>
                      ))}
                  </div>
                </div>
              )}
            </div>
            {filters.descriptions.length > 0 && (
              <div className="po-summary-selected-tags">
                {filters.descriptions.map(desc => (
                  <span key={desc} className="po-summary-tag">
                    {desc}
                    <button onClick={() => handleDescriptionChange(desc)} className="po-summary-tag-remove">×</button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="po-summary-main">
        {/* View Toggle and Export Buttons */}
        <div className="po-summary-view-toggle">
          <div className="po-summary-cards-header">
            <h2 className="po-summary-cards-title">Purchase Orders</h2>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <div className="po-summary-toggle-buttons">
                <button
                  onClick={() => setViewMode("card")}
                  className={`po-summary-toggle-btn ${viewMode === "card" ? "po-summary-toggle-active" : ""}`}
                >
                  <svg className="po-summary-toggle-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                  Card View
                </button>
                <button
                  onClick={() => setViewMode("table")}
                  className={`po-summary-toggle-btn ${viewMode === "table" ? "po-summary-toggle-active" : ""}`}
                >
                  <svg className="po-summary-toggle-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18M3 18h18M3 6h18" />
                  </svg>
                  Table View
                </button>
              </div>
              <div className="po-summary-export-buttons">
                <button
                  onClick={() => handleExport('excel')}
                  className="po-summary-export-excel"
                >
                  <svg className="po-summary-export-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                  </svg>
                  Export Excel
                </button>
                <button
                  onClick={() => handleExport('pdf')}
                  className="po-summary-export-pdf"
                >
                  <svg className="po-summary-export-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  Export PDF
                </button>
              </div>
            </div>
          </div>
          <div className="po-summary-cards-count">
            {filteredPOData.length} orders found
          </div>
        </div>
        
        {/* Card View */}
        {viewMode === "card" && (
          <div className="po-summary-cards-grid">
            {filteredPOData.map((po, idx) => {
              const poItems = getItemsForPO(po["PO #"]);
              const totalItems = poItems.length;
              const calculatedTotal = getPOTotal(po["PO #"]);
              const descriptions = poItems.map(item => item["Description"]).filter((v, i, a) => a.indexOf(v) === i);
              return (
                <div
                  key={idx}
                  className="po-summary-card"
                  onClick={() => setSelectedPO(po["PO #"])}
                >
                  <div className="po-summary-card-inner">
                    <div className="po-summary-card-gradient"></div>
                    <div className="po-summary-card-content">
                      <div className="po-summary-card-header">
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                            <span className="po-summary-serial-number">#{idx + 1}</span>
                            <h3 className="po-summary-card-po-number">
                              {po["PO #"]}
                            </h3>
                          </div>
                          <p className="po-summary-card-supplier">{po["Supplier"]}</p>
                        </div>
                        <span
                          className={`po-summary-status-badge po-summary-status-${(po["Status"] || "default").toLowerCase()}`}
                        >
                          {po["Status"] || "N/A"}
                        </span>
                      </div>
                      
                      <div className="po-summary-card-details">
                        <div className="po-summary-detail-row">
                          <span className="po-summary-detail-label">Order Date:</span>
                          <span className="po-summary-detail-value">{po["Order Date"]}</span>
                        </div>
                        <div className="po-summary-detail-row">
                          <span className="po-summary-detail-label">Expected:</span>
                          <span className="po-summary-detail-value">{po["Expected Date"]}</span>
                        </div>
                        <div className="po-summary-detail-row">
                          <span className="po-summary-detail-label">Lead Time:</span>
                          <span className="po-summary-detail-value">{po["Lead Time (human)"]}</span>
                        </div>
                        <div className="po-summary-divider"></div>
                        <div className="po-summary-detail-row">
                          <span className="po-summary-detail-label">Total Amount:</span>
                          <span className="po-summary-total-amount">
                            ₹{po["Total Amount"] || calculatedTotal}
                          </span>
                        </div>
                        <div className="po-summary-detail-row">
                          <span className="po-summary-detail-label">Items:</span>
                          <span className="po-summary-detail-value">{totalItems}</span>
                        </div>
                        <div className="po-summary-detail-row">
                          <span className="po-summary-detail-label">Supervisor:</span>
                          <span className="po-summary-detail-value">{po["Supervisor"]}</span>
                        </div>
                        {descriptions.length > 0 && (
                          <div className="po-summary-detail-row">
                            <span className="po-summary-detail-label">Descriptions:</span>
                            <span className="po-summary-detail-value po-summary-descriptions">
                              {descriptions.slice(0, 2).join(", ")}
                              {descriptions.length > 2 && ` +${descriptions.length - 2}`}
                            </span>
                          </div>
                        )}
                      </div>
                      
                      <div className="po-summary-card-footer">
                        <button className="po-summary-view-button">
                          View Details
                          <svg className="po-summary-view-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Table View */}
        {viewMode === "table" && (
          <div className="po-summary-table-view">
            <div className="po-summary-table-wrapper">
              <table className="po-summary-table">
                <thead className="po-summary-table-header">
                  <tr>
                    <th className="po-summary-table-th">S.No</th>
                    <th className="po-summary-table-th">PO #</th>
                    <th className="po-summary-table-th">Supplier</th>
                    <th className="po-summary-table-th">Order Date</th>
                    <th className="po-summary-table-th">Expected Date</th>
                    <th className="po-summary-table-th">Status</th>
                    <th className="po-summary-table-th">Supervisor</th>
                    <th className="po-summary-table-th po-summary-text-right">Total Amount</th>
                    <th className="po-summary-table-th po-summary-text-center">Items</th>
                    <th className="po-summary-table-th">Descriptions</th>
                    <th className="po-summary-table-th po-summary-text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="po-summary-table-body">
                  {filteredPOData.map((po, idx) => {
                    const poItems = getItemsForPO(po["PO #"]);
                    const totalItems = poItems.length;
                    const calculatedTotal = getPOTotal(po["PO #"]);
                    const descriptions = poItems.map(item => item["Description"]).join(", ");
                    return (
                      <tr key={idx} className="po-summary-table-row">
                        <td className="po-summary-table-td po-summary-text-center">{idx + 1}</td>
                        <td className="po-summary-table-td po-summary-font-semibold">{po["PO #"]}</td>
                        <td className="po-summary-table-td">{po["Supplier"]}</td>
                        <td className="po-summary-table-td">{po["Order Date"]}</td>
                        <td className="po-summary-table-td">{po["Expected Date"]}</td>
                        <td className="po-summary-table-td">
                          <span className={`po-summary-status-badge po-summary-status-${(po["Status"] || "default").toLowerCase()}`}>
                            {po["Status"] || "N/A"}
                          </span>
                        </td>
                        <td className="po-summary-table-td">{po["Supervisor"]}</td>
                        <td className="po-summary-table-td po-summary-text-right po-summary-font-semibold">
                          ₹{po["Total Amount"] || calculatedTotal}
                        </td>
                        <td className="po-summary-table-td po-summary-text-center">{totalItems}</td>
                        <td className="po-summary-table-td po-summary-descriptions-cell">
                          {descriptions.substring(0, 100)}{descriptions.length > 100 ? "..." : ""}
                        </td>
                        <td className="po-summary-table-td po-summary-text-center">
                          <button
                            onClick={() => setSelectedPO(po["PO #"])}
                            className="po-summary-table-view-btn"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Selected PO Details Modal */}
        {selectedPO && (
          <div className="po-summary-modal-overlay">
            <div className="po-summary-modal">
              <div className="po-summary-modal-header">
                <div>
                  <h2 className="po-summary-modal-title">PO Details</h2>
                  <p className="po-summary-modal-subtitle">{selectedPO}</p>
                </div>
                <button
                  onClick={() => setSelectedPO(null)}
                  className="po-summary-modal-close"
                >
                  <svg className="po-summary-close-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="po-summary-modal-body">
                {/* PO Main Info */}
                {poData
                  .filter((po) => po["PO #"] === selectedPO)
                  .map((po, idx) => (
                    <div key={idx} className="po-summary-info-section">
                      <h3 className="po-summary-info-title">
                        <svg className="po-summary-info-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Order Information
                      </h3>
                      <div className="po-summary-info-grid">
                        <div className="po-summary-info-card">
                          <div className="po-summary-info-label">Supplier</div>
                          <div className="po-summary-info-value">{po["Supplier"]}</div>
                        </div>
                        <div className="po-summary-info-card">
                          <div className="po-summary-info-label">Order Date/Time</div>
                          <div className="po-summary-info-value">{po["Order Date"]} {po["Order Time"]}</div>
                        </div>
                        <div className="po-summary-info-card">
                          <div className="po-summary-info-label">Expected Date/Time</div>
                          <div className="po-summary-info-value">{po["Expected Date"]} {po["Expected Time"]}</div>
                        </div>
                        <div className="po-summary-info-card">
                          <div className="po-summary-info-label">Lead Time</div>
                          <div className="po-summary-info-value">{po["Lead Time (human)"]}</div>
                        </div>
                        <div className="po-summary-info-card">
                          <div className="po-summary-info-label">Supervisor</div>
                          <div className="po-summary-info-value">{po["Supervisor"]}</div>
                        </div>
                        <div className="po-summary-info-card">
                          <div className="po-summary-info-label">Status</div>
                          <div className="po-summary-info-value">
                            <span className={`po-summary-status-badge po-summary-status-${(po["Status"] || "default").toLowerCase()}`}>
                              {po["Status"]}
                            </span>
                          </div>
                        </div>
                        <div className="po-summary-info-card">
                          <div className="po-summary-info-label">Gate In At</div>
                          <div className="po-summary-info-value">{po["Gate In At"] || "—"}</div>
                        </div>
                        <div className="po-summary-info-card">
                          <div className="po-summary-info-label">Received At</div>
                          <div className="po-summary-info-value">{po["Received At"] || "—"}</div>
                        </div>
                        <div className="po-summary-info-card">
                          <div className="po-summary-info-label">Raised By</div>
                          <div className="po-summary-info-value">{po["REQUISITION RAISED BY"]}</div>
                        </div>
                        <div className="po-summary-info-card">
                          <div className="po-summary-info-label">Authorized By</div>
                          <div className="po-summary-info-value">{po["AUTHORIZED BY"]}</div>
                        </div>
                      </div>
                    </div>
                  ))}

                {/* Items Table */}
                <div>
                  <h3 className="po-summary-items-title">
                    <svg className="po-summary-items-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    Order Items
                  </h3>
                  <div className="po-summary-table-wrapper">
                    <table className="po-summary-table">
                      <thead className="po-summary-table-header">
                        <tr>
                          <th className="po-summary-table-th">S.No</th>
                          <th className="po-summary-table-th">Line #</th>
                          <th className="po-summary-table-th">Department</th>
                          <th className="po-summary-table-th">Description</th>
                          <th className="po-summary-table-th">UOM</th>
                          <th className="po-summary-table-th po-summary-text-right">Qty</th>
                          <th className="po-summary-table-th po-summary-text-right">Rate</th>
                          <th className="po-summary-table-th po-summary-text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="po-summary-table-body">
                        {getItemsForPO(selectedPO).map((item, idx) => (
                          <tr key={idx} className="po-summary-table-row">
                            <td className="po-summary-table-td po-summary-text-center">{idx + 1}</td>
                            <td className="po-summary-table-td">{item["Line #"]}</td>
                            <td className="po-summary-table-td">{item["Department"]}</td>
                            <td className="po-summary-table-td">{item["Description"]}</td>
                            <td className="po-summary-table-td po-summary-text-center">{item["UOM"]}</td>
                            <td className="po-summary-table-td po-summary-text-right">{item["Qty"]}</td>
                            <td className="po-summary-table-td po-summary-text-right">₹{item["Rate"]}</td>
                            <td className="po-summary-table-td po-summary-text-right po-summary-font-semibold">₹{item["Amount"]}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="po-summary-table-footer">
                        <tr>
                          <td colSpan="7" className="po-summary-table-total-label">
                            Total Amount:
                          </td>
                          <td className="po-summary-table-total-value">
                            ₹{getPOTotal(selectedPO)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {filteredPOData.length === 0 && !loading && (
          <div className="po-summary-empty-state">
            <div className="po-summary-empty-icon">📋</div>
            <h3 className="po-summary-empty-title">No Purchase Orders Found</h3>
            <p className="po-summary-empty-message">Try adjusting your filters to see more results.</p>
          </div>
        )}
      </div>

      <style jsx>{`
        /* Main Container */
        .po-summary-app {
          min-height: 100vh;
          background: linear-gradient(135deg, #ffffff 0%, #ffffff 100%);
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        }

        /* Header Styles */
        .po-summary-header {
          background: linear-gradient(135deg, #1e3a8a 0%, #4c1d95 50%, #5b21b6 100%);
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
        }

        .po-summary-header-content {
          max-width: 2280px;
          margin: 0 auto;
          padding: 2rem 1.5rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .po-summary-header-text {
          flex: 1;
        }

        .po-summary-header-top {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 0.5rem;
        }

        .po-summary-back-button {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          background: rgba(255, 255, 255, 0.15);
          border: 1px solid rgba(255, 255, 255, 0.3);
          border-radius: 0.5rem;
          color: white;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .po-summary-back-button:hover {
          background: rgba(255, 255, 255, 0.25);
          transform: translateX(-2px);
        }

        .po-summary-back-icon {
          width: 1.25rem;
          height: 1.25rem;
        }

        .po-summary-title {
          font-size: 2.25rem;
          font-weight: bold;
          background: linear-gradient(135deg, #ffffff 0%, #bfdbfe 100%);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
        }

        .po-summary-subtitle {
          color: #bfdbfe;
          font-size: 0.875rem;
        }

        .po-summary-stats {
          display: flex;
          gap: 1rem;
        }

        .po-summary-stats-card {
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          border-radius: 0.75rem;
          padding: 0.5rem 1rem;
        }

        .po-summary-stats-label {
          font-size: 0.875rem;
          color: #bfdbfe;
        }

        .po-summary-stats-value {
          font-weight: bold;
          font-size: 1.5rem;
          margin-left: 0.5rem;
          color: white;
        }

        /* Filters Section */
        .po-summary-filters-section {
          max-width: 2280px;
          margin: 1.5rem auto 0;
          padding: 1.5rem;
          background: white;
          border-radius: 1rem;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .po-summary-filters-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .po-summary-filters-title {
          font-size: 1rem;
          font-weight: 600;
          color: #1f2937;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .po-summary-filters-icon {
          width: 1.25rem;
          height: 1.25rem;
          color: #6b7280;
        }

        .po-summary-clear-filters {
          padding: 0.5rem 1rem;
          background: #ef4444;
          color: white;
          border: none;
          border-radius: 0.5rem;
          font-size: 0.875rem;
          cursor: pointer;
          transition: background 0.2s ease;
        }

        .po-summary-clear-filters:hover {
          background: #dc2626;
        }

        .po-summary-filters-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 1rem;
        }

        .po-summary-filter-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .po-summary-filter-label {
          font-size: 0.875rem;
          font-weight: 500;
          color: #374151;
        }

        .po-summary-filter-input,
        .po-summary-filter-select {
          padding: 0.5rem;
          border: 1px solid #e5e7eb;
          border-radius: 0.5rem;
          font-size: 0.875rem;
          transition: border-color 0.2s ease;
        }

        .po-summary-filter-input:focus,
        .po-summary-filter-select:focus {
          outline: none;
          border-color: #3b82f6;
          ring: 2px solid #3b82f6;
        }

        /* Search Wrapper */
        .po-summary-search-wrapper {
          position: relative;
        }

        .po-summary-clear-search {
          position: absolute;
          right: 0.5rem;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: #9ca3af;
          cursor: pointer;
          font-size: 1rem;
          padding: 0.25rem;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: color 0.2s ease;
        }

        .po-summary-clear-search:hover {
          color: #ef4444;
        }

        .po-summary-search-info {
          font-size: 0.75rem;
          color: #3b82f6;
          margin-top: 0.25rem;
        }

        /* Multi-Select Styles */
        .po-summary-multiselect-container {
          position: relative;
        }

        .po-summary-multiselect-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.5rem;
          border: 1px solid #e5e7eb;
          border-radius: 0.5rem;
          background: white;
          cursor: pointer;
          transition: border-color 0.2s ease;
        }

        .po-summary-multiselect-header:hover {
          border-color: #3b82f6;
        }

        .po-summary-multiselect-selected {
          flex: 1;
          font-size: 0.875rem;
          color: #374151;
        }

        .po-summary-placeholder {
          color: #9ca3af;
        }

        .po-summary-multiselect-arrow {
          display: flex;
          align-items: center;
        }

        .po-summary-arrow-icon {
          width: 1.25rem;
          height: 1.25rem;
          color: #6b7280;
          transition: transform 0.2s ease;
        }

        .po-summary-arrow-icon.rotate {
          transform: rotate(180deg);
        }

        .po-summary-multiselect-dropdown {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          margin-top: 0.25rem;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 0.5rem;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
          z-index: 10;
          max-height: 300px;
          overflow-y: auto;
        }

        .po-summary-multiselect-actions {
          display: flex;
          gap: 0.5rem;
          padding: 0.5rem;
          border-bottom: 1px solid #e5e7eb;
          background: #f9fafb;
        }

        .po-summary-select-all-btn,
        .po-summary-clear-all-btn {
          flex: 1;
          padding: 0.25rem 0.5rem;
          font-size: 0.75rem;
          border: none;
          border-radius: 0.375rem;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .po-summary-select-all-btn {
          background: #3b82f6;
          color: white;
        }

        .po-summary-select-all-btn:hover {
          background: #2563eb;
        }

        .po-summary-clear-all-btn {
          background: #ef4444;
          color: white;
        }

        .po-summary-clear-all-btn:hover {
          background: #dc2626;
        }

        .po-summary-multiselect-options {
          padding: 0.5rem;
        }

        .po-summary-multiselect-option {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem;
          cursor: pointer;
          transition: background 0.2s ease;
          border-radius: 0.375rem;
        }

        .po-summary-multiselect-option:hover {
          background: #f3f4f6;
        }

        .po-summary-multiselect-option input {
          cursor: pointer;
        }

        .po-summary-multiselect-option span {
          font-size: 0.875rem;
          color: #374151;
        }

        .po-summary-selected-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          margin-top: 0.5rem;
        }

        .po-summary-tag {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          padding: 0.25rem 0.5rem;
          background: #e0e7ff;
          color: #3730a3;
          border-radius: 0.375rem;
          font-size: 0.75rem;
        }

        .po-summary-tag-remove {
          background: none;
          border: none;
          font-size: 1.125rem;
          cursor: pointer;
          color: #3730a3;
          padding: 0;
          display: inline-flex;
          align-items: center;
          line-height: 1;
        }

        .po-summary-tag-remove:hover {
          color: #dc2626;
        }

        /* Main Content */
        .po-summary-main {
          max-width: 2280px;
          margin: 0 auto;
          padding: 2rem 1.5rem;
        }

        /* View Toggle */
        .po-summary-view-toggle {
          margin-bottom: 1.5rem;
        }

        .po-summary-cards-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .po-summary-cards-title {
          font-size: 1.5rem;
          font-weight: bold;
          color: #1f2937;
        }

        .po-summary-toggle-buttons {
          display: flex;
          gap: 0.5rem;
        }

        .po-summary-toggle-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          background: #f3f4f6;
          border: 1px solid #e5e7eb;
          border-radius: 0.5rem;
          font-size: 0.875rem;
          font-weight: 500;
          color: #6b7280;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .po-summary-toggle-btn:hover {
          background: #e5e7eb;
        }

        .po-summary-toggle-active {
          background: #3b82f6;
          color: white;
          border-color: #3b82f6;
        }

        .po-summary-toggle-icon {
          width: 1rem;
          height: 1rem;
        }

        /* Export Buttons */
        .po-summary-export-buttons {
          display: flex;
          gap: 0.5rem;
        }

        .po-summary-export-excel,
        .po-summary-export-pdf {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          border: none;
          border-radius: 0.5rem;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .po-summary-export-excel {
          background: #10b981;
          color: white;
        }

        .po-summary-export-excel:hover {
          background: #059669;
          transform: translateY(-1px);
        }

        .po-summary-export-pdf {
          background: #ef4444;
          color: white;
        }

        .po-summary-export-pdf:hover {
          background: #dc2626;
          transform: translateY(-1px);
        }

        .po-summary-export-icon {
          width: 1rem;
          height: 1rem;
        }

        .po-summary-cards-count {
          font-size: 0.875rem;
          color: #6b7280;
          background: white;
          border-radius: 9999px;
          padding: 0.5rem 1rem;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          display: inline-block;
        }

        /* Cards Grid */
        .po-summary-cards-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
          gap: 1.5rem;
        }

        /* Individual Card */
        .po-summary-card {
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .po-summary-card:hover {
          transform: translateY(-4px);
        }

        .po-summary-card-inner {
          position: relative;
          background: white;
          border-radius: 1rem;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
          overflow: hidden;
          transition: box-shadow 0.3s ease;
        }

        .po-summary-card:hover .po-summary-card-inner {
          box-shadow: 0 20px 40px -12px rgba(0, 0, 0, 0.2);
        }

        .po-summary-card-gradient {
          position: absolute;
          top: 0;
          right: 0;
          width: 5rem;
          height: 5rem;
          background: linear-gradient(135deg, #3b82f6, #8b5cf6);
          border-bottom-left-radius: 2rem;
          opacity: 0.1;
        }

        .po-summary-card-content {
          padding: 1.5rem;
        }

        .po-summary-card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 1rem;
        }

        .po-summary-serial-number {
          font-size: 0.75rem;
          font-weight: 600;
          color: #6b7280;
          background: #f3f4f6;
          padding: 0.25rem 0.5rem;
          border-radius: 0.375rem;
        }

        .po-summary-card-po-number {
          font-size: 1.25rem;
          font-weight: bold;
          color: #1f2937;
          transition: color 0.2s ease;
        }

        .po-summary-card:hover .po-summary-card-po-number {
          color: #2563eb;
        }

        .po-summary-card-supplier {
          font-size: 0.875rem;
          color: #6b7280;
          margin-top: 0.25rem;
        }

        /* Status Badges */
        .po-summary-status-badge {
          padding: 0.25rem 0.75rem;
          border-radius: 9999px;
          font-size: 0.75rem;
          font-weight: 600;
          border: 1px solid;
        }

        .po-summary-status-draft {
          background: #fef3c7;
          color: #92400e;
          border-color: #fbbf24;
        }

        .po-summary-status-completed {
          background: #d1fae5;
          color: #065f46;
          border-color: #10b981;
        }

        .po-summary-status-default {
          background: #f3f4f6;
          color: #374151;
          border-color: #d1d5db;
        }

        /* Card Details */
        .po-summary-card-details {
          space-y: 0.5rem;
        }

        .po-summary-detail-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.875rem;
          margin-bottom: 0.5rem;
        }

        .po-summary-detail-label {
          color: #6b7280;
        }

        .po-summary-detail-value {
          font-weight: 500;
          color: #374151;
        }

        .po-summary-descriptions {
          max-width: 200px;
          text-align: right;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .po-summary-divider {
          border-top: 1px solid #e5e7eb;
          margin: 0.75rem 0;
        }

        .po-summary-total-amount {
          font-weight: bold;
          font-size: 1.125rem;
          color: #2563eb;
        }

        .po-summary-card-footer {
          margin-top: 1rem;
          padding-top: 0.75rem;
          border-top: 1px solid #e5e7eb;
        }

        .po-summary-view-button {
          color: #2563eb;
          font-size: 0.875rem;
          font-weight: 600;
          background: none;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          transition: color 0.2s ease;
        }

        .po-summary-view-button:hover {
          color: #1e40af;
        }

        .po-summary-view-icon {
          width: 1rem;
          height: 1rem;
          margin-left: 0.25rem;
          transition: transform 0.2s ease;
        }

        .po-summary-view-button:hover .po-summary-view-icon {
          transform: translateX(4px);
        }

        /* Table View */
        .po-summary-table-view {
          overflow-x: auto;
        }

        .po-summary-table-wrapper {
          overflow-x: auto;
          border-radius: 0.75rem;
          border: 1px solid #e5e7eb;
          background: white;
        }

        .po-summary-table {
          min-width: 100%;
          background: white;
          border-collapse: collapse;
        }

        .po-summary-table-header {
          background: linear-gradient(135deg, #f3f4f6, #e5e7eb);
        }

        .po-summary-table-th {
          padding: 0.75rem 1rem;
          text-align: left;
          font-size: 0.75rem;
          font-weight: 600;
          color: #374151;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          border-bottom: 1px solid #e5e7eb;
        }

        .po-summary-table-body {
          border-top: 1px solid #e5e7eb;
        }

        .po-summary-table-row {
          transition: background 0.15s ease;
        }

        .po-summary-table-row:hover {
          background: #eff6ff;
        }

        .po-summary-table-td {
          padding: 0.75rem 1rem;
          font-size: 0.875rem;
          color: #374151;
          border-bottom: 1px solid #e5e7eb;
        }

        .po-summary-descriptions-cell {
          max-width: 250px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .po-summary-table-view-btn {
          padding: 0.25rem 0.75rem;
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 0.375rem;
          font-size: 0.75rem;
          cursor: pointer;
          transition: background 0.2s ease;
        }

        .po-summary-table-view-btn:hover {
          background: #2563eb;
        }

        /* Modal Styles */
        .po-summary-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(4px);
          z-index: 50;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1rem;
          animation: poSummaryFadeIn 0.3s ease-out;
        }

        @keyframes poSummaryFadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        .po-summary-modal {
          background: white;
          border-radius: 1rem;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
          max-width: 1280px;
          width: 100%;
          max-height: 90vh;
          overflow-y: auto;
          transform: scale(1);
          transition: transform 0.3s ease;
        }

        .po-summary-modal-header {
          position: sticky;
          top: 0;
          background: linear-gradient(135deg, #2563eb, #4c1d95);
          color: white;
          padding: 1.5rem;
          border-top-left-radius: 1rem;
          border-top-right-radius: 1rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .po-summary-modal-title {
          font-size: 1.5rem;
          font-weight: bold;
        }

        .po-summary-modal-subtitle {
          color: #bfdbfe;
          font-size: 0.875rem;
          margin-top: 0.25rem;
        }

        .po-summary-modal-close {
          background: rgba(255, 255, 255, 0.2);
          border: none;
          border-radius: 9999px;
          padding: 0.5rem;
          cursor: pointer;
          transition: background 0.2s ease;
        }

        .po-summary-modal-close:hover {
          background: rgba(255, 255, 255, 0.3);
          transform: rotate(90deg);
        }

        .po-summary-close-icon {
          width: 1.5rem;
          height: 1.5rem;
          color: white;
        }

        .po-summary-modal-body {
          padding: 1.5rem;
        }

        /* Info Section */
        .po-summary-info-section {
          background: linear-gradient(135deg, #f9fafb, #eff6ff);
          border-radius: 0.75rem;
          padding: 1.5rem;
          margin-bottom: 1.5rem;
        }

        .po-summary-info-title {
          font-size: 1.125rem;
          font-weight: 600;
          color: #1f2937;
          margin-bottom: 1rem;
          display: flex;
          align-items: center;
        }

        .po-summary-info-icon {
          width: 1.25rem;
          height: 1.25rem;
          margin-right: 0.5rem;
          color: #2563eb;
        }

        .po-summary-info-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
          gap: 1rem;
        }

        .po-summary-info-card {
          background: white;
          border-radius: 0.5rem;
          padding: 0.75rem;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .po-summary-info-label {
          font-size: 0.75rem;
          color: #6b7280;
          margin-bottom: 0.25rem;
        }

        .po-summary-info-value {
          font-weight: 500;
          color: #1f2937;
        }

        /* Items Table in Modal */
        .po-summary-items-title {
          font-size: 1.125rem;
          font-weight: 600;
          color: #1f2937;
          margin-bottom: 1rem;
          display: flex;
          align-items: center;
        }

        .po-summary-items-icon {
          width: 1.25rem;
          height: 1.25rem;
          margin-right: 0.5rem;
          color: #2563eb;
        }

        .po-summary-table-footer {
          background: linear-gradient(135deg, #f9fafb, #eff6ff);
          font-weight: 600;
        }

        .po-summary-table-total-label {
          padding: 1rem 1.5rem;
          text-align: right;
          font-size: 0.875rem;
          font-weight: 600;
          color: #1f2937;
        }

        .po-summary-table-total-value {
          padding: 1rem 1.5rem;
          text-align: right;
          font-size: 1.25rem;
          font-weight: bold;
          color: #2563eb;
        }

        /* Text Utilities */
        .po-summary-text-right {
          text-align: right;
        }

        .po-summary-text-center {
          text-align: center;
        }

        .po-summary-font-semibold {
          font-weight: 600;
        }

        /* Loading State */
        .po-summary-loading-container {
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          min-height: 24rem;
          background: linear-gradient(135deg, #eff6ff, #e0e7ff);
        }

        .po-summary-spinner-wrapper {
          position: relative;
        }

        .po-summary-spinner {
          width: 4rem;
          height: 4rem;
          border: 4px solid #bfdbfe;
          border-top-color: #2563eb;
          border-radius: 50%;
          animation: poSummarySpin 1s linear infinite;
        }

        .po-summary-spinner-inner {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        @keyframes poSummarySpin {
          to {
            transform: rotate(360deg);
          }
        }

        .po-summary-loading-text {
          margin-top: 1rem;
          font-size: 1.125rem;
          font-weight: 600;
          color: #4b5563;
          animation: poSummaryPulse 1.5s ease-in-out infinite;
        }

        @keyframes poSummaryPulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }

        /* Error State */
        .po-summary-error-container {
          min-height: 100vh;
          background: linear-gradient(135deg, #fef2f2, #ffedd5);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1rem;
        }

        .po-summary-error-card {
          background: white;
          border-radius: 1rem;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
          padding: 2rem;
          max-width: 28rem;
          width: 100%;
          text-align: center;
        }

        .po-summary-error-icon {
          font-size: 3.75rem;
          margin-bottom: 1rem;
        }

        .po-summary-error-title {
          font-size: 1.5rem;
          font-weight: bold;
          color: #1f2937;
          margin-bottom: 0.5rem;
        }

        .po-summary-error-message {
          color: #6b7280;
          margin-bottom: 1rem;
        }

        .po-summary-retry-button {
          background: linear-gradient(135deg, #3b82f6, #4c1d95);
          color: white;
          padding: 0.5rem 1.5rem;
          border-radius: 0.5rem;
          border: none;
          cursor: pointer;
          transition: opacity 0.2s ease;
        }

        .po-summary-retry-button:hover {
          opacity: 0.9;
        }

        /* Empty State */
        .po-summary-empty-state {
          text-align: center;
          padding: 4rem;
        }

        .po-summary-empty-icon {
          font-size: 4rem;
          margin-bottom: 1rem;
          opacity: 0.5;
        }

        .po-summary-empty-title {
          font-size: 1.25rem;
          font-weight: 600;
          color: #4b5563;
          margin-bottom: 0.5rem;
        }

        .po-summary-empty-message {
          color: #6b7280;
        }

        /* Responsive */
        @media (max-width: 768px) {
          .po-summary-cards-grid {
            grid-template-columns: 1fr;
          }
          
          .po-summary-header-content {
            flex-direction: column;
            text-align: center;
          }
          
          .po-summary-header-top {
            flex-direction: column;
          }
          
          .po-summary-info-grid {
            grid-template-columns: 1fr;
          }

          .po-summary-filters-grid {
            grid-template-columns: 1fr;
          }

          .po-summary-cards-header {
            flex-direction: column;
            align-items: stretch;
          }

          .po-summary-toggle-buttons,
          .po-summary-export-buttons {
            justify-content: center;
          }
          
          .po-summary-table-th,
          .po-summary-table-td {
            padding: 0.5rem;
          }
          
          .po-summary-descriptions-cell {
            max-width: 150px;
          }
        }
      `}</style>
    </div>
  );
};

export default POSummaryReport;