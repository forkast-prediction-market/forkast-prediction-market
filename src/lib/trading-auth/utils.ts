export function sanitizeTradingAuthSettings(settings: Record<string, any> | null | undefined) {
  if (!settings?.tradingAuth) {
    return settings
  }

  const { tradingAuth, ...rest } = settings
  const normalized: Record<string, any> = {}

  if (tradingAuth.relayer) {
    normalized.relayer = {
      enabled: Boolean(tradingAuth.relayer.key),
      updatedAt: tradingAuth.relayer.updatedAt,
    }
  }

  if (tradingAuth.clob) {
    normalized.clob = {
      enabled: Boolean(tradingAuth.clob.key),
      updatedAt: tradingAuth.clob.updatedAt,
    }
  }

  if (tradingAuth.approvals) {
    normalized.approvals = {
      enabled: Boolean(tradingAuth.approvals.completed),
      updatedAt: tradingAuth.approvals.updatedAt,
    }
  }

  return {
    ...rest,
    tradingAuth: normalized,
  }
}
