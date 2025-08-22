'use client'

import type { User } from '@/types'
import { useMemo, useState } from 'react'
import SettingsExportPrivateKeyTab from '@/app/settings/_components/SettingsExportPrivateKeyTab'
import SettingsNotificationsTab from '@/app/settings/_components/SettingsNotificationsTab'
import SettingsProfileTab from '@/app/settings/_components/SettingsProfileTab'
import SettingsSidebar from '@/app/settings/_components/SettingsSidebar'
import SettingsTwoFactorAuthTab from '@/app/settings/_components/SettingsTwoFactorAuthTab'

export default function SettingsTabsClientComponent({ user }: { user: User }) {
  const [activeTab, setActiveTab] = useState('profile')
  const content = useMemo(() => {
    switch (activeTab) {
      case 'notifications':
        return <SettingsNotificationsTab />
      case 'two-factor':
        return <SettingsTwoFactorAuthTab />
      case 'export-key':
        return <SettingsExportPrivateKeyTab />
      default:
        return <SettingsProfileTab user={user} />
    }
  }, [activeTab, user])

  return (
    <>
      <SettingsSidebar user={user} activeTab={activeTab} onTabChange={setActiveTab} />
      <div className="mx-auto max-w-2xl lg:mx-0">
        {content}
      </div>
    </>
  )
}
