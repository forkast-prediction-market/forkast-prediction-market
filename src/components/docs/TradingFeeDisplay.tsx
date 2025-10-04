'use client'

import type { AffiliateDataResult } from '@/lib/affiliate-data'
import { useEffect, useState } from 'react'
import { fetchAffiliateSettingsFromAPI } from '@/lib/affiliate-data'
import { ErrorDisplay } from './ErrorDisplay'

interface TradingFeeDisplayProps {
  /**
   * Server-side data passed as props (preferred method)
   */
  data?: AffiliateDataResult
  /**
   * Whether to show the percentage symbol
   */
  showSymbol?: boolean
  /**
   * Custom className for styling
   */
  className?: string
}

/**
 * Component that displays the current trading fee percentage
 * Prioritizes server-side data, falls back to client-side fetching if needed
 */
export function TradingFeeDisplay({
  data,
  showSymbol = true,
  className = 'font-semibold text-primary',
}: TradingFeeDisplayProps) {
  const [clientData, setClientData] = useState<AffiliateDataResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Use server-side data if available, otherwise fetch client-side
  const effectiveData = data || clientData

  useEffect(() => {
    // Only fetch client-side if no server-side data provided
    if (!data) {
      setIsLoading(true)
      fetchAffiliateSettingsFromAPI()
        .then(setClientData)
        .finally(() => setIsLoading(false))
    }
  }, [data])

  // Show loading state only for client-side fetching when no server data
  if (isLoading && !data) {
    return (
      <span className={className}>
        Loading...
      </span>
    )
  }

  // Handle error state - show error with refresh link
  if (effectiveData && !effectiveData.success) {
    return (
      <ErrorDisplay
        error={effectiveData.error}
        className={className}
        showRefresh={!data} // Only show refresh for client-side errors
      />
    )
  }

  // Handle success state
  const tradeFeePercent = effectiveData?.success
    ? effectiveData.data.tradeFeePercent
    : 'N/A'

  return (
    <span className={className}>
      {tradeFeePercent}
      {showSymbol ? '%' : ''}
    </span>
  )
}
