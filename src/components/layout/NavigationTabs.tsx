'use client'

import type { EventCategory } from '@/types'
import { TrendingUp } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { getMainCategories } from '@/lib/mockData'

interface Props {
  activeCategory: EventCategory
}

export default function NavigationTabs({ activeCategory }: Props) {
  const [categories, setCategories] = useState<
    { id: EventCategory, label: string }[]
  >([])

  useEffect(() => {
    async function loadCategories() {
      const mainCategories = await getMainCategories()
      setCategories(mainCategories)
    }

    loadCategories().catch(() => {})
  }, [])

  return (
    <nav className="sticky top-16 z-10 border-b bg-background">
      <div className="container flex gap-6 overflow-x-auto py-1 text-sm font-medium">
        {categories.map((category, index) => (
          <div key={category.id} className="flex items-center">
            <Link
              href={`/?category=${category.id}`}
              className={`flex items-center gap-1.5 border-b-2 py-2 pb-1 whitespace-nowrap transition-colors ${
                activeCategory === category.id
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {category.id === 'trending' && <TrendingUp className="size-4" />}
              <span>{category.label}</span>
            </Link>

            {index === 1 && <div className="mr-0 ml-6 h-4 w-px bg-border" />}
          </div>
        ))}
      </div>
    </nav>
  )
}
