import type { Event } from '@/types'
import { DialogTitle } from '@radix-ui/react-dialog'
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'
import EventOrderPanelForm from '@/app/(platform)/event/[slug]/_components/EventOrderPanelForm'
import { Button } from '@/components/ui/button'
import { Drawer, DrawerContent, DrawerTrigger } from '@/components/ui/drawer'
import { useIsBinaryMarket, useNoPrice, useOrder, useYesPrice } from '@/stores/useOrder'

interface EventMobileOrderPanelProps {
  event: Event
}

export default function EventOrderPanelMobile({ event }: EventMobileOrderPanelProps) {
  const state = useOrder()
  const isBinaryMarket = useIsBinaryMarket()
  const yesPrice = useYesPrice()
  const noPrice = useNoPrice()

  return (
    <Drawer
      open={state.isMobileOrderPanelOpen}
      onClose={() => state.setIsMobileOrderPanelOpen(false)}
      repositionInputs={false}
    >
      <DrawerTrigger asChild>
        {isBinaryMarket && (
          <div className="fixed right-0 bottom-0 left-0 border-t bg-background p-4 lg:hidden">
            <div className="flex gap-2">
              <Button
                variant="yes"
                size="outcome"
                onClick={() => {
                  if (!state.market) {
                    return
                  }

                  state.setOutcome(state.market.outcomes[0])
                  state.setIsMobileOrderPanelOpen(true)
                }}
              >
                <span className="truncate opacity-70">
                  Buy
                  {' '}
                  {state.market!.outcomes[0].outcome_text}
                </span>
                <span className="shrink-0 font-bold">
                  {yesPrice}
                  ¢
                </span>
              </Button>
              <Button
                variant="no"
                size="outcome"
                onClick={() => {
                  if (!state.market) {
                    return
                  }

                  state.setOutcome(state.market.outcomes[1])
                  state.setIsMobileOrderPanelOpen(true)
                }}
              >
                <span className="truncate opacity-70">
                  Buy
                  {' '}
                  {state.market!.outcomes[1].outcome_text}
                </span>
                <span className="shrink-0 font-bold">
                  {noPrice}
                  ¢
                </span>
              </Button>
            </div>
          </div>
        )}
      </DrawerTrigger>

      <DrawerContent className="overflow-y-auto">
        <VisuallyHidden>
          <DialogTitle>{event.title}</DialogTitle>
        </VisuallyHidden>

        <EventOrderPanelForm event={event} isMobile={true} />
      </DrawerContent>
    </Drawer>
  )
}
