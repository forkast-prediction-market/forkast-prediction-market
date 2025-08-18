import { mockUser } from '@/lib/mockData'

export default function HeaderPortfolio() {
  return (
    <div className="hidden items-center gap-6 text-xs lg:flex">
      <a
        href="/portfolio"
        className="rounded-lg p-2 text-center transition-colors hover:bg-black/5 dark:hover:bg-white/5"
      >
        <div className="font-medium text-muted-foreground">Portfolio</div>
        <div className="text-sm font-semibold text-primary">
          $
          {mockUser.portfolio.toLocaleString('en-US', {
            minimumFractionDigits: 2,
          })}
        </div>
      </a>
      <a
        href="/portfolio"
        className="rounded-lg p-2 text-center transition-colors hover:bg-black/5 dark:hover:bg-white/5"
      >
        <div className="font-medium text-muted-foreground">Cash</div>
        <div className="text-sm font-semibold text-primary">
          $
          {mockUser.cash.toLocaleString('en-US', {
            minimumFractionDigits: 2,
          })}
        </div>
      </a>
    </div>
  )
}
