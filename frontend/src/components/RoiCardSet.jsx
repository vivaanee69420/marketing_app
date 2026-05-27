import KpiGrid from './KpiGrid.jsx';
import { roas, roiPct } from '../lib/format.js';

// Spend / Revenue / ROAS / ROI from raw spend + revenue.
export default function RoiCardSet({ spend, revenue }) {
  const metrics = [
    { label: 'Spend', value: spend, kind: 'currency', note: 'Meta + Google', icon: 'PoundSterling' },
    { label: 'Revenue', value: revenue, kind: 'currency', note: 'Attributed', icon: 'TrendingUp' },
    { label: 'ROAS', value: `${roas(revenue, spend).toFixed(2)}×`, note: 'Revenue / spend', icon: 'Target' },
    { label: 'ROI', value: `${roiPct(revenue, spend).toFixed(0)}%`, note: '(rev − spend) / spend', icon: 'Percent' },
  ];
  return <KpiGrid metrics={metrics} cols={4} />;
}
