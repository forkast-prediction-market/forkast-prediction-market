import { CheckIcon, CopyIcon, ExternalLinkIcon } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useClipboard } from '@/hooks/useClipboard'
import { truncateAddress } from '@/lib/utils'
import { useUser } from '@/stores/useUser'

export default function UserInfoSection() {
  const user = useUser()
  const { copied, copy } = useClipboard()

  // Username com truncamento
  const displayUsername = user?.username
    ? user.username.length > 12
      ? `${user.username.slice(0, 12)}...`
      : user.username
    : truncateAddress(user?.address || '')

  // URL do Polygonscan
  const polygonscanUrl = `https://polygonscan.com/address/${user?.address}`

  async function handleCopyWallet() {
    if (user?.address) {
      await copy(user.address)
    }
  }

  function handleOpenPolygonscan() {
    window.open(polygonscanUrl, '_blank')
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
          href={`/${user?.username || user?.address}`}
          className={`
            truncate text-base leading-tight font-semibold text-foreground transition-colors duration-200
            hover:text-primary
          `}
        >
          {displayUsername}
        </Link>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleCopyWallet}
            className={`
              group flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1 text-sm text-muted-foreground
              transition-all duration-200
              hover:bg-muted/60 hover:text-foreground
              focus:ring-2 focus:ring-ring/20 focus:outline-none
              active:scale-95
            `}
            title="Copiar endereço da wallet"
          >
            <span className="font-mono tracking-tight whitespace-nowrap">
              {truncateAddress(user?.address || '')}
            </span>
            <div className="transition-transform duration-200 group-hover:scale-110">
              {copied
                ? (
                    <CheckIcon
                      className="size-3.5 text-green-500"
                      data-testid="check-icon"
                    />
                  )
                : (
                    <CopyIcon className="size-3.5" data-testid="copy-icon" />
                  )}
            </div>
          </button>
          <button
            type="button"
            onClick={handleOpenPolygonscan}
            className={`
              group cursor-pointer rounded-md p-1.5 text-sm text-muted-foreground transition-all duration-200
              hover:bg-muted/60 hover:text-foreground
              focus:ring-2 focus:ring-ring/20 focus:outline-none
              active:scale-95
            `}
            title="Ver no Polygonscan"
          >
            <ExternalLinkIcon className="size-3.5 transition-transform duration-200 group-hover:scale-110" />
          </button>
        </div>
      </div>
    </div>
  )
}
