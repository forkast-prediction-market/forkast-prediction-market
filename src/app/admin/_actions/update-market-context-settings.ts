'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { SettingsRepository } from '@/lib/db/settings'
import { UserRepository } from '@/lib/db/user'
import { encryptSecret } from '@/lib/encryption'

export interface MarketContextSettingsActionState {
  error?: string
  success?: string
}

const UpdateMarketContextSettingsSchema = z.object({
  market_context_prompt: z.string()
    .min(20, 'Please provide at least 20 characters for the prompt.')
    .max(6000, 'Prompt is too long.'),
  openrouter_model: z.string().max(160).optional(),
  openrouter_api_key: z.string().max(256).optional(),
  openrouter_enabled: z.string().optional(),
}).transform(({ market_context_prompt, openrouter_model, openrouter_api_key, openrouter_enabled }) => {
  const prompt = market_context_prompt.trim()
  const model = openrouter_model?.trim() ?? ''
  const apiKey = openrouter_api_key?.trim() ?? ''
  const enabled = typeof openrouter_enabled === 'string'
    ? ['true', '1', 'yes', 'on'].includes(openrouter_enabled.toLowerCase())
    : false

  return {
    prompt,
    model,
    apiKey,
    enabled,
  }
})

export async function updateMarketContextSettingsAction(
  _prevState: MarketContextSettingsActionState,
  formData: FormData,
): Promise<MarketContextSettingsActionState> {
  const user = await UserRepository.getCurrentUser()

  if (!user || !user.is_admin) {
    return { error: 'Not authorized.' }
  }

  const parsed = UpdateMarketContextSettingsSchema.safeParse({
    market_context_prompt: typeof formData.get('market_context_prompt') === 'string'
      ? formData.get('market_context_prompt')
      : '',
    openrouter_model: typeof formData.get('openrouter_model') === 'string'
      ? formData.get('openrouter_model')
      : undefined,
    openrouter_api_key: typeof formData.get('openrouter_api_key') === 'string'
      ? formData.get('openrouter_api_key')
      : undefined,
    openrouter_enabled: typeof formData.get('openrouter_enabled') === 'string'
      ? formData.get('openrouter_enabled')
      : undefined,
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input.' }
  }

  let encryptedKey = ''
  try {
    encryptedKey = parsed.data.apiKey ? encryptSecret(parsed.data.apiKey) : ''
  }
  catch (error) {
    console.error('Failed to encrypt OpenRouter API key', error)
    return { error: 'Unable to secure the OpenRouter API key. Check server configuration.' }
  }

  const updates = [
    { group: 'ai', key: 'market_context_prompt', value: parsed.data.prompt },
    { group: 'ai', key: 'openrouter_model', value: parsed.data.model },
    { group: 'ai', key: 'openrouter_api_key', value: encryptedKey },
    { group: 'ai', key: 'openrouter_enabled', value: parsed.data.enabled ? 'true' : 'false' },
  ]

  const { error } = await SettingsRepository.updateSettings(updates)

  if (error) {
    console.error('Failed to update market context settings', error)
    return { error: 'Failed to update settings. Try again shortly.' }
  }

  revalidatePath('/admin')
  return { success: 'Market context settings updated.' }
}
