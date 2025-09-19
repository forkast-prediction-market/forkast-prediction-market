'use client'

import type { User } from '@/types'
import { useMemo } from 'react'
import SettingsAffiliateTab from '@/app/settings/_components/SettingsAffiliateTab'
import SettingsExportPrivateKeyTab from '@/app/settings/_components/SettingsExportPrivateKeyTab'
import SettingsNotificationsTab from '@/app/settings/_components/SettingsNotificationsTab'
import SettingsProfileTab from '@/app/settings/_components/SettingsProfileTab'
import SettingsSidebar from '@/app/settings/_components/SettingsSidebar'
import SettingsTwoFactorAuthTab from '@/app/settings/_components/SettingsTwoFactorAuthTab'

interface Props {
  user: User
  tab: string
}

export default function SettingsContent({ user, tab }: Props) {
  const content = useMemo(() => {
    switch (tab) {
      case 'affiliate':
        return <SettingsAffiliateTab />
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
      <div className="mx-auto max-w-2xl lg:mx-0">{content}</div>
    </>
  )
}
