'use client'

import { useState } from 'react'
import QRCode from 'react-qr-code'
import { toast } from 'sonner'
import { disableTwoFactorAction } from '@/app/settings/actions/disable-two-factor'
import { enableTwoFactorAction } from '@/app/settings/actions/enable-two-factor'
import { Button } from '@/components/ui/button'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { authClient } from '@/lib/auth-client'
import { useUser } from '@/stores/useUser'
import { TwoFactorSetupSkeleton } from './TwoFactorSetupSkeleton'

interface SetupData {
  totpURI: string
  backupCodes?: string[]
}

interface ComponentState {
  isLoading: boolean
  setupData: SetupData | null
  isEnabled: boolean
  trustDevice: boolean
  code: string
}

export default function SettingsTwoFactorAuthTab() {
  const user = useUser()

  const [state, setState] = useState<ComponentState>({
    isLoading: false,
    setupData: null,
    isEnabled: user?.twoFactorEnabled || false,
    trustDevice: false,
    code: '',
  })

  function handleTrustDeviceChange(checked: boolean) {
    setState(prev => ({
      ...prev,
      trustDevice: checked,
    }))
  }

  function handleEnableTwoFactor() {
    setState(prev => ({ ...prev, isLoading: true, error: null }))

    enableTwoFactorAction()
      .then((result) => {
        if ('error' in result) {
          const errorMessage = result.error === 'Failed to enable two factor'
            ? 'Unable to enable two-factor authentication. Please check your connection and try again.'
            : result.error

          setState(prev => ({
            ...prev,
            isLoading: false,
          }))

          toast.error(errorMessage)
        }
        else {
          setState(prev => ({
            ...prev,
            isLoading: false,
            setupData: {
              totpURI: result.totpURI,
              backupCodes: result.backupCodes,
            },
            error: null,
          }))
        }
      })
      .catch((error) => {
        console.error('Failed to enable two factor:', error)
        const errorMessage = 'An unexpected error occurred while enabling two-factor authentication. Please try again.'

        setState(prev => ({
          ...prev,
          isLoading: false,
          error: errorMessage,
        }))

        toast.error(errorMessage)
      })
  }

  async function handleDisableTwoFactor() {
    try {
      await disableTwoFactorAction()
      toast.success('Successfully disabled two-factor authentication.')
    }
    catch {
      toast.error('An unexpected error occurred while disabling two-factor authentication. Please try again.')
    }
  }

  async function verifyTotp() {
    try {
      const { error } = await authClient.twoFactor.verifyTotp({
        code: state.code,
        trustDevice: state.trustDevice,
      })

      if (error) {
        toast.error('Could not verify the code. Please try again.')
        setState(prev => ({
          ...prev,
          code: '',
          error: null,
        }))
      }
      else {
        toast.success('2FA enabled successfully.')

        setState(prev => ({
          ...prev,
          setupData: null,
          isEnabled: true,
          code: '',
          error: null,
        }))

        if (user) {
          useUser.setState({
            ...user,
            twoFactorEnabled: true,
          })
        }
      }
    }
    catch (error) {
      console.error('Failed to verify TOTP:', error)
      toast.error('An unexpected error occurred during verification. Please try again.')

      setState(prev => ({
        ...prev,
        code: '',
        error: null,
      }))
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Two-Factor Authentication</h1>
        <p className="mt-2 text-muted-foreground">
          Add an extra layer of security to your account.
        </p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          verifyTotp()
        }}
        className="space-y-6"
      >

        <div className="rounded-lg border p-6">
          <div className="grid gap-4">
            <h3 className="text-lg font-medium">Status</h3>

            <div className="grid gap-4">
              {!state.isEnabled && !state.setupData
                ? (
                    <div className="flex items-center justify-between">
                      <div className="grid gap-1">
                        <Label className="text-sm font-medium">
                          Enable 2FA
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Add an extra layer of security to your account using an authenticator app
                        </p>
                      </div>
                      <Button
                        type="button"
                        onClick={handleEnableTwoFactor}
                        disabled={state.isLoading}
                      >
                        {state.isLoading
                          ? 'Enabling...'
                          : 'Enable 2FA'}
                      </Button>
                    </div>
                  )
                : state.isEnabled
                  ? (
                      <div className="flex items-center justify-between">
                        <div className="grid gap-1">
                          <Label className="text-sm font-medium">
                            Two-Factor Authentication
                          </Label>
                          <p className="text-sm text-muted-foreground">
                            Two-factor authentication is now active on your account
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleDisableTwoFactor}
                        >
                          Disable 2FA
                        </Button>
                      </div>
                    )
                  : null}

              {state.setupData && (
                <div className="flex items-center justify-between">
                  <div className="grid gap-1">
                    <Label className="text-sm font-medium">
                      Trust Device
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Trust this device for 30 days after activate 2FA
                    </p>
                  </div>
                  <Switch
                    id="trust-device"
                    checked={state.trustDevice}
                    onCheckedChange={handleTrustDeviceChange}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {state.isLoading && <TwoFactorSetupSkeleton />}

        {state.setupData && !state.isLoading && state.setupData.totpURI && (
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
                <QRCode value={state.setupData.totpURI} />
              </div>

              <a href={state.setupData.totpURI} className="text-center text-sm text-primary">
                Or click here if you are on mobile and have an authenticator app installed.
              </a>

              <div className="flex flex-col items-center justify-center gap-2">
                <InputOTP
                  maxLength={6}
                  value={state.code}
                  onChange={(value: string) => setState(prev => ({
                    ...prev,
                    code: value,
                    error: null,
                  }))}
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
                <Button
                  type="submit"
                  disabled={state.code.length !== 6}
                >
                  Submit
                </Button>
              </div>
            </div>
          </div>
        )}
      </form>
    </div>
  )
}
