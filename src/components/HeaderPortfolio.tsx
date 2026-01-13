import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useBalance } from '@/hooks/useBalance'
import { usePortfolioValue } from '@/hooks/usePortfolioValue'

export default function HeaderPortfolio() {
  const { balance, isLoadingBalance } = useBalance()
  const { isLoading, value: positionsValue } = usePortfolioValue()
  const isLoadingValue = isLoadingBalance || isLoading
  const totalPortfolioValue = (positionsValue ?? 0) + (balance?.raw ?? 0)
  const formattedPortfolioValue = Number.isFinite(totalPortfolioValue)
    ? totalPortfolioValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '0.00'
  const formattedCashValue = Number.isFinite(balance?.raw)
    ? (balance?.raw ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '0.00'

  return (
    <div className="grid grid-cols-2">
      <Button
        variant="ghost"
        className="flex flex-col gap-0"
        asChild
      >
        <Link href="/portfolio">
          <div className="text-xs font-medium text-muted-foreground">Portfolio</div>
          <div className="text-sm font-semibold text-yes">
            {isLoadingValue
              ? <Skeleton className="h-5 w-12" />
              : (
                  <>
                    $
                    {formattedPortfolioValue}
                  </>
                )}
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
          <div className="text-sm font-semibold text-yes">
            {isLoadingValue
              ? <Skeleton className="h-5 w-12" />
              : (
                  <>
                    $
                    {formattedCashValue}
                  </>
                )}
          </div>
        </Link>
      </Button>
    </div>
  )
}
