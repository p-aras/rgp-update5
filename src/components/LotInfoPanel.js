import React from 'react';
import { motion } from 'framer-motion';
import { FiInfo, FiPackage, FiTag, FiGrid, FiDownload } from 'react-icons/fi';

const LotInfoPanel = ({ matrix, onGeneratePdf }) => {
  return (
    <div className="InfoPanel">
      <div className="PanelHeader">
        <FiInfo />
        <h3>Lot Information</h3>
      </div>
      
      <div className="InfoGrid">
        <InfoItem icon={<FiPackage />} label="Lot Number" value={matrix.lotNumber} />
        <InfoItem icon={<FiTag />} label="Style" value={matrix.style} />
        <InfoItem icon={<FiGrid />} label="Fabric" value={matrix.fabric} />
        <InfoItem icon={<FiTag />} label="Garment Type" value={matrix.garmentType} />
      </div>
      
      <SummaryCard matrix={matrix} />
      
      <div className="ActionsRow">
        <motion.button
          className="BaseBtn PrimaryBtn"
          type="button"
          onClick={onGeneratePdf}
          whileTap={{ scale: 0.98 }}
          whileHover={{ scale: 1.02 }}
        >
          <FiDownload /> Generate PDF
        </motion.button>
      </div>
    </div>
  );
};

const InfoItem = ({ icon, label, value }) => (
  <div className="InfoItem">
    <div className="InfoIcon">{icon}</div>
    <div>
      <div className="InfoLabel">{label}</div>
      <div className="InfoValue">{value || '—'}</div>
    </div>
  </div>
);

const SummaryCard = ({ matrix }) => (
  <div className="SummaryCard">
    <div className="SummaryItem">
      <div className="SummaryLabel">Total Pieces</div>
      <div className="SummaryValue">{matrix.totals.grand}</div>
    </div>
    <div className="SummaryItem">
      <div className="SummaryLabel">Colors</div>
      <div className="SummaryValue">{matrix.rows.length}</div>
    </div>
    <div className="SummaryItem">
      <div className="SummaryLabel">Sizes</div>
      <div className="SummaryValue">{matrix.sizes.length}</div>
    </div>
  </div>
);

export default LotInfoPanel;