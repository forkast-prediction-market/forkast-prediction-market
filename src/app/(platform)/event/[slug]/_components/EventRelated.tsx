'use client'

import type { Event } from '@/types'
import { useQuery } from '@tanstack/react-query'
import Image from 'next/image'
import Link from 'next/link'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import EventRelatedSkeleton from '@/app/(platform)/event/[slug]/_components/EventRelatedSkeleton'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface EventRelatedProps {
  event: Event
}

interface BackgroundStyle {
  left: number
  width: number
  height: number
  top: number
  isInitialized: boolean
}

interface RelatedEvent {
  id: string
  slug: string
  title: string
  icon_url: string
}

interface UseRelatedEventsParams {
  eventSlug: string
  tag?: string
  enabled?: boolean
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

async function fetchRelatedEvents(params: UseRelatedEventsParams): Promise<RelatedEvent[]> {
  const { eventSlug, tag } = params

  const url = new URL(`/api/events/${eventSlug}/related`, window.location.origin)
  if (tag && tag !== 'all') {
    url.searchParams.set('tag', tag)
  }

  const response = await fetch(url.toString())

  if (!response.ok) {
    throw new Error('Failed to fetch related events.')
  }

  return response.json()
}

function useRelatedEvents(params: UseRelatedEventsParams) {
  const { eventSlug, tag = 'all', enabled = true } = params

  const queryKey = ['related-events', eventSlug, tag] as const

  return useQuery({
    queryKey,
    queryFn: () => fetchRelatedEvents({ eventSlug, tag }),
    enabled,
    staleTime: 30_000,
    gcTime: 300_000,
    refetchOnWindowFocus: false,
    retry: 3,
  })
}

export default function EventRelated({ event }: EventRelatedProps) {
  const [activeTag, setActiveTagState] = useState('all')
  const [backgroundStyle, setBackgroundStyleState] = useState<BackgroundStyle>(INITIAL_BACKGROUND_STYLE)
  const [showLeftShadow, setShowLeftShadowState] = useState(false)
  const [showRightShadow, setShowRightShadowState] = useState(false)

  const { data: events = [], isLoading: loading, error } = useRelatedEvents({
    eventSlug: event.slug,
    tag: activeTag,
  })

  function resetActiveTag() {
    setActiveTagState('all')
  }

  function resetBackgroundStyle() {
    setBackgroundStyleState({ ...INITIAL_BACKGROUND_STYLE })
  }

  function applyBackgroundStyle(style: BackgroundStyle) {
    setBackgroundStyleState(style)
  }

  function updateScrollShadowState(left: boolean, right: boolean) {
    setShowLeftShadowState(left)
    setShowRightShadowState(right)
  }
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
  }, [event.slug])

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

    // Use requestAnimationFrame to ensure layout calculations happen after DOM updates
    requestAnimationFrame(() => {
      const buttonRect = activeButton.getBoundingClientRect()
      const containerRect = container.getBoundingClientRect()

      // Calculate position relative to the container
      const left = buttonRect.left - containerRect.left
      const top = buttonRect.top - containerRect.top

      applyBackgroundStyle({
        left,
        width: buttonRect.width,
        height: buttonRect.height,
        top,
        isInitialized: true,
      })
    })
  }, [activeIndex])

  const updateScrollShadows = useCallback(() => {
    const container = scrollContainerRef.current
    if (!container) {
      updateScrollShadowState(false, false)
      return
    }

    const { scrollLeft, scrollWidth, clientWidth } = container
    const maxScrollLeft = scrollWidth - clientWidth

    updateScrollShadowState(scrollLeft > 4, scrollLeft < maxScrollLeft - 4)
  }, [])

  useLayoutEffect(() => {
    updateBackgroundPosition()
  }, [updateBackgroundPosition, tagItems.length, activeIndex])

  useEffect(() => {
    const container = scrollContainerRef.current
    updateScrollShadows()

    if (!container) {
      return
    }

    let resizeTimeout: NodeJS.Timeout
    function handleResize() {
      clearTimeout(resizeTimeout)
      resizeTimeout = setTimeout(() => {
        updateBackgroundPosition()
        updateScrollShadows()
      }, 16)
    }

    function handleScroll() {
      updateScrollShadows()
      updateBackgroundPosition()
    }

    container.addEventListener('scroll', handleScroll)
    window.addEventListener('resize', handleResize)

    return () => {
      container.removeEventListener('scroll', handleScroll)
      window.removeEventListener('resize', handleResize)
      clearTimeout(resizeTimeout)
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

  function handleTagClick(slug: string) {
    setActiveTagState(current => (current === slug ? current : slug))
  }

  return (
    <div className="grid w-full max-w-full gap-3">
      <div className="relative min-w-0">
        <div
          ref={scrollContainerRef}
          className={`
            relative scrollbar-hide min-w-0 overflow-x-auto overflow-y-hidden px-2 pb-1
            lg:w-[340px] lg:max-w-[340px]
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
        : error
          ? (
              <div className="rounded-lg border p-4 text-sm text-muted-foreground">
                Failed to fetch related events.
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
