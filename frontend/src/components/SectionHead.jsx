export default function SectionHead({ title, description, actions }) {
  return (
    <div className="section-head">
      <div>
        <h3>{title}</h3>
        {description && <p>{description}</p>}
      </div>
      {actions && <div className="row">{actions}</div>}
    </div>
  );
}
