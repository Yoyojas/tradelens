import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
} from 'recharts'
import { formatCurrency } from '../../utils/format.js'
import { useLang } from '../../i18n/LanguageContext.jsx'

const AXIS = '#9aa3b2'
const TOOLTIP_STYLE = {
  background: '#20242d',
  border: '1px solid #2a2f3a',
  borderRadius: 8,
  color: '#e6e9ef',
}
// Same pos/neg convention as the metric cards (--color-success / --color-danger).
const POS = '#22c55e'
const NEG = '#ef4444'
const ZERO = '#64748b'

// Net realized P&L per closing month (YYYY-MM), closed trades only.
export default function MonthlyPnlChart({ months }) {
  const { t } = useLang()

  return (
    <div className="rp-chart-card">
      <h3 className="rp-chart-title">{t('reports.monthlyTitle')}</h3>
      <p className="rp-chart-sub">{t('reports.monthlySub')}</p>
      {months.length === 0 ? (
        <div className="rp-chart-empty">{t('reports.closedEmpty')}</div>
      ) : (
        <div className="rp-chart-area">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={months} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
              <CartesianGrid stroke="#2a2f3a" vertical={false} />
              <XAxis
                dataKey="month"
                tick={{ fill: AXIS, fontSize: 12 }}
                axisLine={{ stroke: '#2a2f3a' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: AXIS, fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => formatCurrency(v)}
                width={80}
              />
              <ReferenceLine y={0} stroke="#2a2f3a" />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                formatter={(value) => [formatCurrency(value), t('reports.colNet')]}
              />
              <Bar dataKey="pnl" radius={[4, 4, 0, 0]} maxBarSize={64}>
                {months.map((m) => (
                  <Cell
                    key={m.month}
                    fill={m.pnl > 0 ? POS : m.pnl < 0 ? NEG : ZERO}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
