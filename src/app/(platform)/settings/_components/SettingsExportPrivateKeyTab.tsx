'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'

export default function SettingsExportPrivateKeyTab() {
  const [isExporting, setIsExporting] = useState(false)

  function handleStartExport() {
    setIsExporting(true)
    // TODO: Implement private key export functionality
    console.log('Starting private key export...')
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Export Private Key</h1>
        <p className="mt-2 text-muted-foreground">
          Export your private key for backup or wallet migration.
        </p>
      </div>

      <div className="space-y-6">
        {/* Warning Alert */}
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex size-5 flex-shrink-0 items-center justify-center rounded-full bg-destructive/20">
              <span className="text-xs font-bold text-destructive">!</span>
            </div>
            <div>
              <h4 className="mb-1 font-medium text-destructive">Important Security Warning</h4>
              <p className="text-sm text-destructive/80">
                DO NOT share your private key with anyone. We will never ask for your private key.
              </p>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="rounded-lg border p-6">
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Export Instructions</h3>

            <ol className="space-y-3 text-sm">
              <li className="flex">
                <span className={`
                  mr-3 flex size-6 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 font-medium
                  text-primary
                `}
                >
                  1
                </span>
                <div>
                  <p className="font-medium">Secure your environment</p>
                  <p className="text-muted-foreground">
                    Make sure you're in a private, secure location
                  </p>
                </div>
              </li>

              <li className="flex">
                <span className={`
                  mr-3 flex size-6 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 font-medium
                  text-primary
                `}
                >
                  2
                </span>
                <div>
                  <p className="font-medium">Verify your identity</p>
                  <p className="text-muted-foreground">
                    You'll be asked to confirm your password and 2FA (if enabled)
                  </p>
                </div>
              </li>

              <li className="flex">
                <span className={`
                  mr-3 flex size-6 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 font-medium
                  text-primary
                `}
                >
                  3
                </span>
                <div>
                  <p className="font-medium">Save securely</p>
                  <p className="text-muted-foreground">
                    Store your private key in a secure password manager or encrypted file
                  </p>
                </div>
              </li>
            </ol>
          </div>
        </div>

        {/* Export Button */}
        <div className="flex justify-start">
          <Button
            variant="destructive"
            onClick={handleStartExport}
            disabled={isExporting}
            className="w-40"
          >
            {isExporting ? 'Exporting...' : 'Start Export'}
          </Button>
        </div>
      </div>
    </div>
  )
}
