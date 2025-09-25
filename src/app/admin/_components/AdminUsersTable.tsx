import { MailIcon } from 'lucide-react'
import Image from 'next/image'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'

interface AdminUserRow {
  id: string
  username?: string | null
  email: string
  address: string
  created_label: string
  affiliate_code?: string | null
  referred_by_display?: string | null
  referred_by_profile_url?: string | null
  is_admin: boolean
  avatarUrl: string
  profileUrl: string
}

function formatAddress(address: string) {
  return `${address.slice(0, 4)}…${address.slice(-6)}`
}

export default function AdminUsersTable({ users }: { users: AdminUserRow[] }) {
  return (
    <Card>
      <CardContent className="overflow-x-auto">
        <table className="min-w-full divide-y">
          <thead className="text-xs text-muted-foreground uppercase">
            <tr>
              <th className="px-4 py-3 text-left font-medium">User</th>
              <th className="px-4 py-3 text-left font-medium">Email</th>
              <th className="px-4 py-3 text-left font-medium">Referral</th>
              <th className="px-4 py-3 text-right font-medium">Created</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {users.map(user => (
              <tr key={user.id} className="border-b last:border-b-0">
                <td className="px-4 py-4 align-top">
                  <div className="flex items-start gap-3">
                    <Image
                      src={user.avatarUrl}
                      alt={user.username ?? user.address}
                      width={40}
                      height={40}
                      className="rounded-full"
                    />
                    <div className="flex flex-col gap-1">
                      <a
                        href={user.profileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="font-medium text-foreground hover:text-primary"
                      >
                        <span className="inline-flex items-center gap-2">
                          <span>{user.username ?? formatAddress(user.address)}</span>
                          {user.is_admin && <Badge variant="outline">Admin</Badge>}
                        </span>
                      </a>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4 align-top text-xs text-muted-foreground">
                  {user.email
                    ? (
                        <a
                          href={`mailto:${user.email}`}
                          className="inline-flex items-center gap-1 text-muted-foreground hover:text-primary"
                        >
                          <MailIcon className="size-4" />
                          <span className="sr-only">
                            Email
                            {user.email}
                          </span>
                        </a>
                      )
                    : <span className="italic">hidden</span>}
                </td>
                <td className="px-4 py-4 align-top">
                  {user.referred_by_display
                    ? (
                        <a
                          href={user.referred_by_profile_url ?? '#'}
                          target={user.referred_by_profile_url ? '_blank' : undefined}
                          rel={user.referred_by_profile_url ? 'noreferrer' : undefined}
                          className="text-xs font-medium text-foreground hover:text-primary"
                        >
                          {user.referred_by_display}
                        </a>
                      )
                    : <span className="text-xs text-muted-foreground">—</span>}
                </td>
                <td className="px-4 py-4 text-right align-top text-xs text-muted-foreground">
                  {user.created_label}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  )
}
