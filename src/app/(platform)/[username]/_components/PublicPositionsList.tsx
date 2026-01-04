'use client'

import type { PublicPosition } from './PublicPositionItem'
import type { SortOption } from '@/app/(platform)/[username]/_types/PublicPositionsTypes'
import { useAppKitAccount } from '@reown/appkit/react'
import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSignMessage, useSignTypedData } from 'wagmi'
import { useMergePositionsAction } from '@/app/(platform)/[username]/_hooks/useMergePositionsAction'
import { usePublicPositionsQuery } from '@/app/(platform)/[username]/_hooks/usePublicPositionsQuery'
import { buildMergeableMarkets, calculatePositionsTotals, getOutcomeLabel, matchesPositionsSearchQuery, sortPositions } from '@/app/(platform)/[username]/_utils/PublicPositionsUtils'
import { handleOrderCancelledFeedback, handleOrderErrorFeedback, handleOrderSuccessFeedback, handleValidationError, notifyWalletApprovalPrompt } from '@/app/(platform)/event/[slug]/_components/feedback'
import { calculateMarketFill, normalizeBookLevels } from '@/app/(platform)/event/[slug]/_utils/EventOrderPanelUtils'
import { PositionShareDialog } from '@/components/PositionShareDialog'
import SellPositionModal from '@/components/SellPositionModal'
import { useAffiliateOrderMetadata } from '@/hooks/useAffiliateOrderMetadata'
import { useAppKit } from '@/hooks/useAppKit'
import { useDebounce } from '@/hooks/useDebounce'
import { getExchangeEip712Domain, ORDER_SIDE, ORDER_TYPE, OUTCOME_INDEX } from '@/lib/constants'
import { fetchOrderBookSummary } from '@/lib/event-card-orderbook'
import { formatAmountInputValue, formatCentsLabel } from '@/lib/formatters'
import { buildOrderPayload, submitOrder } from '@/lib/orders'
import { signOrderPayload } from '@/lib/orders/signing'
import { buildShareCardPayload } from '@/lib/share-card'
import { isTradingAuthRequiredError } from '@/lib/trading-auth/errors'
import { isUserRejectedRequestError, normalizeAddress } from '@/lib/wallet'
import { useTradingOnboarding } from '@/providers/TradingOnboardingProvider'
import { useUser } from '@/stores/useUser'
import { MergePositionsDialog } from './MergePositionsDialog'
import PublicPositionsFilters from './PublicPositionsFilters'
import PublicPositionsTable from './PublicPositionsTable'

interface PublicPositionsListProps {
  userAddress: string
}

