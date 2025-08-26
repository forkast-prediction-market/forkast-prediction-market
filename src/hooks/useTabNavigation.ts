import { useRouter, useSearchParams } from 'next/navigation'
import { useMemo, useTransition } from 'react'

interface UseTabNavigationProps {
  defaultTab: string
  paramName?: string
  initialTab?: string
}

export function useTabNavigation({
  paramName = 'tab',
  defaultTab,
  initialTab,
}: UseTabNavigationProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const activeTab = useMemo(() => {
    const tabFromURL = searchParams?.get(paramName)
    return tabFromURL || initialTab || defaultTab
  }, [searchParams, paramName, initialTab, defaultTab])

  function handleTabChange(tab: string) {
    startTransition(() => {
      const url = new URL(window.location.href)
      if (tab === defaultTab) {
        url.searchParams.delete(paramName)
      }
      else {
        url.searchParams.set(paramName, tab)
      }

      router.replace(url.toString(), { scroll: false })
    })
  }

  return {
    activeTab,
    handleTabChange,
    isPending,
  }
}
