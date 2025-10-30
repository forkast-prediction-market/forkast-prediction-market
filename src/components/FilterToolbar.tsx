'use client'

import type { LucideIcon } from 'lucide-react'
import type { FilterState } from '@/providers/FilterProvider'
import { useAppKit, useAppKitAccount } from '@reown/appkit/react'
import { BookmarkIcon, ClockIcon, DropletIcon, FlameIcon, HandFistIcon, Settings2Icon, SparklesIcon, TrendingUpIcon } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
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
  filters: FilterState
  onFiltersChange: (filters: Partial<FilterState>) => void
}

interface BookmarkToggleProps {
  isBookmarked: boolean
  isConnected: boolean
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

function createDefaultFilters(overrides: Partial<FilterSettings> = {}): FilterSettings {
  return {
    ...BASE_FILTER_SETTINGS,
    ...overrides,
  }
}

export default function FilterToolbar({ filters, onFiltersChange }: FilterToolbarProps) {
  const { open } = useAppKit()
  const { isConnected } = useAppKitAccount()
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [filterSettings, setFilterSettings] = useState<FilterSettings>(() => createDefaultFilters({
    hideSports: filters.hideSports,
    hideCrypto: filters.hideCrypto,
    hideEarnings: filters.hideEarnings,
  }))

  const isBookmarked = useMemo(() => filters.bookmarked === 'true', [filters.bookmarked])

  const hasActiveFilters = useMemo(() => (
    filterSettings.sortBy !== BASE_FILTER_SETTINGS.sortBy
    || filterSettings.frequency !== BASE_FILTER_SETTINGS.frequency
    || filterSettings.status !== BASE_FILTER_SETTINGS.status
    || filterSettings.hideSports !== BASE_FILTER_SETTINGS.hideSports
    || filterSettings.hideCrypto !== BASE_FILTER_SETTINGS.hideCrypto
    || filterSettings.hideEarnings !== BASE_FILTER_SETTINGS.hideEarnings
  ), [filterSettings])

  useEffect(() => {
    setFilterSettings((prev) => {
      if (
        prev.hideSports === filters.hideSports
        && prev.hideCrypto === filters.hideCrypto
        && prev.hideEarnings === filters.hideEarnings
      ) {
        return prev
      }

      return {
        ...prev,
        hideSports: filters.hideSports,
        hideCrypto: filters.hideCrypto,
        hideEarnings: filters.hideEarnings,
      }
    })
  }, [filters.hideSports, filters.hideCrypto, filters.hideEarnings])

  const handleBookmarkToggle = useCallback(() => {
    const newBookmarked = isBookmarked ? 'false' : 'true'
    onFiltersChange({ bookmarked: newBookmarked as 'true' | 'false' })
  }, [isBookmarked, onFiltersChange])

  const handleConnect = useCallback(() => {
    queueMicrotask(() => open())
  }, [open])

  const handleSettingsToggle = useCallback(() => {
    setIsSettingsOpen(prev => !prev)
  }, [])

  const handleFilterChange = useCallback((updates: Partial<FilterSettings>) => {
    setFilterSettings((prev) => {
      const next = { ...prev, ...updates }

      // Update parent component's filter state for hide options
      const hideSportsChanged = 'hideSports' in updates && updates.hideSports !== undefined && updates.hideSports !== prev.hideSports
      const hideCryptoChanged = 'hideCrypto' in updates && updates.hideCrypto !== undefined && updates.hideCrypto !== prev.hideCrypto
      const hideEarningsChanged = 'hideEarnings' in updates && updates.hideEarnings !== undefined && updates.hideEarnings !== prev.hideEarnings

      if (hideSportsChanged || hideCryptoChanged || hideEarningsChanged) {
        const filterUpdates: Partial<FilterState> = {}
        if (hideSportsChanged) {
          filterUpdates.hideSports = updates.hideSports
        }
        if (hideCryptoChanged) {
          filterUpdates.hideCrypto = updates.hideCrypto
        }
        if (hideEarningsChanged) {
          filterUpdates.hideEarnings = updates.hideEarnings
        }
        onFiltersChange(filterUpdates)
      }

      return next
    })
  }, [onFiltersChange])

  const handleClearFilters = useCallback(() => {
    const defaultFilters = createDefaultFilters()
    setFilterSettings(defaultFilters)

    // Update parent component's filter state
    onFiltersChange({
      hideSports: defaultFilters.hideSports,
      hideCrypto: defaultFilters.hideCrypto,
      hideEarnings: defaultFilters.hideEarnings,
    })
  }, [onFiltersChange])

  const handleSearchChange = useCallback((search: string) => {
    onFiltersChange({ search })
  }, [onFiltersChange])

  return (
    <div className="flex w-full min-w-0 flex-col gap-3">
      <div className="flex w-full min-w-0 flex-col gap-3 md:flex-row md:items-center md:gap-4">
        <div className="order-1 flex w-full min-w-0 items-center gap-3 md:order-1 md:w-auto md:min-w-0">
          <div className="min-w-0 flex-1">
            <FilterToolbarSearchInput
              search={filters.search}
              onSearchChange={handleSearchChange}
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
              onToggle={handleBookmarkToggle}
              onConnect={handleConnect}
            />
          </div>
        </div>

        {isSettingsOpen && (
          <FilterSettingsRow
            className="order-2 scrollbar-hide flex w-full items-center overflow-x-auto px-1 md:hidden"
            filters={filterSettings}
            onChange={handleFilterChange}
            onClear={handleClearFilters}
            hasActiveFilters={hasActiveFilters}
          />
        )}

        <Separator orientation="vertical" className="order-4 hidden shrink-0 md:order-2 md:flex" />

        <div id="navigation-tags" className="order-3 max-w-full min-w-0 flex-1 overflow-hidden md:order-3" />
      </div>

      {isSettingsOpen && (
        <FilterSettingsRow
          className="hidden md:flex"
          filters={filterSettings}
          onChange={handleFilterChange}
          onClear={handleClearFilters}
          hasActiveFilters={hasActiveFilters}
        />
      )}
    </div>
  )
}

function BookmarkToggle({ isBookmarked, isConnected, onToggle, onConnect }: BookmarkToggleProps) {
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
      )}
      title={isBookmarked ? 'Show all items' : 'Show only bookmarked items'}
      aria-label={isBookmarked ? 'Remove bookmark filter' : 'Filter by bookmarks'}
      aria-pressed={isBookmarked}
      onClick={isConnected ? onToggle : onConnect}
    >
      <BookmarkIcon className="size-6 md:size-5" />
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
  className?: string
}

function FilterSettingsRow({ filters, onChange, onClear, hasActiveFilters, className }: FilterSettingsRowProps) {
  return (
    <div
      className={cn(
        `
          scrollbar-hide flex w-full max-w-full flex-nowrap items-center gap-2 overflow-x-auto
          md:flex-wrap md:gap-3 md:overflow-visible
        `,
        className,
      )}
    >
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
            `
              flex flex-shrink-0 items-center gap-2 rounded-full bg-muted/60 px-3 py-2 text-xs font-medium
              text-muted-foreground
            `,
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
            'h-8 flex-shrink-0 rounded-full px-3 text-xs font-medium text-muted-foreground',
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
          `
            h-9 min-w-[160px] flex-shrink-0 gap-2 rounded-full border-none bg-muted/60 px-3 text-xs font-medium
            text-foreground/90
          `,
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
