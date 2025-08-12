import { BookmarkIcon } from 'lucide-react'
import FilterToolbarSearchInput from '@/components/layout/FilterToolbarSearchInput'
import { Separator } from '@/components/ui/separator'

interface Props {
  search: string
}

export default function FilterToolbar({ search }: Props) {
  const showFavoritesOnly = false

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

      <div id="navigation-tags" className="flex items-center gap-2" />
    </div>
  )
}
