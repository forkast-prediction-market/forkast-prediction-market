'use client'

import type { AppKit } from '@reown/appkit'
import type { SIWECreateMessageArgs, SIWESession, SIWEVerifyMessageArgs } from '@reown/appkit-siwe'
import type { ReactNode } from 'react'
import { createSIWEConfig, formatMessage, getAddressFromMessage } from '@reown/appkit-siwe'
import { createAppKit, useAppKitTheme } from '@reown/appkit/react'
import { generateRandomString } from 'better-auth/crypto'
import { useTheme } from 'next-themes'
import { redirect } from 'next/navigation'
import { useEffect, useState } from 'react'
import { WagmiProvider } from 'wagmi'
import { defaultWalletModalValue, WalletModalContext } from '@/hooks/useWalletModal'
import { defaultNetwork, networks, projectId, wagmiAdapter, wagmiConfig } from '@/lib/appkit'
import { authClient } from '@/lib/auth-client'
import { useUser } from '@/stores/useUser'

const REOWN_CONFIG_WARNING_PREFIX = '[Reown Config]'

let hasInitializedAppKit = false
let hasPatchedConfigWarning = false
let hasLoggedConfigFailure = false
let appKitInstance: AppKit | null = null

function isBrowser() {
  return typeof window !== 'undefined'
}

function patchConfigWarning() {
  if (hasPatchedConfigWarning || !isBrowser()) {
    return
  }

  // Deduplicate noisy Reown config warnings so CI/build logs stay readable.
  const originalWarn = console.warn.bind(console)

  console.warn = (...args: any[]) => {
    const firstArg = args[0]
    if (
      typeof firstArg === 'string'
      && firstArg.startsWith(`${REOWN_CONFIG_WARNING_PREFIX} Failed to fetch remote project configuration`)
    ) {
      if (hasLoggedConfigFailure) {
        return
      }
      hasLoggedConfigFailure = true
      originalWarn(...args)
      return
    }

    originalWarn(...args)
  }

  hasPatchedConfigWarning = true
}

function initializeAppKitSingleton(themeMode: 'light' | 'dark') {
  if (hasInitializedAppKit || !isBrowser()) {
    return appKitInstance
  }

  patchConfigWarning()

  try {
    appKitInstance = createAppKit({
      projectId: projectId!,
      adapters: [wagmiAdapter],
      themeMode,
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
            queueMicrotask(() => redirect('/'))
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

    hasInitializedAppKit = true
    return appKitInstance
  }
  catch (error) {
    if (!hasLoggedConfigFailure) {
      hasLoggedConfigFailure = true
      console.warn(
        `${REOWN_CONFIG_WARNING_PREFIX} Wallet initialization failed. Using local/default values.`,
        error,
      )
    }
    return null
  }
}

function AppKitThemeSynchronizer({ themeMode }: { themeMode: 'light' | 'dark' }) {
  const { setThemeMode } = useAppKitTheme()

  useEffect(() => {
    setThemeMode(themeMode)
  }, [setThemeMode, themeMode])

  return null
}

export default function AppKitProvider({ children }: { children: ReactNode }) {
  const { resolvedTheme } = useTheme()
  const [appKitThemeMode, setAppKitThemeMode] = useState<'light' | 'dark'>('light')
  const [canSyncTheme, setCanSyncTheme] = useState(false)
  const [walletModalValue, setWalletModalValue] = useState(defaultWalletModalValue)

  useEffect(() => {
    if (!isBrowser()) {
      return
    }

    const nextThemeMode: 'light' | 'dark' = resolvedTheme === 'dark' ? 'dark' : 'light'
    const instance = initializeAppKitSingleton(nextThemeMode)

    if (instance) {
      setAppKitThemeMode(nextThemeMode)
      setCanSyncTheme(true)
      setWalletModalValue({
        open: async (options) => {
          await instance.open(options)
        },
        close: async () => {
          await instance.close()
        },
        isReady: true,
      })
    }
  }, [resolvedTheme])

  return (
    <WagmiProvider config={wagmiConfig}>
      <WalletModalContext value={walletModalValue}>
        {children}
        {canSyncTheme && <AppKitThemeSynchronizer themeMode={appKitThemeMode} />}
      </WalletModalContext>
    </WagmiProvider>
  )
}
