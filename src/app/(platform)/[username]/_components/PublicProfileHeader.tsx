'use client'

import type { PublicProfile } from '@/types'
import { CheckIcon, CopyIcon } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { useClipboard } from '@/hooks/useClipboard'
import { truncateAddress } from '@/lib/formatters'
import { useUser } from '@/stores/useUser'

interface PublicProfileHeaderProps {
  profile: PublicProfile
}

export default function PublicProfileHeader({ profile }: PublicProfileHeaderProps) {
  const user = useUser()
  const { copied, copy } = useClipboard()

  function handleCopyAddress() {
    copy(profile.address)
  }

  const address = truncateAddress(profile.address)
  const joinDate = new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:gap-8">
      <div className="size-28 overflow-hidden rounded-full border border-border shadow-sm">
        <Image
          src={profile.image}
          alt={`${profile.username || 'User'} avatar`}
          width={112}
          height={112}
          className="size-full object-cover"
        />
      </div>

      <div className="flex-1 space-y-3">
        <h1 className="text-3xl font-bold tracking-tight">
          {profile.username || address}
        </h1>

        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            type="button"
            size="sm"
            onClick={handleCopyAddress}
            className="-ml-2 text-xs text-muted-foreground"
            title={copied ? 'Copied!' : 'Copy address'}
          >
            <span className="font-mono">{address}</span>
            {copied ? <CheckIcon className="size-3 text-yes" /> : <CopyIcon className="size-3" />}
          </Button>

          <span className="text-sm text-muted-foreground">
            Joined
            {' '}
            {joinDate}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-4 lg:self-start">
        {user?.address === profile.address && (
          <Link href="/settings">
            <Button variant="outline">
              Edit profile
            </Button>
          </Link>
        )}
      </div>
    </div>
  )
}
