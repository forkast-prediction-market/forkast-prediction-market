import type { Event } from '@/types'
import { useAppKitAccount } from '@reown/appkit/react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { TriangleAlertIcon } from 'lucide-react'
import Form from 'next/form'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useSignTypedData } from 'wagmi'
import { useOrderBookSummaries } from '@/app/(platform)/event/[slug]/_components/EventOrderBook'
import EventOrderPanelBuySellTabs from '@/app/(platform)/event/[slug]/_components/EventOrderPanelBuySellTabs'
import EventOrderPanelEarnings from '@/app/(platform)/event/[slug]/_components/EventOrderPanelEarnings'
import EventOrderPanelInput from '@/app/(platform)/event/[slug]/_components/EventOrderPanelInput'
import EventOrderPanelLimitControls from '@/app/(platform)/event/[slug]/_components/EventOrderPanelLimitControls'
import EventOrderPanelMarketInfo from '@/app/(platform)/event/[slug]/_components/EventOrderPanelMarketInfo'
import EventOrderPanelMobileMarketInfo from '@/app/(platform)/event/[slug]/_components/EventOrderPanelMobileMarketInfo'
import EventOrderPanelOutcomeButton from '@/app/(platform)/event/[slug]/_components/EventOrderPanelOutcomeButton'
import EventOrderPanelSubmitButton from '@/app/(platform)/event/[slug]/_components/EventOrderPanelSubmitButton'
import EventOrderPanelTermsDisclaimer from '@/app/(platform)/event/[slug]/_components/EventOrderPanelTermsDisclaimer'
import EventOrderPanelUserShares from '@/app/(platform)/event/[slug]/_components/EventOrderPanelUserShares'
import { handleOrderCancelledFeedback, handleOrderErrorFeedback, handleOrderSuccessFeedback, handleValidationError, notifyWalletApprovalPrompt } from '@/app/(platform)/event/[slug]/_components/feedback'
import { buildUserOpenOrdersQueryKey, useUserOpenOrdersQuery } from '@/app/(platform)/event/[slug]/_hooks/useUserOpenOrdersQuery'
import { useUserShareBalances } from '@/app/(platform)/event/[slug]/_hooks/useUserShareBalances'
import { Button } from '@/components/ui/button'
import { useAffiliateOrderMetadata } from '@/hooks/useAffiliateOrderMetadata'
import { useAppKit } from '@/hooks/useAppKit'
import { SAFE_BALANCE_QUERY_KEY, useBalance } from '@/hooks/useBalance'
import { CLOB_ORDER_TYPE, getExchangeEip712Domain, MICRO_UNIT, ORDER_SIDE, ORDER_TYPE, OUTCOME_INDEX } from '@/lib/constants'
import { fetchUserPositionsForMarket } from '@/lib/data-api/user'
import { formatCentsLabel, formatCurrency, toCents } from '@/lib/formatters'
import { buildOrderPayload, submitOrder } from '@/lib/orders'
import { signOrderPayload } from '@/lib/orders/signing'
import { MIN_LIMIT_ORDER_SHARES, validateOrder } from '@/lib/orders/validation'
import { isTradingAuthRequiredError } from '@/lib/trading-auth/errors'
import { cn } from '@/lib/utils'
import { isUserRejectedRequestError, normalizeAddress } from '@/lib/wallet'
import { useTradingOnboarding } from '@/providers/TradingOnboardingProvider'
import { useAmountAsNumber, useIsLimitOrder, useIsSingleMarket, useNoPrice, useOrder, useYesPrice } from '@/stores/useOrder'
import { useUser } from '@/stores/useUser'

interface EventOrderPanelFormProps {
  isMobile: boolean
  event: Event
}

function normalizeShares(value?: number) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    return 0
  }

  return value > 100_000 ? value / MICRO_UNIT : value
}

interface NormalizedBookLevel {
  priceCents: number
  priceDollars: number
  size: number
}

const MAX_LIMIT_PRICE = 99.9
const PRICE_EPSILON = 1e-8

function getRoundedCents(rawPrice: number, side: 'ask' | 'bid') {
  const cents = rawPrice * 100
  if (!Number.isFinite(cents)) {
    return 0
  }

  const scaled = cents * 10
  const roundedScaled = side === 'bid'
    ? Math.floor(scaled + PRICE_EPSILON)
    : Math.ceil(scaled - PRICE_EPSILON)

  const normalized = Math.max(0, Math.min(roundedScaled / 10, MAX_LIMIT_PRICE))
  return Number(normalized.toFixed(1))
}

function normalizeBookLevels(levels: { price?: string, size?: string }[] | undefined, side: 'ask' | 'bid'): NormalizedBookLevel[] {
  if (!levels?.length) {
    return []
  }

  const parsed = levels
    .map((entry) => {
      const price = Number(entry.price)
      const size = Number(entry.size)
      if (!Number.isFinite(price) || !Number.isFinite(size) || price <= 0 || size <= 0) {
        return null
      }

      const priceCents = getRoundedCents(price, side)
      const priceDollars = priceCents / 100
      if (priceCents <= 0 || priceDollars <= 0) {
        return null
      }

      return {
        priceCents,
        priceDollars,
        size: Number(size.toFixed(2)),
      }
    })
    .filter((entry): entry is NormalizedBookLevel => entry !== null)

  return parsed.sort((a, b) => (side === 'ask' ? a.priceDollars - b.priceDollars : b.priceDollars - a.priceDollars))
}

