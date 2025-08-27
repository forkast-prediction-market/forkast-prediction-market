import { useCallback, useState } from 'react'

export function useMenuState() {
  const [openMenuId, setOpenMenuId] = useState<number | null>(null)

  const openMenu = useCallback((id: number) => setOpenMenuId(id), [])
  const closeMenu = useCallback(() => setOpenMenuId(null), [])
  const toggleMenu = useCallback((id: number) =>
    setOpenMenuId(prev => prev === id ? null : id), [])

  return { openMenuId, openMenu, closeMenu, toggleMenu }
}
