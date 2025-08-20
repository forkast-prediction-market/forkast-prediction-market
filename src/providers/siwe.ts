import type {
  SIWECreateMessageArgs,
  SIWESession,
  SIWEVerifyMessageArgs,
} from '@reown/appkit-siwe'
import { createSIWEConfig, formatMessage, getAddressFromMessage } from '@reown/appkit-siwe'
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
    const { data, error } = await authClient.siwe.nonce({
      walletAddress: '0xA87aB507Ba7b76b81dbAC2a6075eD9bb6F55180e',
      chainId: polygonAmoy.id,
    })

    if (data) {
      return data.nonce
    }

    throw new Error(error.message)
  },
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
      const { data } = await authClient.siwe.verify({
        message,
        signature,
        walletAddress: getAddressFromMessage(message),
        chainId: polygonAmoy.id,
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
