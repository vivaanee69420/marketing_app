export default function Button({ variant = 'secondary', className = '', children, ...rest }) {
  const v = variant === 'primary' ? ' primary' : '';
  return (
    <button type="button" className={`btn${v} ${className}`} {...rest}>
      {children}
    </button>
  );
}
