import { SettingsModel } from '@/lib/db/settings'

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
  code: string
}

// Result type for error handling
export type AffiliateDataResult
  = | { success: true, data: FormattedAffiliateSettings }
    | { success: false, error: AffiliateDataError }

/**
 * Fetches affiliate settings from the database and formats them for display
 * SERVER-SIDE ONLY - Do not import this in client components
 * @returns Promise<AffiliateDataResult> - Formatted affiliate settings or error
 */
export async function getFormattedAffiliateSettings(): Promise<AffiliateDataResult> {
  try {
    const { data: settings, error } = await SettingsModel.getSettings()

    if (error) {
      console.error('Failed to fetch settings:', error)
      return {
        success: false,
        error: {
          error: 'Failed to fetch affiliate settings',
          code: 'DATABASE_ERROR',
        },
      }
    }

    if (!settings) {
      return {
        success: false,
        error: {
          error: 'Settings not found',
          code: 'SETTINGS_NOT_FOUND',
        },
      }
    }

    // Extract affiliate settings from the grouped settings
    const affiliateSettings = settings.affiliate

    if (!affiliateSettings) {
      return {
        success: false,
        error: {
          error: 'Affiliate settings not configured',
          code: 'AFFILIATE_SETTINGS_NOT_FOUND',
        },
      }
    }

    const tradeFeeBps = affiliateSettings.trade_fee_bps?.value
    const affiliateShareBps = affiliateSettings.affiliate_share_bps?.value

    if (!tradeFeeBps || !affiliateShareBps) {
      return {
        success: false,
        error: {
          error: 'Incomplete affiliate settings configuration',
          code: 'INCOMPLETE_SETTINGS',
        },
      }
    }

    // Convert basis points to percentages
    const tradeFeePercent = Number.parseFloat(tradeFeeBps) / 100
    const affiliateSharePercent = Number.parseFloat(affiliateShareBps) / 100
    const platformSharePercent = 100 - affiliateSharePercent

    // Validate the converted values
    if (Number.isNaN(tradeFeePercent) || Number.isNaN(affiliateSharePercent)) {
      return {
        success: false,
        error: {
          error: 'Invalid affiliate settings format',
          code: 'INVALID_FORMAT',
        },
      }
    }

    // Format the data for display
    const formattedData: FormattedAffiliateSettings = {
      tradeFeePercent: formatPercentage(tradeFeePercent),
      affiliateSharePercent: formatPercentage(affiliateSharePercent),
      platformSharePercent: formatPercentage(platformSharePercent),
      tradeFeeDecimal: tradeFeePercent / 100,
      affiliateShareDecimal: affiliateSharePercent / 100,
      platformShareDecimal: platformSharePercent / 100,
    }

    return {
      success: true,
      data: formattedData,
    }
  }
  catch (error) {
    console.error('Unexpected error in getFormattedAffiliateSettings:', error)
    return {
      success: false,
      error: {
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
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
