import type { Event } from '@/types'
import { BanknoteIcon } from 'lucide-react'
import Image from 'next/image'
import { useRef } from 'react'
import { Button } from '@/components/ui/button'
import { calculateWinnings, mockUser } from '@/lib/mockData'

interface Props {
  event: Event
  tradingState: ReturnType<typeof import('@/hooks/useTradingState').useTradingState>
  isMobileVersion?: boolean
  handleConfirmTrade: () => Promise<void>
  triggerYesConfetti: (event?: React.MouseEvent) => void
  triggerNoConfetti: (event?: React.MouseEvent) => void
}

export default function EventOrderPanelForm({
  event,
  tradingState,
  isMobileVersion = false,
  handleConfirmTrade,
  triggerYesConfetti,
  triggerNoConfetti,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
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
