import type { SupportedLocale } from '@/i18n/locales'
import { DEFAULT_LOCALE, normalizeEnabledLocales, parseEnabledLocales } from '@/i18n/locales'
import { SettingsRepository } from '@/lib/db/queries/settings'

const LOCALE_SETTINGS_GROUP = 'i18n'
const LOCALE_SETTINGS_KEY = 'enabled_locales'

type SettingsGroup = Record<string, { value: string, updated_at: string }>
interface SettingsMap {
  [group: string]: SettingsGroup | undefined
}

export function getEnabledLocalesFromSettings(settings?: SettingsMap): SupportedLocale[] {
  const rawValue = settings?.[LOCALE_SETTINGS_GROUP]?.[LOCALE_SETTINGS_KEY]?.value
  const parsed = parseEnabledLocales(rawValue)
  return parsed.length > 0 ? parsed : [DEFAULT_LOCALE]
}

export async function loadEnabledLocales(): Promise<SupportedLocale[]> {
  const { data } = await SettingsRepository.getSettings()
  return getEnabledLocalesFromSettings(data ?? undefined)
}

export function serializeEnabledLocales(locales: SupportedLocale[]): string {
  return JSON.stringify(locales)
}

export function ensureEnabledLocales(locales: string[]): SupportedLocale[] {
  const normalized = normalizeEnabledLocales(locales)
  return normalized.length > 0 ? normalized : [DEFAULT_LOCALE]
}
