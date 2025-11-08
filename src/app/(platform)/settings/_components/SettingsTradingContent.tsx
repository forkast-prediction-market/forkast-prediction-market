'use client'

import type { MarketOrderType, User } from '@/types'
import Form from 'next/form'
import { startTransition, useOptimistic, useRef, useState } from 'react'
import { toast } from 'sonner'
import { updateTradingSettingsAction } from '@/app/(platform)/settings/_actions/update-trading-settings'
import { InputError } from '@/components/ui/input-error'
import { Label } from '@/components/ui/label'
import { CLOB_ORDER_TYPE } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { useUser } from '@/stores/useUser'

const ORDER_TYPE_OPTIONS: Array<{
  value: MarketOrderType
  title: string
  description: string
  badge?: string
}> = [
  {
    value: CLOB_ORDER_TYPE.FAK,
    title: 'Fill and Kill (FAK)',
    description: 'Fills as much as possible at the best available prices and cancels any remaining unfilled portion',
  },
  {
    value: CLOB_ORDER_TYPE.FOK,
    title: 'Fill or Kill (FOK)',
    description: 'Executes the entire order immediately at the specified price or cancels it completely',
  },
]

export default function SettingsTradingContent({ user }: { user: User }) {
  const [error, setError] = useState<string | null>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const initialOrderType = (user.settings?.trading?.market_order_type as MarketOrderType) ?? CLOB_ORDER_TYPE.FAK

  const [optimisticOrderType, setOptimisticOrderType] = useOptimistic<MarketOrderType, MarketOrderType>(
    initialOrderType,
    (_, nextValue) => nextValue,
  )

  function updateGlobalUser(value: MarketOrderType) {
    useUser.setState((prev) => {
      if (!prev) {
        return prev
      }

      return {
        ...prev,
        settings: {
          ...prev.settings,
          trading: {
            ...prev.settings?.trading,
            market_order_type: value,
          },
        },
      }
    })
  }

  function handleOptionChange(value: MarketOrderType) {
    if (value === optimisticOrderType) {
      return
    }

    const previousValue = optimisticOrderType

    startTransition(() => {
      setOptimisticOrderType(value)
    })

    queueMicrotask(async () => {
      const formData = new FormData(formRef.current ?? undefined)
      formData.set('market_order_type', value)

      const { error } = await updateTradingSettingsAction(formData)

      if (error) {
        startTransition(() => {
          setOptimisticOrderType(previousValue)
        })
        setError(error)
      }
      else {
        setError(error)
        toast.success('Trading settings updated.')
        updateGlobalUser(value)
      }
    })
  }

  return (
    <div className="grid gap-8">
      {error && <InputError message={error} />}

      <Form ref={formRef} action={() => {}} className="grid gap-6">
        <input type="hidden" name="market_order_type" value={optimisticOrderType} />

        <div className="rounded-lg border p-6">
          <div className="grid gap-4">
            <div className="grid gap-1">
              <Label className="text-base font-semibold">Market Order Type</Label>
              <p className="text-sm text-muted-foreground">
                Choose how your market orders are executed
              </p>
            </div>

            <div className="grid gap-3">
              {ORDER_TYPE_OPTIONS.map((option) => {
                const isSelected = optimisticOrderType === option.value

                return (
                  <label
                    key={option.value}
                    className={cn(
                      'flex cursor-pointer flex-col gap-2 rounded-md border p-4 transition-colors',
                      isSelected ? 'border-primary/80 bg-primary/5' : 'border-border hover:border-primary/60',
                    )}
                  >
                    <input
                      type="radio"
                      name="market-order-type-radio"
                      value={option.value}
                      checked={isSelected}
                      onChange={() => handleOptionChange(option.value)}
                      className="sr-only"
                    />
                    <div className="flex items-center gap-2">
                      <div
                        aria-hidden="true"
                        className={cn(
                          'flex size-4 items-center justify-center rounded-full border transition-colors',
                          isSelected ? 'border-primary bg-primary' : 'border-muted-foreground/40',
                        )}
                      >
                        <div
                          className={cn(
                            'size-2 rounded-full bg-background transition-opacity',
                            isSelected ? 'opacity-100' : 'opacity-0',
                          )}
                        />
                      </div>
                      <span className="text-sm font-medium">{option.title}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {option.description}
                    </p>
                  </label>
                )
              })}
            </div>
          </div>
        </div>
      </Form>
    </div>
  )
}
