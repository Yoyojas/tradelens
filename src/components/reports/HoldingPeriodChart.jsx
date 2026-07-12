import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import { useLang } from '../../i18n/LanguageContext.jsx'

const AXIS = '#9aa3b2'
const TOOLTIP_STYLE = {
  background: '#20242d',
  border: '1px solid #2a2f3a',
  borderRadius: 8,
  color: '#e6e9ef',
}

// Histogram of holding periods (closed trades only) across day buckets.
export default function HoldingPeriodChart({ buckets }) {
  const { t } = useLang()
  const total = buckets.reduce((s, b) => s + b.count, 0)

  return (
    <div className="rp-chart-card">
      <h3 className="rp-chart-title">{t('reports.holdingTitle')}</h3>
      <p className="rp-chart-sub">{t('reports.holdingSub')}</p>
      {total === 0 ? (
        <div className="rp-chart-empty">{t('reports.holdingEmpty')}</div>
      ) : (
        <div className="rp-chart-area">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={buckets} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
              <CartesianGrid stroke="#2a2f3a" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: AXIS, fontSize: 12 }} axisLine={{ stroke: '#2a2f3a' }} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fill: AXIS, fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                formatter={(v) => [
                  t('reports.holdingTooltip', { n: v }),
                  t('reports.holdingCountLabel'),
                ]}
              />
              <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={64} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
