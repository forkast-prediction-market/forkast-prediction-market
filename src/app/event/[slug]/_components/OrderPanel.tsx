import type { Event } from '@/types'
import confetti from 'canvas-confetti'
import { BanknoteIcon, CircleCheckIcon } from 'lucide-react'
import Image from 'next/image'
import { useRef } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { calculateWinnings, mockUser } from '@/lib/mockData'

interface Props {
  event: Event
  tradingState: ReturnType<typeof import('@/hooks/useTradingState').useTradingState>
  isMobileVersion?: boolean
}

export default function OrderPanel({ event, tradingState, isMobileVersion = false }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)

  // Utility functions
  const getSelectedOutcome = tradingState.getSelectedOutcome
  const yesPrice = tradingState.yesPrice
  const noPrice = tradingState.noPrice

  // Function to calculate the amount the user will receive when selling shares
  function calculateSellAmount(sharesToSell: number) {
    if (!tradingState.selectedOutcomeForOrder || !tradingState.yesNoSelection) {
      return 0
    }

    const selectedOutcome = getSelectedOutcome()
    if (!selectedOutcome) {
      return 0
    }

    const sellPrice
        = tradingState.yesNoSelection === 'yes'
          ? (selectedOutcome.probability / 100) * 0.95 // 5% spread for sell
          : ((100 - selectedOutcome.probability) / 100) * 0.95

    return sharesToSell * sellPrice
  }

  // Function to get the average selling price
  function getAvgSellPrice() {
    if (!tradingState.selectedOutcomeForOrder || !tradingState.yesNoSelection) {
      return '0'
    }

    const selectedOutcome = getSelectedOutcome()
    if (!selectedOutcome) {
      return '0'
    }

    const sellPrice
        = tradingState.yesNoSelection === 'yes'
          ? Math.round(selectedOutcome.probability * 0.95) // 5% spread for sell
          : Math.round((100 - selectedOutcome.probability) * 0.95)

    return sellPrice.toString()
  }

  // Confetti effects
  function triggerYesConfetti(event?: React.MouseEvent) {
    let origin: { x?: number, y: number } = { y: 0.6 }

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

  // Handle confirm trade with loading
  async function handleConfirmTrade() {
    if (!tradingState.amount || Number.parseFloat(tradingState.amount) <= 0 || !tradingState.yesNoSelection) {
      return
    }

    tradingState.setIsLoading(true)
    tradingState.setShowWinCard(false)

    // Simulate API call
    setTimeout(() => {
      tradingState.setIsLoading(false)

      const amountNum = Number.parseFloat(tradingState.amount)

      if (tradingState.activeTab === 'sell') {
        // Sell logic
        const sellValue = calculateSellAmount(amountNum)

        // Show success toast for sell
        toast.success(
          `Sell ${tradingState.amount} shares on ${tradingState.yesNoSelection === 'yes' ? 'Yes' : 'No'}`,
          {
            description: (
              <div>
                <div className="font-medium">{event.title}</div>
                <div className="mt-1 text-xs opacity-80">
                  Received $$
                  {tradingState.formatValue(sellValue)}
                  {' '}
                  @ $
                  {getAvgSellPrice()}
                  ¢
                </div>
              </div>
            ),
          },
        )

        console.log(
          `Sell executed: ${tradingState.formatValue(
            Number.parseFloat(tradingState.amount),
          )} shares on ${tradingState.yesNoSelection} for $${tradingState.formatValue(sellValue)}`,
        )
      }
      else {
        // Buy logic (original)
        const price = tradingState.yesNoSelection === 'yes' ? yesPrice : noPrice
        const shares = tradingState.formatValue((amountNum / price) * 100)

        // Show success toast for buy
        toast.success(
          `Buy $${tradingState.amount} on ${tradingState.yesNoSelection === 'yes' ? 'Yes' : 'No'}`,
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

        console.log(
          `Buy executed: $${tradingState.amount} on ${tradingState.yesNoSelection} for market ${event.title}`,
        )
      }

      // Reset states
      tradingState.setAmount('')
      // Temporary workaround: displays victory card after 1.5s
      setTimeout(() => tradingState.setShowWinCard(true), 1500)
    }, 1000)
  }

  // Function to get user shares for the selected outcome
  function getUserShares() {
    if (!tradingState.selectedOutcomeForOrder) {
      return 0
    }
    const shareKey = tradingState.selectedOutcomeForOrder as keyof typeof mockUser.shares
    return mockUser.shares[shareKey] || 0
  }

  // Function to get shares for Yes outcome
  function getYesShares(outcomeId: string) {
    if (outcomeId.includes('-yes')) {
      const shareKey = outcomeId as keyof typeof mockUser.shares
      return mockUser.shares[shareKey] || 0
    }
    if (outcomeId.includes('-no')) {
      const baseId = outcomeId.replace('-no', '-yes')
      const shareKey = baseId as keyof typeof mockUser.shares
      return mockUser.shares[shareKey] || 0
    }
    const shareKey = `${outcomeId}-yes` as keyof typeof mockUser.shares
    return mockUser.shares[shareKey] || 0
  }

  // Function to get shares for No outcome
  function getNoShares(outcomeId: string) {
    if (outcomeId.includes('-no')) {
      const shareKey = outcomeId as keyof typeof mockUser.shares
      return mockUser.shares[shareKey] || 0
    }
    if (outcomeId.includes('-yes')) {
      const baseId = outcomeId.replace('-yes', '-no')
      const shareKey = baseId as keyof typeof mockUser.shares
      return mockUser.shares[shareKey] || 0
    }
    const shareKey = `${outcomeId}-no` as keyof typeof mockUser.shares
    return mockUser.shares[shareKey] || 0
  }

  // Function to render Yes/No buttons
  function renderYesNoButton(
    type: 'yes' | 'no',
    price: number,
    forceTabChange = false,
  ) {
    const isSelected = tradingState.yesNoSelection === type

    const selectedClasses
      = type === 'yes'
        ? 'bg-yes hover:bg-yes-foreground text-white'
        : 'bg-no hover:bg-no-foreground text-white'

    return (
      <Button
        type="button"
        onClick={() => {
          tradingState.setYesNoSelection(type)
          if (forceTabChange) {
            tradingState.setActiveTab('buy')
          }
          inputRef?.current?.focus()
        }}
        variant={isSelected ? type : 'outline'}
        size="lg"
        className={`flex-1 ${isSelected ? selectedClasses : ''}`}
      >
        <span className="opacity-70">
          {type === 'yes'
            ? tradingState.isMultiMarket
              ? 'Yes'
              : event.outcomes[0].name
            : tradingState.isMultiMarket
              ? 'No'
              : event.outcomes[1].name }
        </span>
        <span className="font-bold">
          {price}
          ¢
        </span>
      </Button>
    )
  }

  // Function to render action buttons (percentage and value)
  function renderActionButtons(isMobileVersion: boolean) {
    const baseButtonClasses
      = 'h-7 px-3 rounded-lg border text-[11px] transition-all duration-200 ease-in-out'

    if (tradingState.activeTab === 'sell') {
      const userShares = getUserShares()
      const isDisabled = userShares <= 0

      return ['25%', '50%', '75%'].map(percentage => (
        <button
          type="button"
          key={percentage}
          className={`${baseButtonClasses} ${
            isDisabled
              ? 'cursor-not-allowed opacity-50'
              : 'hover:bg-white/10 dark:hover:bg-white/5'
          }`}
          disabled={isDisabled}
          onClick={() => {
            if (isDisabled) {
              return
            }
            const percentValue = Number.parseInt(percentage.replace('%', '')) / 100
            const newValue = tradingState.formatValue(userShares * percentValue)
            tradingState.setAmount(newValue)
            inputRef?.current?.focus()
          }}
        >
          {percentage}
        </button>
      ))
    }
    else {
      const chipValues = isMobileVersion
        ? ['+$1', '+$20', '+$100']
        : ['+$5', '+$25', '+$100']

      return chipValues.map(chip => (
        <button
          type="button"
          key={chip}
          className={`${baseButtonClasses} hover:border-border hover:bg-white/10 dark:hover:bg-white/5`}
          onClick={() => {
            const chipValue = Number.parseInt(chip.substring(2))
            const currentValue = Number.parseFloat(tradingState.amount) || 0
            const newValue = currentValue + chipValue

            if (newValue <= 999999999) {
              tradingState.setAmount(tradingState.formatValue(newValue))
              inputRef?.current?.focus()
            }
          }}
        >
          {chip}
        </button>
      ))
    }
  }

  function renderWinCard(isMobileVersion = false) {
    const outcomeName
        = tradingState.yesNoSelection === 'yes'
          ? tradingState.yesOutcome?.name || 'Yes'
          : getSelectedOutcome()?.name || 'No'
    const shares = tradingState.amount && !Number.isNaN(Number(tradingState.amount)) ? Number(tradingState.amount) : 1.1
    const valuePerShare
        = tradingState.amount && !Number.isNaN(Number(tradingState.amount))
          ? Number.parseFloat((Number.parseFloat(tradingState.amount) / shares).toFixed(2))
          : 1.0
    const total = shares * valuePerShare

    // Function to trigger blue confetti from the button
    function triggerBlueConfetti(
      event: React.MouseEvent<HTMLButtonElement>,
    ) {
      if (!event || !event.currentTarget) {
        return
      }
      const rect = event.currentTarget.getBoundingClientRect()
      const x = (rect.left + rect.width / 2) / window.innerWidth
      const y = (rect.top + rect.height / 2) / window.innerHeight
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { x, y },
        colors: ['#2563eb', '#1d4ed8', '#3b82f6', '#60a5fa'],
      })
    }

    let outcomeLabel = outcomeName
    if (tradingState.isMultiMarket) {
      const selectedOutcome = getSelectedOutcome()
      if (selectedOutcome) {
        outcomeLabel = `${selectedOutcome.name} - ${
          tradingState.yesNoSelection === 'yes' ? 'Yes' : 'No'
        }`
      }
    }

    return (
      <div
        className={`
          flex flex-col items-center justify-center rounded-lg border p-6
          ${isMobileVersion ? 'w-full' : 'w-full lg:w-[320px]'}`}
      >
        <CircleCheckIcon size={56} className="mb-2 text-primary" />
        <div className="mb-1 text-center text-xl font-bold text-primary">
          Outcome:
          {' '}
          {outcomeLabel}
        </div>
        {!tradingState.claimed && <hr className="my-4 w-full border" />}
        {!tradingState.claimed && (
          <>
            <div className="mb-2 text-center text-lg font-bold text-foreground">
              Your Earnings
            </div>
            <div className="flex w-full flex-col gap-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Position:</span>
                <span className="font-medium text-foreground">
                  {shares}
                  {' '}
                  {outcomeLabel}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Value per Share:</span>
                <span className="font-medium text-foreground">
                  $
                  {valuePerShare.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total:</span>
                <span className="font-medium text-foreground">
                  $
                  {total.toFixed(2)}
                </span>
              </div>
            </div>
            <Button
              type="button"
              onClick={async (e) => {
                tradingState.setClaiming(true)
                triggerBlueConfetti(e)
                await new Promise(res => setTimeout(res, 1800))
                tradingState.setClaiming(false)
                tradingState.setClaimed(true)
                // Show success toast for claim
                toast.success('Redeem shares', {
                  description: (
                    <div>
                      <div className="font-medium">{event.title}</div>
                    </div>
                  ),
                })
              }}
              disabled={tradingState.claiming}
            >
              {tradingState.claiming
                ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent">
                      </div>
                      <span>Confirming...</span>
                    </div>
                  )
                : (
                    'Claim winnings'
                  )}
            </Button>
          </>
        )}
        <p className="mt-3 text-center text-[10px] text-muted-foreground">
          By trading, you agree to our Terms of Service
        </p>
      </div>
    )
  }

  // Function to render the order panel content
  function renderOrderPanel(isMobileVersion = false) {
    if (tradingState.showWinCard) {
      return renderWinCard(isMobileVersion)
    }

    const containerClasses = `${
      isMobileVersion ? 'w-full' : 'w-full lg:w-[320px]'
    } ${
      isMobileVersion
        ? ''
        : 'rounded-lg border'
    } p-4 shadow-xl/5`

    return (
      <div className={containerClasses}>
        {/* Display the selected option (only for multi-outcome) */}
        {event.active_markets_count > 1
          && tradingState.selectedOutcomeForOrder
          && !isMobileVersion && (
          <div className="mb-4 rounded-lg bg-muted/20">
            <div className="flex items-center gap-3">
              <Image
                src={
                  getSelectedOutcome()?.avatar
                  || `https://avatar.vercel.sh/${getSelectedOutcome()?.name.toLowerCase()}.png`
                }
                alt={getSelectedOutcome()?.name || 'Selected outcome'}
                width={42}
                height={42}
                className="shrink-0 rounded-sm"
              />
              <span className="text-sm font-bold">
                {getSelectedOutcome()?.name}
              </span>
            </div>
          </div>
        )}

        {/* Market info for mobile */}
        {isMobileVersion && (
          <div className="mb-4 flex items-center gap-3">
            <Image
              src={
                tradingState.selectedOutcomeForOrder
                  ? getSelectedOutcome()?.avatar
                  || `https://avatar.vercel.sh/${getSelectedOutcome()?.name.toLowerCase()}.png`
                  : event.creatorAvatar
                    || `https://avatar.vercel.sh/${event.title.charAt(0)}.png`
              }
              alt={
                tradingState.selectedOutcomeForOrder
                  ? getSelectedOutcome()?.name || 'Selected outcome'
                  : event.creator || 'Market creator'
              }
              width={32}
              height={32}
              className="shrink-0 rounded"
            />
            <div className="flex-1">
              <div className="line-clamp-2 text-sm font-medium">
                {event.title}
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  {tradingState.selectedOutcomeForOrder
                    ? getSelectedOutcome()?.name
                    : tradingState.yesOutcome?.name || event.outcomes[0]?.name}
                </span>
                <span>
                  Bal. $
                  {tradingState.formatValue(mockUser.cash)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Tabs Buy/Sell */}
        <div className="mb-4 flex text-sm font-semibold">
          <button
            type="button"
            onClick={() => {
              tradingState.setActiveTab('buy')
              tradingState.setAmount('') // Reset value when changing tab
              inputRef?.current?.focus()
            }}
            className={`flex-1 pb-2 transition-colors duration-200 ${
              tradingState.activeTab === 'buy'
                ? 'border-b-2 border-primary text-foreground'
                : 'border-b-2'
            }`}
          >
            Buy
          </button>
          <button
            type="button"
            onClick={() => {
              tradingState.setActiveTab('sell')
              tradingState.setAmount('') // Reset value when changing tab
              inputRef?.current?.focus()
            }}
            className={`flex-1 pb-2 transition-colors duration-200 ${
              tradingState.activeTab === 'sell'
                ? 'border-b-2 border-primary text-foreground'
                : 'border-b-2'
            }`}
          >
            Sell
          </button>
        </div>

        {/* Yes/No buttons */}
        <div className="mb-2 flex gap-2">
          {renderYesNoButton('yes', yesPrice)}
          {renderYesNoButton('no', noPrice)}
        </div>

        {/* Display available shares (only in Sell mode) */}
        {tradingState.activeTab === 'sell' && tradingState.selectedOutcomeForOrder && (
          <div className="mb-4 flex gap-2">
            <div className="flex-1 text-center">
              {getYesShares(tradingState.selectedOutcomeForOrder) > 0
                ? (
                    <span className="text-xs text-muted-foreground">
                      {tradingState.formatValue(getYesShares(tradingState.selectedOutcomeForOrder))}
                      {' '}
                      shares
                    </span>
                  )
                : (
                    <span className="text-xs text-muted-foreground opacity-50">
                      No shares
                    </span>
                  )}
            </div>
            <div className="flex-1 text-center">
              {getNoShares(tradingState.selectedOutcomeForOrder) > 0
                ? (
                    <span className="text-xs text-muted-foreground">
                      {tradingState.formatValue(getNoShares(tradingState.selectedOutcomeForOrder))}
                      {' '}
                      shares
                    </span>
                  )
                : (
                    <span className="text-xs text-muted-foreground opacity-50">
                      No shares
                    </span>
                  )}
            </div>
          </div>
        )}

        {/* Message when no outcome is selected in Sell mode */}
        {tradingState.activeTab === 'sell' && !tradingState.selectedOutcomeForOrder && (
          <div className="mb-4 rounded-lg border bg-muted/30 p-3">
            <p className="text-center text-sm text-muted-foreground">
              Select an outcome to sell shares
            </p>
          </div>
        )}

        {tradingState.activeTab !== 'sell' && <div className="mb-4"></div>}

        {/* Amount/Shares */}
        {isMobileVersion
          ? (
              <div className="mb-4">
                <div className="mb-4 flex items-center justify-center gap-4">
                  <button
                    type="button"
                    onClick={() => {
                      const currentValue = Number.parseFloat(tradingState.amount) || 0
                      const newValue = Math.max(
                        0,
                        currentValue - (tradingState.activeTab === 'sell' ? 0.1 : 1),
                      )
                      tradingState.setAmount(tradingState.formatValue(newValue))
                    }}
                    className={`
                      flex size-12 items-center justify-center rounded-lg bg-muted text-2xl font-bold transition-colors
                      hover:bg-muted/80
                    `}
                  >
                    −
                  </button>
                  <div className="flex-1 text-center">
                    <input
                      ref={inputRef}
                      type="text"
                      className={`
                        w-full
                        [appearance:textfield]
                        border-0 bg-transparent text-center text-4xl font-bold text-foreground
                        placeholder-muted-foreground outline-hidden
                        [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none
                      `}
                      placeholder={tradingState.activeTab === 'sell' ? '0' : '$1.00'}
                      value={
                        tradingState.activeTab === 'sell'
                          ? tradingState.amount || ''
                          : tradingState.amount
                            ? `$${tradingState.amount}`
                            : ''
                      }
                      onChange={(e) => {
                        const rawValue
                      = tradingState.activeTab === 'sell'
                        ? e.target.value
                        : e.target.value.replace(/[^0-9.]/g, '')

                        const value
                      = tradingState.activeTab === 'sell'
                        ? tradingState.limitDecimalPlaces(rawValue, 2)
                        : rawValue

                        const numericValue = Number.parseFloat(value)

                        if (tradingState.activeTab === 'sell') {
                          // For sell, limit by the amount of shares the user has
                          const userShares = getUserShares()
                          if (numericValue <= userShares || value === '') {
                            tradingState.setAmount(value)
                          }
                        }
                        else {
                          // For buy, limit as before
                          if (numericValue <= 99999 || value === '') {
                            tradingState.setAmount(value)
                          }
                        }
                      }}
                      onBlur={(e) => {
                        const value = e.target.value.replace(/[^0-9.]/g, '')
                        if (value && !Number.isNaN(Number.parseFloat(value))) {
                          tradingState.setAmount(tradingState.formatValue(Number.parseFloat(value)))
                        }
                      }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const currentValue = Number.parseFloat(tradingState.amount) || 0
                      const newValue
                    = currentValue + (tradingState.activeTab === 'sell' ? 0.1 : 1)

                      if (tradingState.activeTab === 'sell') {
                        const userShares = getUserShares()
                        if (newValue <= userShares) {
                          tradingState.setAmount(tradingState.formatValue(newValue))
                        }
                      }
                      else {
                        if (newValue <= 99999) {
                          tradingState.setAmount(tradingState.formatValue(newValue))
                        }
                      }
                    }}
                    className={`
                      flex size-12 items-center justify-center rounded-lg bg-muted text-2xl font-bold transition-colors
                      hover:bg-muted/80
                    `}
                  >
                    +
                  </button>
                </div>
              </div>
            )
          : (
              <div className="mb-2 flex items-center gap-3">
                <div className="shrink-0">
                  <div className="text-lg font-medium">
                    {tradingState.activeTab === 'sell' ? 'Shares' : 'Amount'}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {tradingState.activeTab === 'sell'
                      ? ``
                      : `Balance $${tradingState.formatValue(mockUser.cash)}`}
                  </div>
                </div>
                <div className="relative flex-1">
                  <input
                    ref={inputRef}
                    type="text"
                    className={`
                      h-14 w-full
                      [appearance:textfield]
                      border-0 bg-transparent text-right text-4xl font-bold text-slate-700 placeholder-slate-400
                      outline-hidden
                      dark:text-slate-300 dark:placeholder-slate-500
                      [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none
                    `}
                    placeholder={tradingState.activeTab === 'sell' ? '0' : '$0.00'}
                    value={
                      tradingState.activeTab === 'sell'
                        ? tradingState.amount || ''
                        : tradingState.amount
                          ? `$${tradingState.amount}`
                          : ''
                    }
                    onChange={(e) => {
                      const rawValue
                    = tradingState.activeTab === 'sell'
                      ? e.target.value
                      : e.target.value.replace(/[^0-9.]/g, '')

                      const value = tradingState.activeTab === 'sell'
                        ? tradingState.limitDecimalPlaces(rawValue, 2)
                        : rawValue

                      const numericValue = Number.parseFloat(value)

                      if (tradingState.activeTab === 'sell') {
                        // For sell, limit by the amount of shares the user has
                        const userShares = getUserShares()
                        if (numericValue <= userShares || value === '') {
                          tradingState.setAmount(value)
                        }
                      }
                      else {
                        // For buy, limit as before
                        if (numericValue <= 99999 || value === '') {
                          tradingState.setAmount(value)
                        }
                      }
                    }}
                    onBlur={(e) => {
                      const value = e.target.value.replace(/[^0-9.]/g, '')
                      if (value && !Number.isNaN(Number.parseFloat(value))) {
                        tradingState.setAmount(tradingState.formatValue(Number.parseFloat(value)))
                      }
                    }}
                  />
                </div>
              </div>
            )}

        {/* Quick chips */}
        <div
          className={`mb-3 flex gap-2 ${
            isMobileVersion ? 'justify-center' : 'justify-end'
          }`}
        >
          {renderActionButtons(isMobileVersion)}
          {/* Max button */}
          <button
            type="button"
            className={`
              h-7 rounded-lg border px-3 text-[11px] font-semibold transition-all duration-200
              ease-in-out
              ${
      tradingState.activeTab === 'sell' && getUserShares() <= 0
        ? 'cursor-not-allowed opacity-50'
        : 'hover:border-border hover:bg-white/10 dark:hover:bg-white/5'
      }`}
            disabled={tradingState.activeTab === 'sell' && getUserShares() <= 0}
            onClick={() => {
              if (tradingState.activeTab === 'sell') {
                const userShares = getUserShares()
                if (userShares <= 0) {
                  return
                }
                tradingState.setAmount(tradingState.formatValue(userShares))
              }
              else {
                const maxBalance = mockUser.cash
                // Limit to 999,999,999
                const limitedBalance = Math.min(maxBalance, 999999999)
                tradingState.setAmount(tradingState.formatValue(limitedBalance))
              }
              inputRef?.current?.focus()
            }}
          >
            MAX
          </button>
        </div>

        {/* To Win / You'll receive Section */}
        {tradingState.amount && Number.parseFloat(tradingState.amount) > 0 && tradingState.yesNoSelection && (
          <div className={`${isMobileVersion ? 'mb-4 text-center' : 'mb-4'}`}>
            {!isMobileVersion && (
              <hr className="mb-3 border" />
            )}
            <div
              className={`flex ${
                isMobileVersion ? 'flex-col' : 'items-center justify-between'
              }`}
            >
              <div className={isMobileVersion ? 'mb-1' : ''}>
                <div
                  className={`${
                    isMobileVersion ? 'text-lg' : 'text-sm'
                  } font-bold ${
                    isMobileVersion
                      ? 'text-foreground'
                      : 'text-muted-foreground'
                  } flex items-center ${
                    isMobileVersion ? 'justify-center' : ''
                  } gap-1`}
                >
                  {tradingState.activeTab === 'sell' ? 'You\'ll receive' : 'To win'}
                  {!isMobileVersion && (
                    <BanknoteIcon className="size-4 text-yes" />
                  )}
                  {isMobileVersion && (
                    <span className="text-xl text-yes">💰</span>
                  )}
                  {isMobileVersion && (
                    <span className="text-2xl font-bold text-yes">
                      {tradingState.activeTab === 'sell'
                        ? `$${tradingState.formatValue(
                          calculateSellAmount(Number.parseFloat(tradingState.amount)),
                        )}`
                        : `$${tradingState.formatValue(
                          calculateWinnings(Number.parseFloat(tradingState.amount), 0.72),
                        )}`}
                    </span>
                  )}
                </div>
                <div
                  className={`${
                    isMobileVersion ? 'text-sm' : 'text-xs'
                  } text-muted-foreground ${
                    isMobileVersion ? 'text-center' : ''
                  }`}
                >
                  {tradingState.activeTab === 'sell'
                    ? `Avg. price ${getAvgSellPrice()}¢`
                    : 'Avg. Price 72¢'}
                </div>
              </div>
              {!isMobileVersion && (
                <div className="text-4xl font-bold text-yes">
                  {tradingState.activeTab === 'sell'
                    ? `$${tradingState.formatValue(calculateSellAmount(Number.parseFloat(tradingState.amount)))}`
                    : `$${tradingState.formatValue(
                      calculateWinnings(Number.parseFloat(tradingState.amount), 0.26),
                    )}`}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Main button */}
        <Button
          className="w-full"
          size="lg"
          onClick={(e) => {
            // Trigger confetti based on selection
            if (tradingState.yesNoSelection === 'yes') {
              triggerYesConfetti(e)
            }
            else {
              triggerNoConfetti(e)
            }
            handleConfirmTrade()
          }}
          disabled={
            tradingState.isLoading
            || !tradingState.amount
            || Number.parseFloat(tradingState.amount) <= 0
            || !tradingState.yesNoSelection
            || (tradingState.activeTab === 'sell' && Number.parseFloat(tradingState.amount) > getUserShares())
          }
        >
          {tradingState.isLoading
            ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                  <span>Processing...</span>
                </div>
              )
            : (
                <>
                  {tradingState.activeTab === 'sell'
                    ? tradingState.yesNoSelection === 'no'
                      ? `Sell ${tradingState.isMultiMarket ? 'No' : event.outcomes[1].name}`
                      : `Sell ${tradingState.isMultiMarket ? 'Yes' : event.outcomes[0].name}`
                    : tradingState.yesNoSelection === 'no'
                      ? `Buy ${tradingState.isMultiMarket ? 'No' : event.outcomes[1].name}`
                      : `Buy ${tradingState.isMultiMarket ? 'Yes' : event.outcomes[0].name}`}
                </>
              )}
        </Button>

        {/* Disclaimer */}
        <p className="mt-3 text-center text-[10px] text-muted-foreground">
          By trading, you agree to our Terms of Service
        </p>
      </div>
    )
  }

  return renderOrderPanel(isMobileVersion)
}
