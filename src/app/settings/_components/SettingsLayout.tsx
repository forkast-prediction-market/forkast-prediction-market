'use client'

import { useState } from 'react'
import ExportPrivateKey from './ExportPrivateKey'
import NotificationsSettings from './NotificationsSettings'
import ProfileSettings from './ProfileSettings'
import SettingsSidebar from './SettingsSidebar'
import TwoFactorAuth from './TwoFactorAuth'

interface Props {
  defaultTab: string
}

export default function SettingsLayout({ defaultTab }: Props) {
  const [activeTab, setActiveTab] = useState(defaultTab)

  function renderContent() {
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
  }

  return (
    <main className="container py-8">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-8 lg:grid-cols-[240px_1fr] lg:gap-16">
          <SettingsSidebar activeTab={activeTab} onTabChange={setActiveTab} />
          <div className="mx-auto max-w-2xl lg:mx-0">
            {renderContent()}
          </div>
        </div>
      </div>
    </main>
  )
}
