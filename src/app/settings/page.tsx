import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import React from 'react'
import SettingsContentComponent from '@/app/settings/_components/SettingsContentComponent'
import { getCurrentUser } from '@/lib/db/users'

export const metadata: Metadata = {
  title: 'Settings',
}

export default async function SettingsPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/')
  }

  return <SettingsContentComponent user={user} />
}
