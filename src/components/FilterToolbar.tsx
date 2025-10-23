'use client'

import type { LucideIcon } from 'lucide-react'
import type { Route } from 'next'

import { useAppKit, useAppKitAccount } from '@reown/appkit/react'
import { BookmarkIcon, ClockIcon, DropletIcon, FlameIcon, HandFistIcon, Settings2Icon, SparklesIcon, TrendingUpIcon } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useCallback, useMemo, useState, useTransition } from 'react'
import FilterToolbarSearchInput from '@/components/FilterToolbarSearchInput'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

interface FilterToolbarProps {
  search: string
  bookmarked: string
}

interface BookmarkToggleProps {
  isBookmarked: boolean
  isConnected: boolean
  isLoading?: boolean
  onToggle: () => void
  onConnect: () => void
}

interface SettingsToggleProps {
  isActive: boolean
  isOpen: boolean
  onToggle: () => void
}

type SortOption = '24h-volume' | 'total-volume' | 'liquidity' | 'newest' | 'ending-soon' | 'competitive'
type FrequencyOption = 'all' | 'daily' | 'weekly' | 'monthly'
type StatusOption = 'active' | 'resolved'

type FilterCheckboxKey = 'hideSports' | 'hideCrypto' | 'hideEarnings'

interface FilterSettings {
  sortBy: SortOption
  frequency: FrequencyOption
  status: StatusOption
  hideSports: boolean
  hideCrypto: boolean
  hideEarnings: boolean
}

const SORT_OPTIONS: ReadonlyArray<{ value: SortOption, label: string, icon: LucideIcon }> = [
  { value: '24h-volume', label: '24h Volume', icon: TrendingUpIcon },
  { value: 'total-volume', label: 'Total Volume', icon: FlameIcon },
  { value: 'liquidity', label: 'Liquidity', icon: DropletIcon },
  { value: 'newest', label: 'Newest', icon: SparklesIcon },
  { value: 'ending-soon', label: 'Ending Soon', icon: ClockIcon },
  { value: 'competitive', label: 'Competitive', icon: HandFistIcon },
]

const FREQUENCY_OPTIONS: ReadonlyArray<{ value: FrequencyOption, label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
]

const STATUS_OPTIONS: ReadonlyArray<{ value: StatusOption, label: string }> = [
  { value: 'active', label: 'Active' },
  { value: 'resolved', label: 'Resolved' },
]

const FILTER_CHECKBOXES: ReadonlyArray<{ key: FilterCheckboxKey, label: string }> = [
  { key: 'hideSports', label: 'Hide sports?' },
  { key: 'hideCrypto', label: 'Hide crypto?' },
  { key: 'hideEarnings', label: 'Hide earnings?' },
]

const BASE_FILTER_SETTINGS = {
  sortBy: '24h-volume',
  frequency: 'all',
  status: 'active',
  hideSports: false,
  hideCrypto: false,
  hideEarnings: false,
} as const satisfies FilterSettings

function createDefaultFilters(): FilterSettings {
  return {
    ...BASE_FILTER_SETTINGS,
  }
}

