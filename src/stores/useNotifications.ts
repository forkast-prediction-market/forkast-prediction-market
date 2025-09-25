import type { Notification } from '@/types'
import { create } from 'zustand'

interface NotificationsState {
  notifications: Notification[]
  setNotifications: () => Promise<void>
  addNotification: (notification: Notification) => void
  removeNotification: (notificationId: string) => Promise<void>
  isLoading: boolean
  error: string | null
}

export const useNotifications = create<NotificationsState>()((set, get) => ({
  notifications: [],
  isLoading: false,
  error: null,
  setNotifications: async () => {
    set({ isLoading: true, error: null })
    try {
      const response = await fetch('/api/notifications')

      if (!response.ok) {
        throw new Error('Failed to fetch notifications')
      }

      const notifications: Notification[] = await response.json()
      set({ notifications, isLoading: false })
    }
    catch {
      set({ error: 'Failed to fetch notifications', isLoading: false })
    }
  },
  addNotification: (notification) => {
    set({ notifications: [notification, ...get().notifications] })
  },
  removeNotification: async (notificationId) => {
    set({ error: null })
    try {
      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete notification')
      }

      set({ notifications: get().notifications.filter(notification => notification.id !== notificationId) })
    }
    catch {
      set({ error: 'Failed to delete notification' })
      throw new Error('Failed to delete notification')
    }
  },
}))

export function useNotificationList() {
  return useNotifications(state => state.notifications)
}

export function useUnreadNotificationCount() {
  return useNotifications(state => state.notifications.length)
}

export function useNotificationsLoading() {
  return useNotifications(state => state.isLoading)
}

export function useNotificationsError() {
  return useNotifications(state => state.error)
}
