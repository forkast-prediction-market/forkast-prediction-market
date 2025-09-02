import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import React from 'react'
import { UserModel } from '@/lib/db/users'
import SettingsContent from './_components/SettingsContent'

export const metadata: Metadata = {
  title: 'Settings',
}

interface Props {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function SettingsPage({ searchParams }: Props) {
  const user = await UserModel.getCurrentUser()
  const params = await searchParams
  const tab = (params.tab as string) ?? 'profile'

  if (!user) {
    redirect('/')
  }

  return <SettingsContent user={user} tab={tab} />
}
