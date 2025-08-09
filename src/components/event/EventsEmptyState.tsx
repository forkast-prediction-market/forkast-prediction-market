import { BarChart3Icon, SearchIcon, XIcon } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

interface Props {
  activeCategory: string
  searchQuery: string
}

export default function EventsEmptyState({ searchQuery, activeCategory }: Props) {
  return (
    <div className="col-span-4 py-12 text-center">
      <div className="mb-2 flex justify-center text-muted-foreground">
        {searchQuery
          ? <SearchIcon className="size-6" />
          : <BarChart3Icon className="size-6" />}
      </div>

      <h3 className="mb-2 text-lg font-medium text-foreground">
        {searchQuery ? 'No events found' : 'No events available'}
      </h3>

      <p className="mb-6 text-sm text-muted-foreground">
        {searchQuery
          ? (
              <>
                Try adjusting your search for &ldquo;
                {searchQuery}
                &rdquo;
              </>
            )
          : (
              <>
                There are no events in the
                {' '}
                {activeCategory}
                {' '}
                category with these
                filters
              </>
            )}
      </p>

      <Link href="/">
        <Button type="button">
          <XIcon />
          Clear filters
        </Button>
      </Link>
    </div>
  )
}
