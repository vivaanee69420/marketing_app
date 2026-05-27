import { Card } from './Card.jsx';
import Icon from './Icon.jsx';
import { currency, number } from '../lib/format.js';

function display(value, kind) {
  if (kind === 'currency') return currency(value);
  if (kind === 'number') return number(value);
  return value; // 'text' or pre-formatted
}

export default function KpiCard({ label, value, kind = 'text', note, icon }) {
  return (
    <Card>
      <div className="kpi">
        <div>
          <div className="kpi-label">{label}</div>
          <div className="kpi-value">{display(value, kind)}</div>
          {note && <div className="kpi-note">{note}</div>}
        </div>
        {icon && <div className="kpi-icon"><Icon name={icon} size={20} /></div>}
      </div>
    </Card>
  );
}
