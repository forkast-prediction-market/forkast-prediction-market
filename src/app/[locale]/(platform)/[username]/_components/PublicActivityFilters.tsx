import type { ActivitySort, ActivityTypeFilter } from '@/app/[locale]/(platform)/[username]/_types/PublicActivityTypes'
import { ArrowDownNarrowWideIcon, DownloadIcon, ListFilterIcon, SearchIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface PublicActivityFiltersProps {
  searchQuery: string
  onSearchChange: (value: string) => void
  typeFilter: ActivityTypeFilter
  onTypeChange: (value: ActivityTypeFilter) => void
  sortFilter: ActivitySort
  onSortChange: (value: ActivitySort) => void
  onExport: () => void
  disableExport: boolean
}

export default function PublicActivityFilters({
  searchQuery,
  onSearchChange,
  typeFilter,
  onTypeChange,
  sortFilter,
  onSortChange,
  onExport,
  disableExport,
}: PublicActivityFiltersProps) {
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
          <Select value={typeFilter} onValueChange={value => onTypeChange(value as ActivityTypeFilter)}>
            <SelectTrigger className="dark:bg-transparent [&>svg:last-of-type]:hidden">
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

          <Select value={sortFilter} onValueChange={value => onSortChange(value as ActivitySort)}>
            <SelectTrigger className="dark:bg-transparent [&>svg:last-of-type]:hidden">
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
            onClick={onExport}
            disabled={disableExport}
            className="rounded-md dark:bg-transparent"
          >
            <DownloadIcon className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
