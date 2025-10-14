import type { ProfileResultsProps } from '@/types'
import { LoaderIcon } from 'lucide-react'
import ProfileLink from '@/components/ProfileLink'

export function ProfileResults({ profiles, isLoading, query, onResultClick }: ProfileResultsProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <LoaderIcon className="size-4 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">Searching...</span>
      </div>
    )
  }

  if (profiles.length === 0 && query.length >= 2) {
    return (
      <div className="p-4 text-center text-sm text-muted-foreground">
        No profiles found
      </div>
    )
  }

  if (profiles.length === 0) {
    return null
  }

  return (
    <div className="max-h-96 overflow-y-auto">
      {profiles.map(profile => (
        <div
          key={profile.address}
          onClick={onResultClick}
          className="cursor-pointer px-3 transition-colors first:rounded-t-lg last:rounded-b-lg hover:bg-accent"
        >
          <ProfileLink
            user={{
              address: profile.address,
              username: profile.username,
              image: profile.image,
            }}
          />
        </div>
      ))}
    </div>
  )
}
