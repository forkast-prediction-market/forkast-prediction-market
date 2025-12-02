import { useQuery } from '@tanstack/react-query'
import { normalizeAddress } from '@/lib/wallet'
import { useUser } from '@/stores/useUser'

const DATA_API_URL = process.env.DATA_URL!

interface PortfolioValueResult {
  value: number
  text: string
  isLoading: boolean
  isFetching: boolean
}

export function usePortfolioValue(): PortfolioValueResult {
  const user = useUser()
  const proxyWalletAddress = user?.proxy_wallet_status === 'deployed' && user?.proxy_wallet_address
    ? normalizeAddress(user.proxy_wallet_address)
    : null

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['portfolio-value', proxyWalletAddress],
    enabled: Boolean(proxyWalletAddress),
    staleTime: 10_000,
    gcTime: 5 * 60 * 1000,
    refetchInterval: 10_000,
    refetchIntervalInBackground: true,
    queryFn: async (): Promise<number> => {
      if (!proxyWalletAddress) {
        return 0
      }

      const response = await fetch(`${DATA_API_URL}/value?user=${proxyWalletAddress}`)
      if (!response.ok) {
        throw new Error('Failed to fetch portfolio value')
      }

      const body = await response.json()
      const parsed = typeof body.value === 'string'
        ? Number.parseFloat(body.value)
        : Number(body.value)

      return Number.isFinite(parsed) ? parsed : 0
    },
  })

  const value = data ?? 0
  const text = value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  const isInitialLoading = isLoading && !data

  return { value, text, isLoading: isInitialLoading, isFetching }
}
