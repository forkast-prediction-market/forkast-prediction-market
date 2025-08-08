import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'

export default function HeaderDeposit() {
  const { isInitialized } = useAuth()
  return (
    !isInitialized
      ? <Button size="sm" className="hidden sm:inline-flex" disabled>Loading...</Button>
      : <Button size="sm">Deposit</Button>
  )
}
