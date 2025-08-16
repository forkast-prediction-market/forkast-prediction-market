'use client'

import { useState } from 'react'
import { Switch } from '@/components/ui/switch'

export default function NotificationsSettings() {
  const [emailSettings, setEmailSettings] = useState({
    resolutions: false,
  })

  const [inAppSettings, setInAppSettings] = useState({
    orderFills: true,
    hideSmallFills: false,
    resolutions: true,
  })

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Notifications</h1>
        <p className="mt-2 text-muted-foreground">
          Configure how you receive notifications.
        </p>
      </div>

      <div className="space-y-6">
        {/* Email Notifications */}
        <div className="rounded-lg border p-6">
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Email</h3>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <label htmlFor="email-resolutions" className="text-sm font-medium">
                  Resolutions
                </label>
                <p className="text-sm text-muted-foreground">
                  Get notified when markets are resolved
                </p>
              </div>
              <Switch
                id="email-resolutions"
                checked={emailSettings.resolutions}
                onCheckedChange={checked =>
                  setEmailSettings(prev => ({ ...prev, resolutions: checked }))}
              />
            </div>
          </div>
        </div>

        {/* In-App Notifications */}
        <div className="rounded-lg border p-6">
          <div className="space-y-4">
            <h3 className="text-lg font-medium">In-app</h3>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <label htmlFor="inapp-order-fills" className="text-sm font-medium">
                    Order Fills
                  </label>
                  <p className="text-sm text-muted-foreground">
                    Get notified when your orders are filled
                  </p>
                </div>
                <Switch
                  id="inapp-order-fills"
                  checked={inAppSettings.orderFills}
                  onCheckedChange={checked =>
                    setInAppSettings(prev => ({ ...prev, orderFills: checked }))}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <label htmlFor="inapp-hide-small" className="text-sm font-medium">
                    Hide small fills (&lt;1 share)
                  </label>
                  <p className="text-sm text-muted-foreground">
                    Don't notify for fills smaller than 1 share
                  </p>
                </div>
                <Switch
                  id="inapp-hide-small"
                  checked={inAppSettings.hideSmallFills}
                  onCheckedChange={checked =>
                    setInAppSettings(prev => ({ ...prev, hideSmallFills: checked }))}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <label htmlFor="inapp-resolutions" className="text-sm font-medium">
                    Resolutions
                  </label>
                  <p className="text-sm text-muted-foreground">
                    Get notified when markets are resolved
                  </p>
                </div>
                <Switch
                  id="inapp-resolutions"
                  checked={inAppSettings.resolutions}
                  onCheckedChange={checked =>
                    setInAppSettings(prev => ({ ...prev, resolutions: checked }))}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
