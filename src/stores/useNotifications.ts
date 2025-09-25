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
        if (response.status === 401) {
          throw new Error('Unauthenticated.')
        }
        throw new Error(`Failed to fetch notifications: ${response.statusText}`)
      }

      const notifications: Notification[] = await response.json()
      set({ notifications, isLoading: false })
    }
    catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch notifications'
      set({ error: errorMessage, isLoading: false })
      console.error('Error fetching notifications:', error)
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
        if (response.status === 401) {
          throw new Error('Unauthenticated.')
        }
        if (response.status === 404) {
          throw new Error('Notification not found')
        }
        if (response.status === 403) {
          throw new Error('Not authorized to delete this notification')
        }
        throw new Error(`Failed to delete notification: ${response.statusText}`)
      }

      set({ notifications: get().notifications.filter(notification => notification.id !== notificationId) })
    }
    catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete notification'
      set({ error: errorMessage })
      console.error('Error deleting notification:', error)
      throw error
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
