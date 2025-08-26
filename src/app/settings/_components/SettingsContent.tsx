'use client'

import type { User } from '@/types'
import { useMemo } from 'react'
import SettingsExportPrivateKeyTab from './SettingsExportPrivateKeyTab'
import SettingsNotificationsTab from './SettingsNotificationsTab'
import SettingsProfileTab from './SettingsProfileTab'
import SettingsSidebar from './SettingsSidebar'
import SettingsTwoFactorAuthTab from './SettingsTwoFactorAuthTab'

interface Props {
  user: User
  tab: string
}

export default function SettingsContent({ user, tab }: Props) {
  const content = useMemo(() => {
    switch (tab) {
      case 'notifications':
        return <SettingsNotificationsTab user={user} />
      case 'two-factor':
        return <SettingsTwoFactorAuthTab />
      case 'export-key':
        return <SettingsExportPrivateKeyTab />
      default:
        return <SettingsProfileTab user={user} />
    }
  }, [user, tab])

  return (
    <>
      <SettingsSidebar user={user} tab={tab} />
      <div className="mx-auto max-w-2xl lg:mx-0">
        {content}
      </div>
    </>
  )
}
