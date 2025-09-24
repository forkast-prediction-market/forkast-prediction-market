'use client'

import type { Notification } from '@/types'
import { BellIcon, ExternalLinkIcon } from 'lucide-react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { useNotificationList, useNotifications, useUnreadNotificationCount } from '@/stores/useNotifications'

function getNotificationTimeLabel(notification: Notification) {
  if (notification.time_ago) {
    return notification.time_ago
  }

  const createdAt = new Date(notification.created_at)

  if (Number.isNaN(createdAt.getTime())) {
    return ''
  }

  const diffMs = Date.now() - createdAt.getTime()
  const diffMinutes = Math.floor(diffMs / (1000 * 60))

  if (diffMinutes < 1) {
    return 'now'
  }

  if (diffMinutes < 60) {
    return `${diffMinutes}m`
  }

  const diffHours = Math.floor(diffMinutes / 60)

  if (diffHours < 24) {
    return `${diffHours}h`
  }

  const diffDays = Math.floor(diffHours / 24)

  if (diffDays < 7) {
    return `${diffDays}d`
  }

  const diffWeeks = Math.floor(diffDays / 7)

  if (diffWeeks < 4) {
    return `${diffWeeks}w`
  }

  const diffMonths = Math.floor(diffDays / 30)

  if (diffMonths < 12) {
    return `${diffMonths}mo`
  }

  const diffYears = Math.floor(diffDays / 365)
  return `${diffYears}y`
}

export default function HeaderNotifications() {
  const notifications = useNotificationList()
  const unreadCount = useUnreadNotificationCount()
  const markAsRead = useNotifications(state => state.markAsRead)
  const hasNotifications = notifications.length > 0

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
              {notifications.map((notification) => {
                const timeLabel = getNotificationTimeLabel(notification)
                const hasLink = Boolean(notification.link_url)
                const linkIsExternal = notification.link_type === 'external'
                const linkIcon = (
                  <ExternalLinkIcon
                    className={`h-3 w-3 text-muted-foreground ${hasLink ? '' : 'opacity-0'}`}
                  />
                )

                return (
                  <div
                    key={notification.id}
                    className="flex cursor-pointer items-start gap-3 p-3 transition-colors hover:bg-accent/50"
                    onClick={() => {
                      if (!notification.is_read) {
                        markAsRead(notification.id)
                      }
                    }}
                  >
                    <div className="flex-shrink-0">
                      {notification.user_avatar
                        ? (
                            <Image
                              src={notification.user_avatar}
                              alt="User avatar"
                              width={42}
                              height={42}
                              className="rounded-md object-cover"
                            />
                          )
                        : (
                            <div className={`
                              flex h-[42px] w-[42px] items-center justify-center rounded-md bg-muted text-xs
                              font-semibold text-muted-foreground uppercase
                            `}
                            >
                              {notification.title.slice(0, 2)}
                            </div>
                          )}
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
                            {timeLabel}
                          </span>
                          {hasLink
                            ? (
                                <a
                                  href={notification.link_url ?? undefined}
                                  className="inline-flex"
                                  target={linkIsExternal ? '_blank' : undefined}
                                  rel={linkIsExternal ? 'noreferrer noopener' : undefined}
                                  aria-label={notification.link_label ?? 'View notification details'}
                                >
                                  {linkIcon}
                                </a>
                              )
                            : (
                                linkIcon
                              )}
                        </div>
                      </div>

                      {notification.extra_info && (
                        <div className="mt-1">
                          <p className="text-xs text-foreground">
                            {notification.extra_info}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
