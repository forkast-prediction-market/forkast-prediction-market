'use client'

import type { Event } from '@/types'
import confetti from 'canvas-confetti'
import { ChevronsDownIcon, ChevronsUpIcon, DollarSignIcon } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { use, useState } from 'react'
import { toast } from 'sonner'
import EventBookmark from '@/app/event/[slug]/_components/EventBookmark'
import { OpenCardContext } from '@/components/event/EventOpenCardContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

interface Props {
  event: Event
}

export default function EventCard({ event }: Props) {
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

  // Function to format monetary values with 2 decimal places
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

  const isBinaryMarket
    = event.outcomes.length === 2
      && event.outcomes.some(o => o.isYes !== undefined)
  const yesOutcome = event.outcomes.find(o => o.isYes === true)
  const noOutcome = event.outcomes.find(o => o.isYes === false)

  function formatVolume(volume: number) {
    if (volume >= 1000000) {
      return `$${(volume / 1000000).toFixed(1)}M`
    }
    else if (volume >= 1000) {
      return `$${(volume / 1000).toFixed(0)}k`
    }
    return `$${volume.toFixed(0)}`
  }

  async function handleTrade(outcomeId: string, type: 'yes' | 'no') {
    const outcome = event.outcomes.find(o => o.id === outcomeId)
    if (outcome) {
      setSelectedOutcome({
        id: outcomeId,
        type,
        name: outcome.name,
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
      const outcome = event.outcomes.find(o => o.id === selectedOutcome.id)
      if (outcome) {
        const probability = outcome.probability
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
    const outcome = event.outcomes.find(o => o.id === selectedOutcome.id)
    if (!outcome) {
      return '0.00'
    }

    // Calculate potential winnings based on probability
    const probability = outcome.probability / 100
    const odds
      = selectedOutcome.type === 'yes' ? 1 / probability : 1 / (1 - probability)
    const winnings = amountNum * odds
    return winnings.toFixed(2)
  }

  // Confetti effects
  function triggerYesConfetti(event?: React.MouseEvent) {
    let origin: { x?: number, y: number } = { y: 0.6 }

    // If an event is passed, calculate the button position
    if (event && event.currentTarget) {
      const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
      const x = (rect.left + rect.width / 2) / window.innerWidth
      const y = (rect.top + rect.height / 2) / window.innerHeight
      origin = { x, y }
    }

    confetti({
      particleCount: 80,
      spread: 60,
      origin,
      colors: ['#10b981', '#059669', '#047857', '#065f46'], // Green colors
    })
  }

  function triggerNoConfetti(event?: React.MouseEvent) {
    let origin: { x?: number, y: number } = { y: 0.6 }

    // If an event is passed, calculate the button position
    if (event && event.currentTarget) {
      const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
      const x = (rect.left + rect.width / 2) / window.innerWidth
      const y = (rect.top + rect.height / 2) / window.innerHeight
      origin = { x, y }
    }

    confetti({
      particleCount: 80,
      spread: 60,
      origin,
      colors: ['#ef4444', '#dc2626', '#b91c1c', '#991b1b'], // Red colors
    })
  }

  // Unified category icon render function - removed as avatars now replace category icons

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
                src={
                  event.creatorAvatar
                  || `https://avatar.vercel.sh/${
                    event.creator || event.title.charAt(0)
                  }.png`
                }
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
                              Math.round(yesOutcome.probability) < 40
                                ? 'text-no'
                                : Math.round(yesOutcome.probability) === 50
                                  ? 'text-slate-400'
                                  : 'text-yes'
                            }`}
                            strokeDasharray={`${
                              (Math.round(yesOutcome.probability) / 100) * 69.12
                            } 69.12`}
                            strokeDashoffset="0"
                          />
                        </svg>
                        {/* Percentage number centered in arc */}
                        <div className="absolute inset-0 flex items-center justify-center pt-2">
                          <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                            {Math.round(yesOutcome.probability)}
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
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      // Trigger confetti based on selection
                      if (selectedOutcome.type === 'yes') {
                        triggerYesConfetti(e)
                      }
                      else {
                        triggerNoConfetti(e)
                      }
                      handleConfirmTrade()
                    }}
                    disabled={
                      isLoading
                      || !tradeAmount
                      || Number.parseFloat(tradeAmount) <= 0
                    }
                    className={`
                      w-full rounded px-3 py-1 text-sm font-semibold text-white transition-colors
                      disabled:cursor-not-allowed
                      ${selectedOutcome.type === 'yes'
                  ? 'bg-yes hover:bg-yes-foreground'
                  : 'bg-no hover:bg-no-foreground'}
                  `}
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
                  </button>
                </div>
              )
            : (
                <>
                  {/* Body - Show multi-outcome options only for non-binary markets */}
                  {!isBinaryMarket && (
                    <div className="mt-auto mb-1 scrollbar-hide max-h-18 space-y-2 overflow-y-auto">
                      {event.outcomes.map(outcome => (
                        <div
                          key={outcome.id}
                          className="flex items-center justify-between text-xs"
                        >
                          <span
                            className="truncate dark:text-white"
                            title={outcome.name}
                          >
                            {outcome.name}
                          </span>
                          <div className="ml-2 flex items-center gap-2">
                            <span className="text-[11px] font-bold text-slate-900 dark:text-white">
                              {Math.round(outcome.probability)}
                              %
                            </span>
                            <div className="flex gap-1">
                              <Button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleTrade(outcome.yesOutcome?.id || outcome.id, 'yes')
                                  onToggle()
                                }}
                                title={`${outcome.yesOutcome?.name || 'Yes'}: ${Math.round(outcome.probability)}%`}
                                variant="yes"
                                size="sm"
                                className="group h-auto w-[40px] rounded px-2 py-1 text-[11px]"
                              >
                                <span className="group-hover:hidden">
                                  {outcome.yesOutcome?.name || 'Yes'}
                                </span>
                                <span className="hidden font-mono group-hover:inline">
                                  {Math.round(outcome.probability)}
                                  %
                                </span>
                              </Button>
                              <Button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleTrade(outcome.noOutcome?.id || outcome.id, 'no')
                                  onToggle()
                                }}
                                title={`${outcome.noOutcome?.name || 'No'}: ${
                                  100 - Math.round(outcome.probability)
                                }%`}
                                variant="no"
                                size="sm"
                                className="group h-auto w-[40px] rounded px-2 py-1 text-[11px]"
                              >
                                <span className="group-hover:hidden">
                                  {outcome.noOutcome?.name || 'No'}
                                </span>
                                <span className="hidden font-mono group-hover:inline">
                                  {100 - Math.round(outcome.probability)}
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
                      >
                        Buy
                        {' '}
                        {yesOutcome.name}
                        {' '}
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
                      >
                        Buy
                        {' '}
                        {noOutcome.name}
                        {' '}
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
                {formatVolume(event.volume)}
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
