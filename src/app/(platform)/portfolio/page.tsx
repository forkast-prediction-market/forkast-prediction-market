import type { Metadata } from 'next'
import PublicProfileTabs from '@/app/(platform)/[username]/_components/PublicProfileTabs'
import { UserRepository } from '@/lib/db/queries/user'

export const metadata: Metadata = {
  title: 'Portfolio',
}

export default async function PortfolioPage() {
  const user = await UserRepository.getCurrentUser()

  return <PublicProfileTabs userAddress={user.proxy_wallet_address!} />
}
