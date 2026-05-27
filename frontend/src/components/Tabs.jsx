import { useState } from 'react';

// tabs: [{ value, label }]. Controlled or uncontrolled.
export default function Tabs({ tabs, value, onChange, defaultValue }) {
  const [internal, setInternal] = useState(defaultValue ?? tabs[0]?.value);
  const active = value ?? internal;
  const set = (v) => { setInternal(v); onChange?.(v); };

  return (
    <div className="tabs" role="tablist">
      {tabs.map((t) => (
        <button
          key={t.value}
          role="tab"
          aria-selected={active === t.value}
          className={`tab${active === t.value ? ' active' : ''}`}
          onClick={() => set(t.value)}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
