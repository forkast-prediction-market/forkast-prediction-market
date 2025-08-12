'use client'

import type { Tag } from '@/types'
import { BookmarkIcon } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import FilterToolbarSearchInput from '@/components/layout/FilterToolbarSearchInput'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

interface Props {
  category: string
  search: string
}

export default function FilterToolbar({ category, search }: Props) {
  const [activeTag, setActiveTag] = useState('all')
  const [tags, setTags] = useState<Tag[]>([])
  const showFavoritesOnly = false
  const router = useRouter()

  useEffect(() => {
    async function fetchChildTags() {
      const res = await fetch(`/api/tags/${category}/child`)
      if (res.ok) {
        const data = await res.json()
        setTags([{ name: 'All', slug: 'all' }, ...data])
      }
      else {
        setTags([{ name: 'All', slug: 'all' }])
      }
    }

    fetchChildTags().catch(() => setTags([{ name: 'All', slug: 'all' }]))
  }, [category])

  function changeCategory(category: string) {
    router.push(`/?category=${category}`)
    setActiveTag(category)
  }

  return (
    <div className="flex items-center gap-4">
      <FilterToolbarSearchInput search={search} />

      <button
        type="button"
        className="text-muted-foreground transition-colors hover:text-primary"
        title={showFavoritesOnly ? 'Mostrar todos' : 'Apenas favoritos'}
      >
        {showFavoritesOnly
          ? <BookmarkIcon className="size-3.5 fill-current text-primary" />
          : <BookmarkIcon className="size-3.5" />}
      </button>

      <Separator orientation="vertical" />

      <div className="scrollbar-hide flex items-center gap-2 overflow-x-auto">
        {tags.map((tag: Tag) => (
          <Button
            key={tag.slug}
            variant={activeTag === tag.slug ? 'default' : 'ghost'}
            size="sm"
            onClick={() => changeCategory(tag.slug)}
            className="h-8 shrink-0 text-xs whitespace-nowrap"
          >
            {tag.name}
          </Button>
        ))}
      </div>
    </div>
  )
}
