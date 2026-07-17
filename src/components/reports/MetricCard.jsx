// A single headline metric. `tone` colors the value (pos/neg/neutral);
// `title` adds a native hover tooltip (e.g. profit factor with no losses).
export default function MetricCard({ label, value, sub, tone = 'neutral', title }) {
  return (
    <div className="metric-card" title={title}>
      <span className="metric-label">{label}</span>
      <span className={`metric-value metric-${tone}`}>{value}</span>
      {sub && <span className="metric-sub">{sub}</span>}
    </div>
  )
}
