'use client'

import type { Route } from 'next'
import { TrendingUpIcon } from 'lucide-react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import SubNavigationTabs from '@/components/layout/SubNavigationTabs'
import { Teleport } from '@/components/layout/Teleport'

interface Props {
  tag: {
    slug: string
    name: string
    childs: { name: string, slug: string }[]
  }
  childParentMap: Record<string, string>
  isActive: boolean
  ref?: React.Ref<HTMLAnchorElement>
}

function NavigationTab({ tag, childParentMap: _childParentMap, isActive, ref }: Props) {
  const searchParams = useSearchParams()
  const showBookmarkedOnly = searchParams?.get('bookmarked') === 'true'
  const currentSearch = searchParams?.toString() ?? ''
  const tagFromURL = showBookmarkedOnly && searchParams?.get('tag') === 'trending'
    ? ''
    : searchParams?.get('tag') || 'trending'

  function createHref(nextTag: string, context?: string): Route {
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

  return (
    <>
      <Link
        ref={ref}
        href={createHref(tag.slug)}
        className={`flex items-center gap-1.5 py-2 pb-1 whitespace-nowrap transition-colors ${
          isActive
            ? 'font-semibold text-foreground'
            : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        {tag.slug === 'trending' && <TrendingUpIcon className="size-4" />}
        <span>{tag.name}</span>
      </Link>

      {isActive && (
        <Teleport to="#navigation-tags">
          <SubNavigationTabs
            activeTag={tagFromURL}
            mainTag={tag}
            createHref={createHref}
          />
        </Teleport>
      )}
    </>
  )
}

export default NavigationTab
