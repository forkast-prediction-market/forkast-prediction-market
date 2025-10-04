'use client'

import type { AffiliateDataResult } from '@/lib/affiliate-data'
import { useEffect, useState } from 'react'
import { createFeeCalculationExample, fetchAffiliateSettingsFromAPI } from '@/lib/affiliate-data'
import { ErrorDisplay, ErrorDisplayBlock } from './ErrorDisplay'

interface FeeCalculationExampleProps {
  /**
   * The trade amount to use in the calculation example
   */
  amount: number
  /**
   * Server-side data passed as props (preferred method)
   */
  data?: AffiliateDataResult
  /**
   * Custom className for styling the container
   */
  className?: string
  /**
   * Whether to show the calculation as a table or inline
   */
  format?: 'table' | 'inline'
}

/**
 * Component that displays a dynamic fee calculation example
 * Shows trading fee, affiliate commission, and platform share calculations
 * Prioritizes server-side data, falls back to client-side fetching if needed
 */
export function FeeCalculationExample({
  amount,
  data,
  className = '',
  format = 'table',
}: FeeCalculationExampleProps) {
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
        <span className="text-muted-foreground">Loading calculation example...</span>
      </span>
    )
  }

  // Handle error state - use block display for table format, inline for inline format
  if (effectiveData && !effectiveData.success) {
    if (format === 'inline') {
      return (
        <ErrorDisplay
          error={effectiveData.error}
          fallbackValue="Unable to load calculation example"
          className={className}
          showRefresh={!data} // Only show refresh for client-side errors
        />
      )
    }
    else {
      return (
        <ErrorDisplayBlock
          error={effectiveData.error}
          title="Unable to load fee calculation"
          className={className}
        />
      )
    }
  }

  // Calculate the example using current data
  if (!effectiveData?.success) {
    return null // This case is handled above in error states
  }

  const affiliateSettings = effectiveData.data

  const calculation = createFeeCalculationExample(amount, affiliateSettings)

  if (format === 'inline') {
    return (
      <span className={className}>
        For a $
        {calculation.tradeAmount}
        {' '}
        trade: $
        {calculation.tradingFee}
        {' '}
        fee (
        {calculation.tradeFeePercent}
        %),
        $
        {calculation.affiliateCommission}
        {' '}
        affiliate commission (
        {calculation.affiliateSharePercent}
        %),
        $
        {calculation.platformShare}
        {' '}
        platform share (
        {calculation.platformSharePercent}
        %)
      </span>
    )
  }

  return (
    <div className={`${className} not-prose`}>
      <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
        <div className="p-4">
          <h4 className="mb-3 font-semibold">Fee Calculation Example</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Trade Amount:</span>
              <span className="font-mono">
                $
                {calculation.tradeAmount}
              </span>
            </div>
            <div className="flex justify-between">
              <span>
                Trading Fee (
                {calculation.tradeFeePercent}
                %):
              </span>
              <span className="font-mono">
                $
                {calculation.tradingFee}
              </span>
            </div>
            <hr className="my-2" />
            <div className="flex justify-between">
              <span>
                Affiliate Commission (
                {calculation.affiliateSharePercent}
                %):
              </span>
              <span className="font-mono text-green-600">
                $
                {calculation.affiliateCommission}
              </span>
            </div>
            <div className="flex justify-between">
              <span>
                Platform Share (
                {calculation.platformSharePercent}
                %):
              </span>
              <span className="font-mono text-blue-600">
                $
                {calculation.platformShare}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
