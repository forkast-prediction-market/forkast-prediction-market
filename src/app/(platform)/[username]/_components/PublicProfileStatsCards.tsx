'use client'

import type { PublicProfileStats } from '@/types'
import { ActivityIcon, BarChart2Icon, CheckCircle2Icon, TrendingDownIcon, TrendingUpIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  stats: PublicProfileStats
}

interface StatCardProps {
  icon: React.ElementType
  label: string
  value: string
  isProfit?: boolean
}

function StatCard({ icon: Icon, label, value, isProfit }: StatCardProps) {
  return (
    <div className="space-y-3 rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-full bg-muted">
          <Icon className="size-5 text-muted-foreground" />
        </div>
        <div className="flex-1">
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            {label}
          </p>
        </div>
      </div>
      <div className={cn(
        'text-2xl font-bold',
        isProfit !== undefined && (isProfit ? 'text-yes' : 'text-no'),
      )}
      >
        {value}
      </div>
    </div>
  )
}

export default function PublicProfileStatsCards({ stats }: Props) {
  function formatCurrency(amount: number) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  }

  const profitLossIcon = stats.profit_loss >= 0 ? TrendingUpIcon : TrendingDownIcon
  const isProfitable = stats.profit_loss >= 0

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatCard
        icon={ActivityIcon}
        label="Positions value"
        value={formatCurrency(stats.positions_value)}
      />

      <StatCard
        icon={profitLossIcon}
        label="Profit/loss"
        value={formatCurrency(stats.profit_loss)}
        isProfit={isProfitable}
      />

      <StatCard
        icon={BarChart2Icon}
        label="Volume traded"
        value={formatCurrency(stats.volume_traded)}
      />

      <StatCard
        icon={CheckCircle2Icon}
        label="Markets traded"
        value={stats.markets_traded.toString()}
      />
    </div>
  )
}
