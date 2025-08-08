import type { Event } from '@/types'
import Image from 'next/image'
import { useEffect, useState } from 'react'
import EventFavorite from '@/components/event/EventFavorite'
import EventShare from '@/components/event/EventShare'

interface Props {
  event: Event
}

export default function EventHeader({ event }: Props) {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 20)
    }

    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div className={`z-50 mb-6 flex transform items-center gap-3 transition-all ease-in-out ${scrolled
      ? 'sticky top-24 translate-y-[3px] border-b bg-background py-3'
      : ''}`}
    >
      <Image
        src={
          event.creatorAvatar
          || `https://avatar.vercel.sh/${event.title.charAt(0)}.png`
        }
        alt={event.creator || 'Market creator'}
        width={64}
        height={64}
        className={`flex-shrink-0 rounded-sm ${scrolled ? 'size-10' : 'size-16'}`}
      />

      <h1 className={`font-bold ${scrolled
        ? 'text-xs lg:text-base'
        : `text-sm lg:text-2xl`}`}
      >
        {event.title}
      </h1>

      <div className="ms-auto flex gap-2 text-muted-foreground">
        <EventFavorite event={event} />
        <EventShare />
      </div>
    </div>
  )
}
