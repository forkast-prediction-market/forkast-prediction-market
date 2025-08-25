import { useAppKit } from '@reown/appkit/react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { useBalance } from '@/hooks/useBalance'

export default function HeaderPortfolio() {
  const { open } = useAppKit()
  const { balance } = useBalance()

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
            {balance?.data?.balance || '0.00'}
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
          {balance?.data?.balance || '0.00'}
        </div>
      </Button>
    </div>
  )
}
