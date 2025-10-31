import { MinusIcon, PlusIcon } from 'lucide-react'
import React, { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function NumberInput({
  value,
  onChange,
  step = 0.1,
}: {
  value: number
  onChange: (val: number) => void
  step?: number
}) {
  const MAX = 99.9
  const initialString = value === 0 ? '' : value.toFixed(1).replace(/\.0$/, '')
  const [inputValue, setInputValue] = useState<string>(initialString)

  useEffect(() => {
    const newVal = value === 0 ? '' : value.toFixed(1).replace(/\.0$/, '')
    if (newVal !== inputValue) {
      setInputValue(newVal)
    }
  }, [value])

  function formatPolymarketStyle(raw: string): string {
    const digits = raw.replace(/\D/g, '')
    if (!digits) {
      return ''
    }
    if (digits.length === 1) {
      return digits
    }
    if (digits.length === 2) {
      return digits
    }
    if (digits.length === 3) {
      const before = digits.slice(0, 2)
      const after = digits.slice(2)
      return `${before}.${after}`
    }
    if (digits.length > 3) {
      const before = digits.slice(0, 2)
      const after = digits.slice(2, 3)
      return `${before}.${after}`
    }
    return digits
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value
    const prevDigits = inputValue.replace(/\D/g, '')
    const newDigits = raw.replace(/\D/g, '')
    if ((inputValue === '0' || inputValue === '' || inputValue === '0.0') && newDigits.length === 1) {
      setInputValue(newDigits)
      return
    }
    if (prevDigits.length === 3 && newDigits.length > prevDigits.length) {
      if (raw.length >= inputValue.length) {
        return
      }
    }
    const formatted = formatPolymarketStyle(raw)
    if (formatted && !Number.isNaN(Number(formatted)) && Number(formatted) > MAX) {
      setInputValue(MAX.toFixed(1))
      onChange(MAX)
      return
    }
    setInputValue(formatted)
  }

  function commitInput(val: string) {
    const num = Number.parseFloat(val)
    let clamped = num
    if (!Number.isNaN(num)) {
      clamped = Math.min(num, MAX)
      onChange(Number(clamped.toFixed(1)))
    }
    else {
      onChange(0)
    }
    if (!Number.isNaN(clamped) && clamped !== 0) {
      setInputValue(clamped.toFixed(1).replace(/\.0$/, ''))
    }
    else {
      setInputValue('')
    }
  }

  function handleBlur() {
    commitInput(inputValue)
  }

  function handleStep(delta: number) {
    let newValue = Number((value + delta).toFixed(1))
    newValue = Math.max(0, Math.min(newValue, MAX))
    onChange(newValue)
    if (newValue !== 0) {
      setInputValue(newValue.toFixed(1).replace(/\.0$/, ''))
    }
    else {
      setInputValue('')
    }
  }

  return (
    <div className="flex w-1/2 items-center rounded-md border">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-10 rounded-none rounded-l-sm border-none px-2"
        onClick={() => handleStep(-step)}
      >
        <MinusIcon className="size-4" />
      </Button>

      <div className="relative flex-1">
        <Input
          type="text"
          inputMode="decimal"
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleBlur}
          maxLength={5}
          placeholder="0.0"
          className={`
            h-10 rounded-none border-none !bg-transparent text-center font-semibold shadow-none
            focus-visible:ring-0 focus-visible:ring-offset-0
          `}
        />
        <span className="absolute top-1/2 right-2 -translate-y-1/2 text-sm text-muted-foreground">
          ¢
        </span>
      </div>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-10 rounded-none rounded-r-sm border-none px-2"
        onClick={() => handleStep(step)}
      >
        <PlusIcon className="size-4" />
      </Button>
    </div>
  )
}
