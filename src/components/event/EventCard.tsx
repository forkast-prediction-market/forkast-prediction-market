'use client'

import type { Event } from '@/types'
import { ChevronsDownIcon, ChevronsUpIcon, DollarSignIcon } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { use, useState } from 'react'
import { toast } from 'sonner'
import EventBookmark from '@/app/(platform)/event/[slug]/_components/EventBookmark'
import { OpenCardContext } from '@/components/event/EventOpenCardContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { formatVolume, triggerConfetti } from '@/lib/utils'

interface EventCardProps {
  event: Event
}

export default function EventCard({ event }: EventCardProps) {
  const { openCardId, setOpenCardId } = use(OpenCardContext)
  const [isLoading, setIsLoading] = useState(false)
  const [selectedOutcome, setSelectedOutcome] = useState<{
    id: string
    type: 'yes' | 'no'
    name: string
  } | null>(null)
  const [tradeAmount, setTradeAmount] = useState('1')
  const isOpen = openCardId === `${event.id}`

  function onToggle() {
    setOpenCardId(isOpen ? null : `${event.id}`)
  }

  function formatValue(value: number): string {
    return value.toFixed(2)
  }

  // Function to limit decimal places during typing
  function limitDecimalPlaces(value: string, maxDecimals: number = 2): string {
    // Remove non-numeric characters except dot
    const cleaned = value.replace(/[^0-9.]/g, '')

    // Allow only one decimal point
    const parts = cleaned.split('.')
    if (parts.length > 2) {
      return `${parts[0]}.${parts[1]}`
    }

    // Limit decimal places
    if (parts.length === 2 && parts[1].length > maxDecimals) {
      return `${parts[0]}.${parts[1].substring(0, maxDecimals)}`
    }

    return cleaned
  }

  // Use external state control for opening/closing
  const isInTradingMode = isOpen && selectedOutcome

  const isBinaryMarket = event.markets.length === 1
  const yesOutcome = event.markets[0].outcomes[0]
  const noOutcome = event.markets[0].outcomes[1]

  async function handleTrade(outcomeId: string, type: 'yes' | 'no') {
    const outcomes = event.markets.flatMap(market => market.outcomes)
    const outcome = outcomes.find(o => o.id === outcomeId)
    if (outcome) {
      setSelectedOutcome({
        id: outcomeId,
        type,
        name: outcome.outcome_text,
      })
      // Keep current value or set to "1" if empty
      if (!tradeAmount) {
        setTradeAmount('1')
      }
    }
  }

  async function handleConfirmTrade() {
    if (!selectedOutcome || !tradeAmount) {
      return
    }

    setIsLoading(true)

    // Simulate API call
    setTimeout(() => {
      setIsLoading(false)

      // Calculate shares and price
      const amountNum = Number.parseFloat(tradeAmount)
      const outcome = event.markets[0].outcomes.find(o => o.id === selectedOutcome.id)
      if (outcome) {
        const probability = event.markets[0].probability
        const price
          = selectedOutcome.type === 'yes'
            ? Math.round(probability)
            : Math.round(100 - probability)
        const shares = ((amountNum / price) * 100).toFixed(2)

        // Show success toast in Polymarket style
        toast.success(
          `Buy $${tradeAmount} on ${
            selectedOutcome.type === 'yes'
              ? selectedOutcome.name
              : (isBinaryMarket ? selectedOutcome.name : `Against ${selectedOutcome.name}`)
          }`,
          {
            description: (
              <div>
                <div className="font-medium">{event.title}</div>
                <div className="mt-1 text-xs opacity-80">
                  {shares}
                  {' '}
                  shares @
                  {price}
                  ¢
                </div>
              </div>
            ),
          },
        )
      }

      setSelectedOutcome(null)
      setTradeAmount('1')
      // Here would be the actual trade execution
      console.log(
        `Trade executed: $${tradeAmount} on ${selectedOutcome.name} (${selectedOutcome.type})`,
      )
    }, 1000)
  }

  function handleCancelTrade() {
    setSelectedOutcome(null)
    setTradeAmount('1')
    onToggle()
  }

  function calculateWinnings(amount: string) {
    if (!amount || !selectedOutcome) {
      return '0.00'
    }
    const amountNum = Number.parseFloat(amount)
    const outcome = event.markets.find(market => market.condition_id === selectedOutcome.id)
    if (!outcome) {
      return '0.00'
    }

    // Calculate potential winnings based on probability
    const probability = outcome.probability / 100
    const odds = selectedOutcome.type === 'yes' ? 1 / probability : 1 / (1 - probability)
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
        <div className="mb-3 flex items-center justify-between">
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
                isBinaryMarket
                && yesOutcome && (
                  <div className="ml-auto flex flex-col items-center">
                    {/* Semicircular Arc Progress */}
                    <div className="relative flex flex-col items-center">
                      <div className="relative">
                        <svg
                          width="56"
                          height="36"
                          viewBox="0 0 56 36"
                          className="rotate-0 transform"
                        >
                          {/* Background arc */}
                          <path
                            d="M 6 30 A 22 22 0 0 1 50 30"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="4"
                            className="text-slate-200 dark:text-slate-600"
                          />
                          {/* Progress arc */}
                          <path
                            d="M 6 30 A 22 22 0 0 1 50 30"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="4"
                            strokeLinecap="round"
                            className={`transition-all duration-300 ${
                              Math.round(event.markets[0].probability) < 40
                                ? 'text-no'
                                : Math.round(event.markets[0].probability) === 50
                                  ? 'text-slate-400'
                                  : 'text-yes'
                            }`}
                            strokeDasharray={`${
                              (Math.round(event.markets[0].probability) / 100) * 69.12
                            } 69.12`}
                            strokeDashoffset="0"
                          />
                        </svg>
                        {/* Percentage number centered in arc */}
                        <div className="absolute inset-0 flex items-center justify-center pt-2">
                          <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                            {Math.round(event.markets[0].probability)}
                            %
                          </span>
                        </div>
                      </div>
                      {/* "chance" text below arc - colado sem espaço */}
                      <div className="-mt-1 text-[10px] text-slate-500 dark:text-slate-400">
                        chance
                      </div>
                    </div>
                  </div>
                )
              )}
        </div>

        {/* Dynamic Content Area */}
        <div className="flex flex-1 flex-col">
          {isInTradingMode
            ? (
                <div className="flex-1 space-y-3">
                  <div className="relative">
                    <DollarSignIcon
                      className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-green-600 dark:text-green-400"
                    />
                    <input
                      type="number"
                      placeholder="0.00"
                      value={tradeAmount}
                      onChange={(e) => {
                        const rawValue = e.target.value.replace(/[^0-9.]/g, '')
                        const value = limitDecimalPlaces(rawValue, 2)
                        const numericValue = Number.parseFloat(value)

                        // Limit to 99999 like in EventDetail
                        if (numericValue <= 99999 || value === '') {
                          setTradeAmount(value)
                        }
                      }}
                      onBlur={(e) => {
                        const value = e.target.value.replace(/[^0-9.]/g, '')
                        if (value && !Number.isNaN(Number.parseFloat(value))) {
                          setTradeAmount(formatValue(Number.parseFloat(value)))
                        }
                      }}
                      onKeyDown={(e) => {
                        if (
                          e.key === 'Enter'
                          && tradeAmount
                          && Number.parseFloat(tradeAmount) > 0
                        ) {
                          e.preventDefault()
                          handleConfirmTrade()
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
                      if (selectedOutcome.type === 'yes') {
                        triggerConfetti('yes', e)
                      }
                      else {
                        triggerConfetti('no', e)
                      }
                      handleConfirmTrade()
                    }}
                    disabled={
                      isLoading
                      || !tradeAmount
                      || Number.parseFloat(tradeAmount) <= 0
                    }
                    size="outcome"
                    variant={selectedOutcome.type}
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
                              {selectedOutcome.type === 'yes'
                                ? selectedOutcome.name
                                : (isBinaryMarket ? selectedOutcome.name : `Against ${selectedOutcome.name}`)}
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
                  {!isBinaryMarket && (
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
                            <span className="text-[11px] font-bold text-slate-900 dark:text-white">
                              {Math.round(market.probability)}
                              %
                            </span>
                            <div className="flex gap-1">
                              <Button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleTrade(market.outcomes[0].id, 'yes')
                                  onToggle()
                                }}
                                title={`${market.outcomes[0].outcome_text}: ${Math.round(market.probability)}%`}
                                variant="yes"
                                className="group h-auto w-[40px] px-2 py-1 text-[10px]"
                              >
                                <span className="truncate group-hover:hidden">
                                  {market.outcomes[0].outcome_text}
                                </span>
                                <span className="hidden font-mono group-hover:inline">
                                  {Math.round(market.probability)}
                                  %
                                </span>
                              </Button>
                              <Button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleTrade(market.outcomes[1].id, 'no')
                                  onToggle()
                                }}
                                title={`${market.outcomes[1].outcome_text}: ${Math.round(market.probability)}%`}
                                variant="no"
                                size="sm"
                                className="group h-auto w-[40px] px-2 py-1 text-[10px]"
                              >
                                <span className="truncate group-hover:hidden">
                                  {market.outcomes[1].outcome_text}
                                </span>
                                <span className="hidden font-mono group-hover:inline">
                                  {100 - Math.round(market.probability)}
                                  %
                                </span>
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Trading Actions - Only for binary markets */}
                  {isBinaryMarket && yesOutcome && noOutcome && (
                    <div className="mt-auto mb-2 grid grid-cols-2 gap-2">
                      <Button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleTrade(yesOutcome.id, 'yes')
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
                          handleTrade(noOutcome.id, 'no')
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
              <span>
                {formatVolume(event.markets[0].total_volume)}
                {' '}
                Vol.
              </span>
            </div>
            <EventBookmark event={event} />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
