import type { Event } from '@/types'
import Image from 'next/image'
import Link from 'next/link'
import React, { useEffect, useState } from 'react'

interface Props {
  event: Event
}

export default function RelatedEvents({ event }: Props) {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchEvents() {
      const res = await fetch(`/api/events/${event.slug}/related`)
      if (res.ok) {
        const data = await res.json()
        setEvents(data)
      }

      setLoading(false)
    }

    fetchEvents().catch(() => {})
  }, [event.slug])

  if (loading) {
    const skeletons = Array.from({ length: 3 }, (_, i) => `skeleton-${i}`)
    return skeletons.map(id => <RelatedEventSkeleton key={id} />)
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

function RelatedEventSkeleton() {
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
