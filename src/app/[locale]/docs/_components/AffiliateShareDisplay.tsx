'use client'

import type { AffiliateDataResult } from '@/lib/affiliate-data'
import { useEffect, useState } from 'react'
import { fetchAffiliateSettingsFromAPI } from '@/lib/affiliate-data'
import { ErrorDisplay } from './ErrorDisplay'

interface AffiliateShareDisplayProps {
  showSymbol?: boolean
  className?: string
}

export function AffiliateShareDisplay({
  showSymbol = true,
  className = 'font-semibold text-primary',
}: AffiliateShareDisplayProps) {
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

  if (data && !data.success) {
    return (
      <ErrorDisplay
        error={data.error}
        className={className}
        showRefresh={true}
      />
    )
  }

  const affiliateSharePercent = data?.success
    ? data.data.affiliateSharePercent
    : 'N/A'

  return (
    <span className={className}>
      {affiliateSharePercent}
      {showSymbol ? '%' : ''}
    </span>
  )
}
