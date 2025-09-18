import { BellIcon, ExternalLinkIcon } from 'lucide-react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

const mockNotifications = [
  {
    id: '1',
    userAvatar: 'https://avatar.vercel.sh/user1.png',
    title: 'Buy Yes',
    description: 'Bitcoin will reach $100k by 2025?',
    extraInfo: '2.04 shares @ 49.0¢',
    timeAgo: '1d',
    isRead: false,
  },
]

export default function HeaderNotifications() {
  const unreadCount = mockNotifications.filter(n => !n.isRead).length
  const hasNotifications = mockNotifications.length > 0

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" size="icon" variant="ghost" className="relative">
          <BellIcon className="size-5" />
          {unreadCount > 0 && (
            <span
              className={`
                absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-xs
                font-medium text-destructive-foreground
              `}
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        className="max-h-[400px] w-[380px] overflow-hidden"
        align="end"
        sideOffset={8}
        alignOffset={-20}
      >
        <div className="border-b border-border px-3 py-2">
          <h3 className="text-sm font-semibold text-foreground">Notifications</h3>
        </div>

        <div className="max-h-[400px] overflow-y-auto">
          {!hasNotifications && (
            <div className="p-4 text-center text-muted-foreground">
              <BellIcon className="mx-auto mb-2 h-8 w-8 opacity-50" />
              <p className="text-sm">You have no notifications.</p>
            </div>
          )}

          {hasNotifications && (
            <div className="divide-y divide-border">
              {mockNotifications.map(notification => (
                <div
                  key={notification.id}
                  className="flex cursor-pointer items-start gap-3 p-3 transition-colors hover:bg-accent/50"
                >
                  <div className="flex-shrink-0">
                    <Image
                      src={notification.userAvatar}
                      alt="User avatar"
                      width={42}
                      height={42}
                      className="rounded-md object-cover"
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <h4 className="text-sm leading-tight font-semibold text-foreground">
                          {notification.title}
                        </h4>
                        <p className="mt-1 line-clamp-2 text-xs leading-tight text-muted-foreground">
                          {notification.description}
                        </p>
                      </div>

                      <div className="flex flex-shrink-0 items-center gap-1">
                        <span className="text-xs text-muted-foreground">
                          {notification.timeAgo}
                        </span>
                        <ExternalLinkIcon className="h-3 w-3 text-muted-foreground" />
                      </div>
                    </div>

                    <div className="mt-1">
                      <p className="text-xs text-foreground">
                        {notification.extraInfo}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
