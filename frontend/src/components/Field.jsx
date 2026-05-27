// Labeled form fields. All uncontrolled-friendly; pass value/onChange to control.

export function InputField({ label, type = 'text', ...rest }) {
  return (
    <label className="field">
      {label && <span>{label}</span>}
      <input type={type} {...rest} />
    </label>
  );
}

export function TextAreaField({ label, ...rest }) {
  return (
    <label className="field">
      {label && <span>{label}</span>}
      <textarea {...rest} />
    </label>
  );
}

// options: ['A','B'] or [{ value, label }].
export function SelectField({ label, options = [], ...rest }) {
  return (
    <label className="field">
      {label && <span>{label}</span>}
      <select {...rest}>
        {options.map((o) => {
          const value = typeof o === 'object' ? o.value : o;
          const text = typeof o === 'object' ? o.label : o;
          return <option key={value} value={value}>{text}</option>;
        })}
      </select>
    </label>
  );
}
