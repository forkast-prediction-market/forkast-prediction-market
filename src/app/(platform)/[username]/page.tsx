import type { Metadata } from 'next'
import PublicProfileContent from '@/app/(platform)/[username]/_components/PublicProfileContent'
import { truncateAddress } from '@/lib/utils'

export async function generateMetadata({ params }: PageProps<'/[username]'>): Promise<Metadata> {
  const { username } = await params

  const isUsername = username.startsWith('@')
  const displayName = isUsername ? username : truncateAddress(username)

  return {
    title: `${displayName} - Profile`,
  }
}

export default async function ProfilePage({ params }: PageProps<'/[username]'>) {
  const { username } = await params

  return <PublicProfileContent username={username} />
}
