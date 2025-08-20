import type {
  SIWECreateMessageArgs,
  SIWESession,
  SIWEVerifyMessageArgs,
} from '@reown/appkit-siwe'
import { createSIWEConfig, formatMessage } from '@reown/appkit-siwe'
import { polygonAmoy } from '@reown/appkit/networks'
import { authClient } from '@/lib/auth-client'

export const siweConfig = createSIWEConfig({
  getMessageParams: async () => ({
    domain: typeof window !== 'undefined' ? window.location.host : '',
    uri: typeof window !== 'undefined' ? window.location.origin : '',
    chains: [polygonAmoy.id],
    statement: 'Please sign with your account',
  }),
  createMessage: ({ address, ...args }: SIWECreateMessageArgs) => formatMessage(args, address),
  getNonce: async () => {
    const { data } = await authClient.siwe.nonce({
      walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
      chainId: polygonAmoy.id,
    })

    if (data) {
      console.log('Nonce:', data.nonce)
    }

    return new Promise(_ => data?.nonce)
  },
  getSession: async () => {
    const session = authClient.useSession()
    if (!session) {
      return null
    }

    console.log(session.data)

    return {
      address: '',
      chainId: polygonAmoy.id,
    } satisfies SIWESession
  },
  verifyMessage: async ({ message, signature }: SIWEVerifyMessageArgs) => {
    try {
      const { data } = await authClient.siwe.verify({
        message,
        signature, // The signature from the user's wallet
        walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
        chainId: polygonAmoy.id, // optional, defaults to 1
        email: 'user@example.com', // optional, required if anonymous is false
      })

      if (data) {
        console.log('Authentication successful:', data.user)
      }

      return Boolean(data?.success)
    }
    catch {
      return false
    }
  },
  signOut: async () => {
    try {
      await authClient.signOut()

      return true
    }
    catch {
      return false
    }
  },
})
