import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiShoppingCart, 
  FiFilter, 
  FiChevronUp, 
  FiChevronDown, 
  FiTrash2, 
  FiPackage,
  FiLayers,
  FiCheck,
  FiPlus,
  FiMinus,
  FiSearch,
  FiX
} from 'react-icons/fi';
import { includes } from './helpers';

const ZipSelectionSection = ({
  zipOptions,
  selectedZips,
  setSelectedZips,
  zipSearchTerm,
  setZipSearchTerm,
  selectedZipType,
  setSelectedZipType,
  showZipFilters,
  setShowZipFilters
}) => {
  const zipTypes = useMemo(() => {
    const types = [...new Set(zipOptions.map(zip => zip.zipType))];
    return ['all', ...types];
  }, [zipOptions]);

  const filteredZipOptions = useMemo(() => {
    let filtered = zipOptions.filter(zip => 
      !zip.color.toLowerCase().includes('black')
    );

    if (selectedZipType !== 'all') {
      filtered = filtered.filter(zip => zip.zipType === selectedZipType);
    }

    if (zipSearchTerm) {
      filtered = filtered.filter(zip => 
        zip.zipType.toLowerCase().includes(zipSearchTerm.toLowerCase()) ||
        zip.size.toLowerCase().includes(zipSearchTerm.toLowerCase()) ||
        zip.color.toLowerCase().includes(zipSearchTerm.toLowerCase())
      );
    }

    return filtered;
  }, [zipOptions, selectedZipType, zipSearchTerm]);

  const groupedZipOptions = useMemo(() => {
    const groups = {};
    filteredZipOptions.forEach(zip => {
      if (!groups[zip.zipType]) {
        groups[zip.zipType] = [];
      }
      groups[zip.zipType].push(zip);
    });
    return groups;
  }, [filteredZipOptions]);

  const calculateZipTotal = () => {
    return selectedZips.reduce((total, zip) => {
      const zipTotal = zip.price * zip.quantity * zip.pieces;
      return total + zipTotal;
    }, 0);
  };

  const handleZipSelect = (zip) => {
    setSelectedZips(prev => {
      const exists = prev.find(z => z.id === zip.id);
      if (exists) {
        return prev.filter(z => z.id !== zip.id);
      } else {
        return [...prev, { ...zip, quantity: 1, pieces: 1 }];
      }
    });
  };

  const updateZipQuantity = (zipId, quantity) => {
    setSelectedZips(prev => 
      prev.map(zip => 
        zip.id === zipId ? { ...zip, quantity: Math.max(1, quantity) } : zip
      )
    );
  };

  const updateZipPieces = (zipId, pieces) => {
    setSelectedZips(prev => 
      prev.map(zip => 
        zip.id === zipId ? { ...zip, pieces: Math.max(1, pieces) } : zip
      )
    );
  };

  const removeZip = (zipId) => {
    setSelectedZips(prev => prev.filter(zip => zip.id !== zipId));
  };

  const clearAllZips = () => {
    setSelectedZips([]);
  };

  return (
    <div className="ZipSelectionSection">
      <SectionHeader
        selectedZips={selectedZips}
        totalAmount={calculateZipTotal()}
        showZipFilters={showZipFilters}
        setShowZipFilters={setShowZipFilters}
        onClearAll={clearAllZips}
      />

      <ZipFilters
        showZipFilters={showZipFilters}
        selectedZipType={selectedZipType}
        setSelectedZipType={setSelectedZipType}
        zipTypes={zipTypes}
      />

      <ZipSearchAndSelection
        zipSearchTerm={zipSearchTerm}
        setZipSearchTerm={setZipSearchTerm}
        groupedZipOptions={groupedZipOptions}
        filteredZipOptions={filteredZipOptions}
        selectedZips={selectedZips}
        onZipSelect={handleZipSelect}
      />

      <SelectedZipsList
        selectedZips={selectedZips}
        totalAmount={calculateZipTotal()}
        onUpdateQuantity={updateZipQuantity}
        onUpdatePieces={updateZipPieces}
        onRemoveZip={removeZip}
      />
    </div>
  );
};

