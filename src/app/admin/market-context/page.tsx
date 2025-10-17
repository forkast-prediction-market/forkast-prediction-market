import { redirect } from 'next/navigation'
import AdminMarketContextSettingsForm from '@/app/admin/_components/AdminMarketContextSettingsForm'
import { parseMarketContextSettings } from '@/lib/ai/market-context-config'
import { MARKET_CONTEXT_VARIABLES } from '@/lib/ai/market-context-template'
import { fetchOpenRouterModels } from '@/lib/ai/openrouter'
import { SettingsRepository } from '@/lib/db/settings'
import { UserRepository } from '@/lib/db/user'

export default async function AdminMarketContextSettingsPage() {
  const currentUser = await UserRepository.getCurrentUser()

  if (!currentUser || !currentUser.is_admin) {
    redirect('/')
  }

  const { data: allSettings } = await SettingsRepository.getSettings()
  const parsedSettings = parseMarketContextSettings(allSettings ?? undefined)
  const defaultPrompt = parsedSettings.prompt
  const defaultModel = parsedSettings.model ?? ''
  const defaultApiKey = parsedSettings.apiKey ?? ''
  const isEnabled = parsedSettings.enabled
  const apiKeyForModels = parsedSettings.apiKey
  const isModelSelectEnabled = Boolean(apiKeyForModels)

  let modelsError: string | undefined
  let modelOptions: Array<{ id: string, label: string, contextWindow?: number }> = []

  if (isModelSelectEnabled && apiKeyForModels) {
    try {
      const models = await fetchOpenRouterModels(apiKeyForModels)
      modelOptions = models.map(model => ({
        id: model.id,
        label: model.name,
        contextWindow: model.contextLength,
      }))
    }
    catch (error) {
      console.error('Failed to load OpenRouter models', error)
      modelsError = 'Unable to load models from OpenRouter. Please try again later.'
    }
  }

  if (defaultModel && !modelOptions.some(option => option.id === defaultModel)) {
    modelOptions = [{ id: defaultModel, label: defaultModel }, ...modelOptions]
  }

  return (
    <div className="space-y-8">
      <section className="grid gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Market context</h1>
          <p className="text-sm text-muted-foreground">
            Control the AI prompt, OpenRouter credentials, and model selection for market context generation.
          </p>
        </div>

        <AdminMarketContextSettingsForm
          defaultPrompt={defaultPrompt}
          variables={MARKET_CONTEXT_VARIABLES}
          models={modelOptions}
          defaultModel={defaultModel}
          defaultApiKey={defaultApiKey}
          isEnabled={isEnabled}
          isModelSelectEnabled={isModelSelectEnabled}
          modelsError={modelsError}
        />
      </section>
    </div>
  )
}
