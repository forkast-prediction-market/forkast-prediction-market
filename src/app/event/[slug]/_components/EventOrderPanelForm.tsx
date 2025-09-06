import { useRef } from 'react'
import EventOrderPanelBuySellTabs from '@/app/event/[slug]/_components/EventOrderPanelBuySellTabs'
import EventOrderPanelEarnings from '@/app/event/[slug]/_components/EventOrderPanelEarnings'
import EventOrderPanelInputSection from '@/app/event/[slug]/_components/EventOrderPanelInputSection'
import EventOrderPanelMarketInfo from '@/app/event/[slug]/_components/EventOrderPanelMarketInfo'
import EventOrderPanelMobileMarketInfo from '@/app/event/[slug]/_components/EventOrderPanelMobileMarketInfo'
import EventOrderPanelOutcomeButton from '@/app/event/[slug]/_components/EventOrderPanelOutcomeButton'
import EventOrderPanelSubmitButton from '@/app/event/[slug]/_components/EventOrderPanelSubmitButton'
import EventOrderPanelTermsDisclaimer from '@/app/event/[slug]/_components/EventOrderPanelTermsDisclaimer'
import EventOrderPanelUserShares from '@/app/event/[slug]/_components/EventOrderPanelUserShares'
import { cn } from '@/lib/utils'
import {
  getUserShares,
  useIsBinaryMarket,
  useNoPrice,
  useOrder,
  useYesPrice,
} from '@/stores/useOrder'

interface EventOrderPanelFormProps {
  isMobile: boolean
  handleConfirmTrade: () => Promise<void>
}

export default function EventOrderPanelForm({
  isMobile,
  handleConfirmTrade,
}: EventOrderPanelFormProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const state = useOrder()
  const yesPrice = useYesPrice()
  const noPrice = useNoPrice()
  const isBinaryMarket = useIsBinaryMarket()

  return (
    <div className={cn({
      'rounded-lg border lg:w-[320px]': !isMobile,
    }, 'w-full p-4 shadow-xl/5')}
    >
      {!isMobile && !isBinaryMarket && <EventOrderPanelMarketInfo />}
      {isMobile && <EventOrderPanelMobileMarketInfo />}

      <EventOrderPanelBuySellTabs inputRef={inputRef} />

      {/* Yes/No buttons */}
      <div className="mb-2 flex gap-2">
        <EventOrderPanelOutcomeButton inputRef={inputRef} type="yes" price={yesPrice} />
        <EventOrderPanelOutcomeButton inputRef={inputRef} type="no" price={noPrice} />
      </div>

      {state.activeTab === 'sell' ? <EventOrderPanelUserShares /> : <div className="mb-4"></div>}

      <EventOrderPanelInputSection
        isMobile={isMobile}
        inputRef={inputRef}
        getUserShares={getUserShares}
      />

      {Number.parseFloat(state.amount) > 0 && <EventOrderPanelEarnings isMobile={isMobile} />}

      <EventOrderPanelSubmitButton handleConfirmTrade={handleConfirmTrade} />
      <EventOrderPanelTermsDisclaimer />
    </div>
  )
}
