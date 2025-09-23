'use client'

import Form from 'next/form'
import { startTransition, useOptimistic, useRef, useState } from 'react'
import QRCode from 'react-qr-code'
import { enableTwoFactorAction } from '@/app/settings/actions/enable-two-factor'
import { InputError } from '@/components/ui/input-error'
import { Switch } from '@/components/ui/switch'
import { useUser } from '@/stores/useUser'

interface TwoFactorSettings {
  two_factor_enabled: boolean
}

export default function SettingsTwoFactorAuthTab() {
  const user = useUser()
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false)
  const [status, setStatus] = useState<any | null>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const initialSettings = {
    two_factor_enabled: user?.two_factor_enabled || false,
  }

  const [optimisticSettings, updateOptimisticSettings] = useOptimistic<
    TwoFactorSettings,
    Partial<TwoFactorSettings>
  >(
    initialSettings as TwoFactorSettings,
    (state, newSettings) => ({
      ...state,
      ...newSettings,
    }),
  )

  function handleSwitchChange(field: keyof TwoFactorSettings, checked: boolean) {
    const prev = optimisticSettings

    startTransition(() => {
      updateOptimisticSettings({ [field]: checked })
    })

    queueMicrotask(async () => {
      const result = await enableTwoFactorAction()

      if ('error' in result) {
        startTransition(() => {
          updateOptimisticSettings(prev)
        })
        setStatus(result)
      }
      else {
        setTwoFactorEnabled(true)
        setStatus(result)
      }
    })
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Two-Factor Authentication</h1>
        <p className="mt-2 text-muted-foreground">
          Add an extra layer of security to your account.
        </p>
      </div>

      {status?.error && <InputError message={status.error} />}

      <Form ref={formRef} action={() => {}} className="space-y-6">
        <input
          type="hidden"
          name="email_resolutions"
          value={optimisticSettings?.two_factor_enabled ? 'on' : 'off'}
        />
        <div className="rounded-lg border p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="text-lg font-medium">Enable 2FA</h3>
              <p className="text-sm text-muted-foreground">
                Add an extra layer of security to your account using an authenticator app
              </p>
            </div>
            <Switch
              checked={optimisticSettings?.two_factor_enabled}
              onCheckedChange={checked => handleSwitchChange('two_factor_enabled', checked)}
            />
          </div>
        </div>

        {twoFactorEnabled && (
          <div className="rounded-lg border bg-muted/50 p-6">
            <div className="space-y-4">
              <h4 className="font-medium">Setup Instructions</h4>
              <ol className="space-y-2 text-sm text-muted-foreground">
                <li className="flex">
                  <span className="mr-2 font-medium">1.</span>
                  Download an authenticator app like Google Authenticator or Authy
                </li>
                <li className="flex">
                  <span className="mr-2 font-medium">2.</span>
                  Scan the QR code with your authenticator app
                </li>
                <li className="flex">
                  <span className="mr-2 font-medium">3.</span>
                  Enter the 6-digit code from your app to complete setup
                </li>
              </ol>
            </div>

            <div className="mt-6">
              <QRCode value={status?.totpURI || ''} />
            </div>
          </div>
        )}
      </Form>
    </div>
  )
}
