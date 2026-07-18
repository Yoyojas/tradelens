import { useEffect, useMemo, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useLang } from '../i18n/LanguageContext.jsx'
import LanguageMenu from '../components/LanguageMenu.jsx'
import * as dataApi from '../services/data.js'
import {
  EXPERIENCE_OPTIONS,
  ACCOUNT_TYPE_OPTIONS,
  BROKER_OPTIONS,
  ASSET_OPTIONS,
  GOAL_OPTIONS,
  REFERRAL_OPTIONS,
  optionLabel,
} from '../utils/profileOptions.js'
import '../css/onboarding.css'

// First-login onboarding (TL-FEAT-008). 8 steps, every step persisted so a
// refresh or sign-out resumes where the user left off. Legacy accounts (that
// predate this feature) see a skip button on the welcome step — skipping
// marks the flow complete. Sensitive financials are deliberately not asked.
const STEPS = [
  'welcome',
  'experience',
  'accounts',
  'broker',
  'assets',
  'goals',
  'referral',
  'connect',
]

export default function OnboardingPage() {
  const { currentUser, ready, emailVerified, refreshUser, logout } = useAuth()
  const { t } = useLang()
  const navigate = useNavigate()

  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState({
    experience: null,
    accountTypes: [],
    primaryBroker: null,
    assets: [],
    goals: [],
    referralSource: null,
  })
  const [loaded, setLoaded] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(false)

  // Resume: pull saved answers + step once on mount.
  useEffect(() => {
    if (!currentUser || !emailVerified) return
    let cancelled = false
    dataApi
      .fetchProfile()
      .then((p) => {
        if (cancelled) return
        setAnswers({
          experience: p.experience,
          accountTypes: p.accountTypes,
          primaryBroker: p.primaryBroker,
          assets: p.assets,
          goals: p.goals,
          referralSource: p.referralSource,
        })
        setStep(Math.min(Math.max(p.currentStep, 0), STEPS.length - 1))
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoaded(true)
      })
    return () => {
      cancelled = true
    }
  }, [currentUser, emailVerified])

  const legacy = !!currentUser?.onboardingLegacy

  // Continue is enabled only once the current step has a valid answer.
  const canContinue = useMemo(() => {
    switch (STEPS[step]) {
      case 'experience':
        return !!answers.experience
      case 'accounts':
        return answers.accountTypes.length > 0
      case 'broker':
        return !!answers.primaryBroker
      case 'assets':
        return answers.assets.length > 0
      case 'goals':
        return answers.goals.length > 0
      default:
        return true // welcome / referral (optional) / connect
    }
  }, [step, answers])

  // Own gate (this page lives outside ProtectedRoute, like /verify).
  if (!ready) return <div className="auth-loading">{t('common.loading')}</div>
  if (!currentUser) return <Navigate to="/login" replace />
  if (!emailVerified) return <Navigate to="/verify" replace />
  if (currentUser.onboardingCompleted) return <Navigate to="/" replace />

  // Persist the current step's answer + the resume pointer, then advance.
  async function persist(patch, nextStep) {
    setBusy(true)
    setError(false)
    try {
      await dataApi.updateProfile({ ...patch, currentStep: nextStep })
      setStep(nextStep)
    } catch {
      setError(true)
    } finally {
      setBusy(false)
    }
  }

  function stepPatch() {
    switch (STEPS[step]) {
      case 'experience':
        return { experience: answers.experience }
      case 'accounts':
        return { accountTypes: answers.accountTypes }
      case 'broker':
        return { primaryBroker: answers.primaryBroker }
      case 'assets':
        return { assets: answers.assets }
      case 'goals':
        return { goals: answers.goals }
      case 'referral':
        return { referralSource: answers.referralSource }
      default:
        return {}
    }
  }

  function handleContinue() {
    if (busy || !canContinue) return
    persist(stepPatch(), Math.min(step + 1, STEPS.length - 1))
  }

  function handleBack() {
    if (busy || step === 0) return
    persist(stepPatch(), step - 1)
  }

  // Referral step is explicitly skippable: clear the answer and move on.
  function handleReferralSkip() {
    if (busy) return
    setAnswers((a) => ({ ...a, referralSource: null }))
    persist({ referralSource: null }, step + 1)
  }

  async function finish(goConnect) {
    if (busy) return
    setBusy(true)
    setError(false)
    try {
      await dataApi.completeOnboarding()
      await refreshUser()
      navigate(goConnect ? '/connect' : '/', { replace: true })
    } catch {
      setError(true)
      setBusy(false)
    }
  }

  // Legacy accounts: skip = mark complete, straight into the app.
  async function handleLegacySkip() {
    await finish(false)
  }

  function toggle(field, value) {
    setAnswers((a) => {
      const list = a[field]
      return {
        ...a,
        [field]: list.includes(value)
          ? list.filter((v) => v !== value)
          : [...list, value],
      }
    })
  }

  const single = (field, value) =>
    setAnswers((a) => ({ ...a, [field]: value }))

  const kind = STEPS[step]
  const showNav = kind !== 'welcome' && kind !== 'connect'

  return (
    <div className="ob-page">
      <div className="ob-card">
        <div className="ob-top">
          <span className="ob-brand">{t('common.appName')}</span>
          <div className="ob-top-actions">
            {/* TL-FEAT-011: language entry outside the app shell */}
            <LanguageMenu />
            <button
              type="button"
              className="ob-exit"
              onClick={() => {
                logout()
                navigate('/login', { replace: true })
              }}
            >
              {t('onboarding.safeExit')}
            </button>
          </div>
        </div>

        <div
          className="ob-progress"
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={STEPS.length}
          aria-valuenow={step + 1}
        >
          <div className="ob-progress-fill" data-step={step + 1} />
        </div>
        <p className="ob-step-label">
          {t('onboarding.stepLabel', { n: step + 1, total: STEPS.length })}
        </p>

        {!loaded ? (
          <div className="auth-loading">{t('common.loading')}</div>
        ) : (
          <>
            {kind === 'welcome' && (
              <div className="ob-body">
                <h1 className="ob-title">{t('onboarding.welcomeTitle')}</h1>
                <p className="ob-sub">{t('onboarding.welcomeBody')}</p>
                <div className="ob-actions ob-actions-center">
                  <button
                    type="button"
                    className="ob-primary"
                    disabled={busy}
                    onClick={handleContinue}
                  >
                    {t('onboarding.welcomeCta')}
                  </button>
                </div>
                {legacy && (
                  <button
                    type="button"
                    className="ob-skip-link"
                    disabled={busy}
                    onClick={handleLegacySkip}
                  >
                    {t('onboarding.legacySkip')}
                  </button>
                )}
              </div>
            )}

            {kind === 'experience' && (
              <StepOptions
                title={t('onboarding.expTitle')}
                sub={t('onboarding.expSub')}
                options={EXPERIENCE_OPTIONS}
                selected={[answers.experience]}
                onPick={(v) => single('experience', v)}
                t={t}
              />
            )}

            {kind === 'accounts' && (
              <StepOptions
                title={t('onboarding.acctTitle')}
                sub={t('onboarding.multiHint')}
                options={ACCOUNT_TYPE_OPTIONS}
                selected={answers.accountTypes}
                onPick={(v) => toggle('accountTypes', v)}
                t={t}
              />
            )}

            {kind === 'broker' && (
              <StepOptions
                title={t('onboarding.brokerTitle')}
                sub={t('onboarding.brokerSub')}
                options={BROKER_OPTIONS}
                selected={[answers.primaryBroker]}
                onPick={(v) => single('primaryBroker', v)}
                t={t}
              />
            )}

            {kind === 'assets' && (
              <StepOptions
                title={t('onboarding.assetsTitle')}
                sub={t('onboarding.multiHint')}
                options={ASSET_OPTIONS}
                selected={answers.assets}
                onPick={(v) => toggle('assets', v)}
                t={t}
              />
            )}

            {kind === 'goals' && (
              <StepOptions
                title={t('onboarding.goalsTitle')}
                sub={t('onboarding.multiHint')}
                options={GOAL_OPTIONS}
                selected={answers.goals}
                onPick={(v) => toggle('goals', v)}
                t={t}
              />
            )}

            {kind === 'referral' && (
              <>
                <StepOptions
                  title={t('onboarding.refTitle')}
                  sub={t('onboarding.refSub')}
                  options={REFERRAL_OPTIONS}
                  selected={[answers.referralSource]}
                  onPick={(v) => single('referralSource', v)}
                  t={t}
                />
                <button
                  type="button"
                  className="ob-skip-link"
                  disabled={busy}
                  onClick={handleReferralSkip}
                >
                  {t('onboarding.refSkip')}
                </button>
              </>
            )}

            {kind === 'connect' && (
              <div className="ob-body">
                <h1 className="ob-title">{t('onboarding.connectTitle')}</h1>
                <p className="ob-sub">{t('onboarding.connectSub')}</p>
                <div className="ob-actions ob-actions-center">
                  <button
                    type="button"
                    className="ob-primary"
                    disabled={busy}
                    onClick={() => finish(true)}
                  >
                    {t('onboarding.connectNow')}
                  </button>
                  <button
                    type="button"
                    className="ob-secondary"
                    disabled={busy}
                    onClick={() => finish(false)}
                  >
                    {t('onboarding.connectLater')}
                  </button>
                </div>
                <button
                  type="button"
                  className="ob-skip-link"
                  disabled={busy || step === 0}
                  onClick={handleBack}
                >
                  {t('onboarding.back')}
                </button>
              </div>
            )}

            {error && <p className="ob-error">{t('common.requestFailed')}</p>}

            {showNav && (
              <div className="ob-actions">
                <button
                  type="button"
                  className="ob-secondary"
                  disabled={busy || step === 0}
                  onClick={handleBack}
                >
                  {t('onboarding.back')}
                </button>
                <button
                  type="button"
                  className="ob-primary"
                  disabled={busy || !canContinue}
                  onClick={handleContinue}
                >
                  {t('onboarding.continue')}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// Option grid used by every question step. `selected` is always an array —
// single-choice steps pass a one-element array.
function StepOptions({ title, sub, options, selected, onPick, t }) {
  return (
    <div className="ob-body">
      <h1 className="ob-title">{title}</h1>
      <p className="ob-sub">{sub}</p>
      <div className="ob-options">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            className={`ob-option${
              selected.includes(option.value) ? ' ob-option-on' : ''
            }`}
            onClick={() => onPick(option.value)}
          >
            {optionLabel(option, t)}
          </button>
        ))}
      </div>
    </div>
  )
}
