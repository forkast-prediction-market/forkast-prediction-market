'use client'

import type { AffiliateDataResult } from '@/lib/affiliate-data'
import { useEffect, useState } from 'react'
import { fetchAffiliateSettingsFromAPI } from '@/lib/affiliate-data'
import { ErrorDisplay } from './ErrorDisplay'

interface PlatformShareDisplayProps {
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
 * Component that displays the calculated platform share percentage
 * Fetches data client-side for simplicity
 */
export function PlatformShareDisplay({
  showSymbol = true,
  className = 'font-semibold text-primary',
}: PlatformShareDisplayProps) {
  const [data, setData] = useState<AffiliateDataResult | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchAffiliateSettingsFromAPI()
      .then(setData)
      .finally(() => setIsLoading(false))
  }, [])

  if (isLoading) {
    return (
      <span className={className}>
        Loading...
      </span>
    )
  }

  // Handle error state
  if (data && !data.success) {
    return (
      <ErrorDisplay
        error={data.error}
        className={className}
        showRefresh={true}
      />
    )
  }

  // Handle success state
  const platformSharePercent = data?.success
    ? data.data.platformSharePercent
    : 'N/A'

  return (
    <span className={className}>
      {platformSharePercent}
      {showSymbol ? '%' : ''}
    </span>
  )
}
