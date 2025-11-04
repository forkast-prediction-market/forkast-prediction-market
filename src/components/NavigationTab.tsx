'use client'

import { TrendingUpIcon } from 'lucide-react'
import Link from 'next/link'
import { redirect, usePathname } from 'next/navigation'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Teleport } from '@/components/Teleport'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useFilters } from '@/providers/FilterProvider'

interface NavigationTabProps {
  tag: {
    slug: string
    name: string
    childs: { name: string, slug: string }[]
  }
  childParentMap: Record<string, string>
}

export default function NavigationTab({ tag, childParentMap }: NavigationTabProps) {
  const pathname = usePathname()
  const isHomePage = pathname === '/'
  const { filters, updateFilters } = useFilters()

  const showBookmarkedOnly = isHomePage ? filters.bookmarked : false
  const tagFromFilters = isHomePage
    ? (showBookmarkedOnly && filters.tag === 'trending' ? '' : filters.tag)
    : pathname === '/mentions' ? 'mentions' : 'trending'

  const parentSlug = childParentMap[tagFromFilters]
  const hasChildMatch = tag.childs.some(child => child.slug === tagFromFilters)
  const effectiveParent = parentSlug ?? (hasChildMatch ? tag.slug : tagFromFilters)
  const isActive = effectiveParent === tag.slug

  const [showLeftShadow, setShowLeftShadow] = useState(false)
  const [showRightShadow, setShowRightShadow] = useState(false)
  const [showParentLeftShadow, setShowParentLeftShadow] = useState(false)
  const [showParentRightShadow, setShowParentRightShadow] = useState(false)

  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([])
  const mainTabRef = useRef<HTMLButtonElement>(null)
  const parentScrollContainerRef = useRef<HTMLDivElement>(null)

  const tagItems = useMemo(() => {
    return [
      { slug: tag.slug, label: 'All' },
      ...tag.childs.map(child => ({ slug: child.slug, label: child.name })),
    ]
  }, [tag.slug, tag.childs])

  const updateScrollShadows = useCallback(() => {
    const container = scrollContainerRef.current
    if (!container) {
      setShowLeftShadow(false)
      setShowRightShadow(false)
      return
    }

    const { scrollLeft, scrollWidth, clientWidth } = container
    const maxScrollLeft = scrollWidth - clientWidth

    setShowLeftShadow(scrollLeft > 4)
    setShowRightShadow(scrollLeft < maxScrollLeft - 4)
  }, [])

  const updateParentScrollShadows = useCallback(() => {
    const parentContainer = parentScrollContainerRef.current
    if (!parentContainer) {
      setShowParentLeftShadow(false)
      setShowParentRightShadow(false)
      return
    }

    const { scrollLeft, scrollWidth, clientWidth } = parentContainer
    const maxScrollLeft = scrollWidth - clientWidth

    setShowParentLeftShadow(scrollLeft > 4)
    setShowParentRightShadow(scrollLeft < maxScrollLeft - 4)
  }, [])

  useEffect(() => {
    buttonRefs.current = Array.from({ length: tagItems.length }).map((_, index) => buttonRefs.current[index] ?? null)
  }, [tagItems.length])

  useEffect(() => {
    const parentContainer = document.getElementById('navigation-main-tags') as HTMLDivElement
    if (parentContainer) {
      parentScrollContainerRef.current = parentContainer
    }
  }, [])

  useLayoutEffect(() => {
    if (!isActive) {
      setShowLeftShadow(false)
      setShowRightShadow(false)
      return
    }

    const rafId = requestAnimationFrame(() => {
      updateScrollShadows()
    })

    return () => cancelAnimationFrame(rafId)
  }, [isActive, updateScrollShadows, tag.childs.length])

  useLayoutEffect(() => {
    const rafId = requestAnimationFrame(() => {
      updateParentScrollShadows()
    })

    return () => cancelAnimationFrame(rafId)
  }, [updateParentScrollShadows])

  useEffect(() => {
    const parentContainer = parentScrollContainerRef.current
    if (!parentContainer || tag.slug !== 'trending') {
      return
    }

    const maskClasses = []

    if (showParentLeftShadow || showParentRightShadow) {
      if (showParentLeftShadow && showParentRightShadow) {
        maskClasses.push(
          '[mask-image:linear-gradient(to_right,transparent,black_32px,black_calc(100%-32px),transparent)]',
          '[-webkit-mask-image:linear-gradient(to_right,transparent,black_32px,black_calc(100%-32px),transparent)]',
        )
      }
      else if (showParentLeftShadow && !showParentRightShadow) {
        maskClasses.push(
          '[mask-image:linear-gradient(to_right,transparent,black_32px,black)]',
          '[-webkit-mask-image:linear-gradient(to_right,transparent,black_32px,black)]',
        )
      }
      else if (showParentRightShadow && !showParentLeftShadow) {
        maskClasses.push(
          '[mask-image:linear-gradient(to_right,black,black_calc(100%-32px),transparent)]',
          '[-webkit-mask-image:linear-gradient(to_right,black,black_calc(100%-32px),transparent)]',
        )
      }
    }

    parentContainer.classList.remove(
      '[mask-image:linear-gradient(to_right,transparent,black_32px,black_calc(100%-32px),transparent)]',
      '[-webkit-mask-image:linear-gradient(to_right,transparent,black_32px,black_calc(100%-32px),transparent)]',
      '[mask-image:linear-gradient(to_right,transparent,black_32px,black)]',
      '[-webkit-mask-image:linear-gradient(to_right,transparent,black_32px,black)]',
      '[mask-image:linear-gradient(to_right,black,black_calc(100%-32px),transparent)]',
      '[-webkit-mask-image:linear-gradient(to_right,black,black_calc(100%-32px),transparent)]',
    )

    if (maskClasses.length > 0) {
      parentContainer.classList.add(...maskClasses)
    }

    return () => {
      parentContainer.classList.remove(
        '[mask-image:linear-gradient(to_right,transparent,black_32px,black_calc(100%-32px),transparent)]',
        '[-webkit-mask-image:linear-gradient(to_right,transparent,black_32px,black_calc(100%-32px),transparent)]',
        '[mask-image:linear-gradient(to_right,transparent,black_32px,black)]',
        '[-webkit-mask-image:linear-gradient(to_right,transparent,black_32px,black)]',
        '[mask-image:linear-gradient(to_right,black,black_calc(100%-32px),transparent)]',
        '[-webkit-mask-image:linear-gradient(to_right,black,black_calc(100%-32px),transparent)]',
      )
    }
  }, [showParentLeftShadow, showParentRightShadow, tag.slug])

  useEffect(() => {
    if (!isActive) {
      return
    }

    const childIndex = tag.childs.findIndex(child => child.slug === tagFromFilters)
    if (childIndex < 0) {
      return
    }

    const buttonIndex = childIndex + 1
    const activeButton = buttonRefs.current[buttonIndex]

    if (!activeButton) {
      const timeoutId = setTimeout(() => {
        const retryButton = buttonRefs.current[buttonIndex]
        if (retryButton) {
          retryButton.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
        }
      }, 1000)
      return () => clearTimeout(timeoutId)
    }

    const timeoutId = setTimeout(() => {
      activeButton.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
    }, 100)

    return () => clearTimeout(timeoutId)
  }, [isActive, tagFromFilters, tag.childs])

  useEffect(() => {
    if (!isActive) {
      return
    }

    const mainTab = mainTabRef.current
    if (!mainTab) {
      return
    }

    const timeoutId = setTimeout(() => {
      mainTab.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
    }, 100)

    return () => clearTimeout(timeoutId)
  }, [isActive])

  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container || !isActive) {
      return
    }

    let resizeTimeout: NodeJS.Timeout
    function handleResize() {
      clearTimeout(resizeTimeout)
      resizeTimeout = setTimeout(() => {
        updateScrollShadows()
      }, 16)
    }

    function handleScroll() {
      updateScrollShadows()
    }

    container.addEventListener('scroll', handleScroll)
    window.addEventListener('resize', handleResize)

    return () => {
      container.removeEventListener('scroll', handleScroll)
      window.removeEventListener('resize', handleResize)
      clearTimeout(resizeTimeout)
    }
  }, [updateScrollShadows, isActive])

  useEffect(() => {
    const parentContainer = parentScrollContainerRef.current
    if (!parentContainer) {
      return
    }

    let resizeTimeout: NodeJS.Timeout
    function handleResize() {
      clearTimeout(resizeTimeout)
      resizeTimeout = setTimeout(() => {
        updateParentScrollShadows()
      }, 16)
    }

    function handleScroll() {
      updateParentScrollShadows()
    }

    parentContainer.addEventListener('scroll', handleScroll)
    window.addEventListener('resize', handleResize)

    return () => {
      parentContainer.removeEventListener('scroll', handleScroll)
      window.removeEventListener('resize', handleResize)
      clearTimeout(resizeTimeout)
    }
  }, [updateParentScrollShadows])

  const handleTagClick = useCallback((targetTag: string) => {
    if (targetTag === 'mentions') {
      redirect('/mentions')
    }

    updateFilters({ tag: targetTag })
  }, [updateFilters])

  return (
    <>
      {tag.slug === 'mentions' && (
        <Link
          href="/mentions"
          className={`
  flex cursor-pointer items-center gap-1.5 border-b-2 py-2 pb-1 whitespace-nowrap transition-colors
  ${
        isActive
          ? 'border-primary text-foreground'
          : 'border-transparent text-muted-foreground hover:text-foreground'
        }`}
        >
          <span>{tag.name}</span>
        </Link>
      )}

      {tag.slug !== 'mentions' && (
        <span ref={mainTabRef}>
          <Link
            href="/"
            onClick={() => handleTagClick(tag.slug)}
            className={`flex cursor-pointer items-center gap-1.5 border-b-2 py-2 pb-1 whitespace-nowrap transition-colors ${
              isActive
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tag.slug === 'trending' && <TrendingUpIcon className="size-4" />}
            <span>{tag.name}</span>
          </Link>
        </span>
      )}

      {isActive && (
        <Teleport to="#navigation-tags">
          <div className="relative w-full max-w-full">
            <div
              ref={scrollContainerRef}
              className={cn(
                'relative scrollbar-hide flex w-full max-w-full min-w-0 items-center gap-2 overflow-x-auto',
                (showLeftShadow || showRightShadow)
                && `
                  [mask-image:linear-gradient(to_right,transparent,black_32px,black_calc(100%-32px),transparent)]
                  [-webkit-mask-image:linear-gradient(to_right,transparent,black_32px,black_calc(100%-32px),transparent)]
                `,
                showLeftShadow && !showRightShadow
                && `
                  [mask-image:linear-gradient(to_right,transparent,black_32px,black)]
                  [-webkit-mask-image:linear-gradient(to_right,transparent,black_32px,black)]
                `,
                showRightShadow && !showLeftShadow
                && `
                  [mask-image:linear-gradient(to_right,black,black_calc(100%-32px),transparent)]
                  [-webkit-mask-image:linear-gradient(to_right,black,black_calc(100%-32px),transparent)]
                `,
              )}
            >
              <Button
                ref={(el: HTMLButtonElement | null) => {
                  buttonRefs.current[0] = el
                }}
                onClick={() => handleTagClick(tag.slug)}
                variant={
                  tagFromFilters === tag.slug
                    ? 'default'
                    : 'ghost'
                }
                size="sm"
                className={cn(
                  'h-8 shrink-0 text-sm whitespace-nowrap',
                  tagFromFilters === tag.slug
                    ? undefined
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                All
              </Button>

              {tag.childs.map((subtag, index) => (
                <Button
                  key={subtag.slug}
                  ref={(el: HTMLButtonElement | null) => {
                    buttonRefs.current[index + 1] = el
                  }}
                  onClick={() => handleTagClick(subtag.slug)}
                  variant={
                    tagFromFilters === subtag.slug
                      ? 'default'
                      : 'ghost'
                  }
                  size="sm"
                  className={cn(
                    'h-8 shrink-0 text-sm whitespace-nowrap',
                    tagFromFilters === subtag.slug
                      ? undefined
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {subtag.name}
                </Button>
              ))}
            </div>
          </div>
        </Teleport>
      )}
    </>
  )
}
