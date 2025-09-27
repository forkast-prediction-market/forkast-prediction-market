'use cache'

import Header from '@/components/layout/Header'
import NavigationTabs from '@/components/layout/NavigationTabs'
import { Providers } from '@/providers/Providers'

export default async function PlatformLayout({ children }: LayoutProps<'/'>) {
  return (
    <Providers>
      <Header />
      <NavigationTabs />
      {children}
    </Providers>
  )
}