const SectionHeader = ({ selectedZips, totalAmount, showZipFilters, setShowZipFilters, onClearAll }) => (
  <div className="ZipSectionHeader">
    <div>
      <h4><FiShoppingCart /> Zip Selection</h4>
      <div className="ZipStats">
        {selectedZips.length} zips selected • Total: ₹{totalAmount.toFixed(2)}
      </div>
    </div>
    <div className="ZipActions">
      <motion.button 
        className="ZipActionBtn"
        onClick={() => setShowZipFilters(!showZipFilters)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <FiFilter /> Filters {showZipFilters ? <FiChevronUp /> : <FiChevronDown />}
      </motion.button>
      {selectedZips.length > 0 && (
        <motion.button 
          className="ZipActionBtn variant-danger"
          onClick={onClearAll}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <FiTrash2 /> Clear All
        </motion.button>
      )}
    </div>
  </div>
);

const ZipFilters = ({ showZipFilters, selectedZipType, setSelectedZipType, zipTypes }) => (
  <AnimatePresence>
    {showZipFilters && (
      <motion.div
        className="ZipFilters"
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
      >
        <div className="FilterGroup">
          <div className="FilterLabel">Zip Type:</div>
          <select 
            className="FilterSelect"
            value={selectedZipType} 
            onChange={(e) => setSelectedZipType(e.target.value)}
          >
            {zipTypes.map(type => (
              <option key={type} value={type}>
                {type === 'all' ? 'All Types' : type}
              </option>
            ))}
          </select>
        </div>
      </motion.div>
    )}
  </AnimatePresence>
);

const ZipSearchAndSelection = ({
  zipSearchTerm,
  setZipSearchTerm,
  groupedZipOptions,
  filteredZipOptions,
  selectedZips,
  onZipSelect
}) => (
  <div className="ZipSearchSection">
    <div className="SearchBox" style={{ marginBottom: '16px' }}>
      <FiSearch />
      <input
        placeholder="Search zips by type, size, or color..."
        value={zipSearchTerm}
        onChange={(e) => setZipSearchTerm(e.target.value)}
      />
    </div>

    <div className="ZipSelectionGrid">
      {Object.entries(groupedZipOptions).map(([zipType, zips]) => (
        <div className="ZipTypeSection" key={zipType}>
          <div className="ZipTypeHeader">
            <div className="ZipTypeTitle">
              <FiLayers />
              <span>{zipType}</span>
            </div>
            <div className="ZipTypeCount">{zips.length} options</div>
          </div>
          <div className="ZipOptionsGrid">
            {zips.map(zip => (
              <motion.div 
                className={`ZipOptionCard ${selectedZips.some(z => z.id === zip.id) ? 'selected' : ''}`}
                key={zip.id}
                onClick={() => onZipSelect(zip)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="ZipOptionHeader">
                  <div className="ZipSizeBadge">{zip.size}</div>
                  <div className="ZipPriceTag">₹{zip.price.toFixed(2)}</div>
                </div>
                <div className="ZipColor">{zip.color}</div>
                <div className={`SelectionIndicator ${selectedZips.some(z => z.id === zip.id) ? 'selected' : ''}`}>
                  {selectedZips.some(z => z.id === zip.id) ? <FiCheck /> : <FiPlus />}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      ))}
      {filteredZipOptions.length === 0 && (
        <div className="EmptyZipSearch">
          <FiPackage size={32} />
          <p>No zips found</p>
          <span>Try adjusting your search or filters</span>
        </div>
      )}
    </div>
  </div>
);

const SelectedZipsList = ({ selectedZips, totalAmount, onUpdateQuantity, onUpdatePieces, onRemoveZip }) => {
  if (selectedZips.length === 0) {
    return (
      <div className="EmptyZipState">
        <FiPackage size={48} />
        <p>No zips selected yet</p>
        <span>Browse available zips or add black shades to get started</span>
      </div>
    );
  }

  return (
    <div className="SelectedZipsList">
      <div className="SelectedHeader">
        <h5>Selected Zips ({selectedZips.length})</h5>
        <div className="TotalPreview">Total: ₹{totalAmount.toFixed(2)}</div>
      </div>
      
      {selectedZips.map(zip => (
        <ZipCard
          key={zip.id}
          zip={zip}
          onUpdateQuantity={onUpdateQuantity}
          onUpdatePieces={onUpdatePieces}
          onRemoveZip={onRemoveZip}
        />
      ))}
      
      <div className="ZipTotalCard">
        <div className="TotalLabel">Total Amount</div>
        <div className="TotalAmount">₹{totalAmount.toFixed(2)}</div>
      </div>
    </div>
  );
};

const ZipCard = ({ zip, onUpdateQuantity, onUpdatePieces, onRemoveZip }) => (
  <div className="ZipCard">
    <div className="ZipInfo">
      <div className="ZipType">{zip.zipType}</div>
      <div className="ZipDetails">
        <span>Size: {zip.size}</span>
        <span>Color: {zip.color}</span>
        {zip.isCustom && <span className="CustomBadge">Custom</span>}
      </div>
    </div>
    
    <div className="ZipControls">
      <QuantityControl
        label="Quantity"
        value={zip.quantity}
        onDecrease={() => onUpdateQuantity(zip.id, zip.quantity - 1)}
        onIncrease={() => onUpdateQuantity(zip.id, zip.quantity + 1)}
        onChange={(value) => onUpdateQuantity(zip.id, parseInt(value))}
        min={1}
      />
      
      <QuantityControl
        label="Pieces"
        value={zip.pieces}
        onDecrease={() => onUpdatePieces(zip.id, zip.pieces - 1)}
        onIncrease={() => onUpdatePieces(zip.id, zip.pieces + 1)}
        onChange={(value) => onUpdatePieces(zip.id, parseInt(value))}
        min={1}
      />
      
      <div className="ZipPrice">
        ₹{(zip.price * zip.quantity * zip.pieces).toFixed(2)}
        <button className="RemoveZipBtn" onClick={() => onRemoveZip(zip.id)}>
          <FiTrash2 />
        </button>
      </div>
    </div>
  </div>
);

const QuantityControl = ({ label, value, onDecrease, onIncrease, onChange, min }) => (
  <div className="ControlGroup">
    <div className="ControlLabel">{label}:</div>
    <div className="QuantityControl">
      <button 
        className="QtyBtn"
        onClick={onDecrease}
        disabled={value <= min}
      >
        <FiMinus />
      </button>
      <input 
        className="QtyInput"
        type="number" 
        value={value}
        onChange={(e) => onChange(e.target.value)}
        min={min}
      />
      <button className="QtyBtn" onClick={onIncrease}>
        <FiPlus />
      </button>
    </div>
  </div>
);

export default ZipSelectionSection;