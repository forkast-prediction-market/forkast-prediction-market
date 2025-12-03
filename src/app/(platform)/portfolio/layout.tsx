'use cache: private'

import PublicProfileHeroCards from '@/app/(platform)/[username]/_components/PublicProfileHeroCards'
import PortfolioMarketsWonCard from '@/app/(platform)/portfolio/_components/PortfolioMarketsWonCard'
import { UserRepository } from '@/lib/db/queries/user'
import { fetchPortfolioSnapshot } from '@/lib/portfolio'

export default async function PortfolioLayout({ children }: LayoutProps<'/portfolio'>) {
  const user = await UserRepository.getCurrentUser()
  const proxyAddress = user?.proxy_wallet_address ?? user?.address
  const snapshot = await fetchPortfolioSnapshot(proxyAddress)

  return (
    <main className="container py-8">
      <div className="mx-auto grid max-w-4xl gap-6">
        <PublicProfileHeroCards
          profile={{
            username: user?.username ?? 'Your portfolio',
            avatarUrl: user?.image ?? `https://avatar.vercel.sh/${user?.address ?? 'user'}.png`,
            joinedAt: (user as any)?.created_at?.toString?.() ?? (user as any)?.createdAt?.toString?.(),
            address: proxyAddress ?? undefined,
          }}
          snapshot={snapshot}
        />

        <PortfolioMarketsWonCard />

        {children}
      </div>
    </main>
  )
}
