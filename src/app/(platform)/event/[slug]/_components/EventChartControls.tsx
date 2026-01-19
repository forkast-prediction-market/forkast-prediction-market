import type { Dispatch, SetStateAction } from 'react'
import type { TimeRange } from '@/app/(platform)/event/[slug]/_hooks/useEventPriceHistory'
import { CodeXmlIcon, FileTextIcon, SettingsIcon, ShuffleIcon } from 'lucide-react'
import { useState } from 'react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Switch } from '@/components/ui/switch'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

export const defaultChartSettings = {
  autoscale: true,
  xAxis: true,
  yAxis: true,
  horizontalGrid: true,
  verticalGrid: false,
  annotations: false,
  bothOutcomes: false,
}

export type ChartSettings = typeof defaultChartSettings
export type ChartSettingKey = keyof ChartSettings

interface EventChartControlsProps {
  timeRanges: TimeRange[]
  activeTimeRange: TimeRange
  onTimeRangeChange: (value: TimeRange) => void
  showOutcomeSwitch: boolean
  oppositeOutcomeLabel: string
  onShuffle: () => void
  settings: ChartSettings
  onSettingsChange: Dispatch<SetStateAction<ChartSettings>>
  onExportData?: () => void
  onEmbed?: () => void
}

export default function EventChartControls({
  timeRanges,
  activeTimeRange,
  onTimeRangeChange,
  showOutcomeSwitch,
  oppositeOutcomeLabel,
  onShuffle,
  settings,
  onSettingsChange,
  onExportData,
  onEmbed,
}: EventChartControlsProps) {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const settingItems: Array<{ key: ChartSettingKey, label: string }> = [
    { key: 'autoscale', label: 'Autoscale' },
    { key: 'xAxis', label: 'X-Axis' },
    { key: 'yAxis', label: 'Y-Axis' },
    { key: 'horizontalGrid', label: 'Horizontal Grid' },
    { key: 'verticalGrid', label: 'Vertical Grid' },
    { key: 'annotations', label: 'Annotations' },
    { key: 'bothOutcomes', label: 'Both Outcomes' },
  ]

  return (
    <div className="flex flex-wrap items-center justify-end gap-3">
      <div
        className="flex flex-wrap items-center justify-start gap-2 text-xs font-semibold"
      >
        {timeRanges.map(range => (
          <button
            key={range}
            type="button"
            className={cn(
              'relative px-2 py-1 transition-colors',
              activeTimeRange === range
                ? 'text-foreground'
                : 'text-muted-foreground',
            )}
            data-range={range}
            onClick={() => onTimeRangeChange(range)}
            aria-pressed={activeTimeRange === range}
          >
            {range}
          </button>
        ))}
      </div>

      {showOutcomeSwitch && (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className={
                `
                  flex items-center justify-center rounded-md px-2 py-1 text-xs font-semibold text-muted-foreground
                  transition-colors
                  hover:text-foreground
                `
              }
              onClick={onShuffle}
              aria-label={`Switch to ${oppositeOutcomeLabel}`}
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
            Switch to
            {' '}
            {oppositeOutcomeLabel}
          </TooltipContent>
        </Tooltip>
      )}

      <DropdownMenu open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={`
              flex items-center justify-center rounded-md px-2 py-1 text-xs font-semibold text-muted-foreground
              transition-colors
              hover:text-foreground
            `}
            aria-label="Chart settings"
          >
            <SettingsIcon className="size-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          side="bottom"
          align="end"
          sideOffset={8}
          collisionPadding={16}
          className="w-52 border border-border bg-background p-3 text-sm font-semibold text-foreground shadow-xl"
        >
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-2">
              <button
                type="button"
                className="flex items-center gap-2 text-foreground transition-colors hover:text-foreground/80"
                onClick={() => {
                  onEmbed?.()
                  setSettingsOpen(false)
                }}
              >
                <CodeXmlIcon className="size-4" />
                <span>Embed</span>
              </button>
              <button
                type="button"
                className="flex items-center gap-2 text-foreground transition-colors hover:text-foreground/80"
                onClick={() => {
                  onExportData?.()
                  setSettingsOpen(false)
                }}
              >
                <FileTextIcon className="size-4" />
                <span>Export Data</span>
              </button>
            </div>
            <DropdownMenuSeparator className="my-0" />
            <div className="flex flex-col gap-2">
              {settingItems.map((item) => {
                const settingId = `chart-setting-${item.key}`
                return (
                  <label
                    key={item.key}
                    htmlFor={settingId}
                    className={`
                      flex items-center justify-between gap-4 text-foreground transition-colors
                      hover:text-foreground/80
                    `}
                  >
                    <span>{item.label}</span>
                    <Switch
                      id={settingId}
                      checked={settings[item.key]}
                      onCheckedChange={value => onSettingsChange(prev => ({ ...prev, [item.key]: value }))}
                    />
                  </label>
                )
              })}
            </div>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
