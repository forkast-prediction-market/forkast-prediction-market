import { betterAuth } from 'better-auth'
import { siwe } from 'better-auth/plugins'
import { generateNonce, SiweMessage } from 'siwe'

export const auth = betterAuth({
  database: {
    provider: 'postgres',
    url: process.env.DATABASE_URL!,
  },
  secret: process.env.BETTER_AUTH_SECRET!,
  plugins: [
    siwe({
      domain: typeof window !== 'undefined' ? window.location.host : 'localhost:3000',
      getNonce: async () => {
        return generateNonce()
      },
      verifyMessage: async ({ message, signature }) => {
        try {
          const siweMessage = new SiweMessage(message)
          const fields = await siweMessage.verify({ signature })
          return fields.success
        }
        catch {
          return false
        }
      },
    }),
  ],
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
  },
})
