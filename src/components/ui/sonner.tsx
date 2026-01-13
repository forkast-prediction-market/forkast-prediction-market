import { CircleCheckIcon, InfoIcon, Loader2Icon, OctagonXIcon, TriangleAlertIcon } from 'lucide-react'
import { useTheme } from 'next-themes'
import { Toaster as Sonner } from 'sonner'

type ToasterProps = React.ComponentProps<typeof Sonner>

function Toaster({ ...props }: ToasterProps) {
  const { theme = 'system' } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps['theme']}
      expand={false}
      richColors={false}
      closeButton={true}
      duration={6000}
      visibleToasts={5}
      toastOptions={{
        style: {
          fontSize: '0.95rem',
          padding: '14px 16px',
          gap: '10px',
        },
        classNames: {
          title: 'text-base',
          description: 'text-sm',
          icon: '!size-5',
          closeButton: '!size-6',
          actionButton: '!h-8 !px-3 !text-sm',
          cancelButton: '!h-8 !px-3 !text-sm',
        },
      }}
      icons={{
        success: <CircleCheckIcon className="size-5 text-yes" />,
        info: <InfoIcon className="size-5 text-primary" />,
        warning: <TriangleAlertIcon className="size-5 text-orange-400" />,
        error: <OctagonXIcon className="size-5 text-no" />,
        loading: <Loader2Icon className="size-5 animate-spin" />,
      }}
      style={
        {
          '--normal-bg': 'var(--popover)',
          '--normal-text': 'var(--popover-foreground)',
          '--normal-border': 'var(--border)',
          '--border-radius': 'var(--radius)',
          '--width': '22rem',
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
