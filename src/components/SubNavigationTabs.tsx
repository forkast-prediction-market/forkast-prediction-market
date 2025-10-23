'use client'

import type { Route } from 'next'
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import Link from 'next/link'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface SubNavigationTabsProps {
  activeTag: string
  mainTag: {
    slug: string
    name: string
    childs: Array<{ name: string, slug: string }>
  }
  createHref: (nextTag: string, context?: string) => Route
}

interface BackgroundStyle {
  left: number
  width: number
  height: number
  top: number
  isInitialized: boolean
}

export default function SubNavigationTabs({ activeTag, mainTag, createHref }: SubNavigationTabsProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const buttonRefs = useRef<(HTMLAnchorElement | null)[]>([])
  const [scrollIndicators, setScrollIndicators] = useState({ showStart: false, showEnd: false })
  const [backgroundStyle, setBackgroundStyle] = useState<BackgroundStyle>({
    left: 0,
    width: 0,
    height: 0,
    top: 0,
    isInitialized: false,
  })

  const subNavItems = useMemo(() => ([
    { slug: mainTag.slug, name: 'All', isMain: true },
    ...mainTag.childs.map(child => ({ ...child, isMain: false })),
  ]), [mainTag.childs, mainTag.slug])

  const activeIndex = subNavItems.findIndex(item => activeTag === item.slug)

  useEffect(() => {
    if (buttonRefs.current.length !== subNavItems.length) {
      buttonRefs.current = Array.from({ length: subNavItems.length }).fill(null) as (HTMLAnchorElement | null)[]
    }
  }, [subNavItems.length])

  const updateBackgroundPosition = useCallback(() => {
    if (activeIndex === -1 || !buttonRefs.current[activeIndex] || !containerRef.current) {
      return
    }

    const activeButton = buttonRefs.current[activeIndex]
    const container = containerRef.current

    if (activeButton) {
      const buttonRect = activeButton.getBoundingClientRect()
      const containerRect = container.getBoundingClientRect()

      const left = buttonRect.left - containerRect.left
      const width = buttonRect.width
      const height = buttonRect.height
      const top = buttonRect.top - containerRect.top

      setBackgroundStyle({
        left,
        width,
        height,
        top,
        isInitialized: true,
      })
    }
  }, [activeIndex])

  const updateScrollIndicators = useCallback(() => {
    const container = containerRef.current

    if (!container) {
      return
    }

    const maxScrollLeft = container.scrollWidth - container.clientWidth
    const nextShowStart = container.scrollLeft > 8
    const nextShowEnd = container.scrollLeft < maxScrollLeft - 8

    setScrollIndicators((prev) => {
      if (prev.showStart === nextShowStart && prev.showEnd === nextShowEnd) {
        return prev
      }

      return { showStart: nextShowStart, showEnd: nextShowEnd }
    })
  }, [])

  const scrollByStep = useCallback((direction: 'left' | 'right') => {
    const container = containerRef.current

    if (!container) {
      return
    }

    const baseAmount = container.clientWidth ? container.clientWidth * 0.6 : 200
    const offset = direction === 'left' ? -Math.max(baseAmount, 160) : Math.max(baseAmount, 160)

    container.scrollBy({ left: offset, behavior: 'smooth' })
  }, [])

  useLayoutEffect(() => {
    updateBackgroundPosition()
    updateScrollIndicators()
  }, [updateBackgroundPosition, updateScrollIndicators])

  useEffect(() => {
    const container = containerRef.current

    if (!container) {
      return
    }

    function handleScroll() {
      requestAnimationFrame(() => {
        updateBackgroundPosition()
        updateScrollIndicators()
      })
    }

    container.addEventListener('scroll', handleScroll, { passive: true })

    return () => {
      container.removeEventListener('scroll', handleScroll)
    }
  }, [updateBackgroundPosition, updateScrollIndicators])

  useEffect(() => {
    function handleResize() {
      requestAnimationFrame(() => {
        updateBackgroundPosition()
        updateScrollIndicators()
      })
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [updateBackgroundPosition, updateScrollIndicators])

  return (
    <div className="relative w-full max-w-full">
      <div
        ref={containerRef}
        className="relative scrollbar-hide flex w-full max-w-full min-w-0 items-center gap-2 overflow-x-auto"
      >
        {backgroundStyle.isInitialized && (
          <div
            className="pointer-events-none absolute rounded-md bg-primary transition-all duration-300 ease-out"
            style={{
              left: `${backgroundStyle.left}px`,
              width: `${backgroundStyle.width}px`,
              height: `${backgroundStyle.height}px`,
              top: `${backgroundStyle.top}px`,
            }}
          />
        )}

        {subNavItems.map((item, index) => (
          <Link
            key={item.slug}
            href={createHref(
              item.slug,
              item.isMain ? undefined : (mainTag.slug === 'trending' || mainTag.slug === 'new' ? mainTag.slug : undefined),
            )}
            ref={(el: HTMLAnchorElement | null) => {
              buttonRefs.current[index] = el
            }}
          >
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                'relative z-10 whitespace-nowrap hover:bg-transparent focus-visible:ring-0',
                activeTag === item.slug
                  ? 'font-semibold text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {item.name}
            </Button>
          </Link>
        ))}
      </div>

      {scrollIndicators.showStart && (
        <>
          <div
            className={`
              pointer-events-none absolute inset-y-0 left-0 z-10 w-12 rounded-r-sm bg-gradient-to-r from-background
              via-background/80 to-transparent
            `}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Scroll subcategories left"
            onClick={() => scrollByStep('left')}
            className={`
              absolute top-1/2 left-2 z-20 -translate-y-1/2 rounded-sm bg-background/90 text-muted-foreground transition
              hover:text-foreground
              focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
              focus-visible:ring-offset-background
            `}
          >
            <ChevronLeftIcon className="size-5" />
          </Button>
        </>
      )}

      {scrollIndicators.showEnd && (
        <>
          <div
            className={`
              pointer-events-none absolute inset-y-0 right-0 z-10 w-12 rounded-l-sm bg-gradient-to-l from-background
              via-background/80 to-transparent
            `}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Scroll subcategories right"
            onClick={() => scrollByStep('right')}
            className={`
              absolute top-1/2 right-2 z-20 -translate-y-1/2 rounded-sm bg-background/90 text-muted-foreground
              transition
              hover:text-foreground
              focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
              focus-visible:ring-offset-background
            `}
          >
            <ChevronRightIcon className="size-5" />
          </Button>
        </>
      )}
    </div>
  )
}
