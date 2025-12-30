import type { ReactNode } from 'react'
import { sanitizeSvg } from '@/lib/utils'

interface PredictionChartHeaderProps {
  shouldRenderLegend: boolean
  legendContent?: ReactNode
  shouldRenderWatermark: boolean
  watermark?: { iconSvg?: string | null, label?: string | null }
}

export default function PredictionChartHeader({
  shouldRenderLegend,
  legendContent,
  shouldRenderWatermark,
  watermark,
}: PredictionChartHeaderProps) {
  if (!shouldRenderLegend && !shouldRenderWatermark) {
    return null
  }

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex-1">
        {shouldRenderLegend ? legendContent : null}
      </div>

      {shouldRenderWatermark && (
        <div className="flex items-center gap-1 self-end text-muted-foreground opacity-50 select-none lg:self-auto">
          {watermark?.iconSvg
            ? (
                <div
                  className="size-6 **:fill-current **:stroke-current"
                  dangerouslySetInnerHTML={{ __html: sanitizeSvg(watermark.iconSvg) }}
                />
              )
            : null}
          {watermark?.label
            ? (
                <span className="text-xl font-medium">
                  {watermark.label}
                </span>
              )
            : null}
        </div>
      )}
    </div>
  )
}
