'use client'

import type { Event, Market, Outcome } from '@/types'
import { useAppKitAccount } from '@reown/appkit/react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronsDownIcon, ChevronsUpIcon, DollarSignIcon } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { use, useMemo, useState } from 'react'
import { useSignTypedData } from 'wagmi'
import EventBookmark from '@/app/(platform)/event/[slug]/_components/EventBookmark'
import { handleOrderCancelledFeedback, handleOrderErrorFeedback, handleOrderSuccessFeedback, handleValidationError, notifyWalletApprovalPrompt } from '@/app/(platform)/event/[slug]/_components/feedback'
import { OpenCardContext } from '@/components/EventOpenCardContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { NewBadge } from '@/components/ui/new-badge'
import { useAffiliateOrderMetadata } from '@/hooks/useAffiliateOrderMetadata'
import { useAppKit } from '@/hooks/useAppKit'
import { useBalance } from '@/hooks/useBalance'
import { formatDisplayAmount, MAX_AMOUNT_INPUT, sanitizeNumericInput } from '@/lib/amount-input'
import { getExchangeEip712Domain, ORDER_SIDE, ORDER_TYPE } from '@/lib/constants'
import { formatCurrency, formatVolume } from '@/lib/formatters'
import { buildChanceByMarket } from '@/lib/market-chance'
import { buildOrderPayload, submitOrder } from '@/lib/orders'
import { signOrderPayload } from '@/lib/orders/signing'
import { validateOrder } from '@/lib/orders/validation'
import { isMarketNew } from '@/lib/utils'
import { isUserRejectedRequestError, normalizeAddress } from '@/lib/wallet'
import { useTradingOnboarding } from '@/providers/TradingOnboardingProvider'
import { useUser } from '@/stores/useUser'

interface EventCardProps {
  event: Event
}

interface SelectedOutcome {
  market: Market
  outcome: Outcome
  variant: 'yes' | 'no'
}

interface OrderbookLevelSummary {
  price?: string
  size?: string
}

interface OrderBookSummaryResponse {
  bids?: OrderbookLevelSummary[]
  asks?: OrderbookLevelSummary[]
}

interface NormalizedBookLevel {
  priceCents: number
  priceDollars: number
  size: number
}

const PRICE_EPSILON = 1e-8
const MAX_LIMIT_PRICE = 99.9
const CLOB_BASE_URL = process.env.CLOB_URL

