import { MinusIcon, PlusIcon } from 'lucide-react'
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
  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const sanitized = e.target.value.replace(/[^0-9.]/g, '')
    const parts = sanitized.split('.')
    const normalized
      = parts.length > 1 ? `${parts[0]}.${parts[1].slice(0, 1)}` : parts[0]
    onChange(Number.parseFloat(normalized) || 0)
  }

  return (
    <div className="flex w-1/2 items-center rounded-md border">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-10 rounded-none rounded-l-sm border-none px-2"
        onClick={() => onChange(value - step)}
      >
        <MinusIcon className="size-4" />
      </Button>

      <div className="relative flex-1">
        <Input
          type="text"
          inputMode="decimal"
          pattern="\d+(\.\d{0,1})?"
          value={value}
          onChange={handleChange}
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
        onClick={() => onChange(value + step)}
      >
        <PlusIcon className="size-4" />
      </Button>
    </div>
  )
}
