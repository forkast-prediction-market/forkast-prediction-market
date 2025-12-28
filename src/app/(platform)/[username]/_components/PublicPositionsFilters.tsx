import type { SortOption } from '@/app/(platform)/[username]/_types/PublicPositionsTypes'
import { ArrowDownNarrowWideIcon, MergeIcon, SearchIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface PublicPositionsFiltersProps {
  searchQuery: string
  sortBy: SortOption
  onSearchChange: (query: string) => void
  onSortChange: (value: SortOption) => void
  showMergeButton: boolean
  onMergeClick: () => void
}

export default function PublicPositionsFilters({
  searchQuery,
  sortBy,
  onSearchChange,
  onSortChange,
  showMergeButton,
  onMergeClick,
}: PublicPositionsFiltersProps) {
  return (
    <div className="space-y-3 px-2 pt-2 sm:px-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <SearchIcon className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search markets..."
            value={searchQuery}
            onChange={event => onSearchChange(event.target.value)}
            className="w-full pr-3 pl-9"
          />
        </div>

        <div className="flex items-center gap-2">
          <Select value={sortBy} onValueChange={value => onSortChange(value as SortOption)}>
            <SelectTrigger className="w-48 justify-start gap-2 pr-3 [&>svg:last-of-type]:hidden">
              <ArrowDownNarrowWideIcon className="size-4 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="currentValue">Current value</SelectItem>
              <SelectItem value="trade">Trade</SelectItem>
              <SelectItem value="pnlPercent">Profit &amp; Loss %</SelectItem>
              <SelectItem value="pnlValue">Profit &amp; Loss $</SelectItem>
              <SelectItem value="shares">Shares</SelectItem>
              <SelectItem value="alpha">Alphabetically</SelectItem>
              <SelectItem value="endingSoon">Ending soon</SelectItem>
              <SelectItem value="payout">Payout</SelectItem>
              <SelectItem value="latestPrice">Latest Price</SelectItem>
              <SelectItem value="avgCost">Average cost per share</SelectItem>
            </SelectContent>
          </Select>

          {showMergeButton && (
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="shrink-0 rounded-lg"
              onClick={onMergeClick}
              aria-label="Merge positions"
            >
              <MergeIcon className="size-4 rotate-90" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
