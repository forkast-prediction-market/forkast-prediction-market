import type { OrderType } from '@/types'
import * as SelectPrimitive from '@radix-ui/react-select'
import { ChevronDownIcon } from 'lucide-react'
import { useEffect } from 'react'
import { Select, SelectContent, SelectItem, SelectValue } from '@/components/ui/select'
import { ORDER_SIDE, ORDER_TYPE } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { useOrder } from '@/stores/useOrder'

const ORDER_TYPE_STORAGE_KEY = 'forkast:order-panel-type'

export default function EventOrderPanelBuySellTabs() {
  const {
    side,
    setSide,
    setAmount,
    inputRef,
    type,
    setType,
  } = useOrder()

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const storedType = window.localStorage.getItem(ORDER_TYPE_STORAGE_KEY) as OrderType
    if (Object.values(ORDER_TYPE).includes(storedType as any)) {
      setType(storedType)
    }
  }, [setType])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    try {
      window.localStorage.setItem(ORDER_TYPE_STORAGE_KEY, type)
    }
    catch {}
  }, [type])

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
              side === ORDER_SIDE.BUY && 'border-primary text-foreground',
            )}
            onClick={() => {
              setSide(ORDER_SIDE.BUY)
              setAmount('')
              inputRef?.current?.focus()
            }}
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
              side === ORDER_SIDE.SELL && 'border-primary text-foreground',
            )}
            onClick={() => {
              setSide(ORDER_SIDE.SELL)
              setAmount('')
              inputRef?.current?.focus()
            }}
          >
            Sell
          </button>
        </div>

        <Select
          key={type}
          value={type}
          onValueChange={value => setType(value as OrderType)}
        >
          <SelectPrimitive.Trigger asChild>
            <button
              type="button"
              className={cn(
                `
                  group flex cursor-pointer items-center gap-1 bg-transparent pb-2 text-sm font-semibold
                  text-muted-foreground transition-colors duration-200
                  hover:text-foreground
                  focus:outline-none
                  focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none
                  data-[state=open]:text-foreground
                `,
              )}
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
