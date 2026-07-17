// Onboarding / trading-preferences vocabulary (TL-FEAT-008). Slugs are the
// canonical stored values (server whitelists them in api.py); the UI shows
// t(`onboarding.${labelKey}`). Broker display names are product names and
// stay untranslated except other/none.

export const EXPERIENCE_OPTIONS = [
  { value: 'none', labelKey: 'expNone' },
  { value: 'lt1', labelKey: 'expLt1' },
  { value: 'y1_3', labelKey: 'exp1to3' },
  { value: 'y3_5', labelKey: 'exp3to5' },
  { value: 'y5plus', labelKey: 'exp5plus' },
]

export const ACCOUNT_TYPE_OPTIONS = [
  { value: 'personal', labelKey: 'acctPersonal' },
  { value: 'prop', labelKey: 'acctProp' },
  { value: 'paper', labelKey: 'acctPaper' },
  { value: 'none', labelKey: 'acctNone' },
]

export const BROKER_OPTIONS = [
  { value: 'ibkr', name: 'Interactive Brokers' },
  { value: 'schwab', name: 'Charles Schwab' },
  { value: 'fidelity', name: 'Fidelity' },
  { value: 'robinhood', name: 'Robinhood' },
  { value: 'webull', name: 'Webull' },
  { value: 'etrade', name: 'E*TRADE' },
  { value: 'tastytrade', name: 'tastytrade' },
  { value: 'moomoo', name: 'moomoo' },
  { value: 'other', labelKey: 'brokerOther' },
  { value: 'none', labelKey: 'brokerNone' },
]

export const ASSET_OPTIONS = [
  { value: 'stocks', labelKey: 'assetStocks' },
  { value: 'etf', labelKey: 'assetEtf' },
  { value: 'options', labelKey: 'assetOptions' },
  { value: 'futures', labelKey: 'assetFutures' },
  { value: 'forex', labelKey: 'assetForex' },
  { value: 'crypto', labelKey: 'assetCrypto' },
  { value: 'other', labelKey: 'assetOther' },
]

export const GOAL_OPTIONS = [
  { value: 'record', labelKey: 'goalRecord' },
  { value: 'analyze', labelKey: 'goalAnalyze' },
  { value: 'discipline', labelKey: 'goalDiscipline' },
  { value: 'strategy', labelKey: 'goalStrategy' },
  { value: 'review', labelKey: 'goalReview' },
]

export const REFERRAL_OPTIONS = [
  { value: 'search', labelKey: 'refSearch' },
  { value: 'social', labelKey: 'refSocial' },
  { value: 'friend', labelKey: 'refFriend' },
  { value: 'course', labelKey: 'refCourse' },
  { value: 'other', labelKey: 'refOther' },
]

export function optionLabel(option, t) {
  return option.name ?? t(`onboarding.${option.labelKey}`)
}
