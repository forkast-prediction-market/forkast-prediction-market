import type { Metadata } from 'next'
import ProfilePageContent from '@/components/profile/ProfilePageContent'

interface PageProps {
  params: Promise<{
    handle: string
  }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { handle } = await params
  const decodedHandle = decodeURIComponent(handle)

  // Basic title based on handle
  const isUsername = decodedHandle.startsWith('@')
  const displayName = isUsername ? decodedHandle : `${decodedHandle.slice(0, 6)}...${decodedHandle.slice(-4)}`

  return {
    title: `${displayName} - Profile`,
  }
}

export default async function ProfilePage({ params }: PageProps) {
  const { handle } = await params
  const decodedHandle = decodeURIComponent(handle)

  return <ProfilePageContent handle={decodedHandle} />
}
