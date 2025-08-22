import type {
  SIWECreateMessageArgs,
  SIWESession,
  SIWEVerifyMessageArgs,
} from '@reown/appkit-siwe'
import { createSIWEConfig, formatMessage, getAddressFromMessage } from '@reown/appkit-siwe'
import { polygonAmoy } from '@reown/appkit/networks'
import { generateRandomString } from 'better-auth/crypto'
import { authClient } from '@/lib/auth-client'
import { useUser } from '@/stores/useUser'

export const siweConfig = createSIWEConfig({
  getMessageParams: async () => ({
    domain: typeof window !== 'undefined' ? window.location.host : '',
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
  },
  onSignOut: () => {
    useUser.setState(null)
  },
})
