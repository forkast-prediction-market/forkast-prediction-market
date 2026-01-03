import type { RefObject } from 'react'
import type { TimeRange } from '@/app/(platform)/event/[slug]/_hooks/useEventPriceHistory'
import { ShuffleIcon } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

interface EventChartControlsProps {
  hasChartData: boolean
  timeRanges: TimeRange[]
  activeTimeRange: TimeRange
  onTimeRangeChange: (value: TimeRange) => void
  timeRangeContainerRef: RefObject<HTMLDivElement | null>
  timeRangeIndicator: { width: number, left: number }
  timeRangeIndicatorReady: boolean
  isSingleMarket: boolean
  oppositeOutcomeLabel: string
  onShuffle: () => void
}

export default function EventChartControls({
  hasChartData,
  timeRanges,
  activeTimeRange,
  onTimeRangeChange,
  timeRangeContainerRef,
  timeRangeIndicator,
  timeRangeIndicatorReady,
  isSingleMarket,
  oppositeOutcomeLabel,
  onShuffle,
}: EventChartControlsProps) {
  if (!hasChartData) {
    return null
  }

  return (
    <div className="relative mt-3 flex flex-wrap items-center justify-between gap-3">
      <div
        ref={timeRangeContainerRef}
        className="relative flex flex-wrap items-center gap-2 text-xs font-semibold"
      >
        <div
          className={cn(
            'absolute inset-y-0 rounded-md bg-muted',
            timeRangeIndicatorReady ? 'opacity-100 transition-all duration-300' : 'opacity-0 transition-none',
          )}
          style={{
            width: `${timeRangeIndicator.width}px`,
            left: `${timeRangeIndicator.left}px`,
          }}
          aria-hidden={!timeRangeIndicatorReady}
        />
        {timeRanges.map(range => (
          <button
            key={range}
            type="button"
            className={cn(
              'relative z-10 rounded-md px-3 py-2 transition-colors',
              activeTimeRange === range
                ? 'bg-muted text-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
            data-range={range}
            onClick={() => onTimeRangeChange(range)}
          >
            {range}
          </button>
        ))}
      </div>

      {isSingleMarket && (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className={
                `
                  flex items-center justify-center rounded-md px-3 py-2 text-xs font-semibold text-muted-foreground
                  transition-colors
                  hover:bg-muted/70 hover:text-foreground
                `
              }
              onClick={onShuffle}
              aria-label={`switch to ${oppositeOutcomeLabel}`}
            >
              <ShuffleIcon className="size-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent
            side="left"
            sideOffset={8}
            hideArrow
            className="border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground shadow-xl"
          >
            switch to
            {' '}
            {oppositeOutcomeLabel}
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  )
}
