// Generic table. columns: [{ key, header, render?(row), className? }]. rows: array.
// rowKey: field name or fn. Wrapped in .table-wrap for overflow.
export default function DataTable({ columns, rows, rowKey = 'id', empty = 'No rows.' }) {
  const keyOf = typeof rowKey === 'function' ? rowKey : (r, i) => r[rowKey] ?? i;

  if (!rows || rows.length === 0) {
    return <div className="empty-state">{empty}</div>;
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} className={c.className}>{c.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={keyOf(row, i)}>
              {columns.map((c) => (
                <td key={c.key} className={c.className}>
                  {c.render ? c.render(row) : row[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
