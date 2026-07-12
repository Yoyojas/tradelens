import { useLang } from '../../i18n/LanguageContext.jsx'

// Color-coded risk pill. Low=green, Medium=amber, High=red.
export default function RiskBadge({ level }) {
  const { t } = useLang()
  const cls = `risk-badge risk-${(level || '').toLowerCase()}`
  const label = t('risk.badge', { level: t(`risk.${(level || '').toLowerCase()}`) })
  return <span className={cls}>{label}</span>
}
