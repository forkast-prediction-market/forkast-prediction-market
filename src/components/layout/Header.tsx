import HeaderHowItWorks from '@/components/layout/HeaderHowItWorks'
import HeaderLogo from '@/components/layout/HeaderLogo'
import HeaderMenu from '@/components/layout/HeaderMenu'
import HeaderSearch from '@/components/layout/HeaderSearch'

export default async function Header() {
  return (
    <header className="sticky top-0 z-50 bg-background">
      <div className="container flex h-14 items-center gap-4">
        <HeaderLogo />
        <div className="flex flex-1 items-center gap-2">
          <HeaderSearch />
          <HeaderHowItWorks />
        </div>
        <div className="ms-auto flex shrink-0 items-center gap-1 sm:gap-2 lg:gap-4">
          <HeaderMenu />
        </div>
      </div>
    </header>
  )
}
