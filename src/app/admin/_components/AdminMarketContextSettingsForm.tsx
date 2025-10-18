'use client'

import type { MarketContextVariable } from '@/lib/ai/market-context-template'
import { RefreshCwIcon } from 'lucide-react'
import Form from 'next/form'
import { useActionState, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { updateMarketContextSettingsAction } from '@/app/admin/_actions/update-market-context-settings'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { InputError } from '@/components/ui/input-error'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'

const initialState = {
  error: undefined as string | undefined,
  success: undefined as string | undefined,
}

const AUTOMATIC_MODEL_VALUE = '__AUTOMATIC__'

interface ModelOption {
  id: string
  label: string
  contextWindow?: number
}

interface AdminMarketContextSettingsFormProps {
  defaultPrompt: string
  variables: MarketContextVariable[]
  models: ModelOption[]
  defaultModel?: string
  defaultApiKey?: string
  isModelSelectEnabled: boolean
  isEnabled: boolean
  modelsError?: string
}

export default function AdminMarketContextSettingsForm({
  defaultPrompt,
  variables,
  models,
  defaultModel,
  defaultApiKey,
  isModelSelectEnabled,
  isEnabled,
  modelsError,
}: AdminMarketContextSettingsFormProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const [promptValue, setPromptValue] = useState(defaultPrompt)
  const [modelValue, setModelValue] = useState(defaultModel ?? '')
  const [selectValue, setSelectValue] = useState(defaultModel || AUTOMATIC_MODEL_VALUE)
  const [apiKeyValue, setApiKeyValue] = useState(defaultApiKey ?? '')
  const [enabled, setEnabled] = useState(isEnabled)
  const [modelOptions, setModelOptions] = useState<ModelOption[]>(models)
  const [modelsStateError, setModelsStateError] = useState<string | undefined>(modelsError)
  const [isRefreshingModels, setIsRefreshingModels] = useState(false)
  const [state, formAction, isPending] = useActionState(updateMarketContextSettingsAction, initialState)

  useEffect(() => {
    if (state.success) {
      toast.success(state.success)
    }
    if (state.error) {
      toast.error(state.error)
    }
  }, [state.error, state.success])

  useEffect(() => {
    queueMicrotask(() => {
      setModelOptions(models)
    })
  }, [models])

  useEffect(() => {
    queueMicrotask(() => {
      setModelsStateError(previous => (previous === modelsError ? previous : modelsError))
    })
  }, [modelsError])

  function handleInsertVariable(key: string) {
    const placeholder = `[${key}]`
    const textarea = textareaRef.current

    if (!textarea) {
      setPromptValue(prev => `${prev}${placeholder}`)
      return
    }

    const { selectionStart, selectionEnd, value } = textarea
    const start = selectionStart ?? value.length
    const end = selectionEnd ?? value.length
    const nextValue = `${value.slice(0, start)}${placeholder}${value.slice(end)}`
    setPromptValue(nextValue)

    queueMicrotask(() => {
      textarea.focus()
      const cursor = start + placeholder.length
      textarea.setSelectionRange(cursor, cursor)
    })
  }

  function handleModelChange(nextValue: string) {
    setSelectValue(nextValue)
    setModelValue(nextValue === AUTOMATIC_MODEL_VALUE ? '' : nextValue)
  }

  function handleEnabledChange(nextValue: boolean) {
    setEnabled(nextValue)
  }

  const trimmedApiKey = apiKeyValue.trim()
  const modelDropdownEnabled = isModelSelectEnabled || Boolean(trimmedApiKey)

  async function handleRefreshModels() {
    if (!trimmedApiKey) {
      return
    }

    try {
      setIsRefreshingModels(true)
      setModelsStateError(undefined)
      const response = await fetch('/admin/api/openrouter-models', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ apiKey: trimmedApiKey }),
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        setModelsStateError(payload?.error ?? 'Unable to load models. Please verify the API key.')
        return
      }

      const payload = await response.json() as { models?: ModelOption[] }
      const refreshedModels = Array.isArray(payload?.models) ? payload.models : []
      setModelOptions(refreshedModels)

      if (selectValue !== AUTOMATIC_MODEL_VALUE && refreshedModels.every(model => model.id !== selectValue)) {
        setSelectValue(AUTOMATIC_MODEL_VALUE)
        setModelValue('')
      }
    }
    catch (error) {
      console.error('Failed to refresh OpenRouter models', error)
      setModelsStateError('Unable to load models. Please verify the API key.')
    }
    finally {
      setIsRefreshingModels(false)
    }
  }

  return (
    <Form action={formAction} className="grid max-w-3xl gap-8">
      <input type="hidden" name="openrouter_model" value={modelValue} />
      <input type="hidden" name="openrouter_enabled" value={enabled ? 'true' : 'false'} />

      <section className="grid gap-3">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <Label htmlFor="openrouter_key">OpenRouter settings</Label>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="openrouter_enabled" className="text-xs text-muted-foreground">
              Enable market context
            </Label>
            <Switch
              id="openrouter_enabled"
              checked={enabled}
              onCheckedChange={handleEnabledChange}
              disabled={isPending}
            />
          </div>
        </div>
        <Input
          id="openrouter_key"
          name="openrouter_api_key"
          type="password"
          placeholder="Enter your OpenRouter API key"
          autoComplete="off"
          value={apiKeyValue}
          onChange={event => setApiKeyValue(event.target.value)}
          disabled={isPending}
        />
        <p className="text-xs text-muted-foreground">
          Generate an API key at
          {' '}
          <a
            href="https://openrouter.ai/settings/keys"
            className="underline decoration-dotted underline-offset-4"
            target="_blank"
            rel="noreferrer"
          >
            openrouter.ai/settings/keys
          </a>
          .
        </p>
      </section>

      <section className="grid gap-2">
        <Label htmlFor="openrouter_model">Preferred OpenRouter model</Label>
        <div className="flex items-center gap-2">
          <Select
            value={selectValue}
            onValueChange={handleModelChange}
            disabled={!modelDropdownEnabled || isPending}
          >
            <SelectTrigger className="!h-12 w-full max-w-md justify-between">
              <SelectValue placeholder="Select a model" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={AUTOMATIC_MODEL_VALUE}>
                Let OpenRouter decide
              </SelectItem>
              {modelOptions.map(model => (
                <SelectItem key={model.id} value={model.id}>
                  <div className="flex flex-col gap-0.5">
                    <span>{model.label}</span>
                    {model.contextWindow
                      ? (
                          <span className="text-xs text-muted-foreground">
                            Context window:
                            {' '}
                            {model.contextWindow.toLocaleString()}
                          </span>
                        )
                      : null}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="secondary"
            size="icon"
            className="size-12 shrink-0"
            disabled={!trimmedApiKey || isPending || isRefreshingModels}
            onClick={handleRefreshModels}
            title="Refresh models"
            aria-label="Refresh models"
          >
            <RefreshCwIcon className={`size-4 ${isRefreshingModels ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Models with live browsing (for example
          {' '}
          <code>perplexity/sonar</code>
          ) perform best. Explore the catalog at
          {' '}
          <a
            href="https://openrouter.ai/models"
            className="underline decoration-dotted underline-offset-4"
            target="_blank"
            rel="noreferrer"
          >
            openrouter.ai/models
          </a>
          .
        </p>
        {modelsStateError
          ? (
              <p className="text-xs text-destructive">{modelsStateError}</p>
            )
          : null}
      </section>

      <section className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="market_context_prompt">Prompt template</Label>
          <Textarea
            id="market_context_prompt"
            name="market_context_prompt"
            ref={textareaRef}
            rows={16}
            value={promptValue}
            onChange={event => setPromptValue(event.target.value)}
            disabled={isPending}
          />
          <p className="text-xs text-muted-foreground">
            Use the variables below to blend live market data into the instructions. They will be replaced before the request is sent.
          </p>
        </div>

        <div className="grid gap-3">
          <span className="text-xs font-medium text-muted-foreground uppercase">Available variables</span>
          <div className="flex flex-wrap gap-2">
            {variables.map(variable => (
              <Button
                key={variable.key}
                type="button"
                variant="secondary"
                size="sm"
                disabled={isPending}
                onClick={() => handleInsertVariable(variable.key)}
                title={variable.description}
                className="rounded-full"
              >
                [
                {variable.key}
                ]
              </Button>
            ))}
          </div>
          <ul className="list-disc space-y-1 ps-5 text-xs text-muted-foreground">
            {variables.map(variable => (
              <li key={`${variable.key}-description`}>
                <span className="font-medium">
                  [
                  {variable.key}
                  ]
                </span>
                {' – '}
                {variable.description}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {state.error ? <InputError message={state.error} /> : null}

      <div className="flex justify-end">
        <Button type="submit" className="w-40" disabled={isPending}>
          {isPending ? 'Saving...' : 'Save changes'}
        </Button>
      </div>
    </Form>
  )
}
