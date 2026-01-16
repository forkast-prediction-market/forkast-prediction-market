import TwoFactorClient from '@/app/2fa/_components/TwoFactorClient'

export default async function TwoFactorPage({
  searchParams,
}: {
  searchParams?: Promise<{ next?: string }>
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined

  return <TwoFactorClient next={resolvedSearchParams?.next} />
}
