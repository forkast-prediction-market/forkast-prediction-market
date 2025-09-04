import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import SettingsContent from '@/app/settings/_components/SettingsContent'
import { UserModel } from '@/lib/db/users'

export const metadata: Metadata = {
  title: 'Settings',
}

export default async function SettingsPage({ searchParams }: PageProps<'/settings'>) {
  const user = await UserModel.getCurrentUser()
  const params = await searchParams
  const tab = (params.tab as string) ?? 'profile'

  if (!user) {
    redirect('/')
  }

  return <SettingsContent user={user} tab={tab} />
}
