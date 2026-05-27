import KpiCard from './KpiCard.jsx';

// metrics: [{ label, value, kind, note, icon }]. cols: 2..6.
export default function KpiGrid({ metrics, cols = 4 }) {
  return (
    <div className={`grid cols-${cols}`}>
      {metrics.map((m) => (
        <KpiCard key={m.label} {...m} />
      ))}
    </div>
  );
}
