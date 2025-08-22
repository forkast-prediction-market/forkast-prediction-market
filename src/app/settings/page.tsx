import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import React from 'react'
import SettingsTabsClientComponent from '@/app/settings/_components/SettingsTabsClientComponent'
import { getCurrentUser } from '@/lib/db/users'

export const metadata: Metadata = {
  title: 'Settings',
}

export default async function SettingsPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/')
  }

  return <SettingsTabsClientComponent user={user} />
}
