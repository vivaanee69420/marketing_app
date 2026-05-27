// Status pill. tone: 'ok' | 'warn' | 'err'. Defaults label per tone if none given.
const DEFAULT_LABEL = { ok: 'OK', warn: 'Warning', err: 'Error' };

export default function Pill({ tone = 'ok', children }) {
  return <span className={`pill ${tone}`}>{children ?? DEFAULT_LABEL[tone]}</span>;
}
