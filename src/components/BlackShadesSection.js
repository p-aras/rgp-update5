import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { FiAward, FiLayers, FiDollarSign, FiCheck, FiPlus, FiAlertTriangle } from 'react-icons/fi';
import { norm, includes } from './helpers';

const BlackShadesSection = ({ matrix, zipOptions, selectedZips, setSelectedZips }) => {
  const [blackShadeRate, setBlackShadeRate] = useState('');
  const [selectedBlackShade, setSelectedBlackShade] = useState('');
  const [selectedZipTypeForBlack, setSelectedZipTypeForBlack] = useState('');
  const [blackShadeError, setBlackShadeError] = useState('');

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

  const findMatchingZipRate = (zipType) => {
    const matchingZip = zipOptions.find(zip => 
      zip.zipType.toLowerCase() === zipType.toLowerCase() && 
      zip.color.toLowerCase().includes('black')
    );
    return matchingZip ? matchingZip.price : '';
  };

  const handleBlackShadeSelect = (shade) => {
    setSelectedBlackShade(shade);
    if (selectedZipTypeForBlack) {
      const autoRate = findMatchingZipRate(selectedZipTypeForBlack);
      if (autoRate) {
        setBlackShadeRate(autoRate.toString());
      }
    }
  };

  const handleZipTypeSelectForBlack = (zipType) => {
    setSelectedZipTypeForBlack(zipType);
    const autoRate = findMatchingZipRate(zipType);
    if (autoRate) {
      setBlackShadeRate(autoRate.toString());
    }
  };

  const handleAddBlackShade = () => {
    if (!selectedBlackShade || !blackShadeRate || !selectedZipTypeForBlack) {
      setBlackShadeError('Please select zip type, black shade and enter rate');
      return;
    }

    const rate = parseFloat(blackShadeRate);
    if (isNaN(rate) || rate <= 0) {
      setBlackShadeError('Please enter a valid rate');
      return;
    }

    const blackZip = {
      id: `black-${selectedBlackShade}-${selectedZipTypeForBlack}-${Date.now()}`,
      zipType: selectedZipTypeForBlack,
      size: 'One Size',
      color: selectedBlackShade,
      price: rate,
      quantity: 1,
      pieces: 1,
      isCustom: true
    };

    setSelectedZips(prev => [...prev, blackZip]);
    setSelectedBlackShade('');
    setSelectedZipTypeForBlack('');
    setBlackShadeRate('');
    setBlackShadeError('');
  };

  if (availableBlackColors.length === 0) return null;

  return (
    <div className="BlackShadesSection">
      <div className="BlackShadesHeader">
        <div className="BlackShadesTitle">
          <div className="BlackShadesIcon">
            <FiAward />
          </div>
          <div>
            <h4>Black Shades from Cutting Matrix</h4>
            <p>Select zip type and black shade to add custom zips</p>
          </div>
        </div>
        <div className="ZipStats">
          {availableBlackColors.length} black shades available
        </div>
      </div>

      <div className="BlackShadesContent">
        <ZipTypeSelection 
          zipTypes={zipTypes}
          selectedZipTypeForBlack={selectedZipTypeForBlack}
          onSelectZipType={handleZipTypeSelectForBlack}
        />
        
        <ShadeSelection
          availableBlackColors={availableBlackColors}
          selectedBlackShade={selectedBlackShade}
          onSelectShade={handleBlackShadeSelect}
          selectedZipTypeForBlack={selectedZipTypeForBlack}
          blackShadeRate={blackShadeRate}
          setBlackShadeRate={setBlackShadeRate}
          blackShadeError={blackShadeError}
          onAddBlackShade={handleAddBlackShade}
        />
      </div>
    </div>
  );
};

