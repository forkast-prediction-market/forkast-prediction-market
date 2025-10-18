import HeaderLogo from '@/components/HeaderLogo'
import HeaderMenu from '@/components/HeaderMenu'

export default function AdminHeader() {
  return (
    <header className="sticky top-0 z-50 bg-background">
      <div className="container flex h-14 items-center gap-4">
        <HeaderLogo />
        <span>Admin</span>
        <div className="ms-auto flex shrink-0 items-center gap-1 sm:gap-2 lg:gap-4">
          <HeaderMenu />
        </div>
      </div>
    </header>
  )
}
