import HeaderHowItWorks from '@/components/HeaderHowItWorks'
import HeaderLogo from '@/components/HeaderLogo'
import HeaderMenu from '@/components/HeaderMenu'
import HeaderSearch from '@/components/HeaderSearch'

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
