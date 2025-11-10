import type { OrderSide, OrderType } from '@/types'
import * as SelectPrimitive from '@radix-ui/react-select'
import { ChevronDownIcon } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Select, SelectContent, SelectItem, SelectValue } from '@/components/ui/select'
import { ORDER_SIDE, ORDER_TYPE } from '@/lib/constants'
import { cn } from '@/lib/utils'

const ORDER_TYPE_STORAGE_KEY = 'forkast:order-panel-type'

interface EventOrderPanelBuySellTabsProps {
  side: OrderSide
  type: OrderType
  onSideChange: (side: OrderSide) => void
  onTypeChange: (type: OrderType) => void
  onAmountReset: () => void
  onFocusInput: () => void
}

export default function EventOrderPanelBuySellTabs({
  side,
  type,
  onSideChange,
  onTypeChange,
  onAmountReset,
  onFocusInput,
}: EventOrderPanelBuySellTabsProps) {
  const [open, setOpen] = useState(false)
  const hasHydratedType = useRef(false)

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    if (hasHydratedType.current) {
      return
    }

    hasHydratedType.current = true
    const storedType = window.localStorage.getItem(ORDER_TYPE_STORAGE_KEY) as OrderType
    if (storedType && Object.values(ORDER_TYPE).includes(storedType as any) && storedType !== type) {
      onTypeChange(storedType)
    }
  }, [onTypeChange, type])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    try {
      window.localStorage.setItem(ORDER_TYPE_STORAGE_KEY, type)
    }
    catch {}
  }, [type])

  function handleSideChange(nextSide: OrderSide) {
    onSideChange(nextSide)
    onAmountReset()
    onFocusInput()
  }

  return (
    <div className="relative mb-4">
      <div className="flex items-end justify-between gap-4">
        <div className="flex items-center gap-4 text-sm font-semibold">
          <button
            type="button"
            className={cn(
              `
                cursor-pointer rounded-none border-b-2 border-transparent bg-transparent px-0 pb-2 text-sm font-semibold
                text-muted-foreground transition-colors duration-200
                hover:!bg-transparent hover:text-foreground
                focus:!bg-transparent
                focus-visible:!bg-transparent focus-visible:outline-none
                active:!bg-transparent
                dark:hover:!bg-transparent dark:focus:!bg-transparent dark:focus-visible:!bg-transparent
                dark:active:!bg-transparent
              `,
              side === ORDER_SIDE.BUY && 'border-foreground text-foreground',
            )}
            onClick={() => handleSideChange(ORDER_SIDE.BUY)}
          >
            Buy
          </button>
          <button
            type="button"
            className={cn(
              `
                cursor-pointer rounded-none border-b-2 border-transparent bg-transparent px-0 pb-2 text-sm font-semibold
                text-muted-foreground transition-colors duration-200
                hover:!bg-transparent hover:text-foreground
                focus:!bg-transparent
                focus-visible:!bg-transparent focus-visible:outline-none
                active:!bg-transparent
                dark:hover:!bg-transparent dark:focus:!bg-transparent dark:focus-visible:!bg-transparent
                dark:active:!bg-transparent
              `,
              side === ORDER_SIDE.SELL && 'border-foreground text-foreground',
            )}
            onClick={() => handleSideChange(ORDER_SIDE.SELL)}
          >
            Sell
          </button>
        </div>

        <Select
          key={type}
          value={type}
          open={open}
          onOpenChange={setOpen}
          onValueChange={value => onTypeChange(value as OrderType)}
        >
          <SelectPrimitive.Trigger asChild>
            <button
              type="button"
              onMouseEnter={() => setOpen(true)}
              className={cn(`
                group flex cursor-pointer items-center gap-1 bg-transparent pb-2 text-sm font-semibold
                text-muted-foreground transition-colors duration-200
                hover:text-foreground
                focus:outline-none
                focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none
                data-[state=open]:text-foreground
              `)}
            >
              <SelectValue />
              <ChevronDownIcon className={`
                size-4 text-muted-foreground transition-colors
                group-data-[state=open]:text-foreground
              `}
              />
            </button>
          </SelectPrimitive.Trigger>
          <SelectContent align="end" className="min-w-[8rem]">
            <SelectItem className="cursor-pointer" value={ORDER_TYPE.MARKET}>Market</SelectItem>
            <SelectItem className="cursor-pointer" value={ORDER_TYPE.LIMIT}>Limit</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-border"
      />
    </div>
  )
}
