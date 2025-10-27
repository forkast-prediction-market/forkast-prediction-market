import { sql } from 'drizzle-orm'
import { cacheTag, revalidateTag } from 'next/cache'
import { cacheTags } from '@/lib/cache-tags'
import { settings } from '@/lib/db/schema/settings/tables'
import { db } from '@/lib/drizzle'

export const SettingsRepository = {
  async getSettings() {
    'use cache'
    cacheTag(cacheTags.settings)

    try {
      const data = await db.select({
        group: settings.group,
        key: settings.key,
        value: settings.value,
        updated_at: settings.updated_at,
      }).from(settings)

      const settingsByGroup: Record<string, Record<string, { value: string, updated_at: string }>> = {}

      for (const setting of data) {
        settingsByGroup[setting.group] ??= {}
        settingsByGroup[setting.group][setting.key] = {
          value: setting.value,
          updated_at: setting.updated_at.toISOString(),
        }
      }

      return { data: settingsByGroup, error: null }
    }
    catch (e: any) {
      return { data: null, error: e }
    }
  },

  async updateSettings(settingsArray: Array<{ group: string, key: string, value: string }>) {
    const data = await db
      .insert(settings)
      .values(settingsArray)
      .onConflictDoUpdate({
        target: [settings.group, settings.key],
        set: {
          value: sql`EXCLUDED.value`,
        },
      })
      .returning({
        group: settings.group,
        key: settings.key,
        value: settings.value,
        updated_at: settings.updated_at,
      })

    revalidateTag(cacheTags.settings, 'max')

    return { data, error: null }
  },
}
