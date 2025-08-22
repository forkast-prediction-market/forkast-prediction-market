import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/db/users'
import SettingsContent from './_components/SettingsContent'

export const metadata: Metadata = {
  title: 'Settings',
}

export default async function SettingsPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/')
  }

  return (
    <main className="container py-8">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-8 lg:grid-cols-[240px_1fr] lg:gap-16">
          <SettingsContent user={user} />
        </div>
      </div>
    </main>
  )
}
