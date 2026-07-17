import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
} from 'recharts'
import { formatCurrency, formatDate } from '../../utils/format.js'
import { useLang } from '../../i18n/LanguageContext.jsx'

const AXIS = '#9aa3b2'
const TOOLTIP_STYLE = {
  background: '#20242d',
  border: '1px solid #2a2f3a',
  borderRadius: 8,
  color: '#e6e9ef',
}

// Realized equity curve: cumulative net P&L by close day, starting from 0.
// Closed trades only — the subtitle carries the mandatory "no floating P&L"
// wording; this is NOT an account-value chart and must never be labeled one.
export default function EquityCurveChart({ curve }) {
  const { t } = useLang()

  return (
    <div className="rp-chart-card rp-chart-full">
      <h3 className="rp-chart-title">{t('reports.curveTitle')}</h3>
      <p className="rp-chart-sub">{t('reports.curveSub')}</p>
      {curve.length === 0 ? (
        <div className="rp-chart-empty">{t('reports.curveEmpty')}</div>
      ) : (
        <div className="rp-chart-area">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={curve} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
              <CartesianGrid stroke="#2a2f3a" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fill: AXIS, fontSize: 12 }}
                axisLine={{ stroke: '#2a2f3a' }}
                tickLine={false}
                tickFormatter={(d) => d.slice(5)}
              />
              <YAxis
                tick={{ fill: AXIS, fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => formatCurrency(v)}
                width={80}
              />
              <ReferenceLine y={0} stroke="#2a2f3a" strokeDasharray="4 4" />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                labelFormatter={(d) => formatDate(d)}
                formatter={(value) => [formatCurrency(value), t('reports.cumLabel')]}
              />
              <Line
                type="monotone"
                dataKey="cum"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={curve.length <= 40}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
