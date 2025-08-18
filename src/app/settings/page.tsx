'use client'

import { useMemo, useState } from 'react'
import SettingsSidebar from '@/app/settings/_components/SettingsSidebar'
import ExportPrivateKey from './_components/ExportPrivateKey'
import NotificationsSettings from './_components/NotificationsSettings'
import ProfileSettings from './_components/ProfileSettings'
import TwoFactorAuth from './_components/TwoFactorAuth'

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('profile')
  const content = useMemo(() => {
    switch (activeTab) {
      case 'profile':
        return <ProfileSettings />
      case 'notifications':
        return <NotificationsSettings />
      case 'two-factor':
        return <TwoFactorAuth />
      case 'export-key':
        return <ExportPrivateKey />
      default:
        return <ProfileSettings />
    }
  }, [activeTab])

  return (
    <>
      <SettingsSidebar activeTab={activeTab} onTabChange={setActiveTab} />
      <div className="mx-auto max-w-2xl lg:mx-0">
        {content}
      </div>
    </>
  )
}
