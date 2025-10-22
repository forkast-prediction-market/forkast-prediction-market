'use client'

import type { Route } from 'next'
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

  useLayoutEffect(() => {
    updateBackgroundPosition()
  }, [updateBackgroundPosition])

  useEffect(() => {
    const container = containerRef.current

    if (!container) {
      return
    }

    function handleScroll() {
      requestAnimationFrame(updateBackgroundPosition)
    }

    container.addEventListener('scroll', handleScroll, { passive: true })

    return () => {
      container.removeEventListener('scroll', handleScroll)
    }
  }, [updateBackgroundPosition])

  return (
    <div
      ref={containerRef}
      className="relative scrollbar-hide flex w-full max-w-full min-w-0 items-center gap-2 overflow-x-auto"
    >
      {backgroundStyle.isInitialized && (
        <div
          className="pointer-events-none absolute rounded-md bg-primary/10 transition-all duration-300 ease-out"
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
              'relative whitespace-nowrap hover:bg-transparent focus-visible:ring-0',
              activeTag === item.slug
                ? 'font-semibold text-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {item.name}
          </Button>
        </Link>
      ))}
    </div>
  )
}
