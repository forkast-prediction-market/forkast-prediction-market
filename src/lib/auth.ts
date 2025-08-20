import { betterAuth } from 'better-auth'
import { generateRandomString } from 'better-auth/crypto'
import { siwe } from 'better-auth/plugins'
import { Pool } from 'pg'
import { verifyMessage } from 'viem'

export const auth = betterAuth({
  database: new Pool({
    connectionString: process.env.POSTGRES_URL,
  }),
  secret: process.env.BETTER_AUTH_SECRET,
  plugins: [
    siwe({
      domain: typeof window !== 'undefined' ? window.location.host : 'localhost:3000',
      anonymous: false,
      getNonce: async () => generateRandomString(32),
      verifyMessage: async ({ message, signature, address }) => {
        try {
          return await verifyMessage({
            address: address as `0x${string}`,
            message,
            signature: signature as `0x${string}`,
          })
        }
        catch (error) {
          console.error('SIWE verification failed:', error)
          return false
        }
      },
    }),
  ],
  session: {
    expiresIn: 60 * 60 * 24 * 7,
  },
})
