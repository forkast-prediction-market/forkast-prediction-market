import type { Notification } from '@/types'
import { create } from 'zustand'

interface NotificationsState {
  notifications: Notification[]
  setNotifications: (notifications: Notification[]) => void
  addNotification: (notification: Notification) => void
  removeNotification: (notificationId: string) => void
  markAsRead: (notificationId: string) => void
  markAllAsRead: () => void
}

export const useNotifications = create<NotificationsState>()((set, get) => ({
  notifications: [],
  setNotifications: notifications => set({ notifications }),
  addNotification: (notification) => {
    set({ notifications: [notification, ...get().notifications] })
  },
  removeNotification: (notificationId) => {
    set({ notifications: get().notifications.filter(notification => notification.id !== notificationId) })
  },
  markAsRead: (notificationId) => {
    const readTimestamp = new Date().toISOString()

    set({
      notifications: get().notifications.map(notification =>
        notification.id === notificationId && !notification.is_read
          ? { ...notification, is_read: true, read_at: notification.read_at ?? readTimestamp }
          : notification,
      ),
    })
  },
  markAllAsRead: () => {
    const readTimestamp = new Date().toISOString()

    set({
      notifications: get().notifications.map(notification =>
        notification.is_read
          ? notification
          : { ...notification, is_read: true, read_at: notification.read_at ?? readTimestamp },
      ),
    })
  },
}))

export function useNotificationList() {
  return useNotifications(state => state.notifications)
}

export function useUnreadNotificationCount() {
  return useNotifications(state =>
    state.notifications.reduce((total, notification) => total + (notification.is_read ? 0 : 1), 0),
  )
}
