'use client'

import type { User } from '@/types'
import Form from 'next/form'
import { startTransition, useOptimistic, useRef, useState } from 'react'
import { InputError } from '@/components/ui/input-error'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { updateNotificationPreferencesAction } from '../actions/update-notifications-preferences'

interface NotificationSettings {
  email_resolutions: boolean
  inapp_order_fills: boolean
  inapp_hide_small_fills: boolean
  inapp_resolutions: boolean
}

export default function SettingsNotificationsTab({ user }: { user: User }) {
  const [status, setStatus] = useState<{ error: string } | null>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const initialSettings = user.settings?.notifications ?? {
    email_resolutions: false,
    inapp_order_fills: false,
    inapp_hide_small_fills: false,
    inapp_resolutions: false,
  }

  const [optimisticSettings, updateOptimisticSettings] = useOptimistic<
    NotificationSettings,
    Partial<NotificationSettings>
  >(
    initialSettings as NotificationSettings,
    (state, newSettings) => ({
      ...state,
      ...newSettings,
    }),
  )

  function handleSwitchChange(field: keyof NotificationSettings, checked: boolean) {
    const prev = optimisticSettings // snapshot before optimistic update

    startTransition(() => {
      updateOptimisticSettings({ [field]: checked })
    })

    queueMicrotask(async () => {
      const result = await updateNotificationPreferencesAction(
        new FormData(formRef.current!),
      )

      if (result?.error) {
        startTransition(() => {
          updateOptimisticSettings(prev)
        })
        setStatus(result)
      }
      else {
        setStatus(null)
      }
    })
  }

  return (
    <div className="grid gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Notifications</h1>
        <p className="mt-2 text-muted-foreground">
          Configure how you receive notifications.
        </p>
      </div>

      {status?.error && <InputError message={status.error} />}

      <Form ref={formRef} action={() => {}} className="grid gap-6">
        <input
          type="hidden"
          name="email_resolutions"
          value={optimisticSettings?.email_resolutions ? 'on' : 'off'}
        />
        <input
          type="hidden"
          name="inapp_order_fills"
          value={optimisticSettings?.inapp_order_fills ? 'on' : 'off'}
        />
        <input
          type="hidden"
          name="inapp_hide_small_fills"
          value={optimisticSettings?.inapp_hide_small_fills ? 'on' : 'off'}
        />
        <input
          type="hidden"
          name="inapp_resolutions"
          value={optimisticSettings?.inapp_resolutions ? 'on' : 'off'}
        />

        <div className="rounded-lg border p-6">
          <div className="grid gap-4">
            <h3 className="text-lg font-medium">Email</h3>

            <div className="flex items-center justify-between">
              <div className="grid gap-1">
                <Label htmlFor="email-resolutions" className="text-sm font-medium">
                  Resolutions
                </Label>
                <p className="text-sm text-muted-foreground">
                  Get notified when markets are resolved
                </p>
              </div>
              <Switch
                id="email-resolutions"
                checked={optimisticSettings?.email_resolutions}
                onCheckedChange={checked => handleSwitchChange('email_resolutions', checked)}
              />
            </div>
          </div>
        </div>

        <div className="rounded-lg border p-6">
          <div className="grid gap-4">
            <h3 className="text-lg font-medium">In-app</h3>

            <div className="grid gap-4">
              <div className="flex items-center justify-between">
                <div className="grid gap-1">
                  <Label htmlFor="inapp-order-fills" className="text-sm font-medium">
                    Order Fills
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Get notified when your orders are filled
                  </p>
                </div>
                <Switch
                  id="inapp-order-fills"
                  checked={optimisticSettings?.inapp_order_fills}
                  onCheckedChange={checked => handleSwitchChange('inapp_order_fills', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="grid gap-1">
                  <Label htmlFor="inapp-hide-small" className="text-sm font-medium">
                    Hide small fills (&lt;1 share)
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Don't notify for fills smaller than 1 share
                  </p>
                </div>
                <Switch
                  id="inapp-hide-small"
                  checked={optimisticSettings?.inapp_hide_small_fills}
                  onCheckedChange={checked => handleSwitchChange('inapp_hide_small_fills', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="grid gap-1">
                  <Label htmlFor="inapp-resolutions" className="text-sm font-medium">
                    Resolutions
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Get notified when markets are resolved
                  </p>
                </div>
                <Switch
                  id="inapp-resolutions"
                  checked={optimisticSettings?.inapp_resolutions}
                  onCheckedChange={checked => handleSwitchChange('inapp_resolutions', checked)}
                />
              </div>
            </div>
          </div>
        </div>
      </Form>
    </div>
  )
}
