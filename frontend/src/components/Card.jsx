export function Card({ className = '', flush = false, children, ...rest }) {
  return (
    <div className={`card${flush ? ' flush' : ''} ${className}`} {...rest}>
      {children}
    </div>
  );
}

export function SoftCard({ className = '', children, ...rest }) {
  return (
    <div className={`soft-card ${className}`} {...rest}>
      {children}
    </div>
  );
}
