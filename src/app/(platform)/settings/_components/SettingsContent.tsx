'use client'

import type { AffiliateData, User } from '@/types'
import { useMemo } from 'react'
import SettingsAffiliateTab from '@/app/(platform)/settings/_components/SettingsAffiliateTab'
import SettingsExportPrivateKeyTab from '@/app/(platform)/settings/_components/SettingsExportPrivateKeyTab'
import SettingsNotificationsTab from '@/app/(platform)/settings/_components/SettingsNotificationsTab'
import SettingsProfileTab from '@/app/(platform)/settings/_components/SettingsProfileTab'
import SettingsSidebar from '@/app/(platform)/settings/_components/SettingsSidebar'
import SettingsTwoFactorAuthTab from '@/app/(platform)/settings/_components/SettingsTwoFactorAuthTab'

interface Props {
  user: User
  tab: string
  affiliateData?: AffiliateData
}

export default function SettingsContent({ user, tab, affiliateData }: Props) {
  const content = useMemo(() => {
    switch (tab) {
      case 'affiliate':
        return affiliateData
          ? <SettingsAffiliateTab affiliateData={affiliateData} />
          : (
              <div className="rounded-lg border p-6 text-sm text-muted-foreground">
                Unable to load affiliate information. Please try again later.
              </div>
            )
      case 'notifications':
        return <SettingsNotificationsTab user={user} />
      case 'two-factor':
        return <SettingsTwoFactorAuthTab user={user} />
      case 'export-key':
        return <SettingsExportPrivateKeyTab />
      default:
        return <SettingsProfileTab user={user} />
    }
  }, [affiliateData, tab, user])

  return (
    <>
      <SettingsSidebar user={user} tab={tab} />
      <div className="mx-auto max-w-2xl lg:mx-0">{content}</div>
    </>
  )
}
