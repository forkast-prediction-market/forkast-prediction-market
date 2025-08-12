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
  const [activeCategory, setActiveCategory] = useState('all')
  const [tags, setTags] = useState<Tag[]>([])
  const showFavoritesOnly = false
  const router = useRouter()

  useEffect(() => {
    async function fetchChildTags() {
      const res = await fetch(`/api/tags/${category}/child`)
      if (res.ok) {
        const data = await res.json()
        const parentSlug = (Array.isArray(data) && data.length > 0 && data[0].parent) ? data[0].parent : category
        setTags([{ name: 'All', slug: 'all', parent: parentSlug }, ...data])
      }
      else {
        setTags([{ name: 'All', slug: 'all', parent: category }])
      }
    }

    fetchChildTags().catch(() => setTags([{ name: 'All', slug: 'all', parent: category }]))
  }, [category])

  function changeCategory(tag: Tag) {
    const targetCategory = tag.slug === 'all' ? (tag.parent ?? tag.slug) : tag.slug
    router.push(`/?category=${targetCategory}`)
    setActiveCategory(tag.slug)
  }

  return (
    <div className="scrollbar-hide flex items-center gap-4 overflow-x-auto">
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

      <div className="flex items-center gap-2">
        {tags.map((tag: Tag) => (
          <Button
            key={tag.slug}
            variant={activeCategory === tag.slug ? 'default' : 'ghost'}
            size="sm"
            onClick={() => changeCategory(tag)}
            className="h-8 shrink-0 text-xs whitespace-nowrap"
          >
            {tag.name}
          </Button>
        ))}
      </div>
    </div>
  )
}
