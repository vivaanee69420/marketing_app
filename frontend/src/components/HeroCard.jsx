import { Card } from './Card.jsx';
import Icon from './Icon.jsx';

// Highest-ROI business hero. stats: [{ label, value }].
export default function HeroCard({ title = 'Highest-ROI business', business, stats = [] }) {
  return (
    <Card>
      <div className="hero">
        <div className="hero-left">
          <div className="kpi-icon"><Icon name="Star" size={20} /></div>
          <div>
            <div className="hero-title">{title}</div>
            <div className="hero-main">{business}</div>
            <div className="hero-sub">Top performer this period</div>
          </div>
        </div>
        <div className="hero-stats">
          {stats.map((s) => (
            <div className="hero-stat" key={s.label}>
              <div className="label">{s.label}</div>
              <div className="value">{s.value}</div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
