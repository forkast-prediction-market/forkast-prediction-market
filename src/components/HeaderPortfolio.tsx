import { useAppKit } from '@reown/appkit/react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useBalance } from '@/hooks/useBalance'

export default function HeaderPortfolio() {
  const { open } = useAppKit()
  const { isLoadingBalance, balance } = useBalance()

  if (isLoadingBalance) {
    return (
      <div className="flex gap-2">
        <Skeleton className="hidden h-9 w-20 lg:block" />
        <Skeleton className="hidden h-9 w-20 lg:block" />
      </div>
    )
  }

  return (
    <div className="hidden items-center lg:flex">
      <Link href="/portfolio">
        <Button
          type="button"
          variant="ghost"
          className="flex flex-col gap-0"
        >
          <div className="text-xs font-medium text-muted-foreground">Portfolio</div>
          <div className="text-sm font-semibold text-primary">
            $
            {balance.text}
          </div>
        </Button>
      </Link>

      <Button
        type="button"
        variant="ghost"
        className="flex flex-col gap-0"
        onClick={() => open()}
      >
        <div className="text-xs font-medium text-muted-foreground">Cash</div>
        <div className="text-sm font-semibold text-primary">
          $
          {balance.text}
        </div>
      </Button>
    </div>
  )
}
