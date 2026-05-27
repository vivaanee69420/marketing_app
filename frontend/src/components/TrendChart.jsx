// Hand-rolled inline SVG line chart (no charting lib, per DESIGN.md).
// data: [{ month, spend, revenue }]. Two polylines, each normalised to its own
// range so both trends are legible despite different magnitudes.

const W = 640;
const H = 260;
const PAD = { top: 20, right: 20, bottom: 28, left: 20 };
const GRID_LINES = 4;

function buildSeries(data, key) {
  const vals = data.map((d) => d[key]);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const span = max - min || 1;
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const step = data.length > 1 ? plotW / (data.length - 1) : 0;
  return data.map((d, i) => ({
    x: PAD.left + i * step,
    y: PAD.top + plotH - ((d[key] - min) / span) * plotH,
  }));
}

const DEFAULT_SERIES = [
  { key: 'spend', label: 'Spend', color: 'var(--gold)' },
  { key: 'revenue', label: 'Revenue', color: '#b7a77a' },
];

// data: [{ month, ...metrics }]. series: [{ key, label, color }] (each normalised
// to its own range). Defaults to spend + revenue.
export default function TrendChart({ data, series = DEFAULT_SERIES }) {
  const plotH = H - PAD.top - PAD.bottom;
  const toLine = (pts) => pts.map((p) => `${p.x},${p.y}`).join(' ');
  const computed = series.map((s) => ({ ...s, points: buildSeries(data, s.key) }));

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img"
           aria-label="Metric trend by month" style={{ display: 'block' }}>
        {Array.from({ length: GRID_LINES + 1 }).map((_, i) => {
          const y = PAD.top + (plotH / GRID_LINES) * i;
          return <line key={i} x1={PAD.left} x2={W - PAD.right} y1={y} y2={y}
                       stroke="var(--line)" strokeWidth="1" />;
        })}

        {computed.map((s) => (
          <g key={s.key}>
            <polyline fill="none" stroke={s.color} strokeWidth="2.5" points={toLine(s.points)} />
            {s.points.map((p, i) => (
              <circle key={`${s.key}${i}`} cx={p.x} cy={p.y} r="3" fill={s.color} />
            ))}
          </g>
        ))}

        {data.map((d, i) => (
          <text key={d.month} x={(computed[0]?.points[i]?.x) ?? PAD.left} y={H - 8}
                textAnchor="middle" fontSize="12" fill="var(--muted)">{d.month}</text>
        ))}
      </svg>

      <div className="row" style={{ marginTop: 8, gap: 16 }}>
        {series.map((s) => (
          <span key={s.key} className="subtle" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 14, height: 3, background: s.color, display: 'inline-block', borderRadius: 2 }} /> {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}
