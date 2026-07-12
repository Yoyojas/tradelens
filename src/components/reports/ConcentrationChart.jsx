import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { formatCurrency, formatPercent } from '../../utils/format.js'
import { useLang } from '../../i18n/LanguageContext.jsx'

const COLORS = [
  '#3b82f6', '#22c55e', '#f59e0b', '#ec4899', '#8b5cf6',
  '#06b6d4', '#f97316', '#64748b',
]
const TOOLTIP_STYLE = {
  background: '#20242d',
  border: '1px solid #2a2f3a',
  borderRadius: 8,
  color: '#e6e9ef',
}

// Position concentration by ticker (cost basis). Top 7 shown, rest -> "Others".
export default function ConcentrationChart({ concentration }) {
  const { t } = useLang()
  const TOP = 7
  let data = concentration.map((c) => ({
    name: c.ticker,
    value: c.costBasis,
    pct: c.pct,
  }))
  if (data.length > TOP) {
    const head = data.slice(0, TOP)
    const tail = data.slice(TOP)
    head.push({
      name: t('reports.others'),
      value: tail.reduce((s, d) => s + d.value, 0),
      pct: tail.reduce((s, d) => s + d.pct, 0),
    })
    data = head
  }

  return (
    <div className="rp-chart-card">
      <h3 className="rp-chart-title">{t('reports.concentrationTitle')}</h3>
      <p className="rp-chart-sub">{t('reports.concentrationSub')}</p>
      {data.length === 0 ? (
        <div className="rp-chart-empty">{t('reports.concentrationEmpty')}</div>
      ) : (
        <div className="rp-chart-area">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={85}
                paddingAngle={2}
              >
                {data.map((d, i) => (
                  <Cell key={d.name} fill={COLORS[i % COLORS.length]} stroke="none" />
                ))}
              </Pie>
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                formatter={(value, name, item) => [
                  `${formatCurrency(value)} (${formatPercent(item.payload.pct)})`,
                  name,
                ]}
              />
              <Legend
                verticalAlign="middle"
                align="right"
                layout="vertical"
                iconType="circle"
                wrapperStyle={{ fontSize: 12, color: '#9aa3b2' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
