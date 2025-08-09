'use client'

import { LoaderIcon, SearchIcon } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState, useTransition } from 'react'
import { Input } from '@/components/ui/input'

interface Props {
  search: string
}

export default function FilterToolbarSearchInput({ search }: Props) {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState(search)
  const [isPending, startTransition] = useTransition()
  const isFirstRender = useRef(true)
  const prevSearch = useRef(search)

  useEffect(() => {
    if (prevSearch.current !== search) {
      prevSearch.current = search
      const id = setTimeout(() => setSearchQuery(search), 0)
      return () => clearTimeout(id)
    }
  }, [search])

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

        router.replace(url.toString(), { scroll: false })
      })
    }, 500)

    return () => clearTimeout(handler)
  }, [searchQuery, router])

  const iconClasses = 'absolute top-1/2 left-3 z-10 size-4 -translate-y-1/2 text-muted-foreground'

  return (
    <div className="relative w-48 shrink-0">
      {!isPending && <SearchIcon className={iconClasses} />}
      {isPending && <LoaderIcon className={`${iconClasses} animate-spin`} />}
      <Input
        type="text"
        placeholder="Search"
        value={searchQuery}
        onChange={e => setSearchQuery(e.target.value)}
        className="pl-10"
      />
    </div>
  )
}
