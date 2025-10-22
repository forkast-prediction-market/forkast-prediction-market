'use client'

import type { Route } from 'next'
import { useAppKit, useAppKitAccount } from '@reown/appkit/react'
import { BookmarkIcon } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useCallback, useMemo, useState, useTransition } from 'react'
import FilterToolbarSearchInput from '@/components/FilterToolbarSearchInput'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

interface FilterToolbarProps {
  search: string
  bookmarked: string
}

interface BookmarkToggleProps {
  isBookmarked: boolean
  isConnected: boolean
  isLoading?: boolean
  onToggle: () => void
  onConnect: () => void
}

export default function FilterToolbar({ search, bookmarked }: FilterToolbarProps) {
  const { open } = useAppKit()
  const { isConnected } = useAppKitAccount()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [optimisticBookmarked, setOptimisticBookmarked] = useState(bookmarked)
  const isBookmarked = useMemo(() => optimisticBookmarked === 'true', [optimisticBookmarked])

  const toggleBookmarkFilter = useCallback((shouldShowBookmarked: boolean) => {
    try {
      setOptimisticBookmarked(shouldShowBookmarked ? 'true' : 'false')

      startTransition(() => {
        const url = new URL(window.location.href)

        if (shouldShowBookmarked) {
          url.searchParams.set('bookmarked', 'true')
        }
        else {
          url.searchParams.delete('bookmarked')
        }

        router.replace(url.toString() as unknown as Route, { scroll: false })
      })
    }
    catch {
      setOptimisticBookmarked(bookmarked)
    }
  }, [router, bookmarked])

  useMemo(() => {
    setOptimisticBookmarked(bookmarked)
  }, [bookmarked])

  const handleBookmarkToggle = useCallback(() => {
    toggleBookmarkFilter(!isBookmarked)
  }, [toggleBookmarkFilter, isBookmarked])

  const handleConnect = useCallback(() => {
    queueMicrotask(() => open())
  }, [open])

  return (
    <div className="flex w-full flex-col gap-4 overflow-hidden md:flex-row md:items-center md:gap-4">
      <div className="flex w-full items-center gap-3 md:w-auto">
        <div className="flex-1">
          <FilterToolbarSearchInput
            search={search}
            bookmarked={bookmarked}
          />
        </div>

        <BookmarkToggle
          isBookmarked={isBookmarked}
          isConnected={isConnected}
          isLoading={isPending}
          onToggle={handleBookmarkToggle}
          onConnect={handleConnect}
        />
      </div>

      <Separator orientation="vertical" className="hidden shrink-0 md:flex" />

      <div id="navigation-tags" className="min-w-0 flex-1 overflow-hidden" />
    </div>
  )
}

function BookmarkToggle({ isBookmarked, isConnected, isLoading = false, onToggle, onConnect }: BookmarkToggleProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="size-auto p-0"
      title={isBookmarked ? 'Show all items' : 'Show only bookmarked items'}
      aria-label={isBookmarked ? 'Remove bookmark filter' : 'Filter by bookmarks'}
      disabled={isLoading}
      onClick={isConnected ? onToggle : onConnect}
    >
      <BookmarkIcon
        className={cn({
          'fill-current text-primary': isBookmarked,
          'animate-pulse opacity-50': isLoading,
        })}
      />
    </Button>
  )
}
