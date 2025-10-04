import type { ReactNode } from 'react'
import type { AffiliateDataResult } from '@/lib/affiliate-data-server'
import { getFormattedAffiliateSettings } from '@/lib/affiliate-data-server'

interface AffiliateDataProviderProps {
  children: ReactNode
  data: AffiliateDataResult
}

/**
 * Server-side provider that injects affiliate data into MDX components
 * This component receives server-side fetched data and makes it available to child components
 */
export function AffiliateDataProvider({ children, data }: AffiliateDataProviderProps) {
  return (
    <div data-affiliate-data={JSON.stringify(data)}>
      {children}
    </div>
  )
}

/**
 * Server-side function to fetch affiliate data for documentation pages
 * This should be called in the page component before rendering
 */
export async function getAffiliateDataForDocs(): Promise<AffiliateDataResult> {
  try {
    return await getFormattedAffiliateSettings()
  }
  catch (error) {
    console.error('Failed to fetch affiliate data for docs:', error)
    return {
      success: false,
      error: {
        error: 'Failed to fetch affiliate settings',
        code: 'SERVER_ERROR',
      },
    }
  }
}
