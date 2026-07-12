// A single headline metric. `tone` colors the value (pos/neg/neutral).
export default function MetricCard({ label, value, sub, tone = 'neutral' }) {
  return (
    <div className="metric-card">
      <span className="metric-label">{label}</span>
      <span className={`metric-value metric-${tone}`}>{value}</span>
      {sub && <span className="metric-sub">{sub}</span>}
    </div>
  )
}