export default function FilterToolbar({ search, bookmarked }: FilterToolbarProps) {
  const { open } = useAppKit()
  const { isConnected } = useAppKitAccount()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [optimisticBookmarked, setOptimisticBookmarked] = useState(bookmarked)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [filterSettings, setFilterSettings] = useState<FilterSettings>(createDefaultFilters)

  const isBookmarked = useMemo(() => optimisticBookmarked === 'true', [optimisticBookmarked])

  const hasActiveFilters = useMemo(() => (
    filterSettings.sortBy !== BASE_FILTER_SETTINGS.sortBy
    || filterSettings.frequency !== BASE_FILTER_SETTINGS.frequency
    || filterSettings.status !== BASE_FILTER_SETTINGS.status
    || filterSettings.hideSports !== BASE_FILTER_SETTINGS.hideSports
    || filterSettings.hideCrypto !== BASE_FILTER_SETTINGS.hideCrypto
    || filterSettings.hideEarnings !== BASE_FILTER_SETTINGS.hideEarnings
  ), [filterSettings])

  const toggleBookmarkFilter = useCallback((shouldShowBookmarked: boolean) => {
    try {
      setOptimisticBookmarked(shouldShowBookmarked ? 'true' : 'false')

      startTransition(() => {
        const url = new URL(window.location.href)

        if (shouldShowBookmarked) {
          url.searchParams.set('bookmarked', 'true')
        }
        else {
          url.searchParams.delete('bookmarked')
        }

        router.replace(url.toString() as unknown as Route, { scroll: false })
      })
    }
    catch {
      setOptimisticBookmarked(bookmarked)
    }
  }, [router, bookmarked])

  useMemo(() => {
    setOptimisticBookmarked(bookmarked)
  }, [bookmarked])

  const handleBookmarkToggle = useCallback(() => {
    toggleBookmarkFilter(!isBookmarked)
  }, [toggleBookmarkFilter, isBookmarked])

  const handleConnect = useCallback(() => {
    queueMicrotask(() => open())
  }, [open])

  const handleSettingsToggle = useCallback(() => {
    setIsSettingsOpen(prev => !prev)
  }, [])

  const handleFilterChange = useCallback((updates: Partial<FilterSettings>) => {
    setFilterSettings(prev => ({ ...prev, ...updates }))
  }, [])

  const handleClearFilters = useCallback(() => {
    setFilterSettings(createDefaultFilters())
  }, [])

  return (
    <div className="flex w-full min-w-0 flex-col gap-3">
      <div className="flex w-full min-w-0 flex-col gap-3 overflow-hidden md:flex-row md:items-center md:gap-4">
        <div className="flex w-full min-w-0 items-center gap-3 md:w-auto md:min-w-0">
          <div className="min-w-0 flex-1">
            <FilterToolbarSearchInput
              search={search}
              bookmarked={bookmarked}
            />
          </div>

          <div className="flex items-center gap-2 md:gap-3">
            <SettingsToggle
              isActive={isSettingsOpen || hasActiveFilters}
              isOpen={isSettingsOpen}
              onToggle={handleSettingsToggle}
            />

            <BookmarkToggle
              isBookmarked={isBookmarked}
              isConnected={isConnected}
              isLoading={isPending}
              onToggle={handleBookmarkToggle}
              onConnect={handleConnect}
            />
          </div>
        </div>

        <Separator orientation="vertical" className="hidden shrink-0 md:flex" />

        <div id="navigation-tags" className="max-w-full min-w-0 flex-1 overflow-hidden" />
      </div>

      {isSettingsOpen && (
        <FilterSettingsRow
          filters={filterSettings}
          onChange={handleFilterChange}
          onClear={handleClearFilters}
          hasActiveFilters={hasActiveFilters}
        />
      )}
    </div>
  )
}

function BookmarkToggle({ isBookmarked, isConnected, isLoading = false, onToggle, onConnect }: BookmarkToggleProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={cn(
        `
          h-10 w-10 rounded-sm border border-transparent bg-transparent p-0 text-muted-foreground transition-none
          hover:bg-transparent hover:text-muted-foreground
          md:h-9 md:w-9
        `,
        isBookmarked && 'bg-muted/70 text-foreground hover:bg-muted/70 hover:text-foreground',
        isLoading && 'pointer-events-none opacity-80',
      )}
      title={isBookmarked ? 'Show all items' : 'Show only bookmarked items'}
      aria-label={isBookmarked ? 'Remove bookmark filter' : 'Filter by bookmarks'}
      aria-pressed={isBookmarked}
      disabled={isLoading}
      onClick={isConnected ? onToggle : onConnect}
    >
      <BookmarkIcon
        className={cn(
          'size-6 md:size-5',
          isLoading && 'animate-pulse opacity-70',
        )}
      />
    </Button>
  )
}

