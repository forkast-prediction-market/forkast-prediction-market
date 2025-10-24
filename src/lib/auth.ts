import { getChainIdFromMessage } from '@reown/appkit-siwe'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { generateRandomString } from 'better-auth/crypto'
import { nextCookies } from 'better-auth/next-js'
import { customSession, siwe, twoFactor } from 'better-auth/plugins'
import { createPublicClient, http } from 'viem'
import { isAdminWallet } from '@/lib/admin'
import { projectId } from '@/lib/appkit'
import * as affiliatesRelations from '@/lib/db/schema/affiliates/relations'
import * as affiliatesTables from '@/lib/db/schema/affiliates/tables'
import * as authRelations from '@/lib/db/schema/auth/relations'
import * as authTables from '@/lib/db/schema/auth/tables'
import * as bookmarksRelations from '@/lib/db/schema/bookmarks/relations'
import * as bookmarksTables from '@/lib/db/schema/bookmarks/tables'
import * as commentsRelations from '@/lib/db/schema/comments/relations'
import * as commentsTables from '@/lib/db/schema/comments/tables'
import * as eventsRelations from '@/lib/db/schema/events/relations'
import * as eventsTables from '@/lib/db/schema/events/tables'
import * as notificationsRelations from '@/lib/db/schema/notifications/relations'
import * as notificationsTables from '@/lib/db/schema/notifications/tables'
import * as ordersRelations from '@/lib/db/schema/orders/relations'
import * as ordersTables from '@/lib/db/schema/orders/tables'
import * as settingsTables from '@/lib/db/schema/settings/tables'
import * as subgraphTables from '@/lib/db/schema/subgraph/tables'
import { db } from '@/lib/drizzle'
import { getSupabaseImageUrl } from '@/lib/supabase'

const schema = {
  ...affiliatesRelations,
  ...affiliatesTables,
  ...authRelations,
  ...authTables,
  ...bookmarksRelations,
  ...bookmarksTables,
  ...commentsRelations,
  ...commentsTables,
  ...eventsRelations,
  ...eventsTables,
  ...notificationsRelations,
  ...notificationsTables,
  ...ordersRelations,
  ...ordersTables,
  ...settingsTables,
  ...subgraphTables,
}

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema,
  }),
  appName: process.env.NEXT_PUBLIC_SITE_NAME,
  secret: process.env.BETTER_AUTH_SECRET,
  advanced: {
    database: {
      generateId: false,
    },
  },
  plugins: [
    customSession(async ({ user, session }) => {
      return {
        user: {
          ...user,
          image: user.image ? getSupabaseImageUrl(user.image) : `https://avatar.vercel.sh/${user.name}.png`,
          is_admin: isAdminWallet(user.name),
        },
        session,
      }
    }),
    nextCookies(),
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
      domain: process.env.VERCEL_PROJECT_PRODUCTION_URL ?? 'localhost:3000',
      emailDomainName: process.env.VERCEL_PROJECT_PRODUCTION_URL ?? 'forka.st',
      anonymous: true,
      getNonce: async () => generateRandomString(32),
      verifyMessage: async ({ message, signature, address }) => {
        const chainId = getChainIdFromMessage(message)

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
    twoFactor({
      skipVerificationOnEnable: false,
      schema: {
        user: {
          fields: {
            twoFactorEnabled: 'two_factor_enabled',
          },
        },
        twoFactor: {
          modelName: 'two_factors',
          fields: {
            secret: 'secret',
            backupCodes: 'backup_codes',
            userId: 'user_id',
          },
        },
      },
    }),
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
      address: {
        type: 'string',
      },
      username: {
        type: 'string',
      },
      settings: {
        type: 'json',
      },
      affiliate_code: {
        type: 'string',
      },
      referred_by_user_id: {
        type: 'string',
      },
    },
    changeEmail: {
      enabled: true,
    },
  },
  session: {
    modelName: 'sessions',
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,
    },
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
