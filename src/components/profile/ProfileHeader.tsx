'use client'

import type { PublicProfile } from '@/types'
import { CheckIcon, CopyIcon } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { useClipboard } from '@/hooks/useClipboard'
import { cn, sanitizeSvg } from '@/lib/utils'

interface Props {
  profile: PublicProfile
}

function formatWalletAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`
}

function formatJoinDate(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

export default function ProfileHeader({ profile }: Props) {
  const { copied, copy } = useClipboard()

  function handleCopyAddress() {
    copy(profile.address)
  }

  // Use the same avatar pattern as the header
  const avatarSrc = profile.avatar || `https://avatar.vercel.sh/${profile.username || 'user'}.png`

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:gap-8">
      {/* Avatar */}
      <div className="size-28 overflow-hidden rounded-full border border-border shadow-sm">
        <Image
          src={avatarSrc}
          alt={`${profile.username || 'User'} avatar`}
          width={112}
          height={112}
          className="size-full object-cover"
        />
      </div>

      {/* Identity Block */}
      <div className="flex-1 space-y-3">
        {/* Username */}
        <h1 className="text-3xl font-bold tracking-tight">
          {profile.username || formatWalletAddress(profile.address)}
        </h1>

        {/* Secondary Info - all in one line */}
        <div className="flex items-center gap-4">
          {/* Wallet Address with Copy Button */}
          <button
            type="button"
            onClick={handleCopyAddress}
            className={cn(
              'flex items-center gap-2 text-sm text-muted-foreground transition-colors',
              '-mx-2 -my-1 rounded px-2 py-1 hover:bg-accent hover:text-foreground',
            )}
            title={copied ? 'Copied!' : 'Copy address'}
          >
            <span>{formatWalletAddress(profile.address)}</span>
            {copied
              ? (
                  <CheckIcon className="size-3 text-green-600" />
                )
              : (
                  <CopyIcon className="size-3" />
                )}
          </button>

          {/* Join Date */}
          <span className="text-sm text-muted-foreground">
            Joined
            {' '}
            {formatJoinDate(profile.joinedAt)}
          </span>
        </div>
      </div>

      {/* Right side content */}
      <div className="space-y-4 lg:self-start">
        {/* Edit Profile Button - always show */}
        <Button variant="outline" className="h-11" asChild>
          <Link href="/settings">
            Edit profile
          </Link>
        </Button>

        {/* Logo below Edit Profile */}
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
      </div>
    </div>
  )
}
