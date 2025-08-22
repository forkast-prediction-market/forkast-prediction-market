import type { ActivityItem } from '@/types'
import { notFound } from 'next/navigation'
import PublicProfileHeader from '@/app/[username]/_components/PublicProfileHeader'
import PublicProfileStatsCards from '@/app/[username]/_components/PublicProfileStatsCards'
import PublicProfileTabs from '@/app/[username]/_components/PublicProfileTabs'
import { getProfileByUsername } from '@/lib/db/users'

interface Props {
  username: string
}

export default async function PublicProfileContent({ username }: Props) {
  const profile = await getProfileByUsername(username)

  if (!profile) {
    notFound()
  }

  const stats = {
    positionsValue: 0.00,
    profitLoss: 0.00,
    volumeTraded: 3.50,
    marketsTraded: 2,
  }

  const activity: ActivityItem[] = [
    {
      id: '1',
      type: 'Buy',
      market: {
        id: 'bitcoin-100k',
        title: 'Will Bitcoin reach $100k by end of 2024?',
        imageUrl: 'https://avatar.vercel.sh/bitcoin.png',
        outcome: 'Yes',
        price: 1, // 1¢
      },
      shares: 1,
      amount: 0.01,
      timestamp: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000), // 18 days ago
      transactionHash: '0x1234567890abcdef1234567890abcdef12345678',
    },
    {
      id: '2',
      type: 'Sell',
      market: {
        id: 'us-election-2024',
        title: 'Will Democrats win the 2024 US Presidential Election?',
        imageUrl: 'https://avatar.vercel.sh/election.png',
        outcome: 'No',
        price: 91, // 91¢
      },
      shares: 0.1,
      amount: 1.00,
      timestamp: new Date(Date.now() - 2 * 30 * 24 * 60 * 60 * 1000), // 2 months ago
      transactionHash: '0xabcdef1234567890abcdef1234567890abcdef12',
    },
  ]

  return (
    <>
      <PublicProfileHeader profile={profile} />
      <PublicProfileStatsCards stats={stats} />
      <PublicProfileTabs activity={activity} />
    </>
  )
}
