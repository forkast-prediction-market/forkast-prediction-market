import type { Event } from '@/types'
import Image from 'next/image'
import { useEffect, useState } from 'react'
import EventBookmark from '@/app/(platform)/event/[slug]/_components/EventBookmark'
import EventShare from '@/app/(platform)/event/[slug]/_components/EventShare'
import { cn } from '@/lib/utils'

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
    <div className={cn({
      'sticky top-24 translate-y-[1px] border-b bg-background py-3': scrolled,
    }, 'z-10 -mx-4 flex items-center gap-3 px-4 transition-all duration-500 ease-in-out')}
    >
      <Image
        src={event.icon_url}
        alt={event.creator || 'Market creator'}
        width={64}
        height={64}
        className={cn(
          'flex-shrink-0 rounded-sm transition-all duration-500 ease-in-out',
          scrolled ? 'size-10' : 'size-12 lg:size-14',
        )}
      />

      <h1 className={cn(
        'font-bold transition-all duration-500 ease-in-out',
        scrolled ? 'text-xs lg:text-base' : 'text-sm lg:text-xl',
      )}
      >
        {event.title}
      </h1>

      <div className="ms-auto flex gap-3 text-muted-foreground">
        <EventShare />
        <EventBookmark event={event} />
      </div>
    </div>
  )
}
