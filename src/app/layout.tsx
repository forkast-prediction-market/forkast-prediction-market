import type { Metadata, Viewport } from 'next'
import { SpeedInsights } from '@vercel/speed-insights/next'
import ProgressIndicator from '@/app/progress'
import Header from '@/components/layout/Header'
import NavigationTabs from '@/components/layout/NavigationTabs'
import ThemeColor from '@/components/layout/ThemeColor'
import { Toaster } from '@/components/ui/sonner'
import { ThemeProvider } from '@/hooks/useTheme'
import './globals.css'

export const metadata: Metadata = {
  title: {
    template: `${process.env.NEXT_PUBLIC_SITE_NAME} | %s`,
    default: `${process.env.NEXT_PUBLIC_SITE_NAME} - ${process.env.NEXT_PUBLIC_SITE_DESCRIPTION}`,
  },
  description: process.env.NEXT_PUBLIC_SITE_DESCRIPTION,
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#1e293b' },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const theme = localStorage.getItem('theme')
                  const resolvedTheme = (theme === 'dark' || theme === 'light')
                    ? theme
                    : window.matchMedia('(prefers-color-scheme: dark)').matches
                      ? 'dark'
                      : 'light'
                  
                  const root = document.documentElement
                  if (resolvedTheme === 'dark') {
                    root.classList.add('dark')
                  } else {
                    root.classList.remove('dark')
                  }
                } catch (e) {
                  document.documentElement.classList.remove('dark')
                }
              })()
            `,
          }}
        />
        <title />
      </head>

      <body className="font-sans antialiased">
        <ProgressIndicator>
          <ThemeProvider>
            <ThemeColor />

            <div className="min-h-screen bg-background">
              <Header />
              <NavigationTabs />
              {children}
            </div>

            <Toaster />
            {process.env.NODE_ENV === 'production' && <SpeedInsights />}
          </ThemeProvider>
        </ProgressIndicator>
      </body>
    </html>
  )
}
