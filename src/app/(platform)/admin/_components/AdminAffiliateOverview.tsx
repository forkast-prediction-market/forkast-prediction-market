import Image from 'next/image'
import Link from 'next/link'
import { truncateAddress } from '@/lib/utils'

interface AffiliateRow {
  id: string
  username?: string | null
  address: string
  image?: string | null
  affiliate_code?: string | null
  total_referrals: number
  total_volume: number
  total_affiliate_fees: number
}

interface Props {
  rows: AffiliateRow[]
}

function formatCurrency(value: number) {
  if (Number.isNaN(value)) {
    return '$0.00'
  }

  return `$${value.toFixed(2)}`
}

export default function AdminAffiliateOverview({ rows }: Props) {
  if (!rows.length) {
    return (
      <div className="rounded-lg border p-6">
        <h2 className="text-xl font-semibold">Affiliate performance</h2>
        <p className="mt-2 text-sm text-muted-foreground">No affiliate activity recorded yet.</p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border">
      <div className="flex items-center justify-between border-b px-6 py-4">
        <div>
          <h2 className="text-xl font-semibold">Affiliate performance</h2>
          <p className="text-sm text-muted-foreground">Top referring partners and their earnings.</p>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y">
          <thead className="text-xs text-muted-foreground uppercase">
            <tr>
              <th className="px-6 py-3 text-left font-medium">Affiliate</th>
              <th className="px-6 py-3 text-right font-medium">Referrals</th>
              <th className="px-6 py-3 text-right font-medium">Volume</th>
              <th className="px-6 py-3 text-right font-medium">Affiliate fees</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.id} className="border-b last:border-b-0">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <Image
                      src={row.image || `https://avatar.vercel.sh/${row.address}.png`}
                      alt="Affiliate avatar"
                      width={32}
                      height={32}
                      className="rounded-full"
                    />
                    <div className="space-y-0.5">
                      <Link
                        href={`/@${row.username || row.address}`}
                        className="text-sm font-medium hover:text-primary"
                      >
                        {row.username || truncateAddress(row.address)}
                      </Link>
                      {row.affiliate_code && (
                        <p className="text-xs text-muted-foreground">
                          Code:
                          {' '}
                          {row.affiliate_code}
                        </p>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-right text-sm font-medium">
                  {row.total_referrals}
                </td>
                <td className="px-6 py-4 text-right text-sm font-medium">
                  {formatCurrency(row.total_volume)}
                </td>
                <td className="px-6 py-4 text-right text-sm font-medium">
                  {formatCurrency(row.total_affiliate_fees)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
