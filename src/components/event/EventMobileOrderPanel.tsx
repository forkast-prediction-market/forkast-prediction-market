import type { Event } from '@/types'
import { DialogTitle } from '@radix-ui/react-dialog'
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'
import OrderPanel from '@/components/event/OrderPanel'
import { Button } from '@/components/ui/button'
import { Drawer, DrawerContent, DrawerTrigger } from '@/components/ui/drawer'

interface Props {
  event: Event
  tradingState: ReturnType<typeof import('@/hooks/useTradingState').useTradingState>
  isMobileModalOpen: boolean
  setIsMobileModalOpen: (isOpen: boolean) => void
}

export default function EventMobileOrderPanel({ event, tradingState, isMobileModalOpen, setIsMobileModalOpen }: Props) {
  return (
    <Drawer
      open={isMobileModalOpen}
      onClose={() => setIsMobileModalOpen(false)}
    >
      <DrawerTrigger asChild>
        {event.active_markets_count === 1 && (
          <div className="fixed right-0 bottom-0 left-0 border-t border-border/50 bg-background p-4 md:hidden">
            <div className="flex gap-2">
              <Button
                variant="yes"
                size="lg"
                className="flex-1"
                onClick={() => {
                  tradingState.setYesNoSelection('yes')
                  setIsMobileModalOpen(true)
                }}
              >
                Buy Yes
                {' '}
                {tradingState.yesPrice}
                ¢
              </Button>
              <Button
                variant="no"
                size="lg"
                className="flex-1"
                onClick={() => {
                  tradingState.setYesNoSelection('no')
                  setIsMobileModalOpen(true)
                }}
              >
                Buy No
                {' '}
                {tradingState.noPrice}
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

        <OrderPanel event={event} tradingState={tradingState} isMobileVersion={true} />
      </DrawerContent>
    </Drawer>
  )
}
