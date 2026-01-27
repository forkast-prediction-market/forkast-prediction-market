import type { TokensExtendedResponse, WalletTokenExtended } from '@lifi/types'
import { getTokens, getWalletBalances } from '@lifi/sdk'
import { useQuery } from '@tanstack/react-query'

export const LIFI_WALLET_USD_BALANCE_QUERY_KEY = 'lifi-wallet-usd-balance'

const USD_FORMATTER = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

function buildAcceptedTokenMap(tokensResponse: TokensExtendedResponse) {
  const acceptedByChain = new Map<number, Set<string>>()

  for (const [chainIdKey, tokens] of Object.entries(tokensResponse.tokens)) {
    const chainId = Number(chainIdKey)
    const accepted = new Set<string>()

    for (const token of tokens) {
      accepted.add(token.address.toLowerCase())
    }

    acceptedByChain.set(chainId, accepted)
  }

  return acceptedByChain
}

function toUsdValue(token: WalletTokenExtended) {
  const amount = Number(token.amount)
  const decimals = Number(token.decimals)
  const priceUsd = Number(token.priceUSD ?? 0)

  if (!Number.isFinite(amount) || !Number.isFinite(decimals) || !Number.isFinite(priceUsd)) {
    return 0
  }

  const normalizedAmount = amount / 10 ** decimals
  return normalizedAmount * priceUsd
}

interface UseLiFiWalletUsdBalanceOptions {
  enabled?: boolean
}

export function useLiFiWalletUsdBalance(walletAddress?: string | null, options: UseLiFiWalletUsdBalanceOptions = {}) {
  const isEnabled = Boolean(options.enabled ?? true)
  const hasAddress = Boolean(walletAddress)

  const query = useQuery({
    queryKey: [LIFI_WALLET_USD_BALANCE_QUERY_KEY, walletAddress],
    enabled: isEnabled && hasAddress,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    refetchOnMount: 'always',
    queryFn: async () => {
      if (!walletAddress) {
        return 0
      }

      try {
        const [tokensResponse, balancesByChain] = await Promise.all([
          getTokens({ extended: true }),
          getWalletBalances(walletAddress),
        ])

        const acceptedByChain = buildAcceptedTokenMap(tokensResponse)

        let totalUsd = 0

        for (const [chainIdKey, walletTokens] of Object.entries(balancesByChain)) {
          const chainId = Number(chainIdKey)
          const acceptedTokens = acceptedByChain.get(chainId)

          if (!acceptedTokens) {
            continue
          }

          for (const token of walletTokens) {
            if (!acceptedTokens.has(token.address.toLowerCase())) {
              continue
            }

            totalUsd += toUsdValue(token)
          }
        }

        if (!Number.isFinite(totalUsd)) {
          return 0
        }

        return totalUsd
      }
      catch {
        return 0
      }
    },
  })

  const usdBalance = typeof query.data === 'number' && Number.isFinite(query.data)
    ? query.data
    : 0
  const formattedUsdBalance = USD_FORMATTER.format(usdBalance)
  const isLoadingUsdBalance = query.isLoading || (query.isFetching && query.data === undefined)

  return {
    usdBalance,
    formattedUsdBalance,
    isLoadingUsdBalance,
    refetchUsdBalance: query.refetch,
  }
}
