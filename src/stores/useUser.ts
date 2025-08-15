import type { User } from '@/types'
import { create } from 'zustand'

export const useUser = create<User | null>()(() => null)
