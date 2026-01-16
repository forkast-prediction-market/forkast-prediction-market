import TwoFactorClient from './TwoFactorClient'

export default function TwoFactorPage({
  searchParams,
}: {
  searchParams?: { next?: string }
}) {
  return <TwoFactorClient next={searchParams?.next} />
}
