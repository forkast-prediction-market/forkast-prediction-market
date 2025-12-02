import { SparkleIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface NewBadgeProps {
  variant?: 'plain' | 'soft'
  className?: string
}

export function NewBadge({ variant = 'plain', className }: NewBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-2xs leading-none font-semibold',
        variant === 'soft'
          ? 'rounded-full bg-yellow-500/15 px-2 py-1 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-200'
          : 'text-yellow-500 dark:text-yellow-300',
        className,
      )}
    >
      <SparkleIcon className="size-2 text-current" strokeWidth={2.5} />
      <span>New</span>
    </span>
  )
}
