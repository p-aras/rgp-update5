import React, { useState, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import { FiSearch, FiRefreshCw, FiArrowLeft, FiScissors, FiGrid, FiAlertTriangle, FiInfo, FiPackage, FiTag, FiDownload } from 'react-icons/fi';
import { fetchLotMatrixViaSheetsApi } from './sheetsApi';
import { norm } from './helpers';

const CuttingMatrixStep = ({ lotInput, setLotInput, onComplete, onReset }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [matrix, setMatrix] = useState(null);
  const abortRef = useRef(null);

  const canSearch = useMemo(() => norm(lotInput).length > 0 && !loading, [lotInput, loading]);

  const handleSearch = async (e) => {
    e?.preventDefault?.();
    if (!canSearch) return;

    setError('');
    setMatrix(null);
    setLoading(true);

    abortRef.current?.abort?.();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      const data = await fetchLotMatrixViaSheetsApi(norm(lotInput), ctrl.signal);
      setMatrix(data);
    } catch (err) {
      setError(err?.message || "Failed to fetch data.");
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setLotInput('');
    setMatrix(null);
    setError('');
    abortRef.current?.abort?.();
  };

  const handleContinue = () => {
    if (!matrix) return;
    onComplete({ matrix });
  };

  const displaySizes = useMemo(() => {
    if (!matrix) return [];
    return matrix.sizes || [];
  }, [matrix]);

  const columns = useMemo(
    () => (matrix ? ['Color', 'Cutting Table', ...displaySizes, 'Total Pcs'] : []),
    [matrix, displaySizes]
  );

  return (
    <div className="StepContainer">
      <div className="StepHeader">
        <div className="StepIcon">
          <FiScissors />
        </div>
        <div className="StepHeaderContent">
          <h2>Step 1: Search Lot & View Cutting Matrix</h2>
          <p>Enter the Lot Number to view the cutting matrix and verify the data</p>
        </div>
      </div>

      {/* Search Section */}
      <div className="SearchSectionCard">
        <form className="Form" onSubmit={handleSearch}>
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
              onClick={onReset}
              whileTap={{ scale: 0.98 }}
            >
              <FiRefreshCw /> Reset All
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
              onClick={handleClear} 
              whileTap={{ scale: 0.98 }}
            >
              <FiRefreshCw /> Clear
            </motion.button>
          </div>
        </form>

        {error && (
          <div className="ErrorCard">
            <FiAlertTriangle />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Matrix Display */}
      {matrix && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="ContentGrid">
            <div className="InfoPanel">
              <div className="PanelHeader"><FiInfo /><h3>Lot Information</h3></div>
              <div className="InfoGrid">
                <div className="InfoItem">
                  <div className="InfoIcon"><FiPackage /></div>
                  <div><div className="InfoLabel">Lot Number</div><div className="InfoValue">{matrix.lotNumber || '—'}</div></div>
                </div>
                <div className="InfoItem">
                  <div className="InfoIcon"><FiTag /></div>
                  <div><div className="InfoLabel">Style</div><div className="InfoValue">{matrix.style || '—'}</div></div>
                </div>
                <div className="InfoItem">
                  <div className="InfoIcon"><FiGrid /></div>
                  <div><div className="InfoLabel">Fabric</div><div className="InfoValue">{matrix.fabric || '—'}</div></div>
                </div>
                <div className="InfoItem">
                  <div className="InfoIcon"><FiTag /></div>
                  <div><div className="InfoLabel">Garment Type</div><div className="InfoValue">{matrix.garmentType || '—'}</div></div>
                </div>
              </div>
              <div className="SummaryCard">
                <div className="SummaryItem"><div className="SummaryLabel">Total Pieces</div><div className="SummaryValue">{matrix.totals.grand}</div></div>
                <div className="SummaryItem"><div className="SummaryLabel">Colors</div><div className="SummaryValue">{matrix.rows.length}</div></div>
                <div className="SummaryItem"><div className="SummaryLabel">Sizes</div><div className="SummaryValue">{matrix.sizes.length}</div></div>
              </div>

              <div className="ActionsRow">
                <motion.button
                  className="BaseBtn PrimaryBtn LargeBtn"
                  onClick={handleContinue}
                  whileTap={{ scale: 0.98 }}
                  whileHover={{ scale: 1.02 }}
                >
                  Continue to Black Shades <FiArrowLeft style={{ transform: 'rotate(180deg)' }} />
                </motion.button>
              </div>
            </div>

            <div className="TablePanel">
              <div className="PanelHeader"><FiGrid /><h3>Cutting Matrix</h3></div>
              <div className="TableContainer">
                <table className="Table">
                  <thead>
                    <tr>{columns.map((c, i) => <th key={`${c || 'blank'}-${i}`}>{c || '\u00A0'}</th>)}</tr>
                  </thead>
                  <tbody>
                    {matrix.rows.map((r, idx) => (
                      <tr key={idx}>
                        <td>{r.color}</td>
                        <td className="num">{r.cuttingTable ?? ''}</td>
                        {matrix.sizes.map((s) => (
                          <td key={s} className="num">{r.sizes?.[s] ?? ''}</td>
                        ))}
                        <td className="num strong">{r.totalPcs ?? ''}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td className="strong">Total</td>
                      <td className="num">—</td>
                      {matrix.sizes.map((s) => (
                        <td key={s} className="num strong">{matrix.totals.perSize?.[s] ?? 0}</td>
                      ))}
                      <td className="num strong">{matrix.totals.grand}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {!matrix && !loading && !error && (
        <div className="HintCard">
          <FiInfo />
          <span>
            💡 Tip: If your spreadsheet has one tab per lot, name them like <code>Cutting Matrix — Lot 64003</code> or <code>Cutting Matrix - Lot 64003</code>. This component will find them automatically.
          </span>
        </div>
      )}

      <style jsx>{`
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
        
        .SearchSectionCard {
          background: white;
          border-radius: 20px;
          padding: 28px;
          margin-bottom: 24px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
          border: 1px solid #f1f5f9;
        }
        
        .LargeBtn {
          padding: 16px 32px;
          font-size: 1.1rem;
        }
      `}</style>
    </div>
  );
};

export default CuttingMatrixStep;