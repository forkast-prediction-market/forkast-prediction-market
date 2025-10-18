export interface AffiliateSettingsResponse {
  tradeFeePercent: number
  affiliateSharePercent: number
  platformSharePercent: number
  lastUpdated?: string
}

export interface FormattedAffiliateSettings {
  tradeFeePercent: string // "1.00"
  affiliateSharePercent: string // "40.00"
  platformSharePercent: string // "60.00"
  tradeFeeDecimal: number // 0.01
  affiliateShareDecimal: number // 0.40
  platformShareDecimal: number // 0.60
}

export interface AffiliateDataError {
  error: string
}

export type AffiliateDataResult
  = | { success: true, data: FormattedAffiliateSettings }
    | { success: false, error: AffiliateDataError }

export async function fetchAffiliateSettingsFromAPI(): Promise<AffiliateDataResult> {
  try {
    const response = await fetch('/docs/api/affiliate-settings', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const errorData = await response.json()
      return {
        success: false,
        error: errorData,
      }
    }

    const apiData: AffiliateSettingsResponse = await response.json()

    const formattedData: FormattedAffiliateSettings = {
      tradeFeePercent: formatPercentage(apiData.tradeFeePercent),
      affiliateSharePercent: formatPercentage(apiData.affiliateSharePercent),
      platformSharePercent: formatPercentage(apiData.platformSharePercent),
      tradeFeeDecimal: apiData.tradeFeePercent / 100,
      affiliateShareDecimal: apiData.affiliateSharePercent / 100,
      platformShareDecimal: apiData.platformSharePercent / 100,
    }

    return {
      success: true,
      data: formattedData,
    }
  }
  catch (error) {
    console.error('Error fetching affiliate settings from API:', error)
    return {
      success: false,
      error: {
        error: 'Internal server error',
      },
    }
  }
}

export function formatPercentage(percentage: number): string {
  return percentage.toFixed(2)
}

export function formatCurrency(amount: number): string {
  return amount.toFixed(2)
}

export function calculateTradingFee(amount: number, feeDecimal: number): number {
  return amount * feeDecimal
}

export function calculateAffiliateCommission(feeAmount: number, affiliateShareDecimal: number): number {
  return feeAmount * affiliateShareDecimal
}

export function calculatePlatformShare(feeAmount: number, platformShareDecimal: number): number {
  return feeAmount * platformShareDecimal
}

export function createFeeCalculationExample(
  tradeAmount: number,
  affiliateSettings: FormattedAffiliateSettings,
) {
  const tradingFee = calculateTradingFee(tradeAmount, affiliateSettings.tradeFeeDecimal)
  const affiliateCommission = calculateAffiliateCommission(tradingFee, affiliateSettings.affiliateShareDecimal)
  const platformShare = calculatePlatformShare(tradingFee, affiliateSettings.platformShareDecimal)

  return {
    tradeAmount: formatCurrency(tradeAmount),
    tradingFee: formatCurrency(tradingFee),
    affiliateCommission: formatCurrency(affiliateCommission),
    platformShare: formatCurrency(platformShare),
    tradeFeePercent: affiliateSettings.tradeFeePercent,
    affiliateSharePercent: affiliateSettings.affiliateSharePercent,
    platformSharePercent: affiliateSettings.platformSharePercent,
  }
}
