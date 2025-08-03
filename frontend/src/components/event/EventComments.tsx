import { HeartIcon, MoreHorizontalIcon, ShieldIcon } from 'lucide-react'
import Image from 'next/image'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function EventComments() {
  const [newComment, setNewComment] = useState('')

  return (
    <>
      <div className="mt-4 space-y-2">
        <div className="relative">
          <Input
            className={`
              border-border/50 h-11 w-full rounded-lg border px-3 pr-16 text-sm transition-all duration-200 ease-in-out
              dark:border-border/20
              hover:border-border
              focus:border-primary
            `}
            placeholder="Add a comment"
            value={newComment}
            onChange={e => setNewComment(e.target.value)}
          />
          <Button
            size="sm"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium"
            disabled={!newComment.trim()}
          >
            Post
          </Button>
        </div>
        <div className={`
          border-border/50 flex items-center gap-1 rounded-lg border px-3 py-1.5 text-[11px] text-muted-foreground
          dark:border-border/20
        `}
        >
          <ShieldIcon className="h-3 w-3" />
          Beware of external links, they may be phishing attacks.
        </div>
      </div>

      {/* List of Comments */}
      <div className="mt-6 space-y-6">
        {[1, 2, 3].map(comment => (
          <div key={comment} className="space-y-3">
            <div className="flex gap-3">
              <Image
                src={`https://avatar.vercel.sh/user${comment}.png`}
                alt={`user${comment}`}
                width={32}
                height={32}
                className="h-8 w-8 flex-shrink-0 rounded-full object-cover"
              />
              <div className="flex-1">
                <div className="mb-1 flex items-center gap-2">
                  <span className="text-[13px] font-medium">
                    user
                    {comment}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    2h ago
                  </span>
                </div>
                <p className="text-sm">
                  Great analysis! I think Bitcoin has a strong chance of
                  reaching this target given the current market
                  conditions.
                </p>
                <div className="mt-2 flex items-center gap-3">
                  <button
                    type="button"
                    className="text-xs text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Reply
                  </button>
                  <button
                    type="button"
                    className={`
                      flex items-center gap-1 text-xs text-muted-foreground transition-colors
                      hover:text-foreground
                    `}
                  >
                    <HeartIcon className="h-3 w-3" />
                  </button>
                </div>
              </div>
              <button
                type="button"
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                <MoreHorizontalIcon className="h-4 w-4" />
              </button>
            </div>

            {/* Reply example for second comment */}
            {comment === 2 && (
              <div className="ml-11 flex gap-3">
                <Image
                  src="https://avatar.vercel.sh/replier1.png"
                  alt="replier1"
                  width={24}
                  height={24}
                  className="h-6 w-6 flex-shrink-0 rounded-full object-cover"
                />
                <div className="flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <span className="text-[13px] font-medium">
                      replier1
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      1h ago
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    I agree! The institutional adoption has been
                    accelerating this year.
                  </p>
                  <div className="mt-2 flex items-center gap-3">
                    <button
                      type="button"
                      className="text-xs text-muted-foreground transition-colors hover:text-foreground"
                    >
                      Reply
                    </button>
                    <button
                      type="button"
                      className={`
                        flex items-center gap-1 text-xs text-muted-foreground transition-colors
                        hover:text-foreground
                      `}
                    >
                      <HeartIcon className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  )
}
