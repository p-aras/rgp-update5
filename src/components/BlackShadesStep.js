import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  FiAward, 
  FiLayers, 
  FiDollarSign, 
  FiCheck, 
  FiPlus, 
  FiMinus,
  FiAlertTriangle, 
  FiArrowLeft, 
  FiArrowRight, 
  FiTrash2 
} from 'react-icons/fi';
import { norm, includes, getZipRate, getTotalPiecesForColor } from './helpers';

const BlackShadesStep = ({ matrix, zipOptions, selectedZips, onComplete, onBack }) => {
  const [selectedBlackShades, setSelectedBlackShades] = useState([]);
  const [currentSelectedZips, setCurrentSelectedZips] = useState(selectedZips);

  const availableBlackColors = useMemo(() => {
    if (!matrix || !matrix.rows) return [];
    
    const blackColors = matrix.rows
      .map(row => norm(row.color))
      .filter(color => includes(color, 'black'))
      .filter((color, index, self) => self.indexOf(color) === index);
    
    return blackColors;
  }, [matrix]);

  const zipTypes = useMemo(() => {
    const types = [...new Set(zipOptions.map(zip => zip.zipType))];
    return types.filter(type => type !== 'all');
  }, [zipOptions]);

  const handleAddBlackShade = (shade, zipType) => {
    const rate = getZipRate(zipOptions, zipType, shade);
    const totalPieces = getTotalPiecesForColor(matrix, shade);
    
    const blackZip = {
      id: `black-${shade}-${zipType}-${Date.now()}`,
      zipType: zipType,
      size: 'One Size',
      color: shade,
      price: rate,
      quantity: 1,
      pieces: totalPieces, // Auto-fill with total pieces from matrix
      isCustom: true,
      isBlackShade: true
    };

    setCurrentSelectedZips(prev => [...prev, blackZip]);
    setSelectedBlackShades(prev => prev.filter(s => s.shade !== shade || s.zipType !== zipType));
  };

  const handleRemoveBlackShade = (zipId) => {
    setCurrentSelectedZips(prev => prev.filter(zip => zip.id !== zipId));
  };

  const handleShadeSelection = (shade, zipType) => {
    setSelectedBlackShades(prev => {
      const existing = prev.find(s => s.shade === shade && s.zipType === zipType);
      if (existing) {
        return prev.filter(s => !(s.shade === shade && s.zipType === zipType));
      } else {
        return [...prev, { shade, zipType }];
      }
    });
  };

  const isShadeSelected = (shade, zipType) => {
    return selectedBlackShades.some(s => s.shade === shade && s.zipType === zipType);
  };

  const handleContinue = () => {
    onComplete({ selectedZips: currentSelectedZips });
  };

  const calculateTotal = () => {
    return currentSelectedZips.reduce((total, zip) => {
      return total + (zip.price * zip.quantity * zip.pieces);
    }, 0);
  };

  const updateZipQuantity = (zipId, quantity) => {
    setCurrentSelectedZips(prev => 
      prev.map(zip => 
        zip.id === zipId ? { ...zip, quantity: Math.max(1, quantity) } : zip
      )
    );
  };

  const updateZipPieces = (zipId, pieces) => {
    setCurrentSelectedZips(prev => 
      prev.map(zip => 
        zip.id === zipId ? { ...zip, pieces: Math.max(1, pieces) } : zip
      )
    );
  };

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
          <FiAward />
        </div>
        <div className="StepHeaderContent">
          <h2>Step 2: Select Black Shades</h2>
          <p>Choose zip types for each black shade. Pieces are auto-filled from cutting matrix.</p>
        </div>
      </div>

      <div className="BlackShadesSection">
        <div className="BlackShadesGrid">
          {availableBlackColors.map((shade, shadeIndex) => {
            const totalPieces = getTotalPiecesForColor(matrix, shade);
            
            return (
              <div key={shade} className="ShadeCard">
                <div className="ShadeHeader">
                  <div className="ShadeColorPreview">
                    <div className="ShadeColorDot"></div>
                    <div className="ShadeName">{shade}</div>
                  </div>
                  <div className="ShadeTotal">
                    {totalPieces} total pieces
                  </div>
                </div>

                <div className="ZipTypeSelection">
                  <div className="ZipTypeGrid">
                    {zipTypes.map((zipType) => {
                      const rate = getZipRate(zipOptions, zipType, shade);
                      const isSelected = isShadeSelected(shade, zipType);
                      const isAdded = currentSelectedZips.some(zip => 
                        zip.color === shade && zip.zipType === zipType
                      );

                      return (
                        <motion.div
                          key={`${shade}-${zipType}`}
                          className={`ZipTypeOption ${isSelected ? 'selected' : ''} ${isAdded ? 'added' : ''}`}
                          onClick={() => !isAdded && handleShadeSelection(shade, zipType)}
                          whileHover={{ scale: isAdded ? 1 : 1.02 }}
                          whileTap={{ scale: isAdded ? 1 : 0.98 }}
                        >
                          <div className="ZipTypeHeader">
                            <div className="ZipTypeName">{zipType}</div>
                            <div className="ZipPrice">₹{rate} (Black rate)</div>
                          </div>
                          <div className="ZipDetails">
                            <div className="AutoPieces">Auto pieces: {totalPieces}</div>
                          </div>
                          <div className="ZipStatus">
                            {isAdded ? (
                              <span className="AddedStatus">Added ✓</span>
                            ) : isSelected ? (
                              <span className="SelectedStatus">Selected</span>
                            ) : (
                              <span className="AvailableStatus">Click to select</span>
                            )}
                          </div>
                          {isSelected && !isAdded && (
                            <button
                              className="AddZipBtn"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAddBlackShade(shade, zipType);
                              }}
                            >
                              <FiPlus /> Add with {totalPieces} pieces
                            </button>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Black Shades List */}
      {currentSelectedZips.filter(zip => zip.isBlackShade).length > 0 && (
        <div className="SelectedItemsSection">
          <h3>Selected Black Shades ({currentSelectedZips.filter(zip => zip.isBlackShade).length})</h3>
          <div className="SelectedItemsList">
            {currentSelectedZips.filter(zip => zip.isBlackShade).map(zip => {
              const totalPieces = getTotalPiecesForColor(matrix, zip.color);
              
              return (
                <div key={zip.id} className="SelectedItemCard">
                  <div className="ItemInfo">
                    <div className="ItemMain">
                      <span className="ItemType">{zip.zipType}</span>
                      <span className="ItemColor">{zip.color}</span>
                      <span className="ItemRate">₹{zip.price} (Black rate)</span>
                    </div>
                    <div className="AutoInfo">
                      Auto-filled: {zip.pieces} pieces
                    </div>
                  </div>
                  <div className="ItemControls">
                    <div className="QuantityControl">
                      <label>Quantity:</label>
                      <div className="QtyInputGroup">
                        <button 
                          onClick={() => updateZipQuantity(zip.id, zip.quantity - 1)}
                          disabled={zip.quantity <= 1}
                        >
                          <FiMinus />
                        </button>
                        <input 
                          type="number" 
                          value={zip.quantity}
                          onChange={(e) => updateZipQuantity(zip.id, parseInt(e.target.value))}
                          min="1"
                        />
                        <button onClick={() => updateZipQuantity(zip.id, zip.quantity + 1)}>
                          <FiPlus />
                        </button>
                      </div>
                    </div>
                    <div className="QuantityControl">
                      <label>Pieces:</label>
                      <div className="QtyInputGroup">
                        <button 
                          onClick={() => updateZipPieces(zip.id, zip.pieces - 1)}
                          disabled={zip.pieces <= 1}
                        >
                          <FiMinus />
                        </button>
                        <input 
                          type="number" 
                          value={zip.pieces}
                          onChange={(e) => updateZipPieces(zip.id, parseInt(e.target.value))}
                          min="1"
                          max={totalPieces}
                        />
                        <button 
                          onClick={() => updateZipPieces(zip.id, zip.pieces + 1)}
                          disabled={zip.pieces >= totalPieces}
                        >
                          <FiPlus />
                        </button>
                      </div>
                      <div className="AvailablePieces">Max: {totalPieces}</div>
                    </div>
                  </div>
                  <div className="ItemTotal">
                    ₹{(zip.price * zip.quantity * zip.pieces).toFixed(2)}
                    <button 
                      className="RemoveBtn"
                      onClick={() => handleRemoveBlackShade(zip.id)}
                    >
                      <FiTrash2 />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="ItemsTotal">
            <span>Black Shades Total:</span>
            <span className="TotalAmount">₹{calculateTotal().toFixed(2)}</span>
          </div>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="StepNavigation">
        <motion.button
          className="BaseBtn GhostBtn"
          onClick={onBack}
          whileTap={{ scale: 0.98 }}
        >
          <FiArrowLeft /> Back to Matrix
        </motion.button>
        
        <motion.button
          className="BaseBtn PrimaryBtn LargeBtn"
          onClick={handleContinue}
          whileTap={{ scale: 0.98 }}
          whileHover={{ scale: 1.02 }}
        >
          Continue to Other Zips <FiArrowRight />
        </motion.button>
      </div>

      <style jsx>{`
        .StepNavigation {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 32px;
          padding-top: 24px;
          border-top: 1px solid #e2e8f0;
        }
        
        .BlackShadesGrid {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
        
        .ShadeCard {
          background: white;
          border-radius: 16px;
          padding: 24px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
        }
        
        .ShadeHeader {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          padding-bottom: 16px;
          border-bottom: 2px solid #f1f5f9;
        }
        
        .ShadeColorPreview {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        
        .ShadeColorDot {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #000000;
          border: 2px solid #e2e8f0;
        }
        
        .ShadeName {
          font-weight: 700;
          color: #1e293b;
          font-size: 1.2rem;
        }
        
        .ShadeTotal {
          font-weight: 600;
          color: #64748b;
          background: #f1f5f9;
          padding: 8px 16px;
          border-radius: 8px;
        }
        
        .ZipTypeGrid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
          gap: 12px;
        }
        
        .ZipTypeOption {
          padding: 16px;
          border: 2px solid #e2e8f0;
          background: white;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.3s ease;
          position: relative;
        }
        
        .ZipTypeOption.selected {
          border-color: #6366f1;
          background: #f0f9ff;
        }
        
        .ZipTypeOption.added {
          border-color: #10b981;
          background: #f0fdf4;
          cursor: not-allowed;
        }
        
        .ZipTypeOption:hover:not(.added) {
          border-color: #6366f1;
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(99, 102, 241, 0.15);
        }
        
        .ZipTypeHeader {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 8px;
        }
        
        .ZipTypeName {
          font-weight: 700;
          color: #1e293b;
          font-size: 1rem;
        }
        
        .ZipPrice {
          font-weight: 700;
          color: #059669;
          font-size: 0.9rem;
        }
        
        .ZipDetails {
          margin-bottom: 8px;
        }
        
        .AutoPieces {
          font-size: 0.8rem;
          color: #64748b;
          font-weight: 500;
        }
        
        .ZipStatus {
          font-size: 0.8rem;
          margin-bottom: 8px;
        }
        
        .SelectedStatus {
          color: #6366f1;
          font-weight: 600;
        }
        
        .AddedStatus {
          color: #10b981;
          font-weight: 600;
        }
        
        .AvailableStatus {
          color: #64748b;
        }
        
        .AddZipBtn {
          width: 100%;
          padding: 8px;
          background: #6366f1;
          color: white;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          font-size: 0.9rem;
        }
        
        .SelectedItemsSection {
          background: white;
          border-radius: 20px;
          padding: 24px;
          margin: 24px 0;
          border: 1px solid #e2e8f0;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
        }
        
        .SelectedItemsSection h3 {
          margin: 0 0 20px 0;
          color: #1e293b;
          font-size: 1.3rem;
        }
        
        .SelectedItemsList {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-bottom: 16px;
        }
        
        .SelectedItemCard {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px;
          background: #f8fafc;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          gap: 16px;
        }
        
        .ItemInfo {
          flex: 1;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .ItemMain {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        
        .ItemType {
          font-weight: 700;
          color: #1e293b;
        }
        
        .ItemColor {
          color: #64748b;
          font-size: 0.9rem;
        }
        
        .ItemRate {
          color: #059669;
          font-size: 0.8rem;
          font-weight: 600;
        }
        
        .AutoInfo {
          font-size: 0.8rem;
          color: #6366f1;
          font-weight: 500;
          background: #f0f9ff;
          padding: 4px 8px;
          border-radius: 6px;
        }
        
        .ItemControls {
          display: flex;
          gap: 16px;
        }
        
        .QuantityControl {
          display: flex;
          flex-direction: column;
          gap: 4px;
          align-items: center;
        }
        
        .QuantityControl label {
          font-size: 0.8rem;
          color: #64748b;
          font-weight: 600;
        }
        
        .QtyInputGroup {
          display: flex;
          align-items: center;
          gap: 8px;
          background: white;
          border-radius: 8px;
          padding: 4px;
          border: 1px solid #e2e8f0;
          position: relative;
        }
        
        .QtyInputGroup button {
          width: 28px;
          height: 28px;
          border: none;
          background: #6366f1;
          color: white;
          border-radius: 6px;
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
          width: 50px;
          text-align: center;
          border: none;
          background: transparent;
          font-weight: 700;
          color: #1e293b;
        }
        
        .AvailablePieces {
          font-size: 0.7rem;
          color: #64748b;
          margin-top: 2px;
        }
        
        .ItemTotal {
          font-weight: 700;
          color: #059669;
          font-size: 1.1rem;
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 120px;
          justify-content: flex-end;
        }
        
        .RemoveBtn {
          background: none;
          border: none;
          color: #dc2626;
          cursor: pointer;
          padding: 6px;
          border-radius: 6px;
        }
        
        .ItemsTotal {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px;
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
          border-radius: 12px;
          color: white;
          font-weight: 700;
        }
        
        .TotalAmount {
          font-size: 1.3rem;
        }
        
        .ErrorState {
          text-align: center;
          padding: 60px 20px;
          background: white;
          border-radius: 20px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
        }
        
        .ErrorState h2 {
          color: #dc2626;
          margin-bottom: 16px;
        }
      `}</style>
    </div>
  );
};

export default BlackShadesStep;