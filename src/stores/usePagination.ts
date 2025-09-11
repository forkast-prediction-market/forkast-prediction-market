import { create } from 'zustand'

interface PaginationState {
  currentPage: number
  hasMore: boolean
  isLoading: boolean
  error: string | null

  // Actions
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  setHasMore: (hasMore: boolean) => void
  incrementPage: () => void
  reset: () => void
}

export const usePagination = create<PaginationState>()(set => ({
  currentPage: 0,
  hasMore: true,
  isLoading: false,
  error: null,

  setLoading: (loading: boolean) => set({ isLoading: loading }),
  setError: (error: string | null) => set({ error }),
  setHasMore: (hasMore: boolean) => set({ hasMore }),
  incrementPage: () => set(state => ({ currentPage: state.currentPage + 1 })),
  reset: () =>
    set({
      currentPage: 0,
      hasMore: true,
      isLoading: false,
      error: null,
    }),
}))
