import type { Event } from '@/types'
import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { createPublicClient, erc1155Abi, http } from 'viem'
import { defaultNetwork } from '@/lib/appkit'
import { CONDITIONAL_TOKENS_CONTRACT, OUTCOME_INDEX } from '@/lib/constants'

export interface SharesByCondition {
  [conditionId: string]: {
    [OUTCOME_INDEX.YES]: number
    [OUTCOME_INDEX.NO]: number
  }
}

interface UseUserShareBalancesOptions {
  event?: Event
  ownerAddress?: `0x${string}` | null
}

const MICRO_UNIT = 1_000_000

function normalizeSharesFromBalance(balance: bigint): number {
  if (balance <= 0n) {
    return 0
  }

  const decimalValue = Number(balance) / MICRO_UNIT
  return Math.max(0, Math.floor(decimalValue * 10_000) / 10_000)
}

export function useUserShareBalances({ event, ownerAddress }: UseUserShareBalancesOptions) {
  const rpcUrl = useMemo(() => defaultNetwork.rpcUrls.default.http[0], [])

  const client = useMemo(
    () =>
      createPublicClient({
        chain: defaultNetwork,
        transport: http(rpcUrl),
      }),
    [rpcUrl],
  )

  const outcomeDescriptors = useMemo(() => {
    if (!event?.markets?.length) {
      return []
    }

    return event.markets.flatMap(market =>
      market.outcomes.map(outcome => ({
        conditionId: market.condition_id,
        outcomeIndex: outcome.outcome_index ?? OUTCOME_INDEX.YES,
        tokenId: outcome.token_id,
      })),
    )
  }, [event])

  const descriptorKey = useMemo(() => outcomeDescriptors.map(descriptor => `${descriptor.conditionId}:${descriptor.tokenId}`).join('|'), [outcomeDescriptors])

  const query = useQuery({
    queryKey: ['user-conditional-shares', ownerAddress, event?.slug, descriptorKey],
    enabled: Boolean(ownerAddress && outcomeDescriptors.length),
    staleTime: 10_000,
    gcTime: 5 * 60 * 1000,
    refetchInterval: 10_000,
    refetchIntervalInBackground: true,
    queryFn: async (): Promise<SharesByCondition> => {
      if (!ownerAddress || !outcomeDescriptors.length) {
        return {}
      }

      const owners = outcomeDescriptors.map(() => ownerAddress)
      const tokenIds = outcomeDescriptors.map(descriptor => BigInt(descriptor.tokenId))

      const balances = await client.readContract({
        address: CONDITIONAL_TOKENS_CONTRACT,
        abi: erc1155Abi,
        functionName: 'balanceOfBatch',
        args: [owners, tokenIds],
      }) as bigint[]

      return outcomeDescriptors.reduce<SharesByCondition>((acc, descriptor, index) => {
        const normalizedShares = normalizeSharesFromBalance(balances[index] ?? 0n)

        if (!acc[descriptor.conditionId]) {
          acc[descriptor.conditionId] = {
            [OUTCOME_INDEX.YES]: 0,
            [OUTCOME_INDEX.NO]: 0,
          }
        }

        const outcomeKey = descriptor.outcomeIndex === OUTCOME_INDEX.NO
          ? OUTCOME_INDEX.NO
          : OUTCOME_INDEX.YES

        acc[descriptor.conditionId][outcomeKey] = normalizedShares
        return acc
      }, {})
    },
  })

  const sharesByCondition = useMemo(() => query.data ?? {}, [query.data])

  return {
    ...query,
    sharesByCondition,
  }
}
