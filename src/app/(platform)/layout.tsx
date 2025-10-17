'use cache'

import Header from '@/components/Header'
import NavigationTabsContainer from '@/components/NavigationTabsContainer'
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
