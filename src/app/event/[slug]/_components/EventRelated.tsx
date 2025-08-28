import type { Event } from '@/types'
import Image from 'next/image'
import Link from 'next/link'
import React, { useEffect, useRef, useState } from 'react'

interface Props {
  event: Event
}

export default function EventRelated({ event }: Props) {
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
            <strong>{e.title}</strong>
          </Link>
        </li>
      ))}
    </ul>
  )
}

function EventRelatedSkeleton() {
  return (
    <div className="animate-pulse rounded-lg border bg-card p-4">
      <div className="flex items-start gap-2">
        <div className="size-8 rounded bg-muted"></div>
        <div className="flex-1 space-y-2">
          <div className="h-4 w-3/4 rounded bg-muted"></div>
          <div className="h-4 w-1/2 rounded bg-muted"></div>
        </div>
      </div>
    </div>
  )
}
