import React from 'react';
import { FiInfo } from 'react-icons/fi';

const HintCard = () => {
  return (
    <div className="HintCard">
      <FiInfo />
      <span>
        💡 Tip: If your spreadsheet has one tab per lot, name them like <code>Cutting Matrix — Lot 64003</code> or <code>Cutting Matrix - Lot 64003</code>. This component will find them automatically.
      </span>
    </div>
  );
};

export default HintCard;