const ZipTypeSelection = ({ zipTypes, selectedZipTypeForBlack, onSelectZipType }) => (
  <div className="ZipTypeSelectionBox">
    <div className="SectionTitle">
      <FiLayers />
      <span>1. Select Zip Type</span>
    </div>
    <div className="ZipTypeGrid">
      {zipTypes.map((zipType) => (
        <motion.div
          key={zipType}
          className={`ZipTypeOption ${selectedZipTypeForBlack === zipType ? 'selected' : ''}`}
          onClick={() => onSelectZipType(zipType)}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <div className="ZipTypeName">{zipType}</div>
          {selectedZipTypeForBlack === zipType && (
            <div className="SelectedIndicator">
              <FiCheck />
            </div>
          )}
        </motion.div>
      ))}
    </div>
  </div>
);

const ShadeSelection = ({
  availableBlackColors,
  selectedBlackShade,
  onSelectShade,
  selectedZipTypeForBlack,
  blackShadeRate,
  setBlackShadeRate,
  blackShadeError,
  onAddBlackShade
}) => (
  <div className="ShadeSelectionBox">
    <div className="SectionTitle">
      <FiAward />
      <span>2. Select Black Shade</span>
    </div>
    
    <div className="ShadeGrid">
      {availableBlackColors.map((shade, index) => (
        <motion.div
          key={shade}
          className={`ShadeCard ${selectedBlackShade === shade ? 'selected' : ''}`}
          onClick={() => onSelectShade(shade)}
          whileHover={{ scale: 1.03, y: -2 }}
          whileTap={{ scale: 0.98 }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
        >
          <div className="ShadeColorPreview">
            <div className="ShadeColorDot"></div>
            <div className="ShadeName">{shade}</div>
          </div>
          <div className={`ShadeStatus ${selectedBlackShade === shade ? 'selected' : ''}`}>
            {selectedBlackShade === shade ? 'Selected' : 'Click to select'}
          </div>
          {selectedBlackShade === shade && (
            <div className="SelectedBadge">
              <FiCheck />
            </div>
          )}
        </motion.div>
      ))}
    </div>

    {(selectedZipTypeForBlack && selectedBlackShade) && (
      <RateSection
        selectedZipTypeForBlack={selectedZipTypeForBlack}
        selectedBlackShade={selectedBlackShade}
        blackShadeRate={blackShadeRate}
        setBlackShadeRate={setBlackShadeRate}
      />
    )}

    {blackShadeError && (
      <div className="BlackShadeError">
        <FiAlertTriangle />
        <span>{blackShadeError}</span>
      </div>
    )}

    <div className="BlackShadeActions">
      <motion.button 
        className="BaseBtn PrimaryBtn"
        type="button" 
        whileTap={{ scale: 0.98 }} 
        onClick={onAddBlackShade}
        disabled={!selectedBlackShade || !blackShadeRate || !selectedZipTypeForBlack}
        whileHover={{ scale: (!selectedBlackShade || !blackShadeRate || !selectedZipTypeForBlack) ? 1 : 1.02 }}
      >
        <FiPlus /> Add Black Shade Zip
      </motion.button>
    </div>
  </div>
);

const RateSection = ({ selectedZipTypeForBlack, selectedBlackShade, blackShadeRate, setBlackShadeRate }) => (
  <div className="RateSection">
    <div className="RateHeader">
      <FiDollarSign />
      <span>Rate for {selectedZipTypeForBlack} - {selectedBlackShade}</span>
      {blackShadeRate && (
        <span className="AutoRateBadge">
          Auto-filled from sheet
        </span>
      )}
    </div>
    <div className="RateInputGroup">
      <span className="CurrencySymbol">₹</span>
      <input
        className="RateInput"
        type="number"
        step="0.01"
        placeholder="0.00"
        value={blackShadeRate}
        onChange={(e) => setBlackShadeRate(e.target.value)}
      />
    </div>
    <div className="RateHint">
      Rate will be auto-filled based on selected zip type
    </div>
  </div>
);

export default BlackShadesSection;