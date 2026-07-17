// Route-gate decision (TL-FEAT-008). The ENTIRE guard policy lives in this
// pure function so it stays in one place and the five-state matrix is
// unit-testable without a browser:
//   loading    session restore in flight
//   login      no session
//   verify     session but email unconfirmed (gate semantics unchanged)
//   onboarding verified but onboarding incomplete (new AND legacy accounts;
//              legacy ones see the skippable variant inside the page)
//   ok         fully onboarded
export function resolveGate(user, ready) {
  if (!ready) return 'loading'
  if (!user) return 'login'
  if (!user.emailVerifiedAt) return 'verify'
  if (!user.onboardingCompleted) return 'onboarding'
  return 'ok'
}
