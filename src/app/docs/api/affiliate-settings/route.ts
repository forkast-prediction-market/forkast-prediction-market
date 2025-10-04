import { NextResponse } from 'next/server'
import { SettingsModel } from '@/lib/db/settings'

interface AffiliateSettingsResponse {
  tradeFeePercent: number
  affiliateSharePercent: number
  platformSharePercent: number
  lastUpdated?: string
}

interface ErrorResponse {
  error: string
  code: string
}

export async function GET() {
  try {
    const { data: settings, error } = await SettingsModel.getSettings()

    if (error) {
      console.error('Failed to fetch settings:', error)
      return NextResponse.json(
        {
          error: 'Failed to fetch affiliate settings',
          code: 'DATABASE_ERROR',
        } as ErrorResponse,
        { status: 500 },
      )
    }

    if (!settings) {
      return NextResponse.json(
        {
          error: 'Settings not found',
          code: 'SETTINGS_NOT_FOUND',
        } as ErrorResponse,
        { status: 404 },
      )
    }

    // Extract affiliate settings from the grouped settings
    const affiliateSettings = settings.affiliate

    if (!affiliateSettings) {
      return NextResponse.json(
        {
          error: 'Affiliate settings not configured',
          code: 'AFFILIATE_SETTINGS_NOT_FOUND',
        } as ErrorResponse,
        { status: 404 },
      )
    }

    const tradeFeeBps = affiliateSettings.trade_fee_bps?.value
    const affiliateShareBps = affiliateSettings.affiliate_share_bps?.value

    if (!tradeFeeBps || !affiliateShareBps) {
      return NextResponse.json(
        {
          error: 'Incomplete affiliate settings configuration',
          code: 'INCOMPLETE_SETTINGS',
        } as ErrorResponse,
        { status: 404 },
      )
    }

    // Convert basis points to percentages
    const tradeFeePercent = Number.parseFloat(tradeFeeBps) / 100
    const affiliateSharePercent = Number.parseFloat(affiliateShareBps) / 100
    const platformSharePercent = 100 - affiliateSharePercent

    // Validate the converted values
    if (Number.isNaN(tradeFeePercent) || Number.isNaN(affiliateSharePercent)) {
      return NextResponse.json(
        {
          error: 'Invalid affiliate settings format',
          code: 'INVALID_FORMAT',
        } as ErrorResponse,
        { status: 500 },
      )
    }

    // Get the most recent update timestamp
    const lastUpdated = Math.max(
      new Date(affiliateSettings.trade_fee_bps?.updated_at || 0).getTime(),
      new Date(affiliateSettings.affiliate_share_bps?.updated_at || 0).getTime(),
    )

    const response: AffiliateSettingsResponse = {
      tradeFeePercent,
      affiliateSharePercent,
      platformSharePercent,
      lastUpdated: new Date(lastUpdated).toISOString(),
    }

    // Set caching headers (5-minute cache as specified)
    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=60',
        'Content-Type': 'application/json',
      },
    })
  }
  catch (error) {
    console.error('Unexpected error in affiliate settings API:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
      } as ErrorResponse,
      { status: 500 },
    )
  }
}
