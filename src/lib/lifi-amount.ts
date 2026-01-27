import { MAX_AMOUNT_INPUT } from '@/lib/amount-input'

const MAX_WHOLE_DIGITS = String(MAX_AMOUNT_INPUT).length

export function sanitizeLiFiAmount(rawValue: string, decimals: number) {
  const digitsAndDots = rawValue.replace(/[^0-9.]/g, '')
  const [wholePart = '', ...decimalSegments] = digitsAndDots.split('.')
  const limitedWhole = wholePart.slice(0, MAX_WHOLE_DIGITS)

  if (decimalSegments.length === 0) {
    return limitedWhole
  }

  const safeDecimals = Number.isFinite(decimals) && decimals > 0 ? Math.min(decimals, 18) : 18
  const fraction = decimalSegments.join('').slice(0, safeDecimals)
  return fraction ? `${limitedWhole}.${fraction}` : limitedWhole
}
