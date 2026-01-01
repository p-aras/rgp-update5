import React from 'react';
import { motion } from 'framer-motion';
import { FiSearch, FiRefreshCw, FiArrowLeft, FiScissors } from 'react-icons/fi';

const HeaderSection = ({ 
  lotInput, 
  setLotInput, 
  loading, 
  canSearch, 
  onSearch, 
  onBack, 
  onClear 
}) => {
  return (
    <div className="HeaderPaper">
      <div className="TitleSection">
        <div className="TitleIcon"><FiScissors /></div>
        <div>
          <h1>PUNEET ZIP PURCHASE ORDER</h1>
          <p>Search a Lot No. to view its Cutting Matrix and totals</p>
        </div>
      </div>

      <div className="SearchSection">
        <form className="Form" onSubmit={onSearch}>
          <label className="SearchBox">
            <FiSearch />
            <input
              value={lotInput}
              onChange={(e) => setLotInput(e.target.value)}
              placeholder="Enter Lot No (e.g., 64003)"
              autoFocus
            />
          </label>

          <div className="BtnRow">
            <motion.button
              className="BaseBtn GhostBtn"
              type="button"
              onClick={onBack}
              whileTap={{ scale: 0.98 }}
              title="Go back"
            >
              <FiArrowLeft /> Back
            </motion.button>

            <motion.button 
              className="BaseBtn PrimaryBtn" 
              type="submit" 
              disabled={!canSearch} 
              whileTap={{ scale: 0.98 }}
            >
              {loading ? <div className="Spinner"></div> : <><FiSearch /> Search</>}
            </motion.button>

            <motion.button 
              className="BaseBtn GhostBtn" 
              type="button" 
              onClick={onClear} 
              whileTap={{ scale: 0.98 }}
            >
              <FiRefreshCw /> Reset
            </motion.button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default HeaderSection;