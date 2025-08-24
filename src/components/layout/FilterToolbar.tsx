'use client'

import { BookmarkIcon } from 'lucide-react'
import { useRouter } from 'next/navigation'
import FilterToolbarSearchInput from '@/components/layout/FilterToolbarSearchInput'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

interface Props {
  search: string
  bookmarked: string
}

export default function FilterToolbar({ search, bookmarked = 'false' }: Props) {
  const router = useRouter()

  function bookmark(bookmarked: boolean) {
    const url = new URL(window.location.href)

    if (bookmarked) {
      url.searchParams.set('bookmarked', 'true')
    }
    else {
      url.searchParams.delete('bookmarked')
    }

    router.replace(url.toString(), { scroll: false })
  }

  return (
    <div className="scrollbar-hide flex items-center gap-4 overflow-x-auto">
      <FilterToolbarSearchInput search={search} bookmarked={bookmarked} />

      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-auto p-0"
        title={bookmarked === 'true' ? 'Show all' : 'Only bookmarks'}
        onClick={() => bookmark(bookmarked !== 'true')}
      >
        {bookmarked === 'true'
          ? <BookmarkIcon className="fill-current text-primary" />
          : <BookmarkIcon />}
      </Button>

      <Separator orientation="vertical" />

      <div id="navigation-tags" className="flex items-center gap-2" />
    </div>
  )
}
