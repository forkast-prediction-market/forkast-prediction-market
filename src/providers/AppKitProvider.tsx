'use client'

import type { SIWECreateMessageArgs, SIWESession, SIWEVerifyMessageArgs } from '@reown/appkit-siwe'
import type { Route } from 'next'
import type { ReactNode } from 'react'
import type { State } from 'wagmi'
import { createSIWEConfig, formatMessage, getAddressFromMessage } from '@reown/appkit-siwe'
import { polygonAmoy } from '@reown/appkit/networks'
import { createAppKit } from '@reown/appkit/react'
import { generateRandomString } from 'better-auth/crypto'
import { useTheme } from 'next-themes'
import { redirect } from 'next/navigation'
import { WagmiProvider } from 'wagmi'
import { config, networks, projectId, wagmiAdapter } from '@/lib/appkit'
import { authClient } from '@/lib/auth-client'
import { useUser } from '@/stores/useUser'

export default function AppKitProvider({ children, initialState }: { children: ReactNode, initialState: State | undefined }) {
  const { resolvedTheme } = useTheme()

  createAppKit({
    projectId: projectId!,
    adapters: [wagmiAdapter],
    themeMode: resolvedTheme as 'light' | 'dark',
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
    defaultNetwork: networks[0],
    features: {
      analytics: process.env.NODE_ENV === 'production',
    },
    siweConfig: createSIWEConfig({
      signOutOnAccountChange: true,
      getMessageParams: async () => ({
        domain: new URL(process.env.NEXT_PUBLIC_SITE_URL!).host,
        uri: typeof window !== 'undefined' ? window.location.origin : '',
        chains: [polygonAmoy.id],
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
    <WagmiProvider config={config} initialState={initialState}>
      {children}
    </WagmiProvider>
  )
}
