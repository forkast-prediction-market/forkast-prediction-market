'use cache'

import Header from '@/components/layout/Header'
import NavigationTabsContainer from '@/components/layout/NavigationTabsContainer'
import { Providers } from '@/providers/Providers'

export default async function PlatformLayout({ children }: LayoutProps<'/'>) {
  return (
    <Providers>
      <Header />
      <NavigationTabsContainer />
      {children}
    </Providers>
  )
}
