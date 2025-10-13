'use client'

import type { AffiliateDataResult } from '@/lib/affiliate-data'
import { useEffect, useState } from 'react'
import { createFeeCalculationExample, fetchAffiliateSettingsFromAPI } from '@/lib/affiliate-data'
import { ErrorDisplay, ErrorDisplayBlock } from './ErrorDisplay'

interface FeeCalculationExampleProps {
  amount: number
  className?: string
  format?: 'table' | 'inline'
}

export function FeeCalculationExample({ amount, className = '', format = 'table' }: FeeCalculationExampleProps) {
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
        <span className="text-muted-foreground">Loading calculation example...</span>
      </span>
    )
  }

  if (data && !data.success) {
    if (format === 'inline') {
      return (
        <ErrorDisplay
          error={data.error}
          fallbackValue="Unable to load calculation example"
          className={className}
          showRefresh={true}
        />
      )
    }
    else {
      return (
        <ErrorDisplayBlock
          error={data.error}
          title="Unable to load fee calculation"
          className={className}
        />
      )
    }
  }

  if (!data?.success) {
    return null
  }

  const calculation = createFeeCalculationExample(amount, data.data)

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
    <div className={className}>
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
