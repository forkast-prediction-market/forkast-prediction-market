'use client'

import type { SIWECreateMessageArgs, SIWESession, SIWEVerifyMessageArgs } from '@reown/appkit-siwe'
import type { Route } from 'next'
import type { ReactNode } from 'react'
import { createSIWEConfig, formatMessage, getAddressFromMessage } from '@reown/appkit-siwe'
import { createAppKit } from '@reown/appkit/react'
import { generateRandomString } from 'better-auth/crypto'
import { useTheme } from 'next-themes'
import { redirect } from 'next/navigation'
import { WagmiProvider } from 'wagmi'
import { defaultNetwork, networks, projectId, wagmiAdapter, wagmiConfig } from '@/lib/appkit'
import { authClient } from '@/lib/auth-client'
import { useUser } from '@/stores/useUser'

export default function AppKitProvider({ children }: { children: ReactNode }) {
  const { resolvedTheme } = useTheme()

  createAppKit({
    projectId: projectId!,
    adapters: [wagmiAdapter],
    themeMode: (resolvedTheme as 'light' | 'dark') || 'light',
    metadata: {
      name: process.env.NEXT_PUBLIC_SITE_NAME!,
      description: process.env.NEXT_PUBLIC_SITE_DESCRIPTION!,
      url: process.env.NEXT_PUBLIC_SITE_URL!,
      icons: ['https://avatar.vercel.sh/bitcoin.png'],
    },
    themeVariables: {
      '--w3m-font-family': 'var(--font-sans)',
      '--w3m-border-radius-master': '2px',
      '--w3m-accent': 'var(--primary)',
    },
    networks,
    featuredWalletIds: ['c57ca95b47569778a828d19178114f4db188b89b763c899ba0be274e97267d96'],
    features: {
      analytics: process.env.NODE_ENV === 'production',
    },
    siweConfig: createSIWEConfig({
      signOutOnAccountChange: true,
      getMessageParams: async () => ({
        domain: new URL(process.env.NEXT_PUBLIC_SITE_URL!).host,
        uri: typeof window !== 'undefined' ? window.location.origin : '',
        chains: [defaultNetwork.id],
        statement: 'Please sign with your account',
      }),
      createMessage: ({ address, ...args }: SIWECreateMessageArgs) => formatMessage(args, address),
      getNonce: async () => generateRandomString(32),
      getSession: async () => {
        try {
          const session = await authClient.getSession()
          if (!session.data?.user) {
            return null
          }

          return {
            // @ts-expect-error address not defined in session type
            address: session.data?.user.address,
            chainId: defaultNetwork.id,
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
            chainId: defaultNetwork.id,
          })

          const { data } = await authClient.siwe.verify({
            message,
            signature,
            walletAddress: address,
            chainId: defaultNetwork.id,
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
          queueMicrotask(() => redirect(window.location.pathname as unknown as Route))

          return true
        }
        catch {
          return false
        }
      },
      onSignIn: () => {
        authClient.getSession().then((session) => {
          const user = session?.data?.user
          if (user) {
            useUser.setState({ ...user, image: user.image! })
          }
        }).catch(() => {})
      },
    }),
  })

  return (
    <WagmiProvider config={wagmiConfig}>
      {children}
    </WagmiProvider>
  )
}
