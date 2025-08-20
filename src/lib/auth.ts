import { getChainIdFromMessage } from '@reown/appkit-siwe'
import { betterAuth } from 'better-auth'
import { generateRandomString } from 'better-auth/crypto'
import { siwe } from 'better-auth/plugins'
import { Pool } from 'pg'
import { createPublicClient, http } from 'viem'

export const auth = betterAuth({
  database: new Pool({
    connectionString: process.env.POSTGRES_URL,
  }),
  secret: process.env.BETTER_AUTH_SECRET,
  plugins: [
    siwe({
      domain: typeof window !== 'undefined' ? window.location.host : 'localhost:3000',
      anonymous: true,
      getNonce: async () => generateRandomString(32),
      verifyMessage: async ({ message, signature, address }) => {
        const chainId = getChainIdFromMessage(message)
        const projectId = process.env.NEXT_PUBLIC_PROJECT_ID!

        const publicClient = createPublicClient(
          {
            transport: http(
              `https://rpc.walletconnect.org/v1/?chainId=${chainId}&projectId=${projectId}`,
            ),
          },
        )

        return await publicClient.verifyMessage({
          message,
          address: address as `0x${string}`,
          signature: signature as `0x${string}`,
        })
      },
    }),
  ],
  session: {
    expiresIn: 60 * 60 * 24 * 7,
  },
})
