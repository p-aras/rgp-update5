import React, { useMemo } from 'react';
import { FiGrid } from 'react-icons/fi';

const CuttingMatrixTable = ({ matrix }) => {
  const columns = useMemo(
    () => (matrix ? ['Color', 'Cutting Table', ...matrix.sizes, 'Total Pcs'] : []),
    [matrix]
  );

  return (
    <div className="TablePanel">
      <div className="PanelHeader">
        <FiGrid />
        <h3>Cutting Matrix</h3>
      </div>
      
      <div className="TableContainer">
        <table className="Table">
          <thead>
            <tr>
              {columns.map((c, i) => (
                <th key={`${c || 'blank'}-${i}`}>{c || '\u00A0'}</th>
              ))}
            </tr>
          </thead>
          
          <tbody>
            {matrix.rows.map((row, idx) => (
              <TableRow key={idx} row={row} sizes={matrix.sizes} />
            ))}
          </tbody>
          
          <tfoot>
            <TableFooter matrix={matrix} sizes={matrix.sizes} />
          </tfoot>
        </table>
      </div>
    </div>
  );
};

const TableRow = ({ row, sizes }) => (
  <tr>
    <td>{row.color}</td>
    <td className="num">{row.cuttingTable ?? ''}</td>
    {sizes.map((size) => (
      <td key={size} className="num">
        {row.sizes?.[size] ?? ''}
      </td>
    ))}
    <td className="num strong">{row.totalPcs ?? ''}</td>
  </tr>
);

const TableFooter = ({ matrix, sizes }) => (
  <tr>
    <td className="strong">Total</td>
    <td className="num">—</td>
    {sizes.map((size) => (
      <td key={size} className="num strong">
        {matrix.totals.perSize?.[size] ?? 0}
      </td>
    ))}
    <td className="num strong">{matrix.totals.grand}</td>
  </tr>
);

export default CuttingMatrixTable;