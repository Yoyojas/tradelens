// IBKR account-summary tag -> i18n key (TL-DATA-006 tech-debt cleanup: the
// UI shows translated product names, never raw NETLIQUIDATION-style tags).
// Technical meaning of each tag, for reference:
//   NetLiquidation     total account value if liquidated now
//   TotalCashValue     cash across segments
//   AvailableFunds     equity with loan value minus initial margin
//   BuyingPower        max purchasable value given margin
//   GrossPositionValue absolute sum of all position values
export const ACCOUNT_TAG_KEYS = {
  NetLiquidation: 'connect.tagNetLiquidation',
  TotalCashValue: 'connect.tagTotalCashValue',
  AvailableFunds: 'connect.tagAvailableFunds',
  BuyingPower: 'connect.tagBuyingPower',
  GrossPositionValue: 'connect.tagGrossPositionValue',
}

// Unknown tags fall back to the raw string — never blank.
export function accountTagLabel(tag, t) {
  const key = ACCOUNT_TAG_KEYS[tag]
  return key ? t(key) : tag
}
