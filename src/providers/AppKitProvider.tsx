'use client'

import type { ReactNode } from 'react'
import { EthersAdapter } from '@reown/appkit-adapter-ethers'
import { polygonAmoy } from '@reown/appkit/networks'
import { createAppKit, useAppKitTheme } from '@reown/appkit/react'
import { useTheme } from 'next-themes'

createAppKit({
  projectId: process.env.NEXT_PUBLIC_APPKIT_PROJECT_ID!,
  adapters: [new EthersAdapter()],
  metadata: {
    name: process.env.NEXT_PUBLIC_SITE_NAME!,
    description: process.env.NEXT_PUBLIC_SITE_DESCRIPTION!,
    url: `https://${process.env.VERCEL_URL}`,
    icons: ['https://avatar.vercel.com/'],
  },
  themeVariables: {
    '--w3m-border-radius-master': '2px',
    '--w3m-accent': 'var(--primary)',
  },
  networks: [polygonAmoy],
  defaultNetwork: polygonAmoy,
  features: {
    analytics: process.env.NODE_ENV === 'production',
  },
})

export default function AppKitProvider({ children }: { children: ReactNode }) {
  const { resolvedTheme } = useTheme()
  const { setThemeMode } = useAppKitTheme()

  setThemeMode(resolvedTheme as 'light' | 'dark')

  return <>{children}</>
}
