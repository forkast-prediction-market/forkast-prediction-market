import TwoFactorClient from '@/app/2fa/_components/TwoFactorClient'

export default function TwoFactorPage({
  searchParams,
}: {
  searchParams?: { next?: string }
}) {
  return <TwoFactorClient next={searchParams?.next} />
}
