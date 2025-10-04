// Note: SettingsModel import removed to prevent client-side bundling issues
// This file now only contains client-side safe functions

// Types for affiliate settings data
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

// Result type for error handling
export type AffiliateDataResult
  = | { success: true, data: FormattedAffiliateSettings }
    | { success: false, error: AffiliateDataError }

// This function has been moved to the API route to avoid client-side database imports

/**
 * Fetches affiliate settings via the API endpoint (for client-side usage)
 * @returns Promise<AffiliateDataResult> - Formatted affiliate settings or error
 */
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

    // Format the API response data
    // API returns percentages as numbers (e.g., 1.00 for 1%)
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

/**
 * Formats a percentage number to 2 decimal places
 * @param percentage - The percentage as a number (e.g., 1.5 for 1.5%)
 * @returns string - Formatted percentage (e.g., "1.50")
 */
export function formatPercentage(percentage: number): string {
  return percentage.toFixed(2)
}

/**
 * Formats a currency amount to 2 decimal places
 * @param amount - The amount as a number
 * @returns string - Formatted amount (e.g., "10.50")
 */
export function formatCurrency(amount: number): string {
  return amount.toFixed(2)
}

/**
 * Calculates trading fee for a given amount
 * @param amount - The trading amount
 * @param feeDecimal - The fee as a decimal (e.g., 0.01 for 1%)
 * @returns number - The calculated fee
 */
export function calculateTradingFee(amount: number, feeDecimal: number): number {
  return amount * feeDecimal
}

/**
 * Calculates affiliate commission for a given fee amount
 * @param feeAmount - The total fee amount
 * @param affiliateShareDecimal - The affiliate share as a decimal (e.g., 0.40 for 40%)
 * @returns number - The calculated affiliate commission
 */
export function calculateAffiliateCommission(feeAmount: number, affiliateShareDecimal: number): number {
  return feeAmount * affiliateShareDecimal
}

/**
 * Calculates platform share for a given fee amount
 * @param feeAmount - The total fee amount
 * @param platformShareDecimal - The platform share as a decimal (e.g., 0.60 for 60%)
 * @returns number - The calculated platform share
 */
export function calculatePlatformShare(feeAmount: number, platformShareDecimal: number): number {
  return feeAmount * platformShareDecimal
}

/**
 * Creates a complete fee calculation example
 * @param tradeAmount - The amount being traded
 * @param affiliateSettings - The formatted affiliate settings
 * @returns object - Complete calculation breakdown
 */
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
