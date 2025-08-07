'use client'

import { Toaster as Sonner } from 'sonner'

type ToasterProps = React.ComponentProps<typeof Sonner>

function Toaster({ ...props }: ToasterProps) {
  return (
    <Sonner
      position="bottom-right"
      expand={true}
      richColors={true}
      closeButton={false}
      duration={4000}
      visibleToasts={5}
      toastOptions={{
        classNames: {
          toast: 'shadow-lg',
          description: 'text-muted-foreground dark:text-white',
          actionButton: 'bg-primary text-primary-foreground',
          cancelButton: 'bg-muted text-muted-foreground',
          success: 'bg-emerald-600 border-emerald-600 dark:bg-emerald-600 dark:border-emerald-600 dark:text-white',
          error: 'bg-rose-600 border-rose-600 dark:bg-rose-600 dark:border-rose-600 dark:text-white',
          warning: 'bg-amber-600 border-amber-600 dark:bg-amber-600 dark:border-amber-600 dark:text-white',
          info: 'bg-slate-600 border-slate-600 dark:bg-slate-600 dark:border-slate-600 dark:text-white',
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
