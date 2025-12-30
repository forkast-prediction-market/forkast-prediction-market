import type { QueryClient } from '@tanstack/react-query'
import type { MergeableMarket } from '@/app/(platform)/[username]/_components/MergePositionsDialog'
import type { ConditionShares } from '@/app/(platform)/[username]/_types/PublicPositionsTypes'
import type { SafeTransactionRequestPayload } from '@/lib/safe/transactions'
import type { User } from '@/types'
import { useCallback, useState } from 'react'
import { toast } from 'sonner'
import { hashTypedData } from 'viem'
import { getSafeNonceAction, submitSafeTransactionAction } from '@/app/(platform)/_actions/approve-tokens'
import { SAFE_BALANCE_QUERY_KEY } from '@/hooks/useBalance'
import { defaultNetwork } from '@/lib/appkit'
import { DEFAULT_CONDITION_PARTITION, DEFAULT_ERROR_MESSAGE, OUTCOME_INDEX } from '@/lib/constants'
import { ZERO_COLLECTION_ID } from '@/lib/contracts'
import { toMicro } from '@/lib/formatters'
import { aggregateSafeTransactions, buildMergePositionTransaction, getSafeTxTypedData, packSafeSignature } from '@/lib/safe/transactions'
import { fetchLockedSharesByCondition } from '../_utils/PublicPositionsUtils'

interface UseMergePositionsActionOptions {
  mergeableMarkets: MergeableMarket[]
  positionsByCondition: Record<string, ConditionShares>
  hasMergeableMarkets: boolean
  user: User | null
  ensureTradingReady: () => boolean
  queryClient: QueryClient
  signMessageAsync: (args: { message: { raw: `0x${string}` } }) => Promise<`0x${string}`>
  onSuccess?: () => void
}

export function useMergePositionsAction({
  mergeableMarkets,
  positionsByCondition,
  hasMergeableMarkets,
  user,
  ensureTradingReady,
  queryClient,
  signMessageAsync,
  onSuccess,
}: UseMergePositionsActionOptions) {
  const [isMergeProcessing, setIsMergeProcessing] = useState(false)

  const handleMergeAll = useCallback(async () => {
    if (!hasMergeableMarkets) {
      toast.info('No mergeable positions available right now.')
      return
    }

    if (!ensureTradingReady()) {
      return
    }

    if (!user?.proxy_wallet_address || !user?.address) {
      toast.error('Deploy your proxy wallet before merging shares.')
      return
    }

    const lockedSharesByCondition = await fetchLockedSharesByCondition(mergeableMarkets)

    const preparedMerges = mergeableMarkets
      .filter(market => market.mergeAmount > 0 && market.conditionId)
      .map((market) => {
        const conditionId = market.conditionId as string
        const positionShares = positionsByCondition[conditionId]
        if (!positionShares) {
          return null
        }

        const locked = lockedSharesByCondition[conditionId] ?? {
          [OUTCOME_INDEX.YES]: 0,
          [OUTCOME_INDEX.NO]: 0,
        }
        const availableYes = Math.max(0, positionShares[OUTCOME_INDEX.YES] - locked[OUTCOME_INDEX.YES])
        const availableNo = Math.max(0, positionShares[OUTCOME_INDEX.NO] - locked[OUTCOME_INDEX.NO])
        const safeMergeAmount = Math.min(market.mergeAmount, availableYes, availableNo)

        if (!Number.isFinite(safeMergeAmount) || safeMergeAmount <= 0) {
          return null
        }

        return {
          conditionId,
          mergeAmount: safeMergeAmount,
        }
      })
      .filter((entry): entry is { conditionId: string, mergeAmount: number } => Boolean(entry))

    if (preparedMerges.length === 0) {
      toast.info('No eligible pairs to merge.')
      return
    }

    const transactions = preparedMerges.map(entry =>
      buildMergePositionTransaction({
        conditionId: entry.conditionId as `0x${string}`,
        partition: [...DEFAULT_CONDITION_PARTITION],
        amount: toMicro(entry.mergeAmount),
        parentCollectionId: ZERO_COLLECTION_ID,
      }),
    )

    if (transactions.length === 0) {
      toast.info('No eligible pairs to merge.')
      return
    }

    setIsMergeProcessing(true)

    try {
      const nonceResult = await getSafeNonceAction()
      if (nonceResult.error || !nonceResult.nonce) {
        toast.error(nonceResult.error ?? DEFAULT_ERROR_MESSAGE)
        return
      }

      const aggregated = aggregateSafeTransactions(transactions)
      const typedData = getSafeTxTypedData({
        chainId: defaultNetwork.id,
        safeAddress: user.proxy_wallet_address as `0x${string}`,
        transaction: aggregated,
        nonce: nonceResult.nonce,
      })

      const { signatureParams, ...safeTypedData } = typedData
      const structHash = hashTypedData({
        domain: safeTypedData.domain,
        types: safeTypedData.types,
        primaryType: safeTypedData.primaryType,
        message: safeTypedData.message,
      }) as `0x${string}`

      const signature = await signMessageAsync({
        message: { raw: structHash },
      })

      const payload: SafeTransactionRequestPayload = {
        type: 'SAFE',
        from: user.address,
        to: aggregated.to,
        proxyWallet: user.proxy_wallet_address,
        data: aggregated.data,
        nonce: nonceResult.nonce,
        signature: packSafeSignature(signature as `0x${string}`),
        signatureParams,
        metadata: 'merge_position',
      }

      const response = await submitSafeTransactionAction(payload)

      if (response?.error) {
        toast.error(response.error)
        return
      }

      toast.success('Merge submitted', {
        description: 'We sent a merge transaction for your eligible positions.',
      })

      onSuccess?.()

      void queryClient.invalidateQueries({ queryKey: ['user-positions'] })
      void queryClient.invalidateQueries({ queryKey: [SAFE_BALANCE_QUERY_KEY] })
      void queryClient.invalidateQueries({ queryKey: ['user-conditional-shares'] })
      void queryClient.refetchQueries({ queryKey: ['user-conditional-shares'], type: 'active' })

      setTimeout(() => {
        void queryClient.invalidateQueries({ queryKey: ['user-positions'] })
        void queryClient.invalidateQueries({ queryKey: [SAFE_BALANCE_QUERY_KEY] })
        void queryClient.invalidateQueries({ queryKey: ['user-conditional-shares'] })
      }, 3000)
    }
    catch (error) {
      console.error('Failed to submit merge operation.', error)
      toast.error('We could not submit your merge request. Please try again.')
    }
    finally {
      setIsMergeProcessing(false)
    }
  }, [
    ensureTradingReady,
    hasMergeableMarkets,
    mergeableMarkets,
    onSuccess,
    positionsByCondition,
    queryClient,
    signMessageAsync,
    user?.address,
    user?.proxy_wallet_address,
  ])

  return {
    isMergeProcessing,
    handleMergeAll,
  }
}
