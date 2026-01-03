import type { Metadata } from 'next'
import PublicProfileHeroCards from '@/app/(platform)/[username]/_components/PublicProfileHeroCards'
import PublicProfileTabs from '@/app/(platform)/[username]/_components/PublicProfileTabs'
import PortfolioMarketsWonCard from '@/app/(platform)/portfolio/_components/PortfolioMarketsWonCard'
import PortfolioWalletActions from '@/app/(platform)/portfolio/_components/PortfolioWalletActions'
import { UserRepository } from '@/lib/db/queries/user'
import { fetchPortfolioSnapshot } from '@/lib/portfolio'

export const metadata: Metadata = {
  title: 'Portfolio',
}

export default async function PortfolioPage() {
  const user = await UserRepository.getCurrentUser()
  const userAddress = user?.proxy_wallet_address ?? ''
  const snapshotAddress = user?.proxy_wallet_address
  const publicAddress = user?.proxy_wallet_address ?? null
  const snapshot = await fetchPortfolioSnapshot(snapshotAddress)

  return (
    <>
      <PublicProfileHeroCards
        profile={{
          username: user?.username ?? 'Your portfolio',
          avatarUrl: user?.image ?? `https://avatar.vercel.sh/${publicAddress ?? user?.id ?? 'user'}.png`,
          joinedAt: (user as any)?.created_at?.toString?.() ?? (user as any)?.createdAt?.toString?.(),
          portfolioAddress: publicAddress ?? undefined,
        }}
        snapshot={snapshot}
        actions={<PortfolioWalletActions />}
        variant="portfolio"
      />

      <PortfolioMarketsWonCard proxyWalletAddress={publicAddress} />

      <PublicProfileTabs userAddress={userAddress} />
    </>
  )
}
