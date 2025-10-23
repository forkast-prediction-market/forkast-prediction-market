'use cache'

import Header from '@/components/Header'
import NavigationTabs from '@/components/NavigationTabs'
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
