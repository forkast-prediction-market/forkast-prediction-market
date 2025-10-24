import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

// Import schema modules individually
import * as affiliatesRelations from './db/schema/affiliates/relations'
import * as affiliatesTables from './db/schema/affiliates/tables'
import * as authRelations from './db/schema/auth/relations'
import * as authTables from './db/schema/auth/tables'
import * as bookmarksRelations from './db/schema/bookmarks/relations'
import * as bookmarksTables from './db/schema/bookmarks/tables'
import * as commentsRelations from './db/schema/comments/relations'
import * as commentsTables from './db/schema/comments/tables'
import * as eventsRelations from './db/schema/events/relations'
import * as eventsTables from './db/schema/events/tables'
import * as notificationsRelations from './db/schema/notifications/relations'
import * as notificationsTables from './db/schema/notifications/tables'
import * as ordersRelations from './db/schema/orders/relations'
import * as ordersTables from './db/schema/orders/tables'
import * as settingsTables from './db/schema/settings/tables'
import * as subgraphTables from './db/schema/subgraph/tables'

// Combine schema objects manually
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

const globalForDb = globalThis as unknown as {
  client: postgres.Sql | undefined
}

const client = globalForDb.client ?? postgres(process.env.POSTGRES_URL!, { prepare: false })

globalForDb.client = client

export const db = drizzle(client, { schema })
