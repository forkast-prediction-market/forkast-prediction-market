import type { LiFiWalletTokenItem } from '@/hooks/useLiFiWalletTokens'
import { getQuote, getTokens } from '@lifi/sdk'
import { useQuery } from '@tanstack/react-query'
import { parseUnits } from 'viem'
import { COLLATERAL_TOKEN_ADDRESS } from '@/lib/contracts'

export const LIFI_QUOTE_QUERY_KEY = 'lifi-quote'

interface UseLiFiQuoteParams {
  fromToken?: LiFiWalletTokenItem | null
  amountValue: string
  fromAddress?: string | null
  toAddress?: string | null
  refreshIndex?: number
}

export function useLiFiQuote({
  fromToken,
  amountValue,
  fromAddress,
  toAddress,
  refreshIndex = 0,
}: UseLiFiQuoteParams) {
  const amountNumber = Number.parseFloat(amountValue || '0')
  const hasValidAmount = Number.isFinite(amountNumber) && amountNumber > 0
  const canQuote = Boolean(fromAddress && toAddress && fromToken && hasValidAmount)

  const query = useQuery({
    queryKey: [LIFI_QUOTE_QUERY_KEY, fromToken?.id, amountValue, fromAddress, toAddress, refreshIndex],
    enabled: canQuote,
    staleTime: 15_000,
    queryFn: async () => {
      if (!fromAddress || !toAddress || !fromToken) {
        return null
      }

      try {
        const fromAmount = parseUnits(amountNumber.toString(), fromToken.decimals).toString()
        const tokensResponse = await getTokens({ extended: true, chains: [fromToken.chainId] })
        const chainTokens = tokensResponse.tokens[fromToken.chainId] ?? []
        const usdcToken = chainTokens.find(token => token.address.toLowerCase() === COLLATERAL_TOKEN_ADDRESS.toLowerCase())
          ?? chainTokens.find(token => token.symbol.toUpperCase() === 'USDC')

        if (!usdcToken) {
          return null
        }

        const quote = await getQuote({
          fromChain: fromToken.chainId,
          toChain: fromToken.chainId,
          fromToken: fromToken.address,
          toToken: usdcToken.address,
          fromAddress,
          toAddress,
          fromAmount,
        })

        const toAmountRaw = Number.parseFloat(quote.estimate?.toAmount ?? '0')
        const toAmount = toAmountRaw / 10 ** Number(usdcToken.decimals)
        const toAmountDisplay = Number.isFinite(toAmount)
          ? toAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 6 })
          : null

        const gasUsd = quote.estimate?.gasCosts?.reduce((sum, gas) => {
          const usd = Number.parseFloat(gas.amountUSD ?? '0')
          return Number.isFinite(usd) ? sum + usd : sum
        }, 0) ?? 0
        const gasUsdDisplay = Number.isFinite(gasUsd)
          ? gasUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
          : null

        return {
          toAmountDisplay,
          gasUsdDisplay,
        }
      }
      catch {
        return null
      }
    },
  })

  return {
    quote: query.data,
    isLoadingQuote: query.isLoading || (query.isFetching && query.data === undefined),
    refetchQuote: query.refetch,
  }
}
