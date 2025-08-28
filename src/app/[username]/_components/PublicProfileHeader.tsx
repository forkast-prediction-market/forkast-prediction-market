'use client'

import type { PublicProfile } from '@/types'
import { CheckIcon, CopyIcon } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { useClipboard } from '@/hooks/useClipboard'
import { sanitizeSvg, truncateAddress } from '@/lib/utils'
import { useUser } from '@/stores/useUser'

interface Props {
  profile: PublicProfile
}

export default function PublicProfileHeader({ profile }: Props) {
  const user = useUser()
  const { copied, copy } = useClipboard()

  function handleCopyAddress() {
    copy(profile.address)
  }

  const address = truncateAddress(profile.address)
  const joinDate = new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  const avatarSrc = profile.image || `https://avatar.vercel.sh/${profile.username || 'user'}.png`

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:gap-8">
      <div className="size-28 overflow-hidden rounded-full border border-border shadow-sm">
        <Image
          src={avatarSrc}
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
            className="-ml-2"
            title={copied ? 'Copied!' : 'Copy address'}
          >
            <span className="text-muted-foreground">{address}</span>
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
        <div className="flex items-center gap-2 text-muted-foreground opacity-40 select-none">
          <div
            className="size-8"
            dangerouslySetInnerHTML={{
              __html: sanitizeSvg(process.env.NEXT_PUBLIC_SITE_LOGO_SVG!),
            }}
          />
          <span className="text-xl font-bold">
            {process.env.NEXT_PUBLIC_SITE_NAME}
          </span>
        </div>
        {user?.address === profile.address && (
          <Button variant="outline" asChild>
            <Link href="/settings">
              Edit profile
            </Link>
          </Button>
        )}
      </div>
    </div>
  )
}