export default function PublicPositionsList({ userAddress }: PublicPositionsListProps) {
  const rowGridClass = 'grid grid-cols-[minmax(0,2.2fr)_repeat(4,minmax(0,1fr))_auto] items-center gap-4'
  const queryClient = useQueryClient()
  const router = useRouter()
  const { open, close } = useAppKit()
  const { isConnected, embeddedWalletInfo } = useAppKitAccount()
  const { signTypedDataAsync } = useSignTypedData()
  const { ensureTradingReady, openTradeRequirements } = useTradingOnboarding()
  const affiliateMetadata = useAffiliateOrderMetadata()
  const user = useUser()
  const { signMessageAsync } = useSignMessage()
  const hasDeployedProxyWallet = Boolean(user?.proxy_wallet_address && user?.proxy_wallet_status === 'deployed')
  const proxyWalletAddress = hasDeployedProxyWallet ? normalizeAddress(user?.proxy_wallet_address) : null
  const userAddressNormalized = normalizeAddress(user?.address)
  const makerAddress = proxyWalletAddress ?? null
  const signatureType = proxyWalletAddress ? 2 : 0
  const canSell = Boolean(
    hasDeployedProxyWallet
    && user?.proxy_wallet_address
    && user.proxy_wallet_address.toLowerCase() === userAddress.toLowerCase(),
  )

  const marketStatusFilter: 'active' | 'closed' = 'active'
  const [searchQuery, setSearchQuery] = useState('')
  const debouncedSearchQuery = useDebounce(searchQuery, 300)
  const [sortBy, setSortBy] = useState<SortOption>('currentValue')
  const minAmountFilter = 'All'
  const [infiniteScrollError, setInfiniteScrollError] = useState<string | null>(null)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const [isMergeDialogOpen, setIsMergeDialogOpen] = useState(false)
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false)
  const [sharePosition, setSharePosition] = useState<PublicPosition | null>(null)
  const [sellModalPayload, setSellModalPayload] = useState<{
    position: PublicPosition
    shares: number
    filledShares: number | null
    avgPriceCents: number | null
    limitPriceCents: number | null
    receiveAmount: number | null
    tokenId: string | null
    isNegRisk: boolean
  } | null>(null)
  const [isCashOutSubmitting, setIsCashOutSubmitting] = useState(false)
  const loadMoreRef = useRef<HTMLDivElement | null>(null)
  const sellRequestIdRef = useRef(0)

  const handleSearchChange = useCallback((query: string) => {
    setInfiniteScrollError(null)
    setIsLoadingMore(false)
    setRetryCount(0)
    setSearchQuery(query)
  }, [])

  const handleSortChange = useCallback((value: SortOption) => {
    setSortBy(value)
  }, [])

  useEffect(() => {
    queueMicrotask(() => {
      setInfiniteScrollError(null)
      setIsLoadingMore(false)
      setSearchQuery('')
      setRetryCount(0)
    })
  }, [userAddress])

  const {
    status,
    data,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
    refetch,
  } = usePublicPositionsQuery({
    userAddress,
    status: marketStatusFilter,
    minAmountFilter,
    sortBy,
    searchQuery: debouncedSearchQuery,
  })

  const positions = useMemo(
    () => data?.pages.flat() ?? [],
    [data?.pages],
  )

  const visiblePositions = useMemo(
    () => positions.filter(position => matchesPositionsSearchQuery(position, debouncedSearchQuery)),
    [debouncedSearchQuery, positions],
  )

  const sortedPositions = useMemo(
    () => sortPositions(visiblePositions, sortBy),
    [sortBy, visiblePositions],
  )

  const loading = status === 'pending'
  const hasInitialError = status === 'error'

  const isSearchActive = debouncedSearchQuery.trim().length > 0
  const mergeableMarkets = useMemo(
    () => buildMergeableMarkets(positions),
    [positions],
  )
  const positionsByCondition = useMemo(() => {
    const map: Record<string, Record<typeof OUTCOME_INDEX.YES | typeof OUTCOME_INDEX.NO, number>> = {}

    positions
      .filter(position => position.status === 'active' && position.conditionId)
      .forEach((position) => {
        const conditionId = position.conditionId as string
        const outcomeIndex = position.outcomeIndex === OUTCOME_INDEX.NO ? OUTCOME_INDEX.NO : OUTCOME_INDEX.YES
        const size = typeof position.size === 'number' ? position.size : 0
        if (!map[conditionId]) {
          map[conditionId] = {
            [OUTCOME_INDEX.YES]: 0,
            [OUTCOME_INDEX.NO]: 0,
          }
        }
        map[conditionId][outcomeIndex] += size
      })

    return map
  }, [positions])
  const hasMergeableMarkets = mergeableMarkets.length > 0

  const { isMergeProcessing, handleMergeAll } = useMergePositionsAction({
    mergeableMarkets,
    positionsByCondition,
    hasMergeableMarkets,
    user,
    ensureTradingReady,
    queryClient,
    signMessageAsync,
    onSuccess: () => setIsMergeDialogOpen(false),
  })

  const shareCardPayload = useMemo(() => {
    if (!sharePosition) {
      return null
    }

    return buildShareCardPayload(sharePosition, {
      userName: user?.username || undefined,
      userImage: user?.image || undefined,
    })
  }, [sharePosition, user?.image, user?.username])

  const handleShareOpenChange = useCallback((open: boolean) => {
    setIsShareDialogOpen(open)
    if (!open) {
      setSharePosition(null)
    }
  }, [])

  const handleShareClick = useCallback((position: PublicPosition) => {
    setSharePosition(position)
    setIsShareDialogOpen(true)
  }, [])

  const resolveOutcomeIndex = useCallback((position: PublicPosition) => {
    if (typeof position.outcomeIndex === 'number') {
      return position.outcomeIndex
    }

    return getOutcomeLabel(position).toLowerCase().includes('no')
      ? OUTCOME_INDEX.NO
      : OUTCOME_INDEX.YES
  }, [])

  const handleSellClick = useCallback(async (position: PublicPosition) => {
    const shares = typeof position.size === 'number' ? position.size : 0
    if (!shares) {
      return
    }

    const requestId = sellRequestIdRef.current + 1
    sellRequestIdRef.current = requestId
    const resolvedOutcomeIndex = resolveOutcomeIndex(position)

    setSellModalPayload({
      position,
      shares,
      filledShares: null,
      avgPriceCents: null,
      limitPriceCents: null,
      receiveAmount: null,
      tokenId: position.asset ?? null,
      isNegRisk: false,
    })

    const eventSlug = position.eventSlug || position.slug
    let tokenId = position.asset ?? null
    let isNegRisk = false

    if (eventSlug && position.conditionId) {
      try {
        const response = await fetch(
          `/api/events/${encodeURIComponent(eventSlug)}/market-metadata?conditionId=${encodeURIComponent(position.conditionId)}`,
        )
        if (response.ok) {
          const payload = await response.json()
          const outcomes = payload?.data?.outcomes ?? []
          isNegRisk = Boolean(payload?.data?.event_enable_neg_risk || payload?.data?.neg_risk)
          const matchedOutcome = outcomes.find((outcome: { outcome_index?: number }) =>
            outcome.outcome_index === resolvedOutcomeIndex,
          )
          tokenId = matchedOutcome?.token_id ?? tokenId
          setSellModalPayload((current) => {
            if (!current || current.position.id !== position.id || sellRequestIdRef.current !== requestId) {
              return current
            }
            return {
              ...current,
              tokenId,
              isNegRisk,
            }
          })
        }
      }
      catch (error) {
        console.error('Failed to resolve token id for sell preview.', error)
      }
    }

    if (!tokenId) {
      if (sellRequestIdRef.current === requestId) {
        setSellModalPayload(null)
        handleOrderErrorFeedback('Sell unavailable', 'Market data is unavailable.')
      }
      return
    }

    try {
      const summary = await fetchOrderBookSummary(tokenId)
      if (sellRequestIdRef.current !== requestId) {
        return
      }

      const bids = normalizeBookLevels(summary?.bids, 'bid')
      const asks = normalizeBookLevels(summary?.asks, 'ask')
      const fill = calculateMarketFill(ORDER_SIDE.SELL, shares, bids, asks)

      setSellModalPayload((current) => {
        if (!current || current.position.id !== position.id || sellRequestIdRef.current !== requestId) {
          return current
        }
        return {
          ...current,
          filledShares: fill.filledShares,
          avgPriceCents: fill.avgPriceCents,
          limitPriceCents: fill.limitPriceCents ?? null,
          receiveAmount: fill.totalCost > 0 ? fill.totalCost : null,
        }
      })
    }
    catch (error) {
      console.error('Failed to load order book for sell preview.', error)
      if (sellRequestIdRef.current === requestId) {
        handleOrderErrorFeedback('Order book unavailable', 'Please try again in a moment.')
      }
    }
  }, [resolveOutcomeIndex])

  const handleSellModalChange = useCallback((open: boolean) => {
    if (!open) {
      setSellModalPayload(null)
    }
  }, [])

  const handleEditOrder = useCallback(() => {
    if (!sellModalPayload) {
      return
    }

    const { position, shares } = sellModalPayload
    const eventSlug = position.eventSlug || position.slug
    if (!eventSlug) {
      setSellModalPayload(null)
      return
    }

    const resolvedOutcomeIndex = resolveOutcomeIndex(position)

    const params = new URLSearchParams()
    params.set('side', 'SELL')
    params.set('orderType', 'Market')
    params.set('outcomeIndex', resolvedOutcomeIndex.toString())
    params.set('shares', formatAmountInputValue(shares))
    if (position.conditionId) {
      params.set('conditionId', position.conditionId)
    }

    setSellModalPayload(null)
    router.push(`/event/${eventSlug}?${params.toString()}`)
  }, [resolveOutcomeIndex, router, sellModalPayload])

  const handleCashOut = useCallback(async () => {
    if (!sellModalPayload || isCashOutSubmitting) {
      return
    }

    const {
      position,
      shares,
      tokenId,
      isNegRisk,
      limitPriceCents,
      avgPriceCents,
      receiveAmount,
      filledShares,
    } = sellModalPayload
    const eventSlug = position.eventSlug || position.slug
    const marketPriceCents = typeof limitPriceCents === 'number' && Number.isFinite(limitPriceCents)
      ? limitPriceCents
      : (typeof avgPriceCents === 'number' && Number.isFinite(avgPriceCents) ? avgPriceCents : null)

    if (!marketPriceCents || (filledShares ?? 0) <= 0) {
      if (eventSlug) {
        handleEditOrder()
        return
      }
      handleOrderErrorFeedback('Trade failed', 'No liquidity for this market order.')
      return
    }

    if (!ensureTradingReady()) {
      return
    }

    if (!isConnected) {
      handleValidationError('NOT_CONNECTED', { openWalletModal: open })
      return
    }

    if (!user) {
      handleValidationError('MISSING_USER', { openWalletModal: open })
      return
    }

    if (!userAddressNormalized || !makerAddress) {
      handleOrderErrorFeedback('Trade failed', 'Wallet not ready for trading.')
      return
    }

    const conditionId = position.conditionId ?? null
    if (!tokenId || !conditionId || !eventSlug) {
      handleOrderErrorFeedback('Trade failed', 'Market data is unavailable.')
      return
    }

    const effectiveShares = formatAmountInputValue(shares)
    if (!effectiveShares) {
      handleOrderErrorFeedback('Trade failed', 'Invalid share amount.')
      return
    }

    const outcomeIndex = resolveOutcomeIndex(position)
    const outcomeText = getOutcomeLabel(position)
    const timestamp = new Date().toISOString()

    const outcomePayload = {
      id: `portfolio-${tokenId}`,
      condition_id: conditionId,
      outcome_text: outcomeText,
      outcome_index: outcomeIndex,
      token_id: tokenId,
      is_winning_outcome: false,
      created_at: timestamp,
      updated_at: timestamp,
    }

    const orderDomain = getExchangeEip712Domain(isNegRisk)
    const payload = buildOrderPayload({
      userAddress: userAddressNormalized,
      makerAddress,
      signatureType,
      outcome: outcomePayload,
      side: ORDER_SIDE.SELL,
      orderType: ORDER_TYPE.MARKET,
      amount: effectiveShares,
      limitPrice: '0',
      limitShares: '0',
      marketPriceCents,
      feeRateBps: affiliateMetadata.tradeFeeBps,
    })

    let signature: string
    try {
      signature = await signOrderPayload({
        payload,
        domain: orderDomain,
        signTypedDataAsync,
        openAppKit: open,
        closeAppKit: close,
        embeddedWalletInfo,
        onWalletApprovalPrompt: notifyWalletApprovalPrompt,
      })
    }
    catch (error) {
      if (isUserRejectedRequestError(error)) {
        handleOrderCancelledFeedback()
        return
      }
      handleOrderErrorFeedback('Trade failed', 'We could not sign your order. Please try again.')
      return
    }

    setIsCashOutSubmitting(true)
    try {
      const result = await submitOrder({
        order: payload,
        signature,
        orderType: ORDER_TYPE.MARKET,
        conditionId,
        slug: eventSlug,
      })

      if (result?.error) {
        if (isTradingAuthRequiredError(result.error)) {
          openTradeRequirements()
          handleOrderErrorFeedback('Trade failed', 'Complete trading setup to continue.')
        }
        else {
          handleOrderErrorFeedback('Trade failed', result.error)
        }
        return
      }

      const avgSellPriceLabel = formatCentsLabel(marketPriceCents / 100, { fallback: '—' })
      handleOrderSuccessFeedback({
        side: ORDER_SIDE.SELL,
        amountInput: effectiveShares,
        sellSharesLabel: effectiveShares,
        isLimitOrder: false,
        outcomeText,
        eventTitle: position.title,
        marketImage: position.icon ? `https://gateway.irys.xyz/${position.icon}` : undefined,
        marketTitle: position.title,
        sellAmountValue: receiveAmount ?? 0,
        avgSellPrice: avgSellPriceLabel,
        queryClient,
        outcomeIndex,
        lastMouseEvent: null,
      })

      void queryClient.invalidateQueries({ queryKey: ['user-positions'] })
      void queryClient.invalidateQueries({ queryKey: ['portfolio-value'] })
      setSellModalPayload(null)
    }
    catch {
      handleOrderErrorFeedback('Trade failed', 'An unexpected error occurred. Please try again.')
    }
    finally {
      setIsCashOutSubmitting(false)
    }
  }, [
    affiliateMetadata.tradeFeeBps,
    close,
    embeddedWalletInfo,
    ensureTradingReady,
    handleEditOrder,
    openTradeRequirements,
    isCashOutSubmitting,
    isConnected,
    makerAddress,
    open,
    queryClient,
    resolveOutcomeIndex,
    sellModalPayload,
    signTypedDataAsync,
    user,
    userAddressNormalized,
  ])

  useEffect(() => {
    setInfiniteScrollError(null)
    setIsLoadingMore(false)

    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [debouncedSearchQuery, minAmountFilter, marketStatusFilter, sortBy])

  useEffect(() => {
    if (!hasNextPage || !loadMoreRef.current) {
      return undefined
    }

    const observer = new IntersectionObserver((entries) => {
      const [entry] = entries
      if (entry?.isIntersecting && !isFetchingNextPage && !isLoadingMore && !infiniteScrollError) {
        setIsLoadingMore(true)
        fetchNextPage()
          .then(() => {
            setIsLoadingMore(false)
            setRetryCount(0)
          })
          .catch((error) => {
            setIsLoadingMore(false)
            if (error.name !== 'AbortError') {
              setInfiniteScrollError(error.message || 'Failed to load more positions')
            }
          })
      }
    }, { rootMargin: '200px' })

    observer.observe(loadMoreRef.current)

    return () => observer.disconnect()
  }, [fetchNextPage, hasNextPage, infiniteScrollError, isFetchingNextPage, isLoadingMore])

  const retryInitialLoad = useCallback(() => {
    const currentRetryCount = retryCount + 1
    setRetryCount(currentRetryCount)
    setInfiniteScrollError(null)
    setIsLoadingMore(false)

    const delay = Math.min(1000 * 2 ** (currentRetryCount - 1), 8000)

    setTimeout(() => {
      void refetch()
    }, delay)
  }, [refetch, retryCount])

  const totals = useMemo(
    () => calculatePositionsTotals(visiblePositions),
    [visiblePositions],
  )

  return (
    <div className="space-y-3 pb-0">
      <PublicPositionsFilters
        searchQuery={searchQuery}
        sortBy={sortBy}
        onSearchChange={handleSearchChange}
        onSortChange={handleSortChange}
        showMergeButton={hasMergeableMarkets && marketStatusFilter === 'active'}
        onMergeClick={() => setIsMergeDialogOpen(true)}
      />

      <PublicPositionsTable
        rowGridClass={rowGridClass}
        positions={sortedPositions}
        totals={totals}
        isLoading={loading}
        hasInitialError={hasInitialError}
        isSearchActive={isSearchActive}
        searchQuery={debouncedSearchQuery}
        retryCount={retryCount}
        marketStatusFilter={marketStatusFilter}
        onRetry={retryInitialLoad}
        onRefreshPage={() => window.location.reload()}
        onShareClick={handleShareClick}
        onSellClick={canSell ? handleSellClick : undefined}
        loadMoreRef={loadMoreRef}
      />

      {(isFetchingNextPage || isLoadingMore) && (
        <div className="py-4 text-center text-xs text-muted-foreground">Loading more...</div>
      )}

      {infiniteScrollError && (
        <div className="py-4 text-center text-xs text-no">
          {infiniteScrollError}
          {' '}
          <button type="button" onClick={retryInitialLoad} className="underline underline-offset-2">
            Retry
          </button>
        </div>
      )}

      <MergePositionsDialog
        open={isMergeDialogOpen}
        onOpenChange={setIsMergeDialogOpen}
        markets={mergeableMarkets}
        isProcessing={isMergeProcessing}
        onConfirm={handleMergeAll}
      />

      <PositionShareDialog
        open={isShareDialogOpen}
        onOpenChange={handleShareOpenChange}
        payload={shareCardPayload}
      />

      {sellModalPayload && (
        <SellPositionModal
          open={Boolean(sellModalPayload)}
          onOpenChange={handleSellModalChange}
          outcomeLabel={getOutcomeLabel(sellModalPayload.position)}
          outcomeShortLabel={sellModalPayload.position.title}
          outcomeIconUrl={sellModalPayload.position.icon
            ? `https://gateway.irys.xyz/${sellModalPayload.position.icon}`
            : undefined}
          shares={sellModalPayload.shares}
          filledShares={sellModalPayload.filledShares}
          avgPriceCents={sellModalPayload.avgPriceCents}
          receiveAmount={sellModalPayload.receiveAmount}
          onCashOut={handleCashOut}
          onEditOrder={handleEditOrder}
        />
      )}
    </div>
  )
}
