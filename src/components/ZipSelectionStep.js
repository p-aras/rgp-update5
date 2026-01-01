import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiShoppingCart, 
  FiFilter, 
  FiChevronUp, 
  FiChevronDown, 
  FiLayers,
  FiCheck,
  FiPlus,
  FiMinus,
  FiTrash2,
  FiArrowLeft,
  FiArrowRight,
  FiSearch,
  FiPackage,
  FiInfo
} from 'react-icons/fi';
import { norm, includes, getZipRate, getTotalPiecesForColor, getNonBlackShades, getAllColors } from './helpers';

const ZipSelectionStep = ({ matrix, zipOptions, selectedZips, onComplete, onBack, hasBlackShades }) => {
  const [zipSearchTerm, setZipSearchTerm] = useState('');
  const [selectedZipType, setSelectedZipType] = useState('all');
  const [showZipFilters, setShowZipFilters] = useState(false);
  const [currentSelectedZips, setCurrentSelectedZips] = useState([]);
  const [selectedZipTypes, setSelectedZipTypes] = useState(new Set());

  // Get available zip types
  const availableZipTypes = useMemo(() => {
    const types = [...new Set(zipOptions.map(zip => zip.zipType))];
    return types.filter(type => type && norm(type).length > 0);
  }, [zipOptions]);

  // Get colors based on scenario
  const availableColors = useMemo(() => {
    return hasBlackShades ? getNonBlackShades(matrix) : getAllColors(matrix);
  }, [matrix, hasBlackShades]);

  // ========== DIFFERENT LOGIC BASED ON BLACK SHADES ==========
  
  // Auto-populate when we HAVE black shades (based on black shade selections)
  useEffect(() => {
    if (hasBlackShades) {
      const blackZips = selectedZips.filter(zip => zip.isBlackShade);
      
      if (blackZips.length > 0) {
        const autoZips = [];
        const nonBlackColors = getNonBlackShades(matrix);
        
        blackZips.forEach(blackZip => {
          nonBlackColors.forEach(color => {
            const rate = getZipRate(zipOptions, blackZip.zipType, 'Self');
            const totalPieces = getTotalPiecesForColor(matrix, color);
            
            const autoZip = {
              id: `${blackZip.zipType}-${color}-${Date.now()}`,
              zipType: blackZip.zipType,
              size: blackZip.size,
              color: color,
              price: rate,
              quantity: blackZip.quantity, // Use same quantity as black shade
              pieces: totalPieces,
              isCustom: false,
              isAutoSelected: true,
              rateType: 'Self'
            };
            
            autoZips.push(autoZip);
          });
        });
        
        setCurrentSelectedZips(autoZips);
        
        // Also update selected zip types for display
        const blackZipTypes = new Set(blackZips.map(zip => zip.zipType));
        setSelectedZipTypes(blackZipTypes);
      }
    }
    // No auto-population when NO black shades - user will manually select
  }, [selectedZips, matrix, zipOptions, hasBlackShades]);

  // ========== BULK SELECTION LOGIC (for NO black shades) ==========
  
  const handleZipTypeSelect = (zipType) => {
    // This function only works when we DON'T have black shades
    if (hasBlackShades) return;
    
    setSelectedZipTypes(prev => {
      const newSelection = new Set(prev);
      
      if (newSelection.has(zipType)) {
        newSelection.delete(zipType);
        // Remove all zips of this type
        setCurrentSelectedZips(prevZips => 
          prevZips.filter(zip => zip.zipType !== zipType)
        );
      } else {
        newSelection.add(zipType);
        // Add this zip type to ALL colors
        const newZips = [];
        const rate = getZipRate(zipOptions, zipType, 'Self');
        
        availableColors.forEach(color => {
          const totalPieces = getTotalPiecesForColor(matrix, color);
          
          const newZip = {
            id: `${zipType}-${color}-${Date.now()}`,
            zipType: zipType,
            size: 'One Size',
            color: color,
            price: rate,
            quantity: 1,
            pieces: totalPieces,
            isCustom: false,
            isAutoSelected: false,
            rateType: 'Self'
          };
          
          newZips.push(newZip);
        });
        
        setCurrentSelectedZips(prev => [...prev, ...newZips]);
      }
      
      return newSelection;
    });
  };

  // ========== QUANTITY & PIECES CONTROL ==========
  
  // Update quantity for a specific zip type across ALL colors
  const updateZipQuantity = (zipType, quantity) => {
    setCurrentSelectedZips(prev => 
      prev.map(zip => 
        zip.zipType === zipType ? { ...zip, quantity: Math.max(1, quantity) } : zip
      )
    );
  };

  // Update pieces for a specific color-zip combination
  const updateZipPieces = (zipId, pieces) => {
    setCurrentSelectedZips(prev => 
      prev.map(zip => 
        zip.id === zipId ? { ...zip, pieces: Math.max(1, pieces) } : zip
      )
    );
  };

  // Remove a zip type completely (from all colors)
  const removeZipType = (zipType) => {
    if (hasBlackShades) {
      // When we have black shades, we can't remove individual types (they're auto-populated)
      return;
    }
    
    setSelectedZipTypes(prev => {
      const newSelection = new Set(prev);
      newSelection.delete(zipType);
      return newSelection;
    });
    
    setCurrentSelectedZips(prev => 
      prev.filter(zip => zip.zipType !== zipType)
    );
  };

  const clearAllZips = () => {
    if (hasBlackShades) {
      // When we have black shades, we can't clear all (they're auto-populated)
      return;
    }
    
    setSelectedZipTypes(new Set());
    setCurrentSelectedZips([]);
  };

  const calculateZipTotal = () => {
    return currentSelectedZips.reduce((total, zip) => {
      const zipTotal = zip.price * zip.quantity * zip.pieces;
      return total + zipTotal;
    }, 0);
  };

  const handleContinue = () => {
    const allSelectedZips = hasBlackShades 
      ? [...selectedZips.filter(zip => zip.isBlackShade), ...currentSelectedZips]
      : currentSelectedZips;
    onComplete({ selectedZips: allSelectedZips });
  };

  // Group zips by type for display
  const zipsByType = useMemo(() => {
    return currentSelectedZips.reduce((groups, zip) => {
      const type = zip.zipType;
      if (!groups[type]) {
        groups[type] = [];
      }
      groups[type].push(zip);
      return groups;
    }, {});
  }, [currentSelectedZips]);

  if (!matrix) {
    return (
      <div className="StepContainer">
        <div className="ErrorState">
          <h2>No Matrix Data Found</h2>
          <p>Please go back to Step 1 and search for a valid lot number.</p>
          <button className="BaseBtn PrimaryBtn" onClick={onBack}>
            <FiArrowLeft /> Back to Step 1
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="StepContainer">
      <div className="StepHeader">
        <div className="StepIcon">
          <FiShoppingCart />
        </div>
        <div className="StepHeaderContent">
          <h2>
            {hasBlackShades ? 'Step 3: Other Colors (Auto-Selected)' : 'Step 2: Select Zips (Bulk Selection)'}
          </h2>
          <p>
            {hasBlackShades 
              ? 'Zips auto-selected based on your black shade choices'
              : 'Select zip types once - they will apply to all colors automatically'
            }
          </p>
        </div>
      </div>

      {/* Scenario-specific Info */}
      <div className={`ScenarioInfo ${hasBlackShades ? 'auto-mode' : 'bulk-mode'}`}>
        <div className="InfoIcon">
          <FiInfo />
        </div>
        <div className="InfoContent">
          <h4>
            {hasBlackShades ? 'Auto-Selection Mode' : 'Bulk Selection Mode'}
          </h4>
          <p>
            {hasBlackShades 
              ? `Based on your black shade selections, zips have been automatically added for ${availableColors.length} other colors with Self rates (₹4). You can adjust quantities and pieces.`
              : `Select zip types below. Each selected type will be automatically applied to all ${availableColors.length} colors with Self rates (₹4). Pieces are auto-filled from cutting matrix.`
            }
          </p>
        </div>
      </div>

      <div className="ZipSelectionSection">
        <div className="ZipSectionHeader">
          <div>
            <h4><FiShoppingCart /> 
              {hasBlackShades ? 'Auto-Selected Zips' : 'Select Zip Types'}
            </h4>
            <div className="ZipStats">
              {hasBlackShades 
                ? `${Object.keys(zipsByType).length} types • ${currentSelectedZips.length} zips`
                : `${selectedZipTypes.size} types selected • ${currentSelectedZips.length} total zips`
              }
              <span className="RateInfo">All at Self rates (₹4)</span>
            </div>
          </div>
          
          {/* Show Clear All only in bulk mode */}
          {!hasBlackShades && selectedZipTypes.size > 0 && (
            <div className="ZipActions">
              <motion.button 
                className="ZipActionBtn variant-danger"
                onClick={clearAllZips}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <FiTrash2 /> Clear All
              </motion.button>
            </div>
          )}
        </div>

        {/* ========== DIFFERENT UI BASED ON MODE ========== */}

        {/* BULK SELECTION UI (when NO black shades) */}
        {!hasBlackShades && (
          <div className="ZipTypeSelectionGrid">
            {availableZipTypes.map(zipType => {
              const isSelected = selectedZipTypes.has(zipType);
              const rate = getZipRate(zipOptions, zipType, 'Self');
              
              return (
                <motion.div
                  key={zipType}
                  className={`ZipTypeCard ${isSelected ? 'selected' : ''}`}
                  onClick={() => handleZipTypeSelect(zipType)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="ZipTypeHeader">
                    <div className="ZipTypeName">{zipType}</div>
                    <div className="ZipPrice">₹{rate}</div>
                  </div>
                  <div className="ZipTypeInfo">
                    <div className="ZipAppliedTo">
                      Applied to: {availableColors.length} colors
                    </div>
                    <div className="SelectionStatus">
                      {isSelected ? (
                        <span className="SelectedStatus">✓ Selected</span>
                      ) : (
                        <span className="AvailableStatus">Click to select</span>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* SELECTED ZIPS DISPLAY (both modes) */}
        {currentSelectedZips.length > 0 ? (
          <div className="SelectedZipsSection">
            <h4>
              {hasBlackShades 
                ? 'Auto-Selected Zip Types' 
                : 'Selected Zip Types'
              } ({Object.keys(zipsByType).length})
            </h4>
            <div className="SelectedZipsList">
              {Object.entries(zipsByType).map(([zipType, zipsOfType]) => {
                const sampleZip = zipsOfType[0];
                const totalPiecesAllColors = zipsOfType.reduce((sum, zip) => sum + zip.pieces, 0);
                
                return (
                  <div key={zipType} className="SelectedZipTypeCard">
                    <div className="ZipTypeHeader">
                      <div className="ZipTypeInfo">
                        <div className="ZipTypeName">{zipType}</div>
                        <div className="ZipAppliedInfo">
                          Applied to {zipsOfType.length} colors • ₹{sampleZip?.price || 0} per piece
                          {hasBlackShades && <span className="AutoBadge">Auto-Selected</span>}
                        </div>
                      </div>
                      
                      {/* Show remove button only in bulk mode */}
                      {!hasBlackShades && (
                        <button 
                          className="RemoveTypeBtn"
                          onClick={() => removeZipType(zipType)}
                        >
                          <FiTrash2 />
                        </button>
                      )}
                    </div>
                    
                    <div className="ZipTypeControls">
                      <div className="QuantityControl">
                        <label>
                          {hasBlackShades ? 'Quantity:' : 'Quantity (applies to all colors):'}
                        </label>
                        <div className="QtyInputGroup">
                          <button 
                            onClick={() => updateZipQuantity(zipType, (sampleZip?.quantity || 1) - 1)}
                            disabled={(sampleZip?.quantity || 1) <= 1}
                          >
                            <FiMinus />
                          </button>
                          <input 
                            type="number" 
                            value={sampleZip?.quantity || 1}
                            onChange={(e) => updateZipQuantity(zipType, parseInt(e.target.value))}
                            min="1"
                          />
                          <button onClick={() => updateZipQuantity(zipType, (sampleZip?.quantity || 1) + 1)}>
                            <FiPlus />
                          </button>
                        </div>
                      </div>
                      
                      <div className="TotalInfo">
                        <div className="TotalPieces">
                          Total pieces: {totalPiecesAllColors}
                        </div>
                        <div className="TypeTotal">
                          Type total: ₹{zipsOfType.reduce((sum, zip) => sum + (zip.price * zip.quantity * zip.pieces), 0).toFixed(2)}
                        </div>
                      </div>
                    </div>

                    {/* Color-wise breakdown */}
                    <div className="ColorBreakdown">
                      <div className="BreakdownHeader">Color-wise Pieces:</div>
                      <div className="BreakdownGrid">
                        {zipsOfType.map(zip => (
                          <div key={zip.id} className="ColorItem">
                            <span className="ColorName">{zip.color}</span>
                            <div className="PiecesControl">
                              <input 
                                type="number" 
                                value={zip.pieces}
                                onChange={(e) => updateZipPieces(zip.id, parseInt(e.target.value))}
                                min="1"
                                max={getTotalPiecesForColor(matrix, zip.color)}
                              />
                              <span className="MaxPieces">
                                / {getTotalPiecesForColor(matrix, zip.color)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Grand Total */}
            <div className="ZipTotalCard">
              <div className="TotalLabel">
                {hasBlackShades ? 'Other Colors Total' : 'Grand Total'} (Self Rates)
              </div>
              <div className="TotalAmount">₹{calculateZipTotal().toFixed(2)}</div>
            </div>
          </div>
        ) : (
          /* Empty State */
          <div className="EmptyState">
            <FiPackage size={48} />
            <h4>
              {hasBlackShades ? 'No Auto-Selection Available' : 'No Zip Types Selected'}
            </h4>
            <p>
              {hasBlackShades 
                ? 'Go back to Step 2 and select black shades to auto-populate zips for other colors.'
                : 'Select zip types from the options above to apply them to all colors.'
              }
            </p>
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="StepNavigation">
        <motion.button
          className="BaseBtn GhostBtn"
          onClick={onBack}
          whileTap={{ scale: 0.98 }}
        >
          <FiArrowLeft /> {hasBlackShades ? 'Back to Black Shades' : 'Back to Matrix'}
        </motion.button>
        
        <motion.button
          className="BaseBtn PrimaryBtn LargeBtn"
          onClick={handleContinue}
          disabled={currentSelectedZips.length === 0}
          whileTap={{ scale: 0.98 }}
          whileHover={{ scale: 1.02 }}
        >
          {hasBlackShades ? 'Review & Generate PDF' : 'Continue to Review'} <FiArrowRight />
        </motion.button>
      </div>

      <style jsx>{`
        .ScenarioInfo.auto-mode {
          background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
          border: 1px solid #bae6fd;
        }
        
        .ScenarioInfo.bulk-mode {
          background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%);
          border: 1px solid #86efac;
        }
        
        .auto-mode .InfoIcon {
          background: #0ea5e9;
        }
        
        .bulk-mode .InfoIcon {
          background: #16a34a;
        }
        
        .auto-mode .InfoContent h4 {
          color: #0369a1;
        }
        
        .bulk-mode .InfoContent h4 {
          color: #166534;
        }
        
        .auto-mode .InfoContent p {
          color: #0c4a6e;
        }
        
        .bulk-mode .InfoContent p {
          color: #14532d;
        }
        
        .AutoBadge {
          margin-left: 8px;
          padding: 2px 6px;
          background: #dbeafe;
          color: #1e40af;
          border-radius: 4px;
          font-size: 0.7rem;
          font-weight: 600;
        }
          .StepContainer {
          padding: 20px 0;
        }
        
        .StepHeader {
          display: flex;
          align-items: center;
          gap: 20px;
          margin-bottom: 32px;
          padding: 24px;
          background: white;
          border-radius: 20px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
          border: 1px solid #f1f5f9;
        }
        
        .StepIcon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 70px;
          height: 70px;
          border-radius: 18px;
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
          color: white;
          font-size: 28px;
          box-shadow: 0 8px 24px rgba(99, 102, 241, 0.3);
        }
        
        .StepHeaderContent h2 {
          margin: 0 0 8px 0;
          font-size: 1.8rem;
          font-weight: 800;
          color: #1e293b;
        }
        
        .StepHeaderContent p {
          margin: 0;
          color: #64748b;
          font-size: 1.1rem;
        }
        
        .ScenarioInfo {
          display: flex;
          align-items: flex-start;
          gap: 16px;
          background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
          border: 1px solid #bae6fd;
          border-radius: 16px;
          padding: 20px;
          margin-bottom: 24px;
        }
        
        .InfoIcon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          border-radius: 10px;
          background: #0ea5e9;
          color: white;
          font-size: 1.2rem;
          flex-shrink: 0;
        }
        
        .InfoContent h4 {
          margin: 0 0 8px 0;
          color: #0369a1;
          font-size: 1.1rem;
        }
        
        .InfoContent p {
          margin: 0;
          color: #0c4a6e;
          font-size: 0.95rem;
          line-height: 1.4;
        }
        
        .ZipSelectionSection {
          background: white;
          border-radius: 20px;
          padding: 28px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
          border: 1px solid #f1f5f9;
        }
        
        .ZipSectionHeader {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 24px;
        }
        
        .ZipSectionHeader h4 {
          margin: 0 0 8px 0;
          color: #1e293b;
          font-size: 1.3rem;
        }
        
        .ZipStats {
          color: #64748b;
          font-size: 0.95rem;
          display: flex;
          align-items: center;
          gap: 12px;
        }
        
        .ZipStats .RateInfo {
          padding: 2px 8px;
          background: #dcfce7;
          color: #166534;
          border-radius: 6px;
          font-size: 0.8rem;
          font-weight: 600;
        }
        
        .ZipTypeSelectionGrid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
          gap: 16px;
          margin-bottom: 32px;
        }
        
        .ZipTypeCard {
          padding: 20px;
          border: 2px solid #e2e8f0;
          background: white;
          border-radius: 16px;
          cursor: pointer;
          transition: all 0.3s ease;
        }
        
        .ZipTypeCard.selected {
          border-color: #6366f1;
          background: #f0f9ff;
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(99, 102, 241, 0.15);
        }
        
        .ZipTypeCard:hover:not(.selected) {
          border-color: #6366f1;
          transform: translateY(-2px);
        }
        
        .ZipTypeHeader {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 12px;
        }
        
        .ZipTypeName {
          font-weight: 700;
          color: #1e293b;
          font-size: 1.1rem;
        }
        
        .ZipPrice {
          font-weight: 700;
          color: #059669;
          font-size: 1.2rem;
        }
        
        .ZipTypeInfo {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        
        .ZipAppliedTo {
          font-size: 0.9rem;
          color: #64748b;
        }
        
        .SelectionStatus {
          font-size: 0.8rem;
          font-weight: 600;
        }
        
        .SelectedStatus {
          color: #10b981;
        }
        
        .AvailableStatus {
          color: #6366f1;
        }
        
        .SelectedZipsSection {
          margin-top: 32px;
        }
        
        .SelectedZipsSection h4 {
          margin: 0 0 20px 0;
          color: #1e293b;
          font-size: 1.2rem;
        }
        
        .SelectedZipsList {
          display: flex;
          flex-direction: column;
          gap: 20px;
          margin-bottom: 24px;
        }
        
        .SelectedZipTypeCard {
          background: #f8fafc;
          border-radius: 16px;
          padding: 24px;
          border: 1px solid #e2e8f0;
        }
        
        .SelectedZipTypeCard .ZipTypeHeader {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 20px;
        }
        
        .ZipAppliedInfo {
          font-size: 0.9rem;
          color: #64748b;
          margin-top: 4px;
        }
        
        .RemoveTypeBtn {
          background: none;
          border: none;
          color: #dc2626;
          cursor: pointer;
          padding: 8px;
          border-radius: 8px;
          transition: all 0.2s ease;
        }
        
        .RemoveTypeBtn:hover {
          background: rgba(220, 38, 38, 0.1);
        }
        
        .ZipTypeControls {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          padding-bottom: 20px;
          border-bottom: 1px solid #e2e8f0;
        }
        
        .QuantityControl label {
          display: block;
          margin-bottom: 8px;
          font-weight: 600;
          color: #374151;
          font-size: 0.9rem;
        }
        
        .QtyInputGroup {
          display: flex;
          align-items: center;
          gap: 8px;
          background: white;
          border-radius: 10px;
          padding: 6px;
          border: 1px solid #e2e8f0;
        }
        
        .QtyInputGroup button {
          width: 32px;
          height: 32px;
          border: none;
          background: #6366f1;
          color: white;
          border-radius: 8px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .QtyInputGroup button:disabled {
          background: #e2e8f0;
          color: #94a3b8;
          cursor: not-allowed;
        }
        
        .QtyInputGroup input {
          width: 60px;
          text-align: center;
          border: none;
          background: transparent;
          font-weight: 700;
          color: #1e293b;
          font-size: 1rem;
        }
        
        .TotalInfo {
          text-align: right;
        }
        
        .TotalPieces {
          font-weight: 600;
          color: #64748b;
          margin-bottom: 4px;
        }
        
        .TypeTotal {
          font-weight: 700;
          color: #059669;
          font-size: 1.1rem;
        }
        
        .ColorBreakdown {
          background: white;
          border-radius: 12px;
          padding: 16px;
          border: 1px solid #e2e8f0;
        }
        
        .BreakdownHeader {
          font-weight: 600;
          color: #374151;
          margin-bottom: 12px;
          font-size: 0.9rem;
        }
        
        .BreakdownGrid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 12px;
        }
        
        .ColorItem {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 12px;
          background: #f8fafc;
          border-radius: 8px;
        }
        
        .ColorName {
          font-weight: 500;
          color: #374151;
          font-size: 0.9rem;
        }
        
        .PiecesControl {
          display: flex;
          align-items: center;
          gap: 4px;
        }
        
        .PiecesControl input {
          width: 50px;
          text-align: center;
          border: 1px solid #e2e8f0;
          border-radius: 4px;
          padding: 2px 4px;
          font-size: 0.8rem;
        }
        
        .MaxPieces {
          font-size: 0.7rem;
          color: #64748b;
        }
        
        .ZipTotalCard {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 24px;
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
          border-radius: 16px;
          color: white;
          font-weight: 700;
        }
        
        .TotalLabel {
          font-size: 1.1rem;
        }
        
        .TotalAmount {
          font-size: 1.4rem;
        }
        
        .EmptyState {
          text-align: center;
          padding: 60px 20px;
          color: #64748b;
        }
        
        .EmptyState h4 {
          margin: 16px 0 8px 0;
          color: #475569;
        }
        
        .StepNavigation {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 32px;
          padding-top: 24px;
          border-top: 1px solid #e2e8f0;
        }
        
        .BaseBtn {
          border-radius: 14px;
          padding: 14px 22px;
          font-weight: 600;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          border: none;
          transition: all 0.3s ease;
          font-size: 0.95rem;
        }
        
        .GhostBtn {
          background: white;
          border: 2px solid #e2e8f0;
          color: #64748b;
        }
        
        .PrimaryBtn {
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
          color: white;
        }
        
        .LargeBtn {
          padding: 16px 32px;
          font-size: 1.1rem;
        }
        
        .ZipActionBtn {
          padding: 10px 16px;
          border-radius: 12px;
          border: none;
          background: #6366f1;
          color: white;
          font-size: 0.9rem;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        
        .ZipActionBtn.variant-danger {
          background: #ef4444;
        }
        
        .ErrorState {
          text-align: center;
          padding: 60px 20px;
          background: white;
          border-radius: 20px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
        }
      `}</style>
    </div>
  );
};

export default ZipSelectionStep;