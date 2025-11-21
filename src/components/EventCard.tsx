'use client'

import type { Event, Market, Outcome } from '@/types'
import { useAppKitAccount } from '@reown/appkit/react'
import { useQueryClient } from '@tanstack/react-query'
import { ChevronsDownIcon, ChevronsUpIcon, DollarSignIcon } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { use, useMemo, useState } from 'react'
import { useSignTypedData } from 'wagmi'
import EventBookmark from '@/app/(platform)/event/[slug]/_components/EventBookmark'
import { handleOrderCancelledFeedback, handleOrderErrorFeedback, handleOrderSuccessFeedback, handleValidationError, notifyWalletApprovalPrompt } from '@/app/(platform)/event/[slug]/_components/feedback'
import {
  buildMarketTargets,
  useEventPriceHistory,
} from '@/app/(platform)/event/[slug]/_components/useEventPriceHistory'
import { OpenCardContext } from '@/components/EventOpenCardContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { NewBadge } from '@/components/ui/new-badge'
import { useAffiliateOrderMetadata } from '@/hooks/useAffiliateOrderMetadata'
import { useAppKit } from '@/hooks/useAppKit'
import { formatDisplayAmount, MAX_AMOUNT_INPUT, sanitizeNumericInput } from '@/lib/amount-input'
import { getExchangeEip712Domain, ORDER_SIDE, ORDER_TYPE } from '@/lib/constants'
import { formatVolume } from '@/lib/formatters'
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
  const { ensureTradingReady } = useTradingOnboarding()
  const queryClient = useQueryClient()
  const hasDeployedProxyWallet = Boolean(user?.proxy_wallet_address && user?.proxy_wallet_status === 'deployed')
  const proxyWalletAddress = hasDeployedProxyWallet ? normalizeAddress(user?.proxy_wallet_address) : null
  const userAddress = normalizeAddress(user?.address)
  const makerAddress = proxyWalletAddress ?? userAddress ?? null
  const signatureType = proxyWalletAddress ? 1 : 0
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
  const eventHasNegRiskMarket = useMemo(
    () => event.markets.some(market => Boolean(market.neg_risk)),
    [event.markets],
  )
  const isNegRiskMarket = useMemo(() => (
    selectedOutcome?.market ? Boolean(selectedOutcome.market.neg_risk) : eventHasNegRiskMarket
  ), [eventHasNegRiskMarket, selectedOutcome?.market])
  const orderDomain = useMemo(() => getExchangeEip712Domain(isNegRiskMarket), [isNegRiskMarket])

  const marketTargets = useMemo(() => buildMarketTargets(event.markets), [event.markets])
  const { latestSnapshot } = useEventPriceHistory({
    eventId: event.id,
    range: 'ALL',
    targets: marketTargets,
    eventCreatedAt: event.created_at,
  })

  const fallbackChanceByMarket = useMemo(() => {
    function clampPrice(value: number | undefined | null) {
      if (!Number.isFinite(value)) {
        return 0
      }
      return Math.max(0, Math.min(1, Number(value)))
    }

    const baseMap = event.markets.reduce<Record<string, number>>((acc, market) => {
      acc[market.condition_id] = clampPrice(market.price) * 100
      return acc
    }, {})

    const activeMarkets = event.markets.filter(market => market.is_active && !market.is_resolved)
    if (activeMarkets.length <= 1) {
      return baseMap
    }

    const total = activeMarkets.reduce((sum, market) => sum + clampPrice(market.price), 0)
    if (total <= 0) {
      return baseMap
    }

    activeMarkets.forEach((market) => {
      baseMap[market.condition_id] = (clampPrice(market.price) / total) * 100
    })

    return baseMap
  }, [event.markets])

  const displayChanceByMarket = useMemo(() => event.markets.reduce<Record<string, number>>((acc, market) => {
    const snapshotValue = latestSnapshot[market.condition_id]
    if (Number.isFinite(snapshotValue)) {
      acc[market.condition_id] = snapshotValue
    }
    else {
      acc[market.condition_id] = fallbackChanceByMarket[market.condition_id] ?? 0
    }
    return acc
  }, {}), [event.markets, latestSnapshot, fallbackChanceByMarket])

  function getDisplayChance(marketId: string) {
    return displayChanceByMarket[marketId] ?? 0
  }
  const primaryMarket = event.markets[0]
  const primaryDisplayChance = primaryMarket ? getDisplayChance(primaryMarket.condition_id) : 0
  const roundedPrimaryDisplayChance = Math.round(primaryDisplayChance)

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
      isLimitOrder: false,
      limitPrice: '0',
      limitShares: '0',
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
        sellAmountValue: 0,
        avgSellPrice: '—',
        buyPrice: selectedOutcome.outcome.buy_price,
        queryClient,
        eventSlug: event.slug,
        userId: user.id,
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

  function calculateWinnings(amount: string) {
    if (!amount || !selectedOutcome) {
      return '0.00'
    }
    const amountNum = Number.parseFloat(amount)
    const probability = selectedOutcome.market.probability / 100
    const odds = selectedOutcome.variant === 'yes' ? 1 / probability : 1 / (1 - probability)
    const winnings = amountNum * odds
    return winnings.toFixed(2)
  }

  return (
    <Card
      className={`
        flex h-[180px] cursor-pointer flex-col transition-all
        hover:-translate-y-0.5 hover:shadow-lg
        ${isInTradingMode ? 'ring-2 ring-primary/20' : ''}
        overflow-hidden
      `}
    >
      <CardContent className="flex h-full flex-col p-3">
        {/* Unified Header */}
        <div className="mb-3 flex items-start justify-between">
          <Link href={`/event/${event.slug}`} className="flex flex-1 items-start gap-2 pr-2">
            {/* Creator Avatar */}
            <div
              className={`
                flex size-10 flex-shrink-0 items-center justify-center overflow-hidden rounded bg-muted
                text-muted-foreground
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

            {/* Title */}
            <h3
              className={`
                line-clamp-2 text-sm leading-tight font-bold transition-all duration-200
                hover:line-clamp-none hover:text-foreground
              `}
            >
              {event.title}
            </h3>
          </Link>

          {/* Right side - Probability badge OR Close button */}
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
                        {/* Background arc */}
                        <path
                          d="M 6 46 A 30 30 0 0 1 66 46"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="5"
                          className="text-slate-200 dark:text-slate-600"
                        />
                        {/* Progress arc */}
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
                      {/* Percentage number centered in arc */}
                      <div className="absolute inset-0 flex items-center justify-center pt-4">
                        <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                          {roundedPrimaryDisplayChance}
                          %
                        </span>
                      </div>
                    </div>
                    {/* "chance" text positioned close to the arc */}
                    <div className="-mt-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                      chance
                    </div>
                  </div>
                )
              )}
        </div>

        {/* Dynamic Content Area */}
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
                        rounded border-0 bg-slate-100 py-2 pr-3 pl-10 text-sm text-slate-900 transition-colors
                        placeholder:text-slate-500
                        focus:bg-slate-200 focus:outline-none
                        dark:bg-slate-500 dark:text-slate-100 dark:placeholder:text-slate-400 dark:focus:bg-slate-600
                        [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none
                      `}
                      onClick={e => e.stopPropagation()}
                      autoFocus
                    />
                  </div>

                  {/* Confirm Trade Button */}
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
                              {calculateWinnings(tradeAmount)}
                            </div>
                          </div>
                        )}
                  </Button>
                </div>
              )
            : (
                <>
                  {/* Show multi-market options only for non-binary markets */}
                  {!isSingleMarket && (
                    <div className="mt-auto mb-1 scrollbar-hide max-h-18 space-y-2 overflow-y-auto">
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
                                  <span className="text-[11px] font-bold text-slate-900 dark:text-white">
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
                                      className="group h-auto w-[40px] px-2 py-1 text-[10px]"
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
                                      className="group h-auto w-[40px] px-2 py-1 text-[10px]"
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

                  {/* Trading Actions - Only for binary markets */}
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

        {/* Unified Footer - Always at bottom */}
        {!isInTradingMode && (
          <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              {hasRecentMarket
                ? <NewBadge />
                : (
                    <span>
                      {formatVolume(event.volume)}
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
