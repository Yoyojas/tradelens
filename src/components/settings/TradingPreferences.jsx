import { useEffect, useState } from 'react'
import { useLang } from '../../i18n/LanguageContext.jsx'
import * as dataApi from '../../services/data.js'
import {
  EXPERIENCE_OPTIONS,
  ACCOUNT_TYPE_OPTIONS,
  BROKER_OPTIONS,
  ASSET_OPTIONS,
  GOAL_OPTIONS,
  optionLabel,
} from '../../utils/profileOptions.js'

// Settings card: edit the onboarding answers later (TL-FEAT-008). Same
// vocabulary and API as the onboarding flow; referral source is a one-time
// question and intentionally not editable here.
export default function TradingPreferences() {
  const { t } = useLang()
  const [form, setForm] = useState(null) // null until loaded
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false
    dataApi
      .fetchProfile()
      .then((p) => {
        if (cancelled) return
        setForm({
          experience: p.experience,
          accountTypes: p.accountTypes,
          primaryBroker: p.primaryBroker,
          assets: p.assets,
          goals: p.goals,
        })
      })
      .catch(() => {
        if (!cancelled) setError(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  function toggle(field, value) {
    setSaved(false)
    setForm((f) => ({
      ...f,
      [field]: f[field].includes(value)
        ? f[field].filter((v) => v !== value)
        : [...f[field], value],
    }))
  }

  function single(field, value) {
    setSaved(false)
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSave() {
    if (saving || !form) return
    setSaving(true)
    setError(false)
    try {
      await dataApi.updateProfile(form)
      setSaved(true)
    } catch {
      setError(true)
    } finally {
      setSaving(false)
    }
  }

  if (!form) {
    return error ? (
      <p className="set-err">{t('common.requestFailed')}</p>
    ) : (
      <p className="set-muted">{t('common.loading')}</p>
    )
  }

  return (
    <div className="pref-editor">
      <p className="set-muted">{t('settings.prefsSub')}</p>

      <PrefGroup label={t('onboarding.expTitle')}>
        {EXPERIENCE_OPTIONS.map((o) => (
          <Chip
            key={o.value}
            on={form.experience === o.value}
            onClick={() => single('experience', o.value)}
          >
            {optionLabel(o, t)}
          </Chip>
        ))}
      </PrefGroup>

      <PrefGroup label={t('onboarding.acctTitle')}>
        {ACCOUNT_TYPE_OPTIONS.map((o) => (
          <Chip
            key={o.value}
            on={form.accountTypes.includes(o.value)}
            onClick={() => toggle('accountTypes', o.value)}
          >
            {optionLabel(o, t)}
          </Chip>
        ))}
      </PrefGroup>

      <PrefGroup label={t('onboarding.brokerTitle')}>
        {BROKER_OPTIONS.map((o) => (
          <Chip
            key={o.value}
            on={form.primaryBroker === o.value}
            onClick={() => single('primaryBroker', o.value)}
          >
            {optionLabel(o, t)}
          </Chip>
        ))}
      </PrefGroup>

      <PrefGroup label={t('onboarding.assetsTitle')}>
        {ASSET_OPTIONS.map((o) => (
          <Chip
            key={o.value}
            on={form.assets.includes(o.value)}
            onClick={() => toggle('assets', o.value)}
          >
            {optionLabel(o, t)}
          </Chip>
        ))}
      </PrefGroup>

      <PrefGroup label={t('onboarding.goalsTitle')}>
        {GOAL_OPTIONS.map((o) => (
          <Chip
            key={o.value}
            on={form.goals.includes(o.value)}
            onClick={() => toggle('goals', o.value)}
          >
            {optionLabel(o, t)}
          </Chip>
        ))}
      </PrefGroup>

      <div className="pref-actions">
        {saved && <span className="set-ok">{t('settings.prefsSaved')}</span>}
        {error && <span className="set-err">{t('common.requestFailed')}</span>}
        <button
          type="button"
          className="set-submit"
          disabled={saving}
          onClick={handleSave}
        >
          {t('settings.prefsSave')}
        </button>
      </div>
    </div>
  )
}

function PrefGroup({ label, children }) {
  return (
    <div className="pref-group">
      <span className="pref-label">{label}</span>
      <div className="pref-chips">{children}</div>
    </div>
  )
}

function Chip({ on, onClick, children }) {
  return (
    <button
      type="button"
      className={`pref-chip${on ? ' pref-chip-on' : ''}`}
      onClick={onClick}
    >
      {children}
    </button>
  )
}
