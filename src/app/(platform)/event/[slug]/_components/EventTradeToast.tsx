import type { ReactNode } from 'react'

interface EventTradeToastProps {
  title: string
  children: ReactNode
}

export default function EventTradeToast({ title, children }: EventTradeToastProps) {
  return (
    <div>
      <div className="font-medium">{title}</div>
      <div className="mt-1 text-xs opacity-80">
        {children}
      </div>
    </div>
  )
}
