import type { HistorySort, HistoryTypeFilter } from '@/app/(platform)/[username]/_types/PublicHistoryTypes'
import { ArrowDownNarrowWideIcon, DownloadIcon, ListFilterIcon, SearchIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface PublicHistoryFiltersProps {
  searchQuery: string
  onSearchChange: (value: string) => void
  typeFilter: HistoryTypeFilter
  onTypeChange: (value: HistoryTypeFilter) => void
  sortFilter: HistorySort
  onSortChange: (value: HistorySort) => void
  onExport: () => void
  disableExport: boolean
}

export default function PublicHistoryFilters({
  searchQuery,
  onSearchChange,
  typeFilter,
  onTypeChange,
  sortFilter,
  onSortChange,
  onExport,
  disableExport,
}: PublicHistoryFiltersProps) {
  return (
    <div className="space-y-3 px-2 pt-2 sm:px-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <SearchIcon className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search activity..."
            value={searchQuery}
            onChange={e => onSearchChange(e.target.value)}
            className="w-full pr-3 pl-9"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
          <Select value={typeFilter} onValueChange={value => onTypeChange(value as HistoryTypeFilter)}>
            <SelectTrigger
              className={
                `
                  w-auto justify-start gap-2 bg-transparent shadow-none
                  hover:bg-transparent
                  dark:bg-transparent dark:hover:bg-transparent
                  [&>svg:last-of-type]:hidden
                `
              }
            >
              <ListFilterIcon className="size-4 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="trades">Trades</SelectItem>
              <SelectItem value="buy">Buy</SelectItem>
              <SelectItem value="merge">Merge</SelectItem>
              <SelectItem value="redeem">Redeem</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortFilter} onValueChange={value => onSortChange(value as HistorySort)}>
            <SelectTrigger
              className={
                `
                  w-auto justify-start gap-2 bg-transparent pr-3 shadow-none
                  hover:bg-transparent
                  dark:bg-transparent dark:hover:bg-transparent
                  [&>svg:last-of-type]:hidden
                `
              }
            >
              <ArrowDownNarrowWideIcon className="size-4 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="oldest">Oldest</SelectItem>
              <SelectItem value="value">Value</SelectItem>
              <SelectItem value="shares">Shares</SelectItem>
            </SelectContent>
          </Select>

          <Button
            type="button"
            variant="outline"
            size="icon"
            className={`
              rounded-lg bg-transparent shadow-none
              hover:bg-transparent
              dark:bg-transparent dark:hover:bg-transparent
            `}
            onClick={onExport}
            disabled={disableExport}
          >
            <DownloadIcon className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
