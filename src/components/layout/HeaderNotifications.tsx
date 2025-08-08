import { BellIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function HeaderNotifications() {
  return (
    <Button type="button" size="icon" variant="ghost">
      <BellIcon />
    </Button>
  )
}
