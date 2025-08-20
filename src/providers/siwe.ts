import type {
  SIWECreateMessageArgs,
  SIWESession,
  SIWEVerifyMessageArgs,
} from '@reown/appkit-siwe'
import { createSIWEConfig, formatMessage, getAddressFromMessage } from '@reown/appkit-siwe'
import { polygonAmoy } from '@reown/appkit/networks'
import { generateNonce } from 'siwe'
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
  getNonce: async () => {
    if (localStorage.getItem('@appkit/connections') === null) {
      return generateNonce()
    }

    const item = localStorage.getItem('@appkit/connections') as string
    const address = JSON.parse(item).eip155[0].accounts[0].address

    const { data } = await authClient.siwe.nonce({
      walletAddress: address,
      chainId: polygonAmoy.id,
    })

    if (data) {
      return data?.nonce
    }

    return generateNonce()
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
        useUser.setState({
          id: data.user.id,
          address: data.user.walletAddress,
        })

        return Boolean(data.success)
      }

      return false
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