function calculateMarketFill(
  side: typeof ORDER_SIDE.BUY | typeof ORDER_SIDE.SELL,
  value: number,
  bids: NormalizedBookLevel[],
  asks: NormalizedBookLevel[],
) {
  const levels = side === ORDER_SIDE.SELL ? bids : asks
  if (!levels.length || value <= 0) {
    return {
      avgPriceCents: null as number | null,
      limitPriceCents: null as number | null,
      filledShares: 0,
      totalCost: 0,
    }
  }

  let remainingShares = side === ORDER_SIDE.SELL ? value : 0
  let remainingBudget = side === ORDER_SIDE.BUY ? value : 0
  let filledShares = 0
  let totalCost = 0
  let limitPriceCents: number | null = null

  for (const level of levels) {
    if (side === ORDER_SIDE.SELL && remainingShares <= 0) {
      break
    }
    if (side === ORDER_SIDE.BUY && remainingBudget <= 0) {
      break
    }

    if (side === ORDER_SIDE.SELL) {
      const fill = Math.min(level.size, remainingShares)
      if (fill <= 0) {
        continue
      }
      const cost = fill * level.priceDollars
      filledShares = Number((filledShares + fill).toFixed(4))
      totalCost = Number((totalCost + cost).toFixed(4))
      remainingShares = Math.max(0, Number((remainingShares - fill).toFixed(4)))
      limitPriceCents = level.priceCents
    }
    else {
      const maxSharesAtLevel = level.priceDollars > 0 ? remainingBudget / level.priceDollars : 0
      const fill = Math.min(level.size, maxSharesAtLevel)
      if (fill <= 0) {
        continue
      }
      const cost = fill * level.priceDollars
      filledShares = Number((filledShares + fill).toFixed(4))
      totalCost = Number((totalCost + cost).toFixed(4))
      remainingBudget = Math.max(0, Number((remainingBudget - cost).toFixed(4)))
      limitPriceCents = level.priceCents
    }
  }

  const avgPriceCents = filledShares > 0
    ? Number(((totalCost / filledShares) * 100).toFixed(1))
    : null

  return {
    avgPriceCents,
    limitPriceCents,
    filledShares: Number(filledShares.toFixed(4)),
    totalCost: Number(totalCost.toFixed(4)),
  }
}

