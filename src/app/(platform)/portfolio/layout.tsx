import { Suspense } from 'react'
import PortfolioLayoutContent from '@/app/(platform)/portfolio/_components/PortfolioLayoutContent'
import PortfolioLayoutSkeleton from '@/app/(platform)/portfolio/_components/PortfolioLayoutSkeleton'

export default function PortfolioLayout({ children }: LayoutProps<'/portfolio'>) {
  return (
    <Suspense fallback={<PortfolioLayoutSkeleton />}>
      <PortfolioLayoutContent>{children}</PortfolioLayoutContent>
    </Suspense>
  )
}
