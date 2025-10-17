import type { Event } from '@/types'
import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import EventRelatedSkeleton from '@/app/(platform)/event/[slug]/_components/EventRelatedSkeleton'

interface EventRelatedProps {
  event: Event
}

export default function EventRelated({ event }: EventRelatedProps) {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const abortControllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    let isMounted = true
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    abortControllerRef.current = new AbortController()

    async function fetchEvents() {
      try {
        const res = await fetch(`/api/events/${event.slug}/related`, {
          signal: abortControllerRef.current?.signal,
        })

        if (res.ok) {
          const data = await res.json()
          if (isMounted) {
            setEvents(data)
          }
        }
      }
      catch {
        // just don't show related events
      }
      finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    queueMicrotask(() => fetchEvents())

    return () => {
      isMounted = false
      abortControllerRef.current?.abort()
    }
  }, [event.slug])

  if (loading) {
    return Array.from({ length: 3 }, (_, i) => <EventRelatedSkeleton key={`skeleton-${event.slug}-${i}`} />)
  }

  return (
    <ul className="grid gap-2">
      {events.map(e => (
        <li key={e.id}>
          <Link
            href={`/event/${e.slug}`}
            className="flex items-center gap-3 rounded-lg p-2 hover:bg-border"
          >
            <Image
              src={e.icon_url}
              alt={e.title}
              width={42}
              height={42}
              className="shrink-0 rounded-sm"
            />
            <strong className="text-sm">{e.title}</strong>
          </Link>
        </li>
      ))}
    </ul>
  )
}
