'use client'

import Form from 'next/form'
import { startTransition, useOptimistic, useState } from 'react'
import QRCode from 'react-qr-code'
import { enableTwoFactorAction } from '@/app/settings/actions/enable-two-factor'
import { verifyTotp } from '@/app/settings/actions/verify-totp'
import { Button } from '@/components/ui/button'
import { InputError } from '@/components/ui/input-error'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useUser } from '@/stores/useUser'

interface TwoFactorSettings {
  two_factor_enabled: boolean
  trust_device: boolean
}

export default function SettingsTwoFactorAuthTab() {
  const user = useUser()
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false)
  const [status, setStatus] = useState<any | null>(null)
  const [code, setCode] = useState('')
  const initialSettings = {
    trust_device: false,
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

      <Form action={verifyTotp} className="space-y-6">
        <input
          type="hidden"
          name="two_factor_enabled"
          value={optimisticSettings?.two_factor_enabled ? 'on' : 'off'}
        />
        <input
          type="hidden"
          name="trust_device"
          value={optimisticSettings?.trust_device ? 'on' : 'off'}
        />

        <div className="rounded-lg border p-6">
          <div className="grid gap-4">
            <h3 className="text-lg font-medium">Status</h3>

            <div className="grid gap-4">
              <div className="flex items-center justify-between">
                <div className="grid gap-1">
                  <Label htmlFor="email-resolutions" className="text-sm font-medium">
                    Enable 2FA
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Add an extra layer of security to your account using an authenticator app
                  </p>
                </div>
                <Switch
                  id="two-factor-enabled"
                  checked={optimisticSettings?.two_factor_enabled}
                  onCheckedChange={checked => handleSwitchChange('two_factor_enabled', checked)}
                />
              </div>

              {optimisticSettings?.two_factor_enabled && (
                <div className="flex items-center justify-between">
                  <div className="grid gap-1">
                    <Label htmlFor="email-resolutions" className="text-sm font-medium">
                      Trust Device
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Trust this device for 30 days after activate 2FA
                    </p>
                  </div>
                  <Switch
                    id="trust-device"
                    checked={optimisticSettings?.trust_device}
                    onCheckedChange={checked => handleSwitchChange('trust_device', checked)}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {twoFactorEnabled && (
          <div className="rounded-lg border p-6">
            <div className="space-y-4">
              <h4 className="text-lg font-medium">Setup Instructions</h4>
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

            <div className="mt-6 grid gap-6">
              <div className="flex justify-center">
                <QRCode value={status?.totpURI || ''} />
              </div>

              <a href={status?.totpURI} className="text-center text-sm text-primary">
                Or click here if you are on mobile and have an authenticator app installed.
              </a>

              <div className="flex flex-col items-center justify-center gap-2">
                <InputOTP
                  maxLength={6}
                  value={code}
                  name="code"
                  onChange={value => setCode(value)}
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>

                <div className="text-center text-sm">
                  Enter the code showed by your authenticator app.
                </div>
              </div>

              <div className="ms-auto">
                <Button type="submit">
                  Submit
                </Button>
              </div>
            </div>
          </div>
        )}
      </Form>
    </div>
  )
}
