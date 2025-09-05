import type { Event } from '@/types'
import { BanknoteIcon } from 'lucide-react'
import { useRef } from 'react'
import EventOrderPanelInputSection from '@/app/event/[slug]/_components/EventOrderPanelInputSection'
import EventOrderPanelMarketInfo from '@/app/event/[slug]/_components/EventOrderPanelMarketInfo'
import EventOrderPanelMobileMarketInfo from '@/app/event/[slug]/_components/EventOrderPanelMobileMarketInfo'
import { Button } from '@/components/ui/button'
import { calculateWinnings, mockUser } from '@/lib/mockData'
import { cn } from '@/lib/utils'
import { useIsBinaryMarket, useNoPrice, useOrder, useYesPrice } from '@/stores/useOrder'

interface EventOrderPanelFormProps {
  event: Event
  isMobile: boolean
  handleConfirmTrade: () => Promise<void>
}

export default function EventOrderPanelForm({
  event,
  isMobile,
  handleConfirmTrade,
}: EventOrderPanelFormProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const state = useOrder()
  const yesPrice = useYesPrice()
  const noPrice = useNoPrice()
  const isBinaryMarket = useIsBinaryMarket()

  // Function to calculate the amount the user will receive when selling shares
  function calculateSellAmount(sharesToSell: number) {
    if (!state.market || !state.outcome) {
      return 0
    }

    const sellPrice
      = state.outcome.outcome_index === 0
        ? (state.market.probability / 100) * 0.95 // 5% spread for sell
        : ((100 - state.market.probability) / 100) * 0.95

    return sharesToSell * sellPrice
  }

  // Function to get the average selling price
  function getAvgSellPrice() {
    if (!state.market || !state.outcome) {
      return 0
    }

    const sellPrice
      = state.outcome.outcome_index === 0
        ? Math.round(state.market.probability * 0.95) // 5% spread for sell
        : Math.round((100 - state.market.probability) * 0.95)

    return sellPrice.toString()
  }

  // Function to get user shares for the selected outcome
  function getUserShares() {
    if (!state.market) {
      return 0
    }
    return mockUser.shares['1-yes'] || 0
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
    const outcomeIndex = type === 'yes' ? 0 : 1
    const isSelected = state.outcome?.outcome_index === outcomeIndex

    const selectedClasses
      = type === 'yes'
        ? 'bg-yes hover:bg-yes-foreground text-white'
        : 'bg-no hover:bg-no-foreground text-white'

    return (
      <Button
        type="button"
        onClick={() => {
          if (!state.market) {
            return
          }

          state.setOutcome(state.market.outcomes[outcomeIndex])
          if (forceTabChange) {
            state.setActiveTab('buy')
          }

          inputRef?.current?.focus()
        }}
        variant={isSelected ? type : 'outline'}
        size="lg"
        className={`flex-1 ${isSelected ? selectedClasses : ''}`}
      >
        <span className="opacity-70">
          {type === 'yes'
            ? isBinaryMarket
              ? event.markets[0].outcomes[0].outcome_text
              : 'Yes'
            : isBinaryMarket
              ? event.markets[0].outcomes[1].outcome_text
              : 'No'}
        </span>
        <span className="font-bold">
          {price}
          ¢
        </span>
      </Button>
    )
  }

  return (
    <div className={cn({
      'rounded-lg border lg:w-[320px]': !isMobile,
    }, 'w-full p-4 shadow-xl/5')}
    >
      {!isMobile && !isBinaryMarket && <EventOrderPanelMarketInfo />}
      {isMobile && <EventOrderPanelMobileMarketInfo />}

      {/* Tabs Buy/Sell */}
      <div className="mb-4 flex text-sm font-semibold">
        <button
          type="button"
          onClick={() => {
            state.setActiveTab('buy')
            state.setAmount('') // Reset value when changing tab
            inputRef?.current?.focus()
          }}
          className={`flex-1 pb-2 transition-colors duration-200 ${
            state.activeTab === 'buy'
              ? 'border-b-2 border-primary text-foreground'
              : 'border-b-2'
          }`}
        >
          Buy
        </button>
        <button
          type="button"
          onClick={() => {
            state.setActiveTab('sell')
            state.setAmount('') // Reset value when changing tab
            inputRef?.current?.focus()
          }}
          className={`flex-1 pb-2 transition-colors duration-200 ${
            state.activeTab === 'sell'
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
      {state.activeTab === 'sell' && state.market && (
        <div className="mb-4 flex gap-2">
          <div className="flex-1 text-center">
            {getYesShares(state.market.condition_id) > 0
              ? (
                  <span className="text-xs text-muted-foreground">
                    {getYesShares(state.market.condition_id)}
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
            {getNoShares(state.market.condition_id) > 0
              ? (
                  <span className="text-xs text-muted-foreground">
                    {getNoShares(state.market.condition_id)}
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
      {state.activeTab === 'sell' && !state.market && (
        <div className="mb-4 rounded-lg border bg-muted/30 p-3">
          <p className="text-center text-sm text-muted-foreground">
            Select an outcome to sell shares
          </p>
        </div>
      )}

      {state.activeTab !== 'sell' && <div className="mb-4"></div>}

      <EventOrderPanelInputSection
        isMobile={isMobile}
        inputRef={inputRef}
        getUserShares={getUserShares}
      />

      {/* To Win / You'll receive Section */}
      {state.amount && Number.parseFloat(state.amount) > 0 && state.outcome && (
        <div className={`${isMobile ? 'mb-4 text-center' : 'mb-4'}`}>
          {!isMobile && <hr className="mb-3 border" />}
          <div className={cn('flex', isMobile ? 'flex-col' : 'items-center justify-between')}>
            <div className={isMobile ? 'mb-1' : ''}>
              <div
                className={cn(
                  'flex items-center gap-1 font-bold',
                  isMobile ? 'justify-center text-lg text-foreground' : 'text-sm text-muted-foreground',
                )}
              >
                {state.activeTab === 'sell' ? 'You\'ll receive' : 'To win'}
                {!isMobile && <BanknoteIcon className="size-4 text-yes" />}
                {isMobile && <span className="text-xl text-yes">💰</span>}
                {isMobile && (
                  <span className="text-2xl font-bold text-yes">
                    {state.activeTab === 'sell'
                      ? `$${
                        calculateSellAmount(Number.parseFloat(state.amount)).toFixed(2)
                      }`
                      : `$${
                        calculateWinnings(Number.parseFloat(state.amount), 0.72).toFixed(2)
                      }`}
                  </span>
                )}
              </div>
              <div
                className={cn(
                  'text-muted-foreground',
                  isMobile ? 'text-center text-sm' : 'text-xs',
                )}
              >
                {state.activeTab === 'sell'
                  ? `Avg. price ${getAvgSellPrice()}¢`
                  : 'Avg. Price 72¢'}
              </div>
            </div>
            {!isMobile && (
              <div className="text-4xl font-bold text-yes">
                {state.activeTab === 'sell'
                  ? `$${calculateSellAmount(Number.parseFloat(state.amount)).toFixed(2)}`
                  : `$${
                    calculateWinnings(Number.parseFloat(state.amount), 0.26).toFixed(2)
                  }`}
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
          state.isLoading
          || !state.amount
          || !state.outcome
          || (state.activeTab === 'sell' && Number.parseFloat(state.amount) > getUserShares())
        }
      >
        {state.isLoading
          ? (
              <div className="flex items-center justify-center gap-2">
                <div className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                <span>Processing...</span>
              </div>
            )
          : (
              <>
                {`${state.activeTab === 'sell' ? 'Sell' : 'Buy'} ${
                  state.outcome?.outcome_index === 1
                    ? !isBinaryMarket
                        ? 'No'
                        : state.outcome?.outcome_text
                    : !isBinaryMarket
                        ? 'Yes'
                        : state.outcome?.outcome_text
                }`}
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
