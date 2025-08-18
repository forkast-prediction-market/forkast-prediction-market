'use client'

import type { ReactNode } from 'react'
import { EthersAdapter } from '@reown/appkit-adapter-ethers'
import { polygonAmoy } from '@reown/appkit/networks'
import { createAppKit } from '@reown/appkit/react'

const projectId = process.env.NEXT_PUBLIC_APPKIT_PROJECT_ID!

createAppKit({
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
  projectId,
  defaultNetwork: polygonAmoy,
  features: {
    analytics: false,
  },
})

export default function AppKit({ children }: { children: ReactNode }) {
  return <>{children}</>
}
