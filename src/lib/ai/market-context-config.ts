import { MARKET_CONTEXT_PROMPT_DEFAULT } from '@/lib/ai/market-context-template'
import { SettingsRepository } from '@/lib/db/queries/settings'
import { decryptSecret } from '@/lib/encryption'

type SettingsGroup = Record<string, { value: string, updated_at: string }>

interface SettingsMap {
  [group: string]: SettingsGroup | undefined
}

export interface MarketContextSettings {
  prompt: string
  model?: string
  apiKey?: string
  enabled: boolean
}

export interface MarketContextSettingsResult extends MarketContextSettings {
  allSettings?: SettingsMap
  aiSettings?: SettingsGroup
}

function normalizeBoolean(value: string | undefined, fallback: boolean): boolean {
  if (!value) {
    return fallback
  }

  const normalized = value.trim().toLowerCase()
  if (['true', '1', 'yes', 'on', 'enabled'].includes(normalized)) {
    return true
  }
  if (['false', '0', 'no', 'off', 'disabled'].includes(normalized)) {
    return false
  }

  return fallback
}

function parseMarketContextSettingsFromMap(allSettings?: SettingsMap): MarketContextSettingsResult {
  const aiSettings = allSettings?.ai

  const prompt = aiSettings?.market_context_prompt?.value?.trim() || MARKET_CONTEXT_PROMPT_DEFAULT

  const model = aiSettings?.openrouter_model?.value?.trim() || undefined

  const encryptedApiKey = aiSettings?.openrouter_api_key?.value
  const decryptedApiKey = encryptedApiKey ? decryptSecret(encryptedApiKey) : ''
  const apiKey = decryptedApiKey.trim() || undefined

  const enabled = normalizeBoolean(
    aiSettings?.openrouter_enabled?.value,
    Boolean(apiKey),
  )

  return {
    prompt,
    model,
    apiKey,
    enabled,
    allSettings,
    aiSettings,
  }
}

export async function loadMarketContextSettings(): Promise<MarketContextSettingsResult> {
  const { data } = await SettingsRepository.getSettings()
  return parseMarketContextSettingsFromMap(data ?? undefined)
}

export function parseMarketContextSettings(allSettings?: SettingsMap): MarketContextSettingsResult {
  return parseMarketContextSettingsFromMap(allSettings)
}
