'use client'

import type { User } from '@/types'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { authClient } from '@/lib/auth-client'

export default function ProfileSettings({ user }: { user: User }) {
  const [formData, setFormData] = useState({
    email: user?.email ?? '',
    username: '',
    bio: '',
  })
  const [isPending, startTransition] = useTransition()

  function handleChange(field: string, value: string) {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  function handleSave() {
    startTransition(async () => {
      try {
        await authClient.changeEmail({
          newEmail: formData.email,
        })
        toast.success('Profile saved')
      }
      catch (e: any) {
        toast.error(e.message || 'Failed to save')
      }
    })
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Profile Settings</h1>
        <p className="mt-2 text-muted-foreground">
          Manage your account profile and preferences.
        </p>
      </div>

      <div className="space-y-6">
        {/* Avatar Section */}
        <div className="rounded-lg border p-6">
          <div className="flex items-center gap-4">
            <div className={`
              flex size-16 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/60
            `}
            >
              <span className="text-lg font-semibold text-white">U</span>
            </div>
            <Button variant="outline" size="sm">
              Upload
            </Button>
          </div>
        </div>

        {/* Form Fields */}
        <div className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={e => handleChange('email', e.target.value)}
              placeholder="Enter your email"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="username" className="text-sm font-medium">
              Username
            </label>
            <Input
              id="username"
              value={formData.username}
              onChange={e => handleChange('username', e.target.value)}
              placeholder="Enter your username"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="bio" className="text-sm font-medium">
              Bio
            </label>
            <textarea
              id="bio"
              value={formData.bio}
              onChange={e => handleChange('bio', e.target.value)}
              placeholder="Tell us about yourself"
              className={`
                flex min-h-[80px] w-full rounded-md border bg-input px-3 py-2 text-sm ring-offset-background
                placeholder:text-muted-foreground
                focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none
                disabled:cursor-not-allowed disabled:opacity-50
                dark:bg-input/30
              `}
              rows={4}
            />
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-start">
          <Button onClick={handleSave} disabled={isPending} className="w-36">
            {isPending ? 'Saving...' : 'Save changes'}
          </Button>
        </div>
      </div>
    </div>
  )
}
