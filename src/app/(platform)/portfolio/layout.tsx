'use cache: private'

import PublicProfileHeroCards from '@/app/(platform)/[username]/_components/PublicProfileHeroCards'
import PortfolioMarketsWonCard from '@/app/(platform)/portfolio/_components/PortfolioMarketsWonCard'
import PortfolioWalletActions from '@/app/(platform)/portfolio/_components/PortfolioWalletActions'
import { UserRepository } from '@/lib/db/queries/user'
import { fetchPortfolioSnapshot } from '@/lib/portfolio'

export default async function PortfolioLayout({ children }: LayoutProps<'/portfolio'>) {
  const user = await UserRepository.getCurrentUser()
  const snapshotAddress = user?.proxy_wallet_address
  const publicAddress = user?.proxy_wallet_address ?? null
  const snapshot = await fetchPortfolioSnapshot(snapshotAddress)

  return (
    <main className="container py-8">
      <div className="mx-auto grid max-w-4xl gap-6">
        <PublicProfileHeroCards
          profile={{
            username: user?.username ?? 'Your portfolio',
            avatarUrl: user?.image ?? `https://avatar.vercel.sh/${publicAddress ?? user?.id ?? 'user'}.png`,
            joinedAt: (user as any)?.created_at?.toString?.() ?? (user as any)?.createdAt?.toString?.(),
            portfolioAddress: publicAddress ?? undefined,
          }}
          snapshot={snapshot}
          actions={<PortfolioWalletActions />}
        />

        <PortfolioMarketsWonCard />

        {children}
      </div>
    </main>
  )
}
