'use client'

import type { Event, User } from '@/types'
import { ArrowUpIcon } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import EventChart from '@/app/(platform)/event/[slug]/_components/EventChart'
import EventHeader from '@/app/(platform)/event/[slug]/_components/EventHeader'
import EventMarketContext from '@/app/(platform)/event/[slug]/_components/EventMarketContext'
import EventMarketHistory from '@/app/(platform)/event/[slug]/_components/EventMarketHistory'
import EventMarketOpenOrders from '@/app/(platform)/event/[slug]/_components/EventMarketOpenOrders'
import EventMarketPositions from '@/app/(platform)/event/[slug]/_components/EventMarketPositions'
import EventMarkets from '@/app/(platform)/event/[slug]/_components/EventMarkets'
import EventMetaInformation from '@/app/(platform)/event/[slug]/_components/EventMetaInformation'
import EventOrderPanelForm from '@/app/(platform)/event/[slug]/_components/EventOrderPanelForm'
import EventOrderPanelMobile from '@/app/(platform)/event/[slug]/_components/EventOrderPanelMobile'
import { EventOutcomeChanceProvider } from '@/app/(platform)/event/[slug]/_components/EventOutcomeChanceProvider'
import EventRelated from '@/app/(platform)/event/[slug]/_components/EventRelated'
import EventRules from '@/app/(platform)/event/[slug]/_components/EventRules'
import EventSingleMarketOrderBook from '@/app/(platform)/event/[slug]/_components/EventSingleMarketOrderBook'
import EventTabs from '@/app/(platform)/event/[slug]/_components/EventTabs'
import { Teleport } from '@/components/Teleport'
import { useIsMobile } from '@/hooks/useIsMobile'
import { useOrder, useSyncLimitPriceWithOutcome } from '@/stores/useOrder'
import { useUser } from '@/stores/useUser'

interface EventContentProps {
  event: Event
  user: User | null
  marketContextEnabled: boolean
}

export default function EventContent({ event, user, marketContextEnabled }: EventContentProps) {
  const setEvent = useOrder(state => state.setEvent)
  const setMarket = useOrder(state => state.setMarket)
  const setOutcome = useOrder(state => state.setOutcome)
  const currentEventId = useOrder(state => state.event?.id)
  const isMobile = useIsMobile()
  const clientUser = useUser()
  const prevUserId = useRef<string | null>(null)
  const contentRef = useRef<HTMLDivElement | null>(null)
  const eventMarketsRef = useRef<HTMLDivElement | null>(null)
  const currentUser = clientUser ?? user
  const [showBackToTop, setShowBackToTop] = useState(false)
  const [backToTopBounds, setBackToTopBounds] = useState<{ left: number, width: number } | null>(null)

  useEffect(() => {
    if (user?.id) {
      prevUserId.current = user.id
      useUser.setState(user)
      return
    }

    if (!user && prevUserId.current) {
      prevUserId.current = null
      useUser.setState(null)
    }
  }, [user])

  useEffect(() => {
    setEvent(event)
  }, [event, setEvent])

  useEffect(() => {
    if (currentEventId === event.id) {
      return
    }

    const defaultMarket = event.markets[0]
    if (!defaultMarket) {
      return
    }

    setMarket(defaultMarket)
    const defaultOutcome = defaultMarket.outcomes[0]
    if (defaultOutcome) {
      setOutcome(defaultOutcome)
    }
  }, [currentEventId, event, setMarket, setOutcome])

  useEffect(() => {
    if (isMobile) {
      setShowBackToTop(false)
      setBackToTopBounds(null)
      return
    }

    function handleScroll() {
      if (!eventMarketsRef.current) {
        setShowBackToTop(false)
        return
      }

      const eventMarketsTop = eventMarketsRef.current.getBoundingClientRect().top + window.scrollY
      setShowBackToTop(window.scrollY >= eventMarketsTop - 80)
    }

    handleScroll()
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [isMobile])

  useEffect(() => {
    if (isMobile) {
      setBackToTopBounds(null)
      return
    }

    function handleResize() {
      if (!contentRef.current) {
        setBackToTopBounds(null)
        return
      }

      const rect = contentRef.current.getBoundingClientRect()
      setBackToTopBounds({ left: rect.left, width: rect.width })
    }

    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [isMobile])

  function handleBackToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <EventOutcomeChanceProvider eventId={event.id}>
      <OrderLimitPriceSync />
      <div className="grid gap-3" ref={contentRef}>
        <EventHeader event={event} />
        <EventMetaInformation event={event} />
        <EventChart event={event} isMobile={isMobile} />
        <div ref={eventMarketsRef} id="event-markets">
          <EventMarkets event={event} isMobile={isMobile} />
        </div>
        {event.total_markets_count === 1 && (
          <>
            { currentUser && <EventMarketPositions market={event.markets[0]} /> }
            <EventSingleMarketOrderBook market={event.markets[0]} eventSlug={event.slug} />
            { currentUser && <EventMarketOpenOrders market={event.markets[0]} eventSlug={event.slug} />}
            { currentUser && <EventMarketHistory market={event.markets[0]} /> }
          </>
        )}
        {marketContextEnabled && <EventMarketContext event={event} />}
        <EventRules event={event} />
        {isMobile && <EventRelated event={event} />}
        <EventTabs event={event} user={currentUser} />
      </div>

      {!isMobile && showBackToTop && backToTopBounds && (
        <div
          className="pointer-events-none fixed bottom-6 hidden md:flex"
          style={{ left: `${backToTopBounds.left}px`, width: `${backToTopBounds.width}px` }}
        >
          <div className="grid w-full grid-cols-3 items-center px-4">
            <div />
            <button
              type="button"
              onClick={handleBackToTop}
              className={`
                pointer-events-auto justify-self-center rounded-full border bg-background/90 px-4 py-2 text-sm
                font-semibold text-foreground shadow-lg backdrop-blur transition-colors
                hover:text-muted-foreground
              `}
              aria-label="Back to top"
            >
              <span className="inline-flex items-center gap-2">
                Back to top
                <ArrowUpIcon className="size-4" />
              </span>
            </button>
          </div>
        </div>
      )}

      {isMobile
        ? <EventOrderPanelMobile event={event} />
        : (
            <Teleport to="#event-order-panel">
              <EventOrderPanelForm event={event} isMobile={false} />
              <EventRelated event={event} />
            </Teleport>
          )}
    </EventOutcomeChanceProvider>
  )
}

function OrderLimitPriceSync() {
  useSyncLimitPriceWithOutcome()
  return null
}
