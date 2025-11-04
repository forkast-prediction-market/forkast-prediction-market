'use cache: private'

import type { Metadata } from 'next'
import SettingsExportPrivateKeyContent from '@/app/(platform)/settings/_components/SettingsExportPrivateKeyContent'

export const metadata: Metadata = {
  title: 'Export key',
}

export default async function ExportKeySettingsPage() {
  return (
    <section className="grid gap-8">
      <div className="grid gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Export Private Key</h1>
        <p className="text-muted-foreground">
          Export your private key for backup or wallet migration.
        </p>
      </div>

      <div className="mx-auto max-w-2xl lg:mx-0">
        <SettingsExportPrivateKeyContent />
      </div>
    </section>
  )
}
