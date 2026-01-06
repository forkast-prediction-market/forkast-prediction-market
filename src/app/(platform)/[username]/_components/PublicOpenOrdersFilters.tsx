import type { OpenOrdersSort } from '@/app/(platform)/[username]/_types/PublicOpenOrdersTypes'
import { ArrowDownNarrowWideIcon, SearchIcon } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface PublicOpenOrdersFiltersProps {
  searchQuery: string
  onSearchChange: (value: string) => void
  sortBy: OpenOrdersSort
  onSortChange: (value: OpenOrdersSort) => void
}

export default function PublicOpenOrdersFilters({
  searchQuery,
  onSearchChange,
  sortBy,
  onSortChange,
}: PublicOpenOrdersFiltersProps) {
  return (
    <div className="space-y-3 px-2 pt-2 sm:px-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <SearchIcon className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search open orders..."
            value={searchQuery}
            onChange={e => onSearchChange(e.target.value)}
            className="w-full pr-3 pl-9"
          />
        </div>

        <Select value={sortBy} onValueChange={value => onSortChange(value as OpenOrdersSort)}>
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
            <SelectItem value="market">Market</SelectItem>
            <SelectItem value="filled">Filled Quantity</SelectItem>
            <SelectItem value="total">Total Quantity</SelectItem>
            <SelectItem value="date">Order Date</SelectItem>
            <SelectItem value="resolving">Resolving Soonest</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
