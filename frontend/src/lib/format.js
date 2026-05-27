// Formatting helpers. Money = GBP, dates = en-GB dd MMM yyyy.

const gbp0 = new Intl.NumberFormat('en-GB', {
  style: 'currency', currency: 'GBP', maximumFractionDigits: 0,
});
const gbp2 = new Intl.NumberFormat('en-GB', {
  style: 'currency', currency: 'GBP', maximumFractionDigits: 2,
});
const num = new Intl.NumberFormat('en-GB');

export const currency = (v) => gbp0.format(v ?? 0);
export const currency2 = (v) => gbp2.format(v ?? 0);
export const number = (v) => num.format(v ?? 0);
export const percent = (v, dp = 0) => `${(v ?? 0).toFixed(dp)}%`;

export function formatDate(value) {
  if (!value) return '—';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  }).format(d);
}

// ROI math — guarded for divide-by-zero.
export const roas = (rev, spend) => (spend > 0 ? rev / spend : 0);
export const roiPct = (rev, spend) => (spend > 0 ? ((rev - spend) / spend) * 100 : 0);
export const cpc = (spend, conv) => (conv > 0 ? spend / conv : 0);