function SettingsToggle({ isActive, isOpen, onToggle }: SettingsToggleProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={cn(
        `
          h-10 w-10 rounded-sm border border-transparent bg-transparent p-0 text-muted-foreground transition-none
          hover:bg-transparent hover:text-muted-foreground
          md:h-9 md:w-9
        `,
        (isOpen || isActive) && 'bg-muted/70 text-foreground hover:bg-muted/70 hover:text-foreground',
      )}
      title="Open filters"
      aria-label="Open filters"
      aria-pressed={isActive}
      aria-expanded={isOpen}
      onClick={onToggle}
    >
      <Settings2Icon className="size-6 md:size-5" />
    </Button>
  )
}

interface FilterSettingsRowProps {
  filters: FilterSettings
  onChange: (updates: Partial<FilterSettings>) => void
  onClear: () => void
  hasActiveFilters: boolean
}

function FilterSettingsRow({ filters, onChange, onClear, hasActiveFilters }: FilterSettingsRowProps) {
  return (
    <div className="flex w-full max-w-full flex-wrap items-center gap-2 md:gap-3">
      <FilterSettingsSelect
        label="Sort by:"
        value={filters.sortBy}
        options={SORT_OPTIONS}
        onChange={value => onChange({ sortBy: value as SortOption })}
      />

      <FilterSettingsSelect
        label="Frequency:"
        value={filters.frequency}
        options={FREQUENCY_OPTIONS}
        onChange={value => onChange({ frequency: value as FrequencyOption })}
      />

      <FilterSettingsSelect
        label="Status:"
        value={filters.status}
        options={STATUS_OPTIONS}
        onChange={value => onChange({ status: value as StatusOption })}
      />

      {FILTER_CHECKBOXES.map(({ key, label }) => (
        <Label
          key={key}
          htmlFor={`filter-${key}`}
          className={cn(
            'flex items-center gap-2 rounded-full bg-muted/60 px-3 py-2 text-xs font-medium text-muted-foreground',
            'transition-colors hover:bg-muted',
          )}
        >
          <span className="whitespace-nowrap">{label}</span>
          <Checkbox
            id={`filter-${key}`}
            checked={filters[key]}
            onCheckedChange={checked => onChange({
              [key]: Boolean(checked),
            } as Partial<FilterSettings>)}
            className={cn(
              'border-border/80 bg-background/75',
              'data-[state=checked]:border-primary data-[state=checked]:bg-primary',
            )}
          />
        </Label>
      ))}

      {hasActiveFilters && (
        <Button
          type="button"
          variant="ghost"
          className={cn(
            'h-8 rounded-full px-3 text-xs font-medium text-muted-foreground',
            'hover:text-foreground hover:underline',
          )}
          onClick={onClear}
        >
          Clear filters
        </Button>
      )}
    </div>
  )
}

interface FilterSettingsSelectOption {
  value: string
  label: string
  icon?: LucideIcon
}

interface FilterSettingsSelectProps {
  label: string
  value: string
  options: ReadonlyArray<FilterSettingsSelectOption>
  onChange: (value: string) => void
}

function FilterSettingsSelect({ label, value, options, onChange }: FilterSettingsSelectProps) {
  const activeOption = options.find(option => option.value === value)

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger
        size="sm"
        className={cn(
          'h-9 min-w-[160px] gap-2 rounded-full border-none bg-muted/60 px-3 text-xs font-medium text-foreground/90',
          'shadow-none',
          'hover:bg-muted',
        )}
      >
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <span className="text-xs font-semibold text-foreground">{activeOption?.label ?? ''}</span>
      </SelectTrigger>
      <SelectContent align="start">
        {options.map((option) => {
          const OptionIcon = option.icon

          return (
            <SelectItem key={option.value} value={option.value}>
              <span className="flex items-center gap-2">
                {OptionIcon && <OptionIcon className="size-4 text-muted-foreground" />}
                <span>{option.label}</span>
              </span>
            </SelectItem>
          )
        })}
      </SelectContent>
    </Select>
  )
}
