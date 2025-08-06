import type { Metadata } from 'next'
import { SpeedInsights } from '@vercel/speed-insights/next'
import ProgressIndicator from '@/app/progress'
import ThemeColor from '@/components/layout/ThemeColor'
import { Toaster } from '@/components/ui/sonner'
import { ThemeProvider } from '@/hooks/useTheme'
import './globals.css?v=3'

export const metadata: Metadata = {
  title: `${process.env.NEXT_PUBLIC_SITE_NAME} - ${process.env.NEXT_PUBLIC_SITE_DESCRIPTION}`,
  description: process.env.NEXT_PUBLIC_SITE_DESCRIPTION,
}

export const viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#1e293b' },
  ],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('theme');
                  var resolvedTheme;
                  
                  if (theme === 'dark' || theme === 'light') {
                    resolvedTheme = theme;
                  } else {
                    // Check system preference
                    var mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
                    resolvedTheme = mediaQuery.matches ? 'dark' : 'light';
                  }
                  
                  // Apply theme immediately
                  var root = document.documentElement;
                  if (resolvedTheme === 'dark') {
                    root.classList.add('dark');
                  } else {
                    root.classList.remove('dark');
                  }
                } catch (e) {
                  // Fallback to light theme if localStorage is not available
                  document.documentElement.classList.remove('dark');
                }
              })();
            `,
          }}
        />
      </head>
      <body className="antialiased">
        <ProgressIndicator>
          <ThemeProvider>
            <ThemeColor />
            {children}
            <Toaster />
            {process.env.NODE_ENV === 'production' && <SpeedInsights />}
          </ThemeProvider>
        </ProgressIndicator>
      </body>
    </html>
  )
}
