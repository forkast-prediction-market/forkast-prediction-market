'use client'

import type { User } from '@/types'
import { useMemo } from 'react'
import { useTabNavigation } from '@/hooks/useTabNavigation'
import SettingsExportPrivateKeyTab from './SettingsExportPrivateKeyTab'
import SettingsNotificationsTab from './SettingsNotificationsTab'
import SettingsProfileTab from './SettingsProfileTab'
import SettingsSidebar from './SettingsSidebar'
import SettingsTwoFactorAuthTab from './SettingsTwoFactorAuthTab'

interface Props {
  user: User
  initialTab: string
}

export default function SettingsContent({ user, initialTab }: Props) {
  const { activeTab, handleTabChange, isPending } = useTabNavigation({
    defaultTab: 'profile',
    initialTab,
  })

  const content = useMemo(() => {
    switch (activeTab) {
      case 'notifications':
        return <SettingsNotificationsTab user={user} />
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
      <SettingsSidebar
        user={user}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        isLoading={isPending}
      />
      <div className="mx-auto max-w-2xl lg:mx-0">
        {content}
      </div>
    </>
  )
}
