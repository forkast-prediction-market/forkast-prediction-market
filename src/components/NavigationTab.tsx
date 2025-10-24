'use client'

import type { Route } from 'next'
import { TrendingUpIcon } from 'lucide-react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Teleport } from '@/components/Teleport'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface NavigationTabProps {
  tag: {
    slug: string
    name: string
    childs: { name: string, slug: string }[]
  }
  childParentMap: Record<string, string>
}

export default function NavigationTab({ tag, childParentMap }: NavigationTabProps) {
  const searchParams = useSearchParams()
  const showBookmarkedOnly = searchParams?.get('bookmarked') === 'true'
  const currentSearch = searchParams?.toString() ?? ''
  const tagFromURL = showBookmarkedOnly && searchParams?.get('tag') === 'trending'
    ? ''
    : searchParams?.get('tag') || 'trending'
  const contextFromURL = searchParams?.get('context') ?? undefined
  const parentSlug = childParentMap[tagFromURL]
  const hasChildMatch = tag.childs.some(child => child.slug === tagFromURL)
  const effectiveParent = contextFromURL ?? (parentSlug ?? (hasChildMatch ? tag.slug : tagFromURL))
  const isActive = effectiveParent === tag.slug

  const [showLeftShadow, setShowLeftShadow] = useState(false)
  const [showRightShadow, setShowRightShadow] = useState(false)
  const [showParentLeftShadow, setShowParentLeftShadow] = useState(false)
  const [showParentRightShadow, setShowParentRightShadow] = useState(false)
  const [pendingTag, setPendingTag] = useState<string | null>(null)

  useEffect(() => {
    if (pendingTag && tagFromURL === pendingTag) {
      window.dispatchEvent(new CustomEvent('navigation-pending-change', {
        detail: { pendingTag: null },
      }))
    }
  }, [tagFromURL, pendingTag])

  useEffect(() => {
    function handlePendingChange(e: Event) {
      const customEvent = e as CustomEvent
      setPendingTag(customEvent.detail.pendingTag)
    }

    window.addEventListener('navigation-pending-change', handlePendingChange)
    return () => window.removeEventListener('navigation-pending-change', handlePendingChange)
  }, [])

  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([])
  const mainTabRef = useRef<HTMLAnchorElement>(null)
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

    const childIndex = tag.childs.findIndex(child => child.slug === tagFromURL)
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
  }, [isActive, tagFromURL, tag.childs])

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

  function createHref(nextTag: string, context?: string): Route {
    if (nextTag === 'mentions') {
      return '/mentions' as Route
    }

    const params = new URLSearchParams(currentSearch)
    params.set('tag', nextTag)

    if (context) {
      params.set('context', context)
    }
    else {
      params.delete('context')
    }

    if (!params.get('bookmarked') && showBookmarkedOnly) {
      params.set('bookmarked', 'true')
    }

    return (`/${params.toString() ? `?${params.toString()}` : ''}`) as Route
  }

  function handleLinkClick(targetTag: string) {
    window.dispatchEvent(new CustomEvent('navigation-pending-change', {
      detail: { pendingTag: targetTag },
    }))
  }

  return (
    <>
      <Link
        ref={mainTabRef}
        href={createHref(tag.slug)}
        onClick={() => handleLinkClick(tag.slug)}
        className={`flex items-center gap-1.5 border-b-2 py-2 pb-1 whitespace-nowrap transition-colors ${
          pendingTag === tag.slug
          || (isActive && !pendingTag)
          || (pendingTag && childParentMap[pendingTag] === tag.slug)
            ? 'border-primary text-foreground'
            : 'border-transparent text-muted-foreground hover:text-foreground'
        }`}
      >
        {tag.slug === 'trending' && <TrendingUpIcon className="size-4" />}
        <span>{tag.name}</span>
      </Link>

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
              <Link href={createHref(tag.slug)} key={tag.slug} onClick={() => handleLinkClick(tag.slug)}>
                <Button
                  ref={(el: HTMLButtonElement | null) => {
                    buttonRefs.current[0] = el
                  }}
                  variant={
                    pendingTag === tag.slug || (tagFromURL === tag.slug && !pendingTag)
                      ? 'default'
                      : 'ghost'
                  }
                  size="sm"
                  className={cn(
                    'h-8 shrink-0 text-sm whitespace-nowrap',
                    pendingTag === tag.slug || (tagFromURL === tag.slug && !pendingTag)
                      ? undefined
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  All
                </Button>
              </Link>

              {tag.childs.map((subtag, index) => (
                <Link
                  href={createHref(
                    subtag.slug,
                    tag.slug === 'trending' || tag.slug === 'new' ? tag.slug : undefined,
                  )}
                  key={subtag.slug}
                  onClick={() => handleLinkClick(subtag.slug)}
                >
                  <Button
                    ref={(el: HTMLButtonElement | null) => {
                      buttonRefs.current[index + 1] = el
                    }}
                    variant={
                      pendingTag === subtag.slug || (tagFromURL === subtag.slug && !pendingTag)
                        ? 'default'
                        : 'ghost'
                    }
                    size="sm"
                    className={cn(
                      'h-8 shrink-0 text-sm whitespace-nowrap',
                      pendingTag === subtag.slug || (tagFromURL === subtag.slug && !pendingTag)
                        ? undefined
                        : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {subtag.name}
                  </Button>
                </Link>
              ))}
            </div>
          </div>
        </Teleport>
      )}
    </>
  )
}
