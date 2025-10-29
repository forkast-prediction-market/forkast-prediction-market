'use cache'

import { Suspense } from 'react'
import Header from '@/components/Header'
import NavigationTabs from '@/components/NavigationTabs'
import { Providers } from '@/providers/Providers'

export default async function PlatformLayout({ children }: LayoutProps<'/'>) {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Providers>
        <Header />
        <NavigationTabs />
        {children}
      </Providers>
    </Suspense>
  )
}
