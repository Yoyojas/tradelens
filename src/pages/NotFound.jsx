import { Link } from 'react-router-dom'
import { useLang } from '../i18n/LanguageContext.jsx'

export default function NotFound() {
  const { t } = useLang()
  return (
    <section className="page">
      <h1 className="page-title">{t('notFound.title')}</h1>
      <p className="page-subtitle">
        {t('notFound.body')} <Link to="/library">{t('notFound.back')}</Link>.
      </p>
    </section>
  )
}
