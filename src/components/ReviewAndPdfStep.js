import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  FiFileText, 
  FiCalendar, 
  FiUser, 
  FiDownload, 
  FiAlertTriangle,
  FiArrowLeft,
  FiRefreshCw,
  FiPrinter,
  FiCheck,
  FiX
} from 'react-icons/fi';
import { generateIssuePdf } from './pdfGenerator';
import { norm, titleCase, todayLocalISO } from './helpers';

const ReviewAndPdfStep = ({ matrix, selectedZips, supervisorOptions, onAddSupervisor, onBack, onReset }) => {
  const [issueDate, setIssueDate] = useState(() => todayLocalISO());
  const [supervisor, setSupervisor] = useState('');
  const [dialogError, setDialogError] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const typedIsNewSupervisor = supervisor && !supervisorOptions.some(opt => 
    (opt || '').toLowerCase() === supervisor.toLowerCase()
  );

  const calculateTotal = () => {
    return selectedZips.reduce((total, zip) => {
      return total + (zip.price * zip.quantity * zip.pieces);
    }, 0);
  };

  const handleGeneratePdf = async () => {
    if (!norm(supervisor)) { 
      setDialogError('Supervisor is required.'); 
      return; 
    }
    if (!matrix) { 
      setDialogError('Nothing to submit. Search a lot first.'); 
      return; 
    }
    
    setDialogError('');
    setConfirming(true);

    try {
      if (typedIsNewSupervisor) {
        onAddSupervisor(supervisor);
      }

      await generateIssuePdf(matrix, { issueDate, supervisor, selectedZips });
      setShowSuccess(true);
      
      // Auto-hide success message after 3 seconds
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (e) {
      setDialogError(e?.message || 'Failed to generate PDF.');
    } finally {
      setConfirming(false);
    }
  };

  const handleNewOrder = () => {
    onReset();
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
          <FiFileText />
        </div>
        <div className="StepHeaderContent">
          <h2>Step 4: Review & Generate PDF</h2>
          <p>Verify all information and generate the purchase order PDF</p>
        </div>
      </div>

      <div className="ReviewContent">
        {/* Lot Information */}
        <div className="ReviewSection">
          <h3>Lot Information</h3>
          <div className="InfoGridCompact">
            <div className="InfoItemCompact">
              <span className="InfoLabel">Lot Number:</span>
              <span className="InfoValue">{matrix.lotNumber || '—'}</span>
            </div>
            <div className="InfoItemCompact">
              <span className="InfoLabel">Style:</span>
              <span className="InfoValue">{matrix.style || '—'}</span>
            </div>
            <div className="InfoItemCompact">
              <span className="InfoLabel">Fabric:</span>
              <span className="InfoValue">{matrix.fabric || '—'}</span>
            </div>
            <div className="InfoItemCompact">
              <span className="InfoLabel">Garment Type:</span>
              <span className="InfoValue">{matrix.garmentType || '—'}</span>
            </div>
            <div className="InfoItemCompact">
              <span className="InfoLabel">Total Pieces:</span>
              <span className="InfoValue">{matrix.totals.grand}</span>
            </div>
          </div>
        </div>

        {/* Selected Zips Summary */}
        <div className="ReviewSection">
          <h3>Selected Zips ({selectedZips.length})</h3>
          <div className="ZipsSummary">
            <div className="ZipsList">
              {selectedZips.map(zip => (
                <div key={zip.id} className="ZipSummaryItem">
                  <div className="ZipInfo">
                    <div className="ZipType">{zip.zipType}</div>
                    <div className="ZipDetails">
                      {zip.size} • {zip.color}
                      {zip.isCustom && <span className="CustomBadge">Custom</span>}
                    </div>
                  </div>
                  <div className="ZipQuantities">
                    {zip.quantity} × {zip.pieces} pcs
                  </div>
                  <div className="ZipPrice">
                    ₹{zip.price} × {zip.quantity * zip.pieces} = ₹{(zip.price * zip.quantity * zip.pieces).toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
            <div className="ZipsTotal">
              <span>Grand Total:</span>
              <span className="TotalAmount">₹{calculateTotal().toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* PDF Generation Form */}
        <div className="ReviewSection">
          <h3>Generate PDF</h3>
          <div className="PdfForm">
            <div className="FormRow">
              <label className="Field">
                <div className="FieldLabel"><FiCalendar /> Date of Issue</div>
                <input 
                  type="date" 
                  value={issueDate} 
                  onChange={(e) => setIssueDate(e.target.value)} 
                />
              </label>

              <label className="Field">
                <div className="FieldLabel"><FiUser /> Supervisor</div>
                <div className="SupervisorInput">
                  <input
                    list="supervisorList"
                    placeholder="Enter supervisor name"
                    value={supervisor}
                    onChange={(e) => setSupervisor(titleCase(e.target.value))}
                  />
                  {typedIsNewSupervisor && (
                    <button
                      type="button"
                      onClick={() => onAddSupervisor(supervisor)}
                      title="Add to suggestions"
                      className="AddSupervisorBtn"
                    >
                      + Add
                    </button>
                  )}
                </div>
                <datalist id="supervisorList">
                  {supervisorOptions.map((name) => (
                    <option key={name} value={name} />
                  ))}
                </datalist>
              </label>
            </div>

            {dialogError && (
              <div className="InlineError">
                <FiAlertTriangle />
                <span>{dialogError}</span>
              </div>
            )}

            {showSuccess && (
              <div className="SuccessMessage">
                <FiCheck />
                <span>PDF generated successfully! Check your downloads.</span>
              </div>
            )}

            <div className="PdfActions">
              <motion.button
                className="BaseBtn GhostBtn"
                onClick={onBack}
                whileTap={{ scale: 0.98 }}
              >
                <FiArrowLeft /> Back to Zips
              </motion.button>

              <div className="PrimaryActions">
                <motion.button
                  className="BaseBtn PrimaryBtn LargeBtn"
                  onClick={handleGeneratePdf}
                  disabled={confirming || !norm(supervisor)}
                  whileTap={{ scale: 0.98 }}
                  whileHover={{ scale: 1.02 }}
                >
                  {confirming ? (
                    <div className="Spinner"></div>
                  ) : (
                    <>
                      <FiDownload /> Generate PDF
                    </>
                  )}
                </motion.button>

                <motion.button
                  className="BaseBtn SecondaryBtn"
                  onClick={handleNewOrder}
                  whileTap={{ scale: 0.98 }}
                >
                  <FiRefreshCw /> New Order
                </motion.button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .ReviewContent {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
        
        .ReviewSection {
          background: white;
          border-radius: 20px;
          padding: 28px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
          border: 1px solid #f1f5f9;
        }
        
        .ReviewSection h3 {
          margin: 0 0 20px 0;
          color: #1e293b;
          font-size: 1.4rem;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 12px;
        }
        
        .InfoGridCompact {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
        }
        
        .InfoItemCompact {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          background: #f8fafc;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
        }
        
        .InfoLabel {
          font-weight: 600;
          color: #64748b;
        }
        
        .InfoValue {
          font-weight: 700;
          color: #1e293b;
        }
        
        .ZipsSummary {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        
        .ZipsList {
          display: flex;
          flex-direction: column;
          gap: 8px;
          max-height: 300px;
          overflow-y: auto;
        }
        
        .ZipSummaryItem {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px;
          background: #f8fafc;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
        }
        
        .ZipInfo {
          flex: 1;
        }
        
        .ZipType {
          font-weight: 700;
          color: #1e293b;
          margin-bottom: 4px;
        }
        
        .ZipDetails {
          display: flex;
          align-items: center;
          gap: 12px;
          color: #64748b;
          font-size: 0.9rem;
        }
        
        .ZipQuantities {
          font-weight: 600;
          color: #475569;
          min-width: 100px;
          text-align: center;
        }
        
        .ZipPrice {
          font-weight: 700;
          color: #059669;
          min-width: 200px;
          text-align: right;
        }
        
        .ZipsTotal {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px;
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
          border-radius: 12px;
          color: white;
          font-weight: 700;
          font-size: 1.2rem;
        }
        
        .PdfForm {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        
        .FormRow {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }
        
        .SupervisorInput {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 8px;
        }
        
        .AddSupervisorBtn {
          white-space: nowrap;
          border-radius: 10px;
          border: 2px solid #e2e8f0;
          background: #fff;
          color: #475569;
          font-weight: 600;
          padding: 10px 12px;
          cursor: pointer;
        }
        
        .PdfActions {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 20px;
        }
        
        .PrimaryActions {
          display: flex;
          gap: 12px;
          align-items: center;
        }
        
        .SuccessMessage {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px;
          background: #d1fae5;
          border: 1px solid #a7f3d0;
          border-radius: 12px;
          color: #065f46;
          font-weight: 600;
        }
        
        .SecondaryBtn {
          background: #6b7280;
          color: white;
        }
        
        .SecondaryBtn:hover {
          background: #4b5563;
        }
        
        @media (max-width: 768px) {
          .FormRow {
            grid-template-columns: 1fr;
          }
          
          .PdfActions {
            flex-direction: column;
            gap: 16px;
          }
          
          .PrimaryActions {
            width: 100%;
            justify-content: space-between;
          }
        }
      `}</style>
    </div>
  );
};

export default ReviewAndPdfStep;