import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiPrinter, FiX, FiCalendar, FiUser, FiDownload, FiAlertTriangle } from 'react-icons/fi';
import { norm, titleCase } from './helpers';

const IssueDialog = ({
  showIssueDialog,
  onClose,
  issueDate,
  setIssueDate,
  supervisor,
  setSupervisor,
  supervisorOptions,
  typedIsNewSupervisor,
  onAddSupervisor,
  dialogError,
  confirming,
  selectedZips,
  onConfirm,
  matrix
}) => {
  const calculateZipTotal = () => {
    return selectedZips.reduce((total, zip) => {
      const zipTotal = zip.price * zip.quantity * zip.pieces;
      return total + zipTotal;
    }, 0);
  };

  if (!showIssueDialog) return null;

  return (
    <>
      <motion.div 
        className="Backdrop" 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }} 
        onClick={onClose} 
      />
      
      <motion.div
        className="Dialog"
        role="dialog"
        aria-modal="true"
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.98 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="DialogHeader">
          <h3><FiPrinter /> Generate Issue PDF</h3>
          <button className="IconBtn" onClick={onClose} aria-label="Close">
            <FiX />
          </button>
        </div>

        <DateField issueDate={issueDate} setIssueDate={setIssueDate} />
        
        <SupervisorField
          supervisor={supervisor}
          setSupervisor={setSupervisor}
          supervisorOptions={supervisorOptions}
          typedIsNewSupervisor={typedIsNewSupervisor}
          onAddSupervisor={onAddSupervisor}
        />

        <ZipSummary selectedZips={selectedZips} />

        {dialogError && <ErrorDisplay error={dialogError} />}

        <DialogActions
          onClose={onClose}
          onConfirm={onConfirm}
          confirming={confirming}
          disabled={!norm(supervisor) || !matrix}
        />
      </motion.div>
    </>
  );
};

const DateField = ({ issueDate, setIssueDate }) => (
  <label className="Field">
    <div className="FieldLabel"><FiCalendar /> Date of Issue</div>
    <input 
      type="date" 
      value={issueDate} 
      onChange={(e) => setIssueDate(e.target.value)} 
    />
  </label>
);

const SupervisorField = ({
  supervisor,
  setSupervisor,
  supervisorOptions,
  typedIsNewSupervisor,
  onAddSupervisor
}) => (
  <label className="Field">
    <div className="FieldLabel"><FiUser /> Supervisor</div>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8 }}>
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
);

const ZipSummary = ({ selectedZips }) => {
  if (selectedZips.length === 0) return null;

  const total = selectedZips.reduce((sum, zip) => 
    sum + (zip.price * zip.quantity * zip.pieces), 0
  );

  return (
    <div className="ZipSummary">
      <div className="SummaryLabel">Selected Zips:</div>
      <div className="ZipList">
        {selectedZips.map(zip => (
          <div className="ZipSummaryItem" key={zip.id}>
            {zip.zipType} - {zip.color} (₹{zip.price} × {zip.quantity} × {zip.pieces})
          </div>
        ))}
      </div>
      <div className="TotalSummary">
        Total: ₹{total.toFixed(2)}
      </div>
    </div>
  );
};

const ErrorDisplay = ({ error }) => (
  <div className="InlineError">
    <FiAlertTriangle />
    <span>{error}</span>
  </div>
);

const DialogActions = ({ onClose, onConfirm, confirming, disabled }) => (
  <div className="DialogActions">
    <motion.button 
      className="BaseBtn GhostBtn" 
      type="button" 
      whileTap={{ scale: 0.98 }} 
      onClick={onClose} 
      disabled={confirming}
    >
      Cancel
    </motion.button>
    
    <motion.button 
      className="BaseBtn PrimaryBtn" 
      type="button" 
      whileTap={{ scale: 0.98 }} 
      onClick={onConfirm} 
      disabled={confirming || disabled}
      title="Generate PDF"
    >
      {confirming ? <div className="Spinner"></div> : <><FiDownload /> Generate PDF</>}
    </motion.button>
  </div>
);

export default IssueDialog;