import { headers } from 'next/headers'
import { cookieToInitialState } from 'wagmi'
import Header from '@/components/layout/Header'
import NavigationTabsContainer from '@/components/layout/NavigationTabsContainer'
import { config } from '@/lib/appkit'
import { Providers } from '@/providers/Providers'

export default async function PlatformLayout({ children }: LayoutProps<'/'>) {
  const initialState = cookieToInitialState(
    config,
    (await headers()).get('cookie'),
  )

  return (
    <Providers initialState={initialState}>
      <Header />
      <NavigationTabsContainer />
      {children}
    </Providers>
  )
}
