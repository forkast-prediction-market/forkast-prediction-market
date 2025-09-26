'use client'

import Form from 'next/form'
import { useActionState, useEffect } from 'react'
import { toast } from 'sonner'
import { updateForkSettingsAction } from '@/app/(platform)/admin/actions/update-fork-settings'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { InputError } from '@/components/ui/input-error'
import { Label } from '@/components/ui/label'

interface Props {
  tradeFeeBps: number
  affiliateShareBps: number
  updatedAtLabel?: string
}

const initialState = {
  error: undefined as string | undefined,
  success: undefined as string | undefined,
}

export default function AdminForkSettingsForm({ tradeFeeBps, affiliateShareBps, updatedAtLabel }: Props) {
  const [state, formAction, isPending] = useActionState(updateForkSettingsAction, initialState)

  useEffect(() => {
    if (state.success) {
      toast.success(state.success)
    }
    if (state.error) {
      toast.error(state.error)
    }
  }, [state.success, state.error])

  return (
    <Form action={formAction} className="grid gap-6 rounded-lg border p-6">
      <div>
        <h2 className="text-xl font-semibold">Trading Fees</h2>
        <p className="text-sm text-muted-foreground">
          Configure the trading fee charged on your platform and the share paid to affiliates.
        </p>
        {updatedAtLabel && (
          <p className="mt-1 text-xs text-muted-foreground">
            Last updated
            {' '}
            {updatedAtLabel}
          </p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="trade_fee_percent">Trading fee (%)</Label>
          <Input
            id="trade_fee_percent"
            name="trade_fee_percent"
            type="number"
            step="0.01"
            min="0"
            max="9"
            defaultValue={(tradeFeeBps / 100).toFixed(2)}
            disabled={isPending}
          />
          <p className="text-xs text-muted-foreground">
            Extra fee over Forkast (max 9%)
          </p>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="affiliate_share_percent">Affiliate share (%)</Label>
          <Input
            id="affiliate_share_percent"
            name="affiliate_share_percent"
            type="number"
            step="0.5"
            min="0"
            max="100"
            defaultValue={(affiliateShareBps / 100).toFixed(2)}
            disabled={isPending}
          />
          <p className="text-xs text-muted-foreground">
            Affiliate share of trading fee.
          </p>
        </div>
      </div>

      {state.error && <InputError message={state.error} />}

      <Button type="submit" className="w-40" disabled={isPending}>
        {isPending ? 'Saving...' : 'Save changes'}
      </Button>
    </Form>
  )
}
