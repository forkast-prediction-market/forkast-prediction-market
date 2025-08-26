import { getChainIdFromMessage } from '@reown/appkit-siwe'
import { betterAuth } from 'better-auth'
import { generateRandomString } from 'better-auth/crypto'
import { nextCookies } from 'better-auth/next-js'
import { siwe } from 'better-auth/plugins'
import { Pool } from 'pg'
import { createPublicClient, http } from 'viem'

export const auth = betterAuth({
  database: new Pool({
    connectionString: process.env.POSTGRES_URL,
  }),
  secret: process.env.BETTER_AUTH_SECRET,
  advanced: {
    database: {
      useNumberId: true,
      generateId: false,
    },
  },
  plugins: [
    siwe({
      schema: {
        walletAddress: {
          modelName: 'wallets',
          fields: {
            userId: 'user_id',
            address: 'address',
            chainId: 'chain_id',
            isPrimary: 'is_primary',
            createdAt: 'created_at',
          },
        },
      },
      domain: process.env.NEXT_PUBLIC_SITE_URL ? new URL(process.env.NEXT_PUBLIC_SITE_URL).host : 'localhost:3000',
      anonymous: true,
      getNonce: async () => generateRandomString(32),
      verifyMessage: async ({ message, signature, address }) => {
        const chainId = getChainIdFromMessage(message)
        const projectId = process.env.NEXT_PUBLIC_REOWN_APPKIT_PROJECT_ID!

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
    nextCookies(),
  ],
  user: {
    modelName: 'users',
    fields: {
      name: 'address',
      email: 'email',
      emailVerified: 'email_verified',
      image: 'image',
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
    additionalFields: {
      username: {
        type: 'string',
      },
      bio: {
        type: 'string',
      },
      notification_preferences: {
        type: 'string',
      },
    },
    changeEmail: {
      enabled: true,
    },
  },
  session: {
    modelName: 'sessions',
    fields: {
      userId: 'user_id',
      token: 'token',
      expiresAt: 'expires_at',
      ipAddress: 'ip_address',
      userAgent: 'user_agent',
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
  },
  account: {
    modelName: 'accounts',
    fields: {
      userId: 'user_id',
      accountId: 'account_id',
      providerId: 'provider_id',
      accessToken: 'access_token',
      refreshToken: 'refresh_token',
      accessTokenExpiresAt: 'access_token_expires_at',
      refreshTokenExpiresAt: 'refresh_token_expires_at',
      scope: 'scope',
      password: 'password',
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
  },
  verification: {
    modelName: 'verifications',
    fields: {
      identifier: 'identifier',
      value: 'value',
      expiresAt: 'expires_at',
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
  },
})
