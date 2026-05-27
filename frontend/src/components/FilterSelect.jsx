// Compact inline filter dropdown (36px). options: string[] or [{value,label}].
export default function FilterSelect({ options = [], ...rest }) {
  return (
    <select className="filter-select" {...rest}>
      {options.map((o) => {
        const value = typeof o === 'object' ? o.value : o;
        const text = typeof o === 'object' ? o.label : o;
        return <option key={value} value={value}>{text}</option>;
      })}
    </select>
  );
}
