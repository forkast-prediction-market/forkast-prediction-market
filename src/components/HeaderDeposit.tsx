import { Button } from '@/components/ui/button'
import { useUser } from '@/stores/useUser'

export default function HeaderDeposit() {
  const user = useUser()

  return (
    !user
      ? <Button size="sm" className="hidden sm:inline-flex" disabled>Loading...</Button>
      : <Button size="sm">Deposit</Button>
  )
}
