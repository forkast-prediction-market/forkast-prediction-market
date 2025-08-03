'use client'

import type { Event } from '@/types'
import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState } from 'react'

interface EventDetailProps {
  event: Event
}

export default function RelatedEvents({ event }: EventDetailProps) {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchEvents() {
      const res = await fetch(`/api/events/${event.slug}/related`)
      const data = await res.json()
      setEvents(data)
      setLoading(false)
    }

    fetchEvents().catch(() => {})
  }, [event.slug])

  if (loading) {
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

  return (
    <ul className="grid gap-2">
      {events.map(e => (
        <li key={e.id}>
          <Link
            href={`/event/${e.slug}`}
            className="flex items-center gap-3 rounded-lg p-2 hover:bg-border"
          >
            <Image
              src={`https://avatar.vercel.sh/${e.creatorAvatar?.toLowerCase()}.png`}
              alt={e.title}
              width={42}
              height={42}
              className="flex-shrink-0 rounded-sm"
            />
            <strong>{e.title}</strong>
          </Link>
        </li>
      ))}
    </ul>
  )
}
