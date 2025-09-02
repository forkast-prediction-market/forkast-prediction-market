import type { Event } from '@/types'
import { BanknoteIcon } from 'lucide-react'
import Image from 'next/image'
import { useRef } from 'react'
import { Button } from '@/components/ui/button'
import { calculateWinnings, mockUser } from '@/lib/mockData'
import EventOrderPanelInputSection from './EventOrderPanelInputSection'

interface Props {
  event: Event
  tradingState: ReturnType<typeof import('@/hooks/useTradingState').useTradingState>
  isMobileVersion?: boolean
  handleConfirmTrade: () => Promise<void>
}

export default function EventOrderPanelForm({
  event,
  tradingState,
  isMobileVersion = false,
  handleConfirmTrade,
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

      <EventOrderPanelInputSection
        isMobileVersion={isMobileVersion}
        tradingState={tradingState}
        inputRef={inputRef}
        getUserShares={getUserShares}
      />

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
        onClick={handleConfirmTrade}
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
