// Banner. tone: 'good' | 'warn' (default) | 'issue'.
export default function Notice({ tone = 'warn', children }) {
  const cls = tone === 'good' ? ' good' : tone === 'issue' ? ' issue' : '';
  return <div className={`notice${cls}`}>{children}</div>;
}
