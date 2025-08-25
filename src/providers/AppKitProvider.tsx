'use client'

import type { SIWECreateMessageArgs, SIWESession, SIWEVerifyMessageArgs } from '@reown/appkit-siwe'
import type { ReactNode } from 'react'
import { EthersAdapter } from '@reown/appkit-adapter-ethers'
import { createSIWEConfig, formatMessage, getAddressFromMessage } from '@reown/appkit-siwe'
import { polygonAmoy } from '@reown/appkit/networks'
import { createAppKit } from '@reown/appkit/react'
import { generateRandomString } from 'better-auth/crypto'
import { useTheme } from 'next-themes'
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
    siweConfig: typeof window === 'undefined' || sessionStorage.getItem('signed')
      ? undefined
      : createSIWEConfig({
          getMessageParams: async () => ({
            domain: new URL(typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000').host,
            uri: typeof window !== 'undefined' ? window.location.origin : '',
            chains: [polygonAmoy.id],
            statement: 'Please sign with your account',
          }),
          createMessage: ({ address, ...args }: SIWECreateMessageArgs) => formatMessage(args, address),
          getNonce: async () => generateRandomString(32),
          getSession: async () => {
            const session = authClient.useSession()
            if (!session) {
              return null
            }

            return {
              address: session.data?.user?.email as string,
              chainId: polygonAmoy.id,
            } satisfies SIWESession
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
              sessionStorage.removeItem('signed')
              window.location.reload()

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
                address: user?.name,
                email: user?.email,
                image: user?.image || `https://avatar.vercel.sh/${user?.name}.png`,
              })
            })

            sessionStorage.setItem('signed', 'true')
          },
        }),
    features: {
      analytics: process.env.NODE_ENV === 'production',
    },
  })

  return <>{children}</>
}
