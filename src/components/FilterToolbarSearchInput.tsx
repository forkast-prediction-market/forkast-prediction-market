'use client'

import type { Route } from 'next'
import { LoaderIcon, SearchIcon } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState, useTransition } from 'react'
import { Input } from '@/components/ui/input'

interface FilterToolbarSearchInputProps {
  search: string
  bookmarked: string
}

export default function FilterToolbarSearchInput({ search, bookmarked = 'false' }: FilterToolbarSearchInputProps) {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState(search)
  const [isPending, startTransition] = useTransition()
  const isFirstRender = useRef(true)
  const prevSearch = useRef(search)
  const bookmarkedRef = useRef(bookmarked)

  useEffect(() => {
    if (prevSearch.current !== search) {
      prevSearch.current = search
      const id = setTimeout(() => setSearchQuery(search), 0)
      return () => clearTimeout(id)
    }
  }, [search])

  useEffect(() => {
    bookmarkedRef.current = bookmarked
  }, [bookmarked])

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }

    const handler = setTimeout(() => {
      startTransition(() => {
        const url = new URL(window.location.href)
        if (searchQuery) {
          url.searchParams.set('search', searchQuery)
        }
        else {
          url.searchParams.delete('search')
        }

        if (bookmarkedRef.current === 'true') {
          url.searchParams.set('bookmarked', bookmarkedRef.current)
        }

        router.replace(url.toString() as unknown as Route, { scroll: false })
      })
    }, 500)

    return () => clearTimeout(handler)
  }, [searchQuery, router])

  const iconClasses = 'pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground'

  return (
    <div className="relative w-full md:w-64 lg:w-72 xl:w-80">
      {!isPending && <SearchIcon className={iconClasses} />}
      {isPending && <LoaderIcon className={`${iconClasses} animate-spin`} />}
      <Input
        type="text"
        data-testid="filter-search-input"
        placeholder="Search"
        value={searchQuery}
        onChange={e => setSearchQuery(e.target.value)}
        className="pl-10 focus-visible:ring-0"
      />
    </div>
  )
}
