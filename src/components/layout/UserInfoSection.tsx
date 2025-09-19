import { CheckIcon, CopyIcon, ExternalLinkIcon } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { useClipboard } from '@/hooks/useClipboard'
import { truncateAddress } from '@/lib/utils'
import { useUser } from '@/stores/useUser'

export default function UserInfoSection() {
  const user = useUser()
  const { copied, copy } = useClipboard()

  const displayUsername = user?.username
    ? user.username.length > 12
      ? `${user.username.slice(0, 12)}...`
      : user.username
    : truncateAddress(user?.address || '')

  const polygonscanUrl = `https://polygonscan.com/address/${user?.address}`

  function handleCopyWallet() {
    copy(user!.address)
  }

  return (
    <div className="flex items-center gap-4 p-4">
      <div className="shrink-0">
        <Image
          src={user?.image || `https://avatar.vercel.sh/${user?.address}.png`}
          alt="User avatar"
          width={48}
          height={48}
          className="rounded-full ring-2 ring-border/20 transition-all duration-200 hover:ring-border/40"
        />
      </div>
      <div className="min-w-0 flex-1 space-y-1.5">
        <Link
          href={`/@${user?.username || user?.address}`}
          className={`
            truncate text-base leading-tight font-semibold text-foreground transition-colors duration-200
            hover:text-primary
          `}
        >
          {displayUsername}
        </Link>
        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            type="button"
            size="sm"
            onClick={handleCopyWallet}
            className="-ml-2 text-xs text-muted-foreground"
            title={copied ? 'Copied!' : 'Copy address'}
          >
            <span className="font-mono">
              {truncateAddress(user?.address || '')}
            </span>
            {copied
              ? (
                  <CheckIcon
                    className="size-3.5 text-green-500"
                    data-testid="check-icon"
                  />
                )
              : <CopyIcon className="size-3.5" data-testid="copy-icon" />}
          </Button>
          <a href={polygonscanUrl} target="_blank">
            <Button
              variant="ghost"
              type="button"
              size="sm"
              className="-ml-2 text-xs text-muted-foreground"
              title="See on polygonscan"
            >
              <ExternalLinkIcon className="size-3.5" />
            </Button>
          </a>
        </div>
      </div>
    </div>
  )
}
