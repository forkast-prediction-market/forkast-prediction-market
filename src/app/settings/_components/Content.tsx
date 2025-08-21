'use client'

import type { User } from '@/types'
import { useMemo, useState } from 'react'
import ExportPrivateKey from '@/app/settings/_components/ExportPrivateKey'
import NotificationsSettings from '@/app/settings/_components/NotificationsSettings'
import ProfileSettings from '@/app/settings/_components/ProfileSettings'
import SettingsSidebar from '@/app/settings/_components/SettingsSidebar'
import TwoFactorAuth from '@/app/settings/_components/TwoFactorAuth'

export default function Content({ user }: { user: User }) {
  const [activeTab, setActiveTab] = useState('profile')
  const content = useMemo(() => {
    switch (activeTab) {
      case 'notifications':
        return <NotificationsSettings />
      case 'two-factor':
        return <TwoFactorAuth />
      case 'export-key':
        return <ExportPrivateKey />
      default:
        return <ProfileSettings user={user} />
    }
  }, [activeTab, user])

  return (
    <>
      <SettingsSidebar activeTab={activeTab} onTabChange={setActiveTab} />
      <div className="mx-auto max-w-2xl lg:mx-0">
        {content}
      </div>
    </>
  )
}
