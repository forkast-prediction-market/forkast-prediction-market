'use client'

import type { SIWECreateMessageArgs, SIWESession, SIWEVerifyMessageArgs } from '@reown/appkit-siwe'
import type { ReactNode } from 'react'
import { EthersAdapter } from '@reown/appkit-adapter-ethers'
import { createSIWEConfig, formatMessage, getAddressFromMessage } from '@reown/appkit-siwe'
import { polygonAmoy } from '@reown/appkit/networks'
import { createAppKit } from '@reown/appkit/react'
import { generateRandomString } from 'better-auth/crypto'
import { useTheme } from 'next-themes'
import { redirect } from 'next/navigation'
import { authClient } from '@/lib/auth-client'
import { useUser } from '@/stores/useUser'

export default function AppKitProvider({ children }: { children: ReactNode }) {
  const { resolvedTheme } = useTheme()
  const projectId = process.env.NEXT_PUBLIC_REOWN_APPKIT_PROJECT_ID!

  createAppKit({
    projectId,
    adapters: [new EthersAdapter()],
    themeMode: resolvedTheme as 'light' | 'dark',
    metadata: {
      name: process.env.NEXT_PUBLIC_SITE_NAME!,
      description: process.env.NEXT_PUBLIC_SITE_DESCRIPTION!,
      url: typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000',
      icons: ['https://avatar.vercel.sh/bitcoin.png'],
    },
    themeVariables: {
      '--w3m-border-radius-master': '2px',
      '--w3m-accent': 'var(--primary)',
    },
    networks: [polygonAmoy],
    defaultNetwork: polygonAmoy,
    siweConfig: createSIWEConfig({
      signOutOnAccountChange: true,
      getMessageParams: async () => ({
        domain: new URL(typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000').host,
        uri: typeof window !== 'undefined' ? window.location.origin : '',
        chains: [polygonAmoy.id],
        statement: 'Please sign with your account',
      }),
      createMessage: ({ address, ...args }: SIWECreateMessageArgs) => formatMessage(args, address),
      getNonce: async () => generateRandomString(32),
      getSession: async () => {
        try {
          const session = await authClient.getSession()
          if (!session.data?.user?.email) {
            return null
          }

          // Extract wallet address from email format (address@domain)
          const email = session.data.user.email as string
          const address = email.includes('@') ? email.split('@')[0] : email

          return {
            address,
            chainId: polygonAmoy.id,
          } satisfies SIWESession
        }
        catch {
          return null
        }
      },
      verifyMessage: async ({ message, signature }: SIWEVerifyMessageArgs) => {
        try {
          const address = getAddressFromMessage(message)

          await authClient.siwe.nonce({
            walletAddress: address,
            chainId: polygonAmoy.id,
          })

          const { data } = await authClient.siwe.verify({
            message,
            signature,
            walletAddress: address,
            chainId: polygonAmoy.id,
          })

          return Boolean(data?.success)
        }
        catch {
          return false
        }
      },
      signOut: async () => {
        try {
          await authClient.signOut()

          useUser.setState(null)
          queueMicrotask(() => redirect(window.location.pathname))

          return true
        }
        catch {
          return false
        }
      },
      onSignIn: () => {
        authClient.getSession().then((session) => {
          const user = session.data?.user
          useUser.setState({
          // @ts-expect-error type expects name
            address: user?.address,
            email: user?.email,
            // @ts-expect-error type expects name
            image: user?.image || `https://avatar.vercel.sh/${user?.address}.png`,
          })

          redirect(window.location.pathname)
        }).catch(() => {})
      },
    }),
    features: {
      analytics: process.env.NODE_ENV === 'production',
    },
  })

  return <>{children}</>
}
