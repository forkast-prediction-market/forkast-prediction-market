import type { Event } from '@/types'
import { DialogTitle } from '@radix-ui/react-dialog'
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'
import { Button } from '@/components/ui/button'
import { Drawer, DrawerContent, DrawerTrigger } from '@/components/ui/drawer'
import { useIsBinaryMarket, useNoPrice, useOrder, useYesPrice } from '@/stores/useOrder'
import EventOrderPanel from './EventOrderPanel'

interface EventMobileOrderPanelProps {
  event: Event
}

export default function EventMobileOrderPanel({ event }: EventMobileOrderPanelProps) {
  const state = useOrder()
  const isBinaryMarket = useIsBinaryMarket()
  const yesPrice = useYesPrice()
  const noPrice = useNoPrice()

  return (
    <Drawer
      open={state.isMobileOrderPanelOpen}
      onClose={() => state.setIsMobileOrderPanelOpen(false)}
    >
      <DrawerTrigger asChild>
        {isBinaryMarket && (
          <div className="fixed right-0 bottom-0 left-0 border-t bg-background p-4 md:hidden">
            <div className="flex gap-2">
              <Button
                variant="yes"
                size="lg"
                className="flex-1"
                onClick={() => {
                  if (!state.market) {
                    return
                  }

                  state.setOutcome(state.market.outcomes[0])
                  state.setIsMobileOrderPanelOpen(true)
                }}
              >
                Buy Yes
                {' '}
                {yesPrice}
                ¢
              </Button>
              <Button
                variant="no"
                size="lg"
                className="flex-1"
                onClick={() => {
                  if (!state.market) {
                    return
                  }

                  state.setOutcome(state.market.outcomes[1])
                  state.setIsMobileOrderPanelOpen(true)
                }}
              >
                Buy No
                {' '}
                {noPrice}
                ¢
              </Button>
            </div>
          </div>
        )}
      </DrawerTrigger>

      <DrawerContent>
        <VisuallyHidden>
          <DialogTitle>{event.title}</DialogTitle>
        </VisuallyHidden>

        <EventOrderPanel event={event} isMobile={true} />
      </DrawerContent>
    </Drawer>
  )
}
