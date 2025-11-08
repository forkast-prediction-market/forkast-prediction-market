const DEFAULT_LOCALE = 'en-US'
const DEFAULT_CURRENCY = 'USD'

export const priceFormatter = new Intl.NumberFormat(DEFAULT_LOCALE, {
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
})

export const sharesFormatter = new Intl.NumberFormat(DEFAULT_LOCALE, {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
})

export const usdFormatter = new Intl.NumberFormat(DEFAULT_LOCALE, {
  style: 'currency',
  currency: DEFAULT_CURRENCY,
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const USD_FORMATTER_CACHE = new Map<string, Intl.NumberFormat>([
  ['2-2', usdFormatter],
])

function getUsdFormatter(min: number, max: number) {
  const key = `${min}-${max}`
  const cached = USD_FORMATTER_CACHE.get(key)
  if (cached) {
    return cached
  }

  const formatter = new Intl.NumberFormat(DEFAULT_LOCALE, {
    style: 'currency',
    currency: DEFAULT_CURRENCY,
    minimumFractionDigits: min,
    maximumFractionDigits: max,
  })
  USD_FORMATTER_CACHE.set(key, formatter)
  return formatter
}

interface CurrencyFormatOptions {
  minimumFractionDigits?: number
  maximumFractionDigits?: number
  includeSymbol?: boolean
}

export function formatCurrency(
  value: number | null | undefined,
  options: CurrencyFormatOptions = {},
) {
  const minimumFractionDigits = options.minimumFractionDigits ?? 2
  const maximumFractionDigits = options.maximumFractionDigits ?? minimumFractionDigits
  const includeSymbol = options.includeSymbol ?? true
  const formatter = getUsdFormatter(minimumFractionDigits, maximumFractionDigits)
  const safeValue = typeof value === 'number' && Number.isFinite(value) ? value : 0

  if (includeSymbol) {
    return formatter.format(safeValue)
  }

  return formatter
    .formatToParts(safeValue)
    .filter(part => part.type !== 'currency')
    .map(part => part.value)
    .join('')
    .trim()
}

interface PercentFormatOptions {
  digits?: number
  includeSymbol?: boolean
}

export function formatPercent(value: number, options: PercentFormatOptions = {}) {
  const digits = options.digits ?? 2
  const includeSymbol = options.includeSymbol ?? true
  const safeValue = Number.isFinite(value) ? value : 0
  const formatted = safeValue.toFixed(digits)
  return includeSymbol ? `${formatted}%` : formatted
}

export function formatVolume(volume: number): string {
  if (!Number.isFinite(volume) || volume < 0) {
    return '$0'
  }

  if (volume >= 1_000_000) {
    return `$${(volume / 1_000_000).toFixed(1)}M`
  }
  if (volume >= 1_000) {
    return `$${(volume / 1_000).toFixed(0)}k`
  }
  return `$${volume.toFixed(0)}`
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString(DEFAULT_LOCALE, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

export function formatTimeAgo(dateString: string) {
  const date = new Date(dateString)
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diffInSeconds < 60) {
    return `${diffInSeconds}s ago`
  }

  if (diffInSeconds < 3600) {
    return `${Math.floor(diffInSeconds / 60)}m ago`
  }

  if (diffInSeconds < 86400) {
    return `${Math.floor(diffInSeconds / 3600)}h ago`
  }

  return `${Math.floor(diffInSeconds / 86400)}d ago`
}

export function truncateAddress(address: string) {
  if (!address) {
    return ''
  }
  return `${address.slice(0, 4)}…${address.slice(-6)}`
}

export function formatPosition(amountMicro: string): string {
  const numeric = Number(amountMicro)
  if (!Number.isFinite(numeric)) {
    return '0'
  }

  const amount = Number.parseFloat((numeric / 1e6).toFixed(1))

  if (amount < 1_000) {
    return amount.toString()
  }

  if (amount < 1_000_000) {
    return Math.floor(amount).toLocaleString(DEFAULT_LOCALE)
  }

  const millions = amount / 1_000_000
  return `${millions.toFixed(1)}M`
}

export function toCents(value?: string | number) {
  if (value === null || value === undefined) {
    return null
  }

  const normalized = typeof value === 'number' && Number.isFinite(value)
    ? Math.min(Math.max(value, 0), 1)
    : 0.5

  return Number((normalized * 100).toFixed(1))
}
