// One header for every signed-in page: a lime [LABEL], the title, an optional one-line subtitle and an optional action.
export default function PageHeader({ label, title, subtitle, action }: { label: string; title: React.ReactNode; subtitle?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <header className="page-head">
      <div className="page-head-main">
        <div className="page-label">[{label}]</div>
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="page-sub">{subtitle}</p>}
      </div>
      {action && <div className="page-action">{action}</div>}
    </header>
  )
}