async function fetchClobJson<T>(path: string, body: unknown): Promise<T> {
  if (!CLOB_BASE_URL) {
    throw new Error('CLOB URL is not configured.')
  }

  const response = await fetch(`${CLOB_BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  })

  const text = await response.text()
  if (!response.ok) {
    throw new Error(`Failed to fetch ${path}: ${response.status} ${text}`)
  }

  try {
    return JSON.parse(text) as T
  }
  catch (error) {
    console.error(`Failed to parse response from ${path}`, error)
    throw new Error(`Failed to parse response from ${path}`)
  }
}

async function fetchOrderBookSummary(tokenId: string): Promise<OrderBookSummaryResponse> {
  const payload = [{ token_id: tokenId }]
  const orderBooks = await fetchClobJson<Array<OrderBookSummaryResponse & { asset_id?: string, token_id?: string }>>('/books', payload)

  const entry = Array.isArray(orderBooks)
    ? orderBooks.find(item => item && (item.asset_id === tokenId || (item as any).token_id === tokenId))
    : null

  if (!entry) {
    return {}
  }

  return {
    bids: entry.bids ?? [],
    asks: entry.asks ?? [],
  }
}

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

function normalizeBookLevels(levels: OrderbookLevelSummary[] | undefined, side: 'ask' | 'bid'): NormalizedBookLevel[] {
  if (!levels?.length) {
    return []
  }

  return levels
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
    .sort((a, b) => (side === 'ask' ? a.priceDollars - b.priceDollars : b.priceDollars - a.priceDollars))
}

function calculateMarketFill(value: number, asks: NormalizedBookLevel[]) {
  if (!asks.length || value <= 0) {
    return {
      avgPriceCents: null as number | null,
      filledShares: 0,
      totalCost: 0,
    }
  }

  let remainingBudget = value
  let filledShares = 0
  let totalCost = 0

  for (const level of asks) {
    if (remainingBudget <= 0) {
      break
    }

    const maxSharesAtLevel = level.priceDollars > 0 ? remainingBudget / level.priceDollars : 0
    const fill = Math.min(level.size, maxSharesAtLevel)
    if (fill <= 0) {
      continue
    }
    const cost = fill * level.priceDollars
    filledShares = Number((filledShares + fill).toFixed(4))
    totalCost = Number((totalCost + cost).toFixed(4))
    remainingBudget = Math.max(0, Number((remainingBudget - cost).toFixed(4)))
  }

  const avgPriceCents = filledShares > 0
    ? Number(((totalCost / filledShares) * 100).toFixed(1))
    : null

  return {
    avgPriceCents,
    filledShares: Number(filledShares.toFixed(4)),
    totalCost: Number(totalCost.toFixed(4)),
  }
}

export default function EventCard({ event }: EventCardProps) {
  const { openCardId, setOpenCardId } = use(OpenCardContext)
  const [isLoading, setIsLoading] = useState(false)
  const [selectedOutcome, setSelectedOutcome] = useState<SelectedOutcome | null>(null)
  const [tradeAmount, setTradeAmount] = useState('1')
  const [lastMouseEvent, setLastMouseEvent] = useState<MouseEvent | null>(null)
  const { open, close } = useAppKit()
  const { isConnected, embeddedWalletInfo } = useAppKitAccount()
  const { signTypedDataAsync } = useSignTypedData()
  const user = useUser()
  const affiliateMetadata = useAffiliateOrderMetadata()
  const { balance } = useBalance()
  const { ensureTradingReady } = useTradingOnboarding()
  const queryClient = useQueryClient()
  const hasDeployedProxyWallet = Boolean(user?.proxy_wallet_address && user?.proxy_wallet_status === 'deployed')
  const proxyWalletAddress = hasDeployedProxyWallet ? normalizeAddress(user?.proxy_wallet_address) : null
  const userAddress = normalizeAddress(user?.address)
  const makerAddress = proxyWalletAddress ?? null
  const signatureType = proxyWalletAddress ? 2 : 0
  const isOpen = openCardId === `${event.id}`
  const amountNumber = Number.parseFloat(tradeAmount) || 0

  function onToggle() {
    setOpenCardId(isOpen ? null : `${event.id}`)
  }

  const activeOutcome = isOpen ? selectedOutcome : null
  const isInTradingMode = Boolean(activeOutcome)
  const isSingleMarket = event.markets.length === 1
  const yesOutcome = event.markets[0].outcomes[0]
  const noOutcome = event.markets[0].outcomes[1]
  const hasRecentMarket = event.markets.some(market => isMarketNew(market.created_at))
  const isNegRiskEnabled = Boolean(event.enable_neg_risk)
  const orderDomain = useMemo(() => getExchangeEip712Domain(isNegRiskEnabled), [isNegRiskEnabled])
  const availableBalance = balance.raw
  const selectedTokenId = selectedOutcome?.outcome.token_id ?? null

  const chanceByMarket = useMemo(
    () => buildChanceByMarket(event.markets),
    [event.markets],
  )

  function getDisplayChance(marketId: string) {
    return chanceByMarket[marketId] ?? 0
  }
  const primaryMarket = event.markets[0]
  const primaryDisplayChance = primaryMarket ? getDisplayChance(primaryMarket.condition_id) : 0
  const roundedPrimaryDisplayChance = Math.round(primaryDisplayChance)

  const resolvedVolume = useMemo(() => event.volume ?? 0, [event.volume])

  const orderBookQuery = useQuery({
    queryKey: ['card-orderbook', selectedTokenId],
    enabled: Boolean(selectedTokenId && isInTradingMode),
    queryFn: () => fetchOrderBookSummary(selectedTokenId!),
    staleTime: 60_000,
    gcTime: 60_000,
    refetchOnWindowFocus: false,
  })

  const normalizedAsks = useMemo(
    () => normalizeBookLevels(orderBookQuery.data?.asks, 'ask'),
    [orderBookQuery.data?.asks],
  )

  const marketBuyFill = useMemo(() => {
    if (!isInTradingMode || !selectedOutcome || amountNumber <= 0) {
      return null
    }
    return calculateMarketFill(amountNumber, normalizedAsks)
  }, [amountNumber, isInTradingMode, normalizedAsks, selectedOutcome])

  const toWinAmount = useMemo(() => {
    if (!selectedOutcome || amountNumber <= 0) {
      return 0
    }

    if (marketBuyFill?.filledShares && marketBuyFill.filledShares > 0) {
      return marketBuyFill.filledShares
    }

    const fallbackPrice = typeof selectedOutcome.outcome.buy_price === 'number'
      ? selectedOutcome.outcome.buy_price
      : selectedOutcome.market?.probability
        ? selectedOutcome.market.probability / 100
        : 0

    return fallbackPrice > 0 ? amountNumber / fallbackPrice : 0
  }, [amountNumber, marketBuyFill?.filledShares, selectedOutcome])

  const toWinLabel = useMemo(
    () => formatCurrency(Math.max(0, toWinAmount), { includeSymbol: false }),
    [toWinAmount],
  )

  function handleTrade(outcome: Outcome, market: Market, variant: 'yes' | 'no') {
    setSelectedOutcome({
      market,
      outcome,
      variant,
    })

    if (!tradeAmount) {
      setTradeAmount('1')
    }
  }

  async function handleConfirmTrade() {
    if (!selectedOutcome) {
      return
    }

    if (!ensureTradingReady()) {
      return
    }

    const validation = validateOrder({
      isLoading,
      isConnected,
      user,
      market: selectedOutcome.market,
      outcome: selectedOutcome.outcome,
      amountNumber,
      side: ORDER_SIDE.BUY,
      isLimitOrder: false,
      limitPrice: '0',
      limitShares: '0',
      availableBalance: balance.raw,
    })

    if (!validation.ok) {
      handleValidationError(validation.reason, { openWalletModal: open })
      return
    }

    if (!user || !userAddress || !makerAddress) {
      return
    }

    const payload = buildOrderPayload({
      userAddress,
      makerAddress,
      signatureType,
      outcome: selectedOutcome.outcome,
      side: ORDER_SIDE.BUY,
      orderType: ORDER_TYPE.MARKET,
      amount: tradeAmount,
      limitPrice: '0',
      limitShares: '0',
      marketPriceCents: typeof selectedOutcome.outcome.buy_price === 'number'
        ? selectedOutcome.outcome.buy_price * 100
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

    setIsLoading(true)
    try {
      const result = await submitOrder({
        order: payload,
        signature,
        orderType: ORDER_TYPE.MARKET,
        conditionId: selectedOutcome.market.condition_id,
        slug: event.slug,
      })

      if (result?.error) {
        handleOrderErrorFeedback('Trade failed', result.error)
        return
      }

      handleOrderSuccessFeedback({
        side: ORDER_SIDE.BUY,
        amountInput: tradeAmount,
        outcomeText: selectedOutcome.outcome.outcome_text,
        eventTitle: event.title,
        marketImage: selectedOutcome.market.icon_url,
        marketTitle: selectedOutcome.market.short_title || selectedOutcome.market.title,
        sellAmountValue: 0,
        avgSellPrice: '—',
        buyPrice: selectedOutcome.outcome.buy_price,
        queryClient,
        outcomeIndex: selectedOutcome.outcome.outcome_index,
        lastMouseEvent,
      })

      setSelectedOutcome(null)
      setTradeAmount('1')
      setLastMouseEvent(null)

      setTimeout(() => {
        void queryClient.refetchQueries({ queryKey: ['event-activity'] })
        void queryClient.refetchQueries({ queryKey: ['event-holders'] })
      }, 3000)
    }
    catch {
      handleOrderErrorFeedback('Trade failed', 'An unexpected error occurred. Please try again.')
    }
    finally {
      setIsLoading(false)
    }
  }

  function handleCancelTrade() {
    setSelectedOutcome(null)
    setTradeAmount('1')
    setLastMouseEvent(null)
    onToggle()
  }

  function handleTradeAmountInputChange(rawValue: string) {
    const cleaned = sanitizeNumericInput(rawValue)

    if (cleaned === '') {
      setTradeAmount('')
      return
    }

    const numericValue = Number.parseFloat(cleaned)
    if (Number.isNaN(numericValue)) {
      setTradeAmount('')
      return
    }

    if (numericValue > MAX_AMOUNT_INPUT) {
      return
    }

    setTradeAmount(cleaned)
  }

  const formattedTradeAmount = formatDisplayAmount(tradeAmount)

  return (
    <Card
      className={`
        flex h-45 cursor-pointer flex-col transition-all
        hover:-translate-y-0.5 hover:shadow-lg
        ${isInTradingMode ? 'ring-2 ring-primary/20' : ''}
        overflow-hidden
      `}
    >
      <CardContent className="flex h-full flex-col p-3">
        <div className="mb-3 flex items-start justify-between">
          <Link href={`/event/${event.slug}`} className="flex flex-1 items-start gap-2 pr-2">
            <div
              className={`
                flex size-10 shrink-0 items-center justify-center overflow-hidden rounded bg-muted text-muted-foreground
              `}
            >
              <Image
                src={event.icon_url}
                alt={event.creator || 'Market creator'}
                width={40}
                height={40}
                className="h-full w-full rounded object-cover"
              />
            </div>

            <h3
              className={`
                line-clamp-2 text-sm leading-tight font-bold transition-all duration-200
                hover:line-clamp-none hover:text-foreground
              `}
            >
              {event.title}
            </h3>
          </Link>

          {isInTradingMode
            ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleCancelTrade()
                  }}
                  className={`
                    flex size-6 items-center justify-center rounded-lg bg-slate-200 text-slate-600 transition-colors
                    hover:bg-slate-300
                    dark:bg-slate-600 dark:text-slate-400 dark:hover:bg-slate-500
                  `}
                >
                  ✕
                </button>
              )
            : (
                isSingleMarket && (
                  <div className="relative -mt-3 flex flex-col items-center">
                    <div className="relative">
                      <svg
                        width="72"
                        height="52"
                        viewBox="0 0 72 52"
                        className="rotate-0 transform"
                      >

                        <path
                          d="M 6 46 A 30 30 0 0 1 66 46"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="5"
                          className="text-slate-200 dark:text-slate-600"
                        />

                        <path
                          d="M 6 46 A 30 30 0 0 1 66 46"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="5"
                          strokeLinecap="round"
                          className={`transition-all duration-300 ${
                            roundedPrimaryDisplayChance < 40
                              ? 'text-no'
                              : roundedPrimaryDisplayChance === 50
                                ? 'text-slate-400'
                                : 'text-yes'
                          }`}
                          strokeDasharray={`${(roundedPrimaryDisplayChance / 100) * 94.25} 94.25`}
                          strokeDashoffset="0"
                        />
                      </svg>

                      <div className="absolute inset-0 flex items-center justify-center pt-4">
                        <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                          {roundedPrimaryDisplayChance}
                          %
                        </span>
                      </div>
                    </div>

                    <div className="-mt-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                      chance
                    </div>
                  </div>
                )
              )}
        </div>

        <div className="flex flex-1 flex-col">
          {activeOutcome
            ? (
                <div className="flex-1 space-y-3">
                  <div className="relative">
                    <DollarSignIcon
                      className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-green-600 dark:text-green-400"
                    />
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder="0.00"
                      value={formattedTradeAmount}
                      onChange={event => handleTradeAmountInputChange(event.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && activeOutcome && amountNumber > 0) {
                          e.preventDefault()
                          void handleConfirmTrade()
                        }
                        else if (e.key === 'Escape') {
                          e.preventDefault()
                          handleCancelTrade()
                        }
                      }}
                      className={`
                        w-full
                        [appearance:textfield]
                        rounded border ${amountNumber > availableBalance ? 'border-red-500' : 'border-transparent'}
                        bg-slate-100 py-2 pr-3 pl-10 text-sm text-slate-900 transition-colors
                        placeholder:text-slate-500
                        focus:bg-slate-200 focus:outline-none
                        dark:bg-slate-500 dark:text-slate-100 dark:placeholder:text-slate-400 dark:focus:bg-slate-600
                        [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none
                      `}
                      onClick={e => e.stopPropagation()}
                      autoFocus
                    />
                  </div>

                  <Button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setLastMouseEvent(e.nativeEvent)
                      void handleConfirmTrade()
                    }}
                    disabled={
                      isLoading
                      || !activeOutcome
                      || amountNumber <= 0
                      || amountNumber > availableBalance
                    }
                    size="outcome"
                    variant={activeOutcome.variant}
                    className="w-full"
                  >
                    {isLoading
                      ? (
                          <div className="flex items-center justify-center gap-2">
                            <div
                              className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
                            >
                            </div>
                            <span>Processing...</span>
                          </div>
                        )
                      : (
                          <div className="line-clamp-3 text-center text-xs">
                            <div>
                              Buy
                              {' '}
                              {activeOutcome.variant === 'yes'
                                ? activeOutcome.outcome.outcome_text
                                : (isSingleMarket ? activeOutcome.outcome.outcome_text : `Against ${activeOutcome.outcome.outcome_text}`)}
                            </div>
                            <div className="text-xs opacity-90">
                              to win $
                              {toWinLabel}
                            </div>
                          </div>
                        )}
                  </Button>
                </div>
              )
            : (
                <>

                  {!isSingleMarket && (
                    <div className="mt-auto mb-1 scrollbar-hide max-h-14 space-y-2 overflow-y-auto">
                      {event.markets.map(market => (
                        <div
                          key={market.condition_id}
                          className="flex items-center justify-between text-xs"
                        >
                          <span
                            className="truncate dark:text-white"
                            title={market.short_title || market.title}
                          >
                            {market.short_title || market.title}
                          </span>
                          <div className="ml-2 flex items-center gap-2">
                            {(() => {
                              const displayChance = Math.round(getDisplayChance(market.condition_id))
                              const oppositeChance = Math.max(0, Math.min(100, 100 - displayChance))
                              return (
                                <>
                                  <span className="text-2xs font-bold text-slate-900 dark:text-white">
                                    {displayChance}
                                    %
                                  </span>
                                  <div className="flex gap-1">
                                    <Button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleTrade(market.outcomes[0], market, 'yes')
                                        onToggle()
                                      }}
                                      title={`${market.outcomes[0].outcome_text}: ${displayChance}%`}
                                      variant="yes"
                                      className="group h-auto w-10 px-2 py-1 text-2xs"
                                    >
                                      <span className="truncate group-hover:hidden">
                                        {market.outcomes[0].outcome_text}
                                      </span>
                                      <span className="hidden font-mono group-hover:inline">
                                        {displayChance}
                                        %
                                      </span>
                                    </Button>
                                    <Button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleTrade(market.outcomes[1], market, 'no')
                                        onToggle()
                                      }}
                                      title={`${market.outcomes[1].outcome_text}: ${oppositeChance}%`}
                                      variant="no"
                                      size="sm"
                                      className="group h-auto w-10 px-2 py-1 text-2xs"
                                    >
                                      <span className="truncate group-hover:hidden">
                                        {market.outcomes[1].outcome_text}
                                      </span>
                                      <span className="hidden font-mono group-hover:inline">
                                        {oppositeChance}
                                        %
                                      </span>
                                    </Button>
                                  </div>
                                </>
                              )
                            })()}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {isSingleMarket && yesOutcome && noOutcome && (
                    <div className="mt-auto mb-2 grid grid-cols-2 gap-2">
                      <Button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          if (!primaryMarket) {
                            return
                          }
                          handleTrade(yesOutcome, primaryMarket, 'yes')
                          onToggle()
                        }}
                        disabled={isLoading}
                        variant="yes"
                        size="outcome"
                      >
                        <span className="truncate">
                          Buy
                          {' '}
                          {yesOutcome.outcome_text}
                          {' '}
                        </span>
                        <ChevronsUpIcon className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          if (!primaryMarket) {
                            return
                          }
                          handleTrade(noOutcome, primaryMarket, 'no')
                          onToggle()
                        }}
                        disabled={isLoading}
                        variant="no"
                        size="outcome"
                      >
                        <span className="truncate">
                          Buy
                          {' '}
                          {noOutcome.outcome_text}
                          {' '}
                        </span>
                        <ChevronsDownIcon className="size-4" />
                      </Button>
                    </div>
                  )}
                </>
              )}
        </div>

        {!isInTradingMode && (
          <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              {hasRecentMarket
                ? <NewBadge />
                : (
                    <span>
                      {formatVolume(resolvedVolume)}
                      {' '}
                      Vol.
                    </span>
                  )}
            </div>
            <EventBookmark event={event} />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
