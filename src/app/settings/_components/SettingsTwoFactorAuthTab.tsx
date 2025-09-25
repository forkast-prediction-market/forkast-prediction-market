'use client'

import type { User } from '@/types'
import { CheckIcon, CopyIcon } from 'lucide-react'
import { useState } from 'react'
import QRCode from 'react-qr-code'
import { toast } from 'sonner'
import { disableTwoFactorAction } from '@/app/settings/actions/disable-two-factor'
import { enableTwoFactorAction } from '@/app/settings/actions/enable-two-factor'
import { Button } from '@/components/ui/button'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useClipboard } from '@/hooks/useClipboard'
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
  isVerifying: boolean
  isDisabling: boolean
}

export default function SettingsTwoFactorAuthTab({ user }: { user: User }) {
  const { copied, copy } = useClipboard()
  const [state, setState] = useState<ComponentState>({
    isLoading: false,
    setupData: null,
    isEnabled: user?.twoFactorEnabled || false,
    trustDevice: false,
    code: '',
    isVerifying: false,
    isDisabling: false,
  })

  function extractTotpSecret() {
    try {
      const url = new URL(state.setupData?.totpURI as string)
      return url.searchParams.get('secret') ?? ''
    }
    catch {
      return ''
    }
  }

  function handleCopySecret() {
    copy(extractTotpSecret())
  }

  function handleTrustDeviceChange(checked: boolean) {
    setState(prev => ({
      ...prev,
      trustDevice: checked,
    }))
  }

  async function handleEnableTwoFactor() {
    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      const result = await enableTwoFactorAction()

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
    }
    catch {
      const errorMessage = 'An unexpected error occurred while enabling two-factor authentication. Please try again.'

      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }))

      toast.error(errorMessage)
    }
  }

  async function handleDisableTwoFactor() {
    setState(prev => ({ ...prev, isDisabling: true }))

    try {
      await disableTwoFactorAction()
      toast.success('Successfully disabled two-factor authentication.')

      setState(prev => ({
        ...prev,
        isEnabled: false,
        isDisabling: false,
      }))

      if (user) {
        useUser.setState({
          ...user,
          twoFactorEnabled: false,
        })
      }
    }
    catch {
      toast.error('An unexpected error occurred while disabling two-factor authentication. Please try again.')
      setState(prev => ({ ...prev, isDisabling: false }))
    }
  }

  async function verifyTotp() {
    setState(prev => ({ ...prev, isVerifying: true }))

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
          isVerifying: false,
        }))
      }
      else {
        toast.success('2FA enabled successfully.')

        setState(prev => ({
          ...prev,
          setupData: null,
          isEnabled: true,
          code: '',
          isVerifying: false,
        }))

        if (user) {
          useUser.setState({
            ...user,
            twoFactorEnabled: true,
          })
        }
      }
    }
    catch {
      toast.error('An unexpected error occurred during verification. Please try again.')

      setState(prev => ({
        ...prev,
        code: '',
        isVerifying: false,
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
        className="space-y-6"
        onSubmit={(e) => {
          e.preventDefault()
          verifyTotp()
        }}
      >

        <div className="rounded-lg border p-6">
          <div className="grid gap-4">
            <h3 className="text-lg font-medium">Status</h3>

            <div className="grid gap-4">
              {!state.isEnabled && !state.setupData
                ? (
                    <div className="flex flex-col justify-between gap-4">
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
                        className="ms-auto"
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
                            2FA Enabled
                          </Label>
                          <p className="text-sm text-muted-foreground">
                            Two-factor authentication is now active on your account
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleDisableTwoFactor}
                          disabled={state.isDisabling}
                        >
                          {state.isDisabling ? 'Disabling...' : 'Disable 2FA'}
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
                      Trust this device for 30 days after activating 2FA
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
                  Scan the QR code with your authenticator app (or copy the code).
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

              <div className="mx-auto">
                <Button
                  variant="ghost"
                  type="button"
                  size="sm"
                  onClick={handleCopySecret}
                  className="-ml-2 max-w-[18rem] text-xs text-muted-foreground"
                  title={copied ? 'Copied!' : 'Copy address'}
                >
                  <span className="block min-w-0 break-words whitespace-normal">{extractTotpSecret()}</span>
                  {copied
                    ? <CheckIcon className="size-3.5 text-yes" data-testid="check-icon" />
                    : <CopyIcon className="size-3.5" data-testid="copy-icon" />}
                </Button>
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
                    <InputOTPSlot className="size-12 lg:size-14" index={0} />
                    <InputOTPSlot className="size-12 lg:size-14" index={1} />
                    <InputOTPSlot className="size-12 lg:size-14" index={2} />
                    <InputOTPSlot className="size-12 lg:size-14" index={3} />
                    <InputOTPSlot className="size-12 lg:size-14" index={4} />
                    <InputOTPSlot className="size-12 lg:size-14" index={5} />
                  </InputOTPGroup>
                </InputOTP>

                <div className="text-center text-sm">
                  Enter the code shown by your authenticator app.
                </div>
              </div>

              <div className="ms-auto">
                <Button
                  type="submit"
                  disabled={state.code.length !== 6 || state.isVerifying}
                >
                  {state.isVerifying ? 'Verifying...' : 'Submit'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </form>
    </div>
  )
}