export default function EventOrderPanelForm({ event, isMobile }: EventOrderPanelFormProps) {
  const { open, close } = useAppKit()
  const { isConnected, embeddedWalletInfo } = useAppKitAccount()
  const { signTypedDataAsync } = useSignTypedData()
  const user = useUser()
  const state = useOrder()
  const setUserShares = useOrder(store => store.setUserShares)
  const queryClient = useQueryClient()
  const yesPrice = useYesPrice()
  const noPrice = useNoPrice()
  const isSingleMarket = useIsSingleMarket()
  const amountNumber = useAmountAsNumber()
  const isLimitOrder = useIsLimitOrder()
  const [showMarketMinimumWarning, setShowMarketMinimumWarning] = useState(false)
  const [showInsufficientSharesWarning, setShowInsufficientSharesWarning] = useState(false)
  const [showInsufficientBalanceWarning, setShowInsufficientBalanceWarning] = useState(false)
  const [showAmountTooLowWarning, setShowAmountTooLowWarning] = useState(false)
  const [shouldShakeInput, setShouldShakeInput] = useState(false)
  const [shouldShakeLimitShares, setShouldShakeLimitShares] = useState(false)
  const limitSharesInputRef = useRef<HTMLInputElement | null>(null)
  const limitSharesNumber = Number.parseFloat(state.limitShares) || 0
  const { balance } = useBalance()
  const outcomeTokenId = state.outcome?.token_id ? String(state.outcome.token_id) : null
  const orderBookSummaryQuery = useOrderBookSummaries(
    outcomeTokenId ? [outcomeTokenId] : [],
    { enabled: Boolean(outcomeTokenId && state.type === ORDER_TYPE.MARKET) },
  )
  const validCustomExpirationTimestamp = useMemo(() => {
    const nowSeconds = Math.floor(Date.now() / 1000)

    if (state.limitExpirationOption !== 'custom') {
      return null
    }

    if (
      !state.limitExpirationTimestamp
      || !Number.isFinite(state.limitExpirationTimestamp)
      || state.limitExpirationTimestamp <= 0
    ) {
      return null
    }

    return state.limitExpirationTimestamp > nowSeconds
      ? state.limitExpirationTimestamp
      : null
  }, [state.limitExpirationOption, state.limitExpirationTimestamp])
  const affiliateMetadata = useAffiliateOrderMetadata()
  const { ensureTradingReady, openTradeRequirements, startDepositFlow } = useTradingOnboarding()
  const hasDeployedProxyWallet = Boolean(user?.proxy_wallet_address && user?.proxy_wallet_status === 'deployed')
  const proxyWalletAddress = hasDeployedProxyWallet ? normalizeAddress(user?.proxy_wallet_address) : null
  const userAddress = normalizeAddress(user?.address)
  const makerAddress = proxyWalletAddress ?? userAddress ?? null
  const signatureType = proxyWalletAddress ? 2 : 0
  const { sharesByCondition } = useUserShareBalances({ event, ownerAddress: makerAddress })
  const openOrdersQueryKey = useMemo(
    () => buildUserOpenOrdersQueryKey(user?.id, event.slug, state.market?.condition_id),
    [event.slug, state.market?.condition_id, user?.id],
  )
  const openOrdersQuery = useUserOpenOrdersQuery({
    userId: user?.id,
    eventSlug: event.slug,
    conditionId: state.market?.condition_id,
    enabled: Boolean(user?.id && state.market?.condition_id),
  })
  const isNegRiskEnabled = Boolean(event.enable_neg_risk)
  const orderDomain = useMemo(() => getExchangeEip712Domain(isNegRiskEnabled), [isNegRiskEnabled])
  const endOfDayTimestamp = useMemo(() => {
    const now = new Date()
    now.setHours(23, 59, 59, 0)
    return Math.floor(now.getTime() / 1000)
  }, [])
  const [showLimitMinimumWarning, setShowLimitMinimumWarning] = useState(false)
  const positionsQuery = useQuery({
    queryKey: ['order-panel-user-positions', makerAddress, state.market?.condition_id],
    enabled: Boolean(makerAddress && state.market?.condition_id),
    staleTime: 1000 * 30,
    gcTime: 1000 * 60 * 5,
    refetchInterval: makerAddress ? 15_000 : false,
    refetchIntervalInBackground: true,
    queryFn: ({ signal }) =>
      fetchUserPositionsForMarket({
        pageParam: 0,
        userAddress: makerAddress!,
        conditionId: state.market?.condition_id,
        status: 'active',
        signal,
      }),
  })
  const aggregatedPositionShares = useMemo(() => {
    if (!positionsQuery.data?.length) {
      return null
    }

    return positionsQuery.data.reduce<Record<string, Record<typeof OUTCOME_INDEX.YES | typeof OUTCOME_INDEX.NO, number>>>((acc, position) => {
      const conditionId = position.market?.condition_id
      const quantity = typeof position.total_shares === 'number' ? position.total_shares : 0
      if (!conditionId || quantity <= 0) {
        return acc
      }

      const normalizedOutcome = position.outcome_text?.toLowerCase()
      const explicitOutcomeIndex = typeof position.outcome_index === 'number' ? position.outcome_index : undefined
      const resolvedOutcomeIndex = explicitOutcomeIndex != null
        ? explicitOutcomeIndex
        : normalizedOutcome === 'no'
          ? OUTCOME_INDEX.NO
          : OUTCOME_INDEX.YES

      if (!acc[conditionId]) {
        acc[conditionId] = {
          [OUTCOME_INDEX.YES]: 0,
          [OUTCOME_INDEX.NO]: 0,
        }
      }

      const bucket = resolvedOutcomeIndex === OUTCOME_INDEX.NO ? OUTCOME_INDEX.NO : OUTCOME_INDEX.YES
      acc[conditionId][bucket] += quantity
      return acc
    }, {})
  }, [positionsQuery.data])

  const openOrders = useMemo(
    () => openOrdersQuery.data?.pages?.flatMap(page => page) ?? [],
    [openOrdersQuery.data],
  )

  const normalizedOrderBook = useMemo(() => {
    const summary = outcomeTokenId ? orderBookSummaryQuery.data?.[outcomeTokenId] : undefined
    return {
      bids: normalizeBookLevels(summary?.bids, 'bid'),
      asks: normalizeBookLevels(summary?.asks, 'ask'),
    }
  }, [orderBookSummaryQuery.data, outcomeTokenId])

  const openSellSharesByCondition = useMemo(() => {
    if (!openOrders.length) {
      return {}
    }

    return openOrders.reduce<Record<string, Record<typeof OUTCOME_INDEX.YES | typeof OUTCOME_INDEX.NO, number>>>((acc, order) => {
      if (order.side !== 'sell' || !order.market?.condition_id) {
        return acc
      }

      const conditionId = order.market.condition_id
      const outcomeIndex = order.outcome?.index === OUTCOME_INDEX.NO ? OUTCOME_INDEX.NO : OUTCOME_INDEX.YES
      const totalShares = Math.max(
        normalizeShares(order.maker_amount),
        normalizeShares(order.taker_amount),
      )
      const filledShares = Math.max(normalizeShares(order.size_matched), 0)
      const remainingShares = Math.max(totalShares - Math.min(filledShares, totalShares), 0)

      if (remainingShares <= 0) {
        return acc
      }

      if (!acc[conditionId]) {
        acc[conditionId] = {
          [OUTCOME_INDEX.YES]: 0,
          [OUTCOME_INDEX.NO]: 0,
        }
      }

      acc[conditionId][outcomeIndex] += remainingShares
      return acc
    }, {})
  }, [openOrders])

  const lockedBuyCollateral = useMemo(() => {
    if (!openOrders.length) {
      return 0
    }

    return openOrders.reduce((acc, order) => {
      if (order.side !== 'buy') {
        return acc
      }

      const makerAmountMicro = BigInt(Math.max(0, Math.trunc(order.maker_amount || 0)))
      const takerAmountMicro = BigInt(Math.max(0, Math.trunc(order.taker_amount || 0)))
      const filledMicro = BigInt(Math.max(0, Math.trunc(order.size_matched || 0)))
      if (makerAmountMicro === 0n || takerAmountMicro === 0n) {
        return acc + (Number(makerAmountMicro) / MICRO_UNIT)
      }

      const filledRatio = filledMicro >= takerAmountMicro
        ? BigInt(MICRO_UNIT)
        : (filledMicro * BigInt(MICRO_UNIT)) / takerAmountMicro

      const remainingMaker = makerAmountMicro - ((makerAmountMicro * filledRatio) / BigInt(MICRO_UNIT))
      return acc + (Number(remainingMaker) / MICRO_UNIT)
    }, 0)
  }, [openOrders])

  const availableBalanceForOrders = Math.max(0, balance.raw - lockedBuyCollateral)

  const mergedSharesByCondition = useMemo(() => {
    const merged: Record<string, Record<typeof OUTCOME_INDEX.YES | typeof OUTCOME_INDEX.NO, number>> = {}
    const keys = new Set([
      ...Object.keys(sharesByCondition),
      ...Object.keys(aggregatedPositionShares ?? {}),
    ])

    keys.forEach((conditionId) => {
      merged[conditionId] = {
        [OUTCOME_INDEX.YES]: Math.max(
          sharesByCondition[conditionId]?.[OUTCOME_INDEX.YES] ?? 0,
          aggregatedPositionShares?.[conditionId]?.[OUTCOME_INDEX.YES] ?? 0,
        ),
        [OUTCOME_INDEX.NO]: Math.max(
          sharesByCondition[conditionId]?.[OUTCOME_INDEX.NO] ?? 0,
          aggregatedPositionShares?.[conditionId]?.[OUTCOME_INDEX.NO] ?? 0,
        ),
      }
    })

    return merged
  }, [aggregatedPositionShares, sharesByCondition])

  useEffect(() => {
    if (!makerAddress) {
      setUserShares({}, { replace: true })
      setShowMarketMinimumWarning(false)
      return
    }

    if (!Object.keys(mergedSharesByCondition).length) {
      setUserShares({}, { replace: true })
      return
    }

    setUserShares(mergedSharesByCondition, { replace: true })
  }, [makerAddress, mergedSharesByCondition, setUserShares])

  const conditionTokenShares = state.market ? state.userShares[state.market.condition_id] : undefined
  const conditionPositionShares = state.market ? aggregatedPositionShares?.[state.market.condition_id] : undefined
  const yesTokenShares = conditionTokenShares?.[OUTCOME_INDEX.YES] ?? 0
  const noTokenShares = conditionTokenShares?.[OUTCOME_INDEX.NO] ?? 0
  const yesPositionShares = conditionPositionShares?.[OUTCOME_INDEX.YES] ?? 0
  const noPositionShares = conditionPositionShares?.[OUTCOME_INDEX.NO] ?? 0
  const lockedYesShares = state.market ? openSellSharesByCondition[state.market.condition_id]?.[OUTCOME_INDEX.YES] ?? 0 : 0
  const lockedNoShares = state.market ? openSellSharesByCondition[state.market.condition_id]?.[OUTCOME_INDEX.NO] ?? 0 : 0
  const availableYesTokenShares = Math.max(0, yesTokenShares - lockedYesShares)
  const availableNoTokenShares = Math.max(0, noTokenShares - lockedNoShares)
  const availableYesPositionShares = Math.max(0, yesPositionShares - lockedYesShares)
  const availableNoPositionShares = Math.max(0, noPositionShares - lockedNoShares)
  const mergeableYesShares = Math.max(availableYesTokenShares, availableYesPositionShares)
  const mergeableNoShares = Math.max(availableNoTokenShares, availableNoPositionShares)
  const availableMergeShares = Math.max(0, Math.min(mergeableYesShares, mergeableNoShares))
  const availableSplitBalance = Math.max(0, balance.raw)
  const outcomeIndex = state.outcome?.outcome_index as typeof OUTCOME_INDEX.YES | typeof OUTCOME_INDEX.NO | undefined
  const selectedTokenShares = outcomeIndex === undefined
    ? 0
    : outcomeIndex === OUTCOME_INDEX.YES
      ? availableYesTokenShares
      : availableNoTokenShares
  const selectedPositionShares = outcomeIndex === undefined
    ? 0
    : outcomeIndex === OUTCOME_INDEX.YES
      ? availableYesPositionShares
      : availableNoPositionShares
  const selectedShares = state.side === ORDER_SIDE.SELL
    ? (isLimitOrder ? selectedTokenShares : selectedPositionShares)
    : selectedTokenShares
  const selectedShareLabel = state.outcome?.outcome_text
    ?? (outcomeIndex === OUTCOME_INDEX.NO
      ? 'No'
      : outcomeIndex === OUTCOME_INDEX.YES
        ? 'Yes'
        : undefined)

  const marketSellFill = useMemo(() => {
    if (state.side !== ORDER_SIDE.SELL || isLimitOrder) {
      return null
    }

    return calculateMarketFill(
      ORDER_SIDE.SELL,
      amountNumber,
      normalizedOrderBook.bids,
      normalizedOrderBook.asks,
    )
  }, [amountNumber, isLimitOrder, normalizedOrderBook.asks, normalizedOrderBook.bids, state.side])

  const marketBuyFill = useMemo(() => {
    if (state.side !== ORDER_SIDE.BUY || isLimitOrder) {
      return null
    }

    return calculateMarketFill(
      ORDER_SIDE.BUY,
      amountNumber,
      normalizedOrderBook.bids,
      normalizedOrderBook.asks,
    )
  }, [amountNumber, isLimitOrder, normalizedOrderBook.asks, normalizedOrderBook.bids, state.side])

  const sellOrderSnapshot = useMemo(() => {
    if (state.side !== ORDER_SIDE.SELL) {
      return { shares: 0, priceCents: 0, totalValue: 0 }
    }

    const isLimit = state.type === ORDER_TYPE.LIMIT
    const sharesInput = isLimit
      ? Number.parseFloat(state.limitShares || '0') || 0
      : Number.parseFloat(state.amount || '0') || 0

    const limitPrice = isLimit
      ? Number.parseFloat(state.limitPrice || '0') || 0
      : null

    if (isLimit) {
      const totalValue = sharesInput > 0 && limitPrice && limitPrice > 0 ? (sharesInput * limitPrice) / 100 : 0
      return {
        shares: sharesInput,
        priceCents: limitPrice ?? 0,
        totalValue,
      }
    }

    const fill = marketSellFill
    const effectivePriceCents = fill?.avgPriceCents ?? null
    const filledShares = fill?.filledShares ?? sharesInput
    const totalValue = fill?.totalCost ?? 0

    return {
      shares: filledShares,
      priceCents: effectivePriceCents ?? Number.NaN,
      totalValue,
    }
  }, [marketSellFill, state.amount, state.limitPrice, state.limitShares, state.side, state.type])

  const sellAmountValue = state.side === ORDER_SIDE.SELL ? sellOrderSnapshot.totalValue : 0

  const avgSellPriceLabel = formatCentsLabel(sellOrderSnapshot.priceCents, { fallback: '—' })
  const outcomeFallbackBuyPriceCents = typeof state.outcome?.buy_price === 'number'
    ? Number((state.outcome.buy_price * 100).toFixed(1))
    : null
  const currentBuyPriceCents = (() => {
    if (isLimitOrder && state.side === ORDER_SIDE.BUY) {
      return Number.parseFloat(state.limitPrice || '0') || 0
    }

    if (!isLimitOrder && state.side === ORDER_SIDE.BUY) {
      return marketBuyFill?.avgPriceCents ?? null
    }

    return outcomeFallbackBuyPriceCents
  })()

  const effectiveMarketBuyCost = state.side === ORDER_SIDE.BUY && state.type === ORDER_TYPE.MARKET
    ? (marketBuyFill?.totalCost ?? amountNumber)
    : 0
  const shouldShowDepositCta = state.side === ORDER_SIDE.BUY
    && state.type === ORDER_TYPE.MARKET
    && Math.max(effectiveMarketBuyCost, amountNumber) > balance.raw

  const buyPayoutSummary = useMemo(() => {
    if (state.side !== ORDER_SIDE.BUY) {
      return {
        payout: 0,
        cost: 0,
        profit: 0,
        changePct: 0,
        multiplier: 0,
      }
    }

    if (isLimitOrder) {
      const price = Number.parseFloat(state.limitPrice || '0') / 100
      const shares = Number.parseFloat(state.limitShares || '0') || 0
      const cost = price > 0 ? shares * price : 0
      const payout = shares
      const profit = payout - cost
      const changePct = cost > 0 ? (profit / cost) * 100 : 0
      const multiplier = cost > 0 ? payout / cost : 0
      return { payout, cost, profit, changePct, multiplier }
    }

    const avgPrice = marketBuyFill?.avgPriceCents != null ? marketBuyFill.avgPriceCents / 100 : (currentBuyPriceCents ?? 0) / 100
    const cost = marketBuyFill?.totalCost ?? amountNumber
    const payout = marketBuyFill?.filledShares && marketBuyFill.filledShares > 0
      ? marketBuyFill.filledShares
      : (avgPrice > 0 ? amountNumber / avgPrice : 0)
    const profit = payout - cost
    const changePct = cost > 0 ? (profit / cost) * 100 : 0
    const multiplier = cost > 0 ? payout / cost : 0

    return { payout, cost, profit, changePct, multiplier }
  }, [amountNumber, currentBuyPriceCents, isLimitOrder, marketBuyFill, state.limitPrice, state.limitShares, state.side])

  const avgBuyPriceLabel = formatCentsLabel(currentBuyPriceCents ?? undefined, { fallback: '—' })
  const avgBuyPriceCentsValue = typeof currentBuyPriceCents === 'number' && Number.isFinite(currentBuyPriceCents)
    ? currentBuyPriceCents
    : null
  const avgSellPriceCentsValue = Number.isFinite(sellOrderSnapshot.priceCents) && sellOrderSnapshot.priceCents > 0
    ? sellOrderSnapshot.priceCents
    : null
  const sellAmountLabel = formatCurrency(sellAmountValue)
  useEffect(() => {
    if (!isLimitOrder || limitSharesNumber >= MIN_LIMIT_ORDER_SHARES) {
      setShowLimitMinimumWarning(false)
    }
  }, [isLimitOrder, limitSharesNumber])

  useEffect(() => {
    setShowInsufficientSharesWarning(false)
    setShowInsufficientBalanceWarning(false)
    setShowAmountTooLowWarning(false)
    setShouldShakeInput(false)
    setShouldShakeLimitShares(false)
  }, [state.amount, state.side, selectedShares])

  useEffect(() => {
    if (
      isLimitOrder
      || state.side !== ORDER_SIDE.BUY
      || amountNumber >= 1
      || amountNumber <= 0
    ) {
      setShowMarketMinimumWarning(false)
    }
  }, [amountNumber, isLimitOrder, state.side])

  function focusInput() {
    state.inputRef?.current?.focus()
  }

  function triggerLimitSharesShake() {
    setShouldShakeLimitShares(true)
    limitSharesInputRef.current?.focus()
    setTimeout(() => setShouldShakeLimitShares(false), 320)
  }

  function triggerInputShake() {
    setShouldShakeInput(true)
    state.inputRef?.current?.focus()
    setTimeout(() => setShouldShakeInput(false), 320)
  }

  async function onSubmit() {
    if (!ensureTradingReady()) {
      return
    }

    const validation = validateOrder({
      isLoading: state.isLoading,
      isConnected,
      user,
      market: state.market,
      outcome: state.outcome,
      amountNumber,
      side: state.side,
      isLimitOrder,
      limitPrice: state.limitPrice,
      limitShares: state.limitShares,
      availableBalance: availableBalanceForOrders,
      availableShares: selectedShares,
      limitExpirationEnabled: state.limitExpirationEnabled,
      limitExpirationOption: state.limitExpirationOption,
      limitExpirationTimestamp: validCustomExpirationTimestamp,
    })

    if (!validation.ok) {
      switch (validation.reason) {
        case 'LIMIT_SHARES_TOO_LOW': {
          setShowLimitMinimumWarning(true)
          triggerLimitSharesShake()
          return
        }
        case 'MARKET_MIN_AMOUNT': {
          setShowMarketMinimumWarning(true)
          return
        }
        case 'INVALID_AMOUNT':
        case 'INVALID_LIMIT_SHARES': {
          setShowAmountTooLowWarning(true)
          if (isLimitOrder) {
            triggerLimitSharesShake()
          }
          else {
            triggerInputShake()
          }
          return
        }
        case 'INSUFFICIENT_SHARES': {
          setShowInsufficientSharesWarning(true)
          if (isLimitOrder) {
            triggerLimitSharesShake()
          }
          else {
            triggerInputShake()
          }
          return
        }
        case 'INSUFFICIENT_BALANCE': {
          setShowInsufficientBalanceWarning(true)
          if (isLimitOrder) {
            triggerLimitSharesShake()
          }
          else {
            triggerInputShake()
          }
          return
        }
        default:
          setShowLimitMinimumWarning(false)
          setShowMarketMinimumWarning(false)
          setShowInsufficientSharesWarning(false)
          setShowInsufficientBalanceWarning(false)
          setShowAmountTooLowWarning(false)
          setShouldShakeInput(false)
          setShouldShakeLimitShares(false)
      }
      handleValidationError(validation.reason, {
        openWalletModal: open,
        shareLabel: selectedShareLabel,
      })
      return
    }
    setShowLimitMinimumWarning(false)
    setShowInsufficientSharesWarning(false)
    setShowInsufficientBalanceWarning(false)
    setShowAmountTooLowWarning(false)
    setShouldShakeInput(false)
    setShouldShakeLimitShares(false)

    if (!state.market || !state.outcome || !user || !userAddress || !makerAddress) {
      return
    }

    const customExpirationTimestamp = state.limitExpirationOption === 'custom'
      ? validCustomExpirationTimestamp
      : null

    const effectiveAmountForOrder = (() => {
      if (state.type === ORDER_TYPE.MARKET) {
        if (state.side === ORDER_SIDE.SELL) {
          const requestedShares = Number.parseFloat(state.amount || '0') || 0
          return requestedShares.toString()
        }

        const cost = marketBuyFill?.totalCost ?? amountNumber
        return cost.toString()
      }

      if (state.side === ORDER_SIDE.SELL) {
        return state.limitShares
      }

      return state.amount
    })()

    const marketLimitPriceCents = (() => {
      if (state.side === ORDER_SIDE.SELL) {
        const value = marketSellFill?.limitPriceCents ?? sellOrderSnapshot.priceCents
        return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : undefined
      }

      const value = marketBuyFill?.limitPriceCents
        ?? currentBuyPriceCents
        ?? outcomeFallbackBuyPriceCents

      return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : undefined
    })()

    const payload = buildOrderPayload({
      userAddress,
      makerAddress,
      signatureType,
      outcome: state.outcome,
      side: state.side,
      orderType: state.type,
      amount: effectiveAmountForOrder,
      limitPrice: state.limitPrice,
      limitShares: state.limitShares,
      marketPriceCents: marketLimitPriceCents,
      expirationTimestamp: state.limitExpirationEnabled
        ? (customExpirationTimestamp ?? endOfDayTimestamp)
        : undefined,
      referrerAddress: affiliateMetadata.referrerAddress,
      affiliateAddress: affiliateMetadata.affiliateAddress,
      affiliateSharePercent: affiliateMetadata.affiliateSharePercent,
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

    state.setIsLoading(true)
    try {
      const result = await submitOrder({
        order: payload,
        signature,
        orderType: state.type,
        clobOrderType: state.type === ORDER_TYPE.LIMIT && state.limitExpirationEnabled
          ? CLOB_ORDER_TYPE.GTD
          : undefined,
        conditionId: state.market.condition_id,
        slug: event.slug,
      })

      if (result?.error) {
        if (isTradingAuthRequiredError(result.error)) {
          openTradeRequirements()
        }
        handleOrderErrorFeedback('Trade failed', result.error)
        return
      }

      const sellSharesLabel = state.side === ORDER_SIDE.SELL
        ? (state.type === ORDER_TYPE.LIMIT ? state.limitShares : state.amount)
        : undefined
      const displayBuyPriceCents = state.side === ORDER_SIDE.BUY
        ? (marketBuyFill?.avgPriceCents ?? currentBuyPriceCents ?? marketLimitPriceCents)
        : undefined

      handleOrderSuccessFeedback({
        side: state.side,
        amountInput: state.amount,
        sellSharesLabel,
        isLimitOrder: state.type === ORDER_TYPE.LIMIT,
        outcomeText: state.outcome.outcome_text,
        eventTitle: event.title,
        marketImage: state.market?.icon_url,
        marketTitle: state.market?.short_title || state.market?.title,
        sellAmountValue,
        avgSellPrice: avgSellPriceLabel,
        buyPrice: displayBuyPriceCents,
        queryClient,
        outcomeIndex: state.outcome.outcome_index,
        lastMouseEvent: state.lastMouseEvent,
      })

      if (state.market?.condition_id && user?.id) {
        void queryClient.invalidateQueries({ queryKey: openOrdersQueryKey })
        void queryClient.invalidateQueries({ queryKey: ['orderbook-summary'] })
        setTimeout(() => {
          void queryClient.invalidateQueries({ queryKey: openOrdersQueryKey })
          void queryClient.invalidateQueries({ queryKey: ['orderbook-summary'] })
        }, 10_000)
      }

      void queryClient.invalidateQueries({ queryKey: [SAFE_BALANCE_QUERY_KEY] })

      setTimeout(() => {
        void queryClient.invalidateQueries({ queryKey: [SAFE_BALANCE_QUERY_KEY] })
        void queryClient.refetchQueries({ queryKey: ['event-activity'] })
        void queryClient.refetchQueries({ queryKey: ['event-holders'] })
      }, 3000)
    }
    catch {
      handleOrderErrorFeedback('Trade failed', 'An unexpected error occurred. Please try again.')
    }
    finally {
      state.setIsLoading(false)
    }
  }

  const yesOutcome = state.market?.outcomes[OUTCOME_INDEX.YES]
  const noOutcome = state.market?.outcomes[OUTCOME_INDEX.NO]
  function handleTypeChange(nextType: typeof state.type) {
    state.setType(nextType)
    if (nextType !== ORDER_TYPE.LIMIT) {
      return
    }
    const outcomeIndex = state.outcome?.outcome_index
    const nextPrice = outcomeIndex === OUTCOME_INDEX.NO ? noPrice : yesPrice
    if (nextPrice === null || nextPrice === undefined) {
      return
    }
    const cents = toCents(nextPrice)
    if (cents === null) {
      return
    }
    state.setLimitPrice(cents.toFixed(1))
  }

  return (
    <Form
      action={onSubmit}
      className={cn({
        'rounded-lg border lg:w-85': !isMobile,
      }, 'w-full p-4 shadow-xl/5')}
    >
      {!isMobile && !isSingleMarket && <EventOrderPanelMarketInfo market={state.market} />}
      {isMobile && (
        <EventOrderPanelMobileMarketInfo
          event={event}
          market={state.market}
          isSingleMarket={isSingleMarket}
          balanceText={balance.text}
        />
      )}

      <EventOrderPanelBuySellTabs
        side={state.side}
        type={state.type}
        availableMergeShares={availableMergeShares}
        availableSplitBalance={availableSplitBalance}
        conditionId={state.market?.condition_id}
        marketTitle={state.market?.title || state.market?.short_title}
        onSideChange={state.setSide}
        onTypeChange={handleTypeChange}
        onAmountReset={() => state.setAmount('')}
        onFocusInput={focusInput}
      />

      <div className="mb-2 flex gap-2">
        <EventOrderPanelOutcomeButton
          variant="yes"
          price={yesPrice}
          label={yesOutcome?.outcome_text ?? 'Yes'}
          isSelected={state.outcome?.outcome_index === OUTCOME_INDEX.YES}
          onSelect={() => {
            if (!state.market || !yesOutcome) {
              return
            }
            state.setOutcome(yesOutcome)
            focusInput()
          }}
        />
        <EventOrderPanelOutcomeButton
          variant="no"
          price={noPrice}
          label={noOutcome?.outcome_text ?? 'No'}
          isSelected={state.outcome?.outcome_index === OUTCOME_INDEX.NO}
          onSelect={() => {
            if (!state.market || !noOutcome) {
              return
            }
            state.setOutcome(noOutcome)
            focusInput()
          }}
        />
      </div>

      {isLimitOrder
        ? (
            <div className="mb-4">
              {state.side === ORDER_SIDE.SELL && (
                <EventOrderPanelUserShares
                  yesShares={availableYesTokenShares}
                  noShares={availableNoTokenShares}
                  activeOutcome={outcomeIndex}
                />
              )}
              <EventOrderPanelLimitControls
                side={state.side}
                limitPrice={state.limitPrice}
                limitShares={state.limitShares}
                limitExpirationEnabled={state.limitExpirationEnabled}
                limitExpirationOption={state.limitExpirationOption}
                limitExpirationTimestamp={state.limitExpirationTimestamp}
                isLimitOrder={isLimitOrder}
                availableShares={selectedShares}
                showLimitMinimumWarning={showLimitMinimumWarning}
                shouldShakeShares={shouldShakeLimitShares}
                limitSharesRef={limitSharesInputRef}
                onLimitPriceChange={state.setLimitPrice}
                onLimitSharesChange={state.setLimitShares}
                onLimitExpirationEnabledChange={state.setLimitExpirationEnabled}
                onLimitExpirationOptionChange={state.setLimitExpirationOption}
                onLimitExpirationTimestampChange={state.setLimitExpirationTimestamp}
                onAmountUpdateFromLimit={state.setAmount}
              />
            </div>
          )
        : (
            <>
              {state.side === ORDER_SIDE.SELL
                ? (
                    <EventOrderPanelUserShares
                      yesShares={availableYesPositionShares}
                      noShares={availableNoPositionShares}
                      activeOutcome={outcomeIndex}
                    />
                  )
                : <div className="mb-4"></div>}
              <EventOrderPanelInput
                isMobile={isMobile}
                side={state.side}
                amount={state.amount}
                amountNumber={amountNumber}
                availableShares={selectedShares}
                balance={balance}
                inputRef={state.inputRef}
                onAmountChange={state.setAmount}
                shouldShake={shouldShakeInput}
              />
              {amountNumber > 0 && (
                <EventOrderPanelEarnings
                  isMobile={isMobile}
                  side={state.side}
                  sellAmountLabel={sellAmountLabel}
                  avgSellPriceLabel={avgSellPriceLabel}
                  avgBuyPriceLabel={avgBuyPriceLabel}
                  avgSellPriceCents={avgSellPriceCentsValue}
                  avgBuyPriceCents={avgBuyPriceCentsValue}
                  buyPayout={buyPayoutSummary.payout}
                  buyProfit={buyPayoutSummary.profit}
                  buyChangePct={buyPayoutSummary.changePct}
                  buyMultiplier={buyPayoutSummary.multiplier}
                />
              )}
              {showMarketMinimumWarning && (
                <div
                  className={`
                    mt-3 flex animate-order-shake items-center justify-center gap-2 pb-1 text-sm font-semibold
                    text-orange-500
                  `}
                >
                  <TriangleAlertIcon className="size-4" />
                  Market buys must be at least $1
                </div>
              )}
            </>
          )}

      {(showInsufficientSharesWarning || showInsufficientBalanceWarning || showAmountTooLowWarning) && (
        <div
          className={`
            mt-2 mb-3 flex animate-order-shake items-center justify-center gap-2 text-sm font-semibold text-orange-500
          `}
        >
          <TriangleAlertIcon className="size-4" />
          {showAmountTooLowWarning
            ? 'Amount too low'
            : showInsufficientBalanceWarning
              ? 'Insufficient USDC balance'
              : 'Insufficient shares for this order'}
        </div>
      )}

      {shouldShowDepositCta
        ? (
            <Button
              type="button"
              size="outcome"
              disabled={state.isLoading}
              aria-disabled={state.isLoading}
              onClick={() => {
                focusInput()
                startDepositFlow()
              }}
              className="w-full text-base font-bold"
            >
              Deposit
            </Button>
          )
        : (
            <EventOrderPanelSubmitButton
              isLoading={state.isLoading}
              isDisabled={state.isLoading}
              onClick={event => state.setLastMouseEvent(event)}
            />
          )}
      <EventOrderPanelTermsDisclaimer />
    </Form>
  )
}
