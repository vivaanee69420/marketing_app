export default function PageHeader({ title, description, actions }) {
  return (
    <header className="page-header">
      <div>
        <h2>{title}</h2>
        {description && <p className="desc">{description}</p>}
      </div>
      {actions && <div className="header-actions">{actions}</div>}
    </header>
  );
}
