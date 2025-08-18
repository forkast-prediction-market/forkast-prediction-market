'use client'

import { useRequireConnection } from '@/hooks/useRequireWalletConnection'
import PortfolioSkeleton from './_components/PortfolioSkeleton'

export default function PortfolioLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { isConnected } = useRequireConnection()

  return (
    <main className="container py-4">
      <div className="mx-auto grid max-w-4xl gap-6 px-4">
        {!isConnected && <PortfolioSkeleton />}
        {isConnected && children}
      </div>
    </main>
  )
}
