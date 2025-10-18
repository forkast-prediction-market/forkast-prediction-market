'use client'

import type { Event } from '@/types'
import Image from 'next/image'
import Link from 'next/link'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import EventRelatedSkeleton from '@/app/(platform)/event/[slug]/_components/EventRelatedSkeleton'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface EventRelatedProps {
  event: Event
}

interface RelatedEvent {
  id: string
  slug: string
  title: string
  icon_url: string
}

interface BackgroundStyle {
  left: number
  width: number
  height: number
  top: number
  isInitialized: boolean
}

const INITIAL_BACKGROUND_STYLE: BackgroundStyle = {
  left: 0,
  width: 0,
  height: 0,
  top: 0,
  isInitialized: false,
}

function formatTagLabel(value: string) {
  return value
    .split('-')
    .map(segment => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ')
}

export default function EventRelated({ event }: EventRelatedProps) {
  const [events, setEventsState] = useState<RelatedEvent[]>([])
  const [loading, setLoadingState] = useState(true)
  const [activeTag, setActiveTagState] = useState('all')
  const [backgroundStyle, setBackgroundStyleState] = useState<BackgroundStyle>(INITIAL_BACKGROUND_STYLE)
  const [showLeftShadow, setShowLeftShadowState] = useState(false)
  const [showRightShadow, setShowRightShadowState] = useState(false)

  const resetActiveTag = useCallback(() => {
    setActiveTagState('all')
  }, [])

  const resetBackgroundStyle = useCallback(() => {
    setBackgroundStyleState({ ...INITIAL_BACKGROUND_STYLE })
  }, [])

  const applyBackgroundStyle = useCallback((style: BackgroundStyle) => {
    setBackgroundStyleState(style)
  }, [])

  const updateScrollShadowState = useCallback((left: boolean, right: boolean) => {
    setShowLeftShadowState(left)
    setShowRightShadowState(right)
  }, [])

  const setLoading = useCallback((value: boolean) => {
    setLoadingState(value)
  }, [])

  const setEvents = useCallback((nextEvents: RelatedEvent[]) => {
    setEventsState(nextEvents)
  }, [])

  const abortControllerRef = useRef<AbortController | null>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const buttonsWrapperRef = useRef<HTMLDivElement>(null)
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([])

  const tagItems = useMemo(() => {
    const uniqueTags = new Map<string, string>()

    if (event.tagDetails && event.tagDetails.length > 0) {
      for (const tag of event.tagDetails) {
        if (tag.slug && !uniqueTags.has(tag.slug)) {
          uniqueTags.set(tag.slug, tag.name)
        }
      }
    }
    else if (event.tags && event.tags.length > 0) {
      for (const slug of event.tags) {
        if (!uniqueTags.has(slug)) {
          uniqueTags.set(slug, formatTagLabel(slug))
        }
      }
    }

    return [
      { slug: 'all', label: 'All' },
      ...Array.from(uniqueTags.entries()).map(([slug, label]) => ({
        slug,
        label,
      })),
    ]
  }, [event.tagDetails, event.tags])

  const activeIndex = useMemo(
    () => tagItems.findIndex(item => item.slug === activeTag),
    [activeTag, tagItems],
  )

  useEffect(() => {
    resetActiveTag()
  }, [event.slug, resetActiveTag])

  useEffect(() => {
    buttonRefs.current = Array.from({ length: tagItems.length }).map((_, index) => buttonRefs.current[index] ?? null)
  }, [tagItems.length])

  const updateBackgroundPosition = useCallback(() => {
    if (activeIndex === -1) {
      resetBackgroundStyle()
      return
    }

    const activeButton = buttonRefs.current[activeIndex]
    const container = buttonsWrapperRef.current

    if (!activeButton || !container) {
      return
    }

    const buttonRect = activeButton.getBoundingClientRect()
    const containerRect = container.getBoundingClientRect()

    applyBackgroundStyle({
      left: buttonRect.left - containerRect.left,
      width: buttonRect.width,
      height: buttonRect.height,
      top: buttonRect.top - containerRect.top,
      isInitialized: true,
    })
  }, [activeIndex, applyBackgroundStyle, resetBackgroundStyle])

  const updateScrollShadows = useCallback(() => {
    const container = scrollContainerRef.current
    if (!container) {
      updateScrollShadowState(false, false)
      return
    }

    const { scrollLeft, scrollWidth, clientWidth } = container
    const maxScrollLeft = scrollWidth - clientWidth

    updateScrollShadowState(scrollLeft > 4, scrollLeft < maxScrollLeft - 4)
  }, [updateScrollShadowState])

  useLayoutEffect(() => {
    updateBackgroundPosition()
  }, [updateBackgroundPosition, tagItems.length, activeIndex])

  useEffect(() => {
    const container = scrollContainerRef.current
    updateScrollShadows()

    if (!container) {
      return
    }

    container.addEventListener('scroll', updateScrollShadows)
    window.addEventListener('resize', updateBackgroundPosition)
    window.addEventListener('resize', updateScrollShadows)

    return () => {
      container.removeEventListener('scroll', updateScrollShadows)
      window.removeEventListener('resize', updateBackgroundPosition)
      window.removeEventListener('resize', updateScrollShadows)
    }
  }, [updateBackgroundPosition, updateScrollShadows, tagItems.length])

  useEffect(() => {
    if (activeIndex < 0) {
      return
    }

    const activeButton = buttonRefs.current[activeIndex]
    if (!activeButton) {
      return
    }

    activeButton.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
  }, [activeIndex])

  useEffect(() => {
    let isMounted = true

    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    const controller = new AbortController()
    abortControllerRef.current = controller

    setLoading(true)
    setEvents([])

    async function fetchEvents() {
      try {
        const url = new URL(`/api/events/${event.slug}/related`, window.location.origin)
        if (activeTag !== 'all') {
          url.searchParams.set('tag', activeTag)
        }

        const res = await fetch(url.toString(), { signal: controller.signal })

        if (!res.ok) {
          throw new Error('Failed to fetch related events.')
        }

        const data = await res.json() as RelatedEvent[]

        if (isMounted) {
          setEvents(data)
        }
      }
      catch (error) {
        if ((error as Error).name === 'AbortError') {
          return
        }

        if (isMounted) {
          setEvents([])
        }
      }
      finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    fetchEvents().catch(() => {})

    return () => {
      isMounted = false
      controller.abort()
    }
  }, [event.slug, activeTag, setEvents, setLoading])

  const handleTagClick = useCallback((slug: string) => {
    setActiveTagState(current => (current === slug ? current : slug))
  }, [])

  return (
    <div className="grid w-full max-w-full gap-3">
      <div className="relative">
        <div
          ref={scrollContainerRef}
          className={`
            relative overflow-x-auto overflow-y-hidden px-2 pb-1
            [scrollbar-width:none]
            lg:w-[340px] lg:max-w-[340px]
            [&::-webkit-scrollbar]:hidden
          `}
        >
          <div ref={buttonsWrapperRef} className="relative flex flex-nowrap items-center gap-2">
            {backgroundStyle.isInitialized && (
              <div
                className={`
                  pointer-events-none absolute z-0 rounded-md bg-muted shadow-sm transition-all duration-300 ease-out
                `}
                style={{
                  left: `${backgroundStyle.left}px`,
                  width: `${backgroundStyle.width}px`,
                  height: `${backgroundStyle.height}px`,
                  top: `${backgroundStyle.top}px`,
                }}
              />
            )}

            {tagItems.map((item, index) => (
              <Button
                key={item.slug}
                ref={(el: HTMLButtonElement | null) => {
                  buttonRefs.current[index] = el
                }}
                variant="ghost"
                size="sm"
                className={cn(
                  'relative z-10 shrink-0 px-3 whitespace-nowrap transition-none hover:bg-transparent',
                  activeTag === item.slug
                    ? 'font-medium text-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
                onClick={() => handleTagClick(item.slug)}
              >
                {item.label}
              </Button>
            ))}
          </div>
        </div>

        {showLeftShadow && (
          <div className={`
            pointer-events-none absolute top-0 left-0 h-full w-6 bg-gradient-to-r from-background to-transparent
          `}
          />
        )}
        {showRightShadow && (
          <div className={`
            pointer-events-none absolute top-0 right-0 h-full w-6 bg-gradient-to-l from-background to-transparent
          `}
          />
        )}
      </div>

      {loading
        ? (
            <div className="grid gap-2">
              {Array.from({ length: 3 }, (_, index) => (
                <EventRelatedSkeleton key={`skeleton-${event.slug}-${activeTag}-${index}`} />
              ))}
            </div>
          )
        : events.length > 0
          ? (
              <ul className="grid gap-2 lg:w-[340px] lg:max-w-[340px]">
                {events.map(relatedEvent => (
                  <li key={relatedEvent.id}>
                    <Link
                      href={`/event/${relatedEvent.slug}`}
                      className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-border"
                    >
                      <Image
                        src={relatedEvent.icon_url}
                        alt={relatedEvent.title}
                        width={42}
                        height={42}
                        className="shrink-0 rounded-sm object-cover"
                      />
                      <strong className="text-sm">{relatedEvent.title}</strong>
                    </Link>
                  </li>
                ))}
              </ul>
            )
          : (
              <div className="rounded-lg border p-4 text-sm text-muted-foreground">
                No related events for this tag yet.
              </div>
            )}
    </div>
  )
}
