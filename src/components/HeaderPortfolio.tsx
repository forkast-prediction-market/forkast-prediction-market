import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useBalance } from '@/hooks/useBalance'
import { usePortfolioValue } from '@/hooks/usePortfolioValue'

export default function HeaderPortfolio() {
  const { isLoadingBalance, balance } = useBalance()
  const { isLoading, value: positionsValue } = usePortfolioValue()
  const isInitialLoading = isLoadingBalance || isLoading
  const [hasLoaded, setHasLoaded] = useState(!isInitialLoading)
  useEffect(() => {
    if (!isInitialLoading) {
      setHasLoaded(true)
    }
  }, [isInitialLoading])
  const isLoadingValue = !hasLoaded
  const totalPortfolioValue = (positionsValue ?? 0) + (balance?.raw ?? 0)
  const formattedPortfolioValue = Number.isFinite(totalPortfolioValue)
    ? totalPortfolioValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '0.00'

  if (isLoadingValue) {
    return (
      <div className="flex gap-2">
        <Skeleton className="h-9 w-20 lg:block" />
        <Skeleton className="h-9 w-20 lg:block" />
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2">
      <Button
        variant="ghost"
        className="flex flex-col gap-0"
        asChild
      >
        <Link href="/portfolio">
          <div className="text-xs font-medium text-muted-foreground">Portfolio</div>
          <div className="text-sm font-semibold text-green-600 dark:text-green-400">
            $
            {formattedPortfolioValue}
          </div>
        </Link>
      </Button>

      <Button
        variant="ghost"
        className="flex flex-col gap-0"
        asChild
      >
        <Link href="/portfolio">
          <div className="text-xs font-medium text-muted-foreground">Cash</div>
          <div className="text-sm font-semibold text-green-600 dark:text-green-400">
            $
            {balance.text}
          </div>
        </Link>
      </Button>
    </div>
  )
}
