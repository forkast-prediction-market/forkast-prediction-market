import type { ChainId, ExtendedChain, TokensExtendedResponse, WalletTokenExtended } from '@lifi/types'
import { getChains, getTokens, getWalletBalances } from '@lifi/sdk'
import { useQuery } from '@tanstack/react-query'

export const LIFI_WALLET_TOKENS_QUERY_KEY = 'lifi-wallet-tokens'

const USD_FORMATTER = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const MIN_USD_BALANCE = 2

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

function buildChainMap(chains: ExtendedChain[]) {
  const chainMap = new Map<number, ExtendedChain>()
  for (const chain of chains) {
    chainMap.set(chain.id as number, chain)
  }
  return chainMap
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

function formatTokenAmount(token: WalletTokenExtended) {
  const amount = Number(token.amount)
  const decimals = Number(token.decimals)

  if (!Number.isFinite(amount) || !Number.isFinite(decimals)) {
    return '0.00'
  }

  const normalizedAmount = amount / 10 ** decimals

  return normalizedAmount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  })
}

export interface LiFiWalletTokenItem {
  id: string
  symbol: string
  network: string
  icon: string
  chainIcon?: string
  balance: string
  usd: string
  usdValue: number
  disabled: boolean
}

interface UseLiFiWalletTokensOptions {
  enabled?: boolean
}

export function useLiFiWalletTokens(walletAddress?: string | null, options: UseLiFiWalletTokensOptions = {}) {
  const isEnabled = Boolean(options.enabled ?? true)
  const hasAddress = Boolean(walletAddress)

  const query = useQuery({
    queryKey: [LIFI_WALLET_TOKENS_QUERY_KEY, walletAddress],
    enabled: isEnabled && hasAddress,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    refetchOnMount: 'always',
    queryFn: async (): Promise<LiFiWalletTokenItem[]> => {
      if (!walletAddress) {
        return []
      }

      try {
        const [tokensResponse, balancesByChain, chains] = await Promise.all([
          getTokens({ extended: true }),
          getWalletBalances(walletAddress),
          getChains(),
        ])

        const acceptedByChain = buildAcceptedTokenMap(tokensResponse)
        const chainMap = buildChainMap(chains)
        const items: LiFiWalletTokenItem[] = []

        for (const [chainIdKey, walletTokens] of Object.entries(balancesByChain)) {
          const chainId = Number(chainIdKey) as ChainId
          const acceptedTokens = acceptedByChain.get(chainId)

          if (!acceptedTokens) {
            continue
          }

          const chain = chainMap.get(chainId)
          const networkName = chain?.name ?? `Chain ${chainId}`
          const networkIcon = chain?.logoURI

          for (const token of walletTokens) {
            if (!acceptedTokens.has(token.address.toLowerCase())) {
              continue
            }

            const usdValue = toUsdValue(token)
            if (!Number.isFinite(usdValue) || usdValue <= 0) {
              continue
            }

            items.push({
              id: `${chainId}:${token.address}`,
              symbol: token.symbol,
              network: networkName,
              icon: token.logoURI ?? '/images/deposit/transfer/usdc_dark.png',
              chainIcon: networkIcon,
              balance: formatTokenAmount(token),
              usd: USD_FORMATTER.format(usdValue),
              usdValue,
              disabled: usdValue < MIN_USD_BALANCE,
            })
          }
        }

        items.sort((a, b) => b.usdValue - a.usdValue)

        return items
      }
      catch {
        return []
      }
    },
  })

  return {
    items: query.data ?? [],
    isLoadingTokens: query.isLoading || (query.isFetching && query.data === undefined),
    refetchTokens: query.refetch,
  }
}
