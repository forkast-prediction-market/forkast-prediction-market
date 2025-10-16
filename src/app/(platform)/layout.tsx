import { headers } from 'next/headers'
import Header from '@/components/layout/Header'
import NavigationTabsContainer from '@/components/layout/NavigationTabsContainer'
import { Providers } from '@/providers/Providers'

export default async function PlatformLayout({ children }: LayoutProps<'/'>) {
  const headersData = await headers()
  const cookies = headersData.get('cookie')

  return (
    <Providers cookies={cookies}>
      <Header />
      <NavigationTabsContainer />
      {children}
    </Providers>
  )
}
