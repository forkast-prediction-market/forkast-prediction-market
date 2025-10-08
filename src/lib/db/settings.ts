import { supabaseAdmin } from '@/lib/supabase'

export const SettingsModel = {
  async getSettings() {
    'use cache'

    const { data, error } = await supabaseAdmin
      .from('settings')
      .select('group, key, value, updated_at')

    if (error) {
      return { data: null, error }
    }

    const settingsByGroup: Record<string, Record<string, { value: string, updated_at: string }>> = {}

    data?.forEach((setting) => {
      if (!settingsByGroup[setting.group]) {
        settingsByGroup[setting.group] = {}
      }
      settingsByGroup[setting.group][setting.key] = {
        value: setting.value,
        updated_at: setting.updated_at,
      }
    })

    return { data: settingsByGroup, error: null }
  },

  async updateSettings(settings: Array<{ group: string, key: string, value: string }>) {
    const { data, error } = await supabaseAdmin
      .from('settings')
      .upsert(settings, { onConflict: 'group,key' })
      .select('group, key, value, updated_at')

    if (error) {
      return { data: null, error }
    }

    return { data, error: null }
  },
}
