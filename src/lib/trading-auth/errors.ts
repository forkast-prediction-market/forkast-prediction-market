export const TRADING_AUTH_REQUIRED_ERROR = 'Enable trading to continue.'

export function isTradingAuthRequiredError(message: string | null | undefined) {
  if (!message) {
    return false
  }

  return (
    message === TRADING_AUTH_REQUIRED_ERROR
    || message.toLowerCase().includes('enable trading')
  )
}
