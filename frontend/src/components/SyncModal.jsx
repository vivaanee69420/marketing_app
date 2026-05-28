import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import Button from './Button.jsx';

/**
 * Blocking sync-progress modal. Renders to document.body via portal so the
 * overlay covers everything, including the sidebar. Until isDone or isError
 * the user cannot click anything behind it — no close button, no Esc, no
 * backdrop dismiss. That matches the requirement: "restrict all the other
 * works until the sync is completed".
 *
 * Body scroll is locked while open to prevent scroll-jacking the page below.
 */
const PHASE_LABEL = {
  start:      'Starting…',
  fetching:   'Fetching from provider…',
  fetched:    'Fetch complete — preparing write…',
  writing:    'Writing metrics…',
  finalizing: 'Finalising…',
  done:       'Done',
  error:      'Failed',
  skipped:    'Not connected — skipped',
};

export default function SyncModal({
  open, provider, phase, percent, done, total,
  isRunning, isDone, isError, result, error, onClose,
}) {
  // Lock body scroll while open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  if (!open) return null;

  const providerLabel = provider === 'meta' ? 'Meta'
                       : provider === 'google' ? 'Google Ads'
                       : 'All providers';
  const phaseText = phase ? (PHASE_LABEL[phase] || phase) : 'Starting…';
  const pct = Math.max(0, Math.min(100, Math.round(percent || 0)));
  const writeCounter = phase === 'writing' && total ? ` (${done}/${total})` : '';

  return createPortal(
    <div className="sync-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="sync-modal-title">
      <div className="sync-modal">
        <h3 id="sync-modal-title">Syncing {providerLabel}</h3>
        <p className="subtle">{phaseText}{writeCounter}</p>

        <div className="progress-track" aria-hidden={isError ? 'true' : 'false'}>
          <div
            className={`progress-fill ${isError ? 'is-error' : ''} ${isDone ? 'is-done' : ''}`}
            style={{ width: `${pct}%` }}
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={pct}
          />
        </div>
        <div className="progress-meta">
          <span>{pct}%</span>
          {isRunning && <span className="subtle">please wait — other actions disabled</span>}
        </div>

        {isError && (
          <div className="notice issue" style={{ marginTop: 12 }}>
            {error || 'Sync failed.'}
          </div>
        )}
        {isDone && result?.results && (
          <ul className="list" style={{ marginTop: 12 }}>
            {result.results.map((r) => (
              <li key={`${r.businessId}-${r.provider}`}>
                <strong>{r.provider}:</strong> {r.status}
                {r.records != null ? ` (${r.records} rows)` : ''}
                {r.error ? ` — ${r.error}` : ''}
              </li>
            ))}
          </ul>
        )}

        <div className="row" style={{ justifyContent: 'flex-end', marginTop: 16 }}>
          <Button
            variant="primary"
            disabled={isRunning}
            onClick={onClose}
          >
            {isRunning ? 'Working…' : 'Close'}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
