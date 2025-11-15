import { useQuery } from '@tanstack/react-query'
import { ZERO_ADDRESS } from '@/lib/constants'

interface AffiliateInfoResponse {
  referrerAddress: `0x${string}`
  affiliateAddress: `0x${string}`
  affiliateSharePercent: number
}

const DEFAULT_REFERRER = (process.env.NEXT_PUBLIC_FEE_RECIPIENT_WALLET ?? ZERO_ADDRESS) as `0x${string}`

const DEFAULT_RESPONSE: AffiliateInfoResponse = {
  referrerAddress: DEFAULT_REFERRER,
  affiliateAddress: ZERO_ADDRESS,
  affiliateSharePercent: 0,
}

async function fetchAffiliateInfo(): Promise<AffiliateInfoResponse> {
  const response = await fetch('/api/affiliate-info', {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error('Failed to load affiliate info')
  }

  return response.json()
}

export function useAffiliateOrderMetadata(): AffiliateInfoResponse {
  const { data } = useQuery({
    queryKey: ['affiliate-order-info'],
    queryFn: fetchAffiliateInfo,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  })

  return data ?? DEFAULT_RESPONSE
}
