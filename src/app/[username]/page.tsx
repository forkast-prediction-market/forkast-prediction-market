'use cache'

import type { Metadata } from 'next'
import React, { Suspense } from 'react'
import { truncateAddress } from '@/lib/utils'
import PublicProfileContent from './_components/PublicProfileContent'
import PublicProfileSkeleton from './_components/PublicProfileSkeleton'

interface PageProps {
  params: Promise<{
    username: string
  }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { username } = await params

  const isUsername = username.startsWith('@')
  const displayName = isUsername ? username : truncateAddress(username)

  return {
    title: `${displayName} - Profile`,
  }
}

export default async function ProfilePage({ params }: PageProps) {
  const { username } = await params

  return (
    <main className="container py-8">
      <div className="mx-auto grid max-w-4xl gap-12">
        <Suspense fallback={<PublicProfileSkeleton />}>
          <PublicProfileContent username={username} />
        </Suspense>
      </div>
    </main>
  )
}
