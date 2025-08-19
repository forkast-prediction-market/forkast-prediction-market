'use client'

import type { PublicProfile } from '@/types'
import { ActivityIcon, BarChart2Icon, CheckCircle2Icon, TrendingDownIcon, TrendingUpIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  stats: PublicProfile['stats']
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
        isProfit !== undefined && (isProfit ? 'text-green-600' : 'text-red-600'),
      )}
      >
        {value}
      </div>
    </div>
  )
}

export default function StatsCards({ stats }: Props) {
  function formatCurrency(amount: number) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  }

  const profitLossIcon = stats.profitLoss >= 0 ? TrendingUpIcon : TrendingDownIcon
  const isProfitable = stats.profitLoss >= 0

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatCard
        icon={ActivityIcon}
        label="Positions value"
        value={formatCurrency(stats.positionsValue)}
      />

      <StatCard
        icon={profitLossIcon}
        label="Profit/loss"
        value={formatCurrency(stats.profitLoss)}
        isProfit={isProfitable}
      />

      <StatCard
        icon={BarChart2Icon}
        label="Volume traded"
        value={formatCurrency(stats.volumeTraded)}
      />

      <StatCard
        icon={CheckCircle2Icon}
        label="Markets traded"
        value={stats.marketsTraded.toString()}
      />
    </div>
  )
}
