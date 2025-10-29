'use cache'

import { Suspense } from 'react'
import Header from '@/components/Header'
import NavigationTabs from '@/components/NavigationTabs'
import { Providers } from '@/providers/Providers'

export default async function PlatformLayout({ children }: LayoutProps<'/'>) {
  return (
    <Providers>
      <Header />
      <Suspense fallback={<div>Loading...</div>}>
        <NavigationTabs />
        {children}
      </Suspense>
    </Providers>
  )
}
