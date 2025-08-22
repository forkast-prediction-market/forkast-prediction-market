'use client'

import type { User } from '@/types'
import Form from 'next/form'
import { useActionState } from 'react'
import { updateUser } from '@/app/settings/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { InputError } from '@/components/ui/input-error'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

export default function ProfileSettings({ user }: { user: User }) {
  const [state, formAction, isPending] = useActionState(updateUser, {})

  return (
    <div className="grid gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Profile Settings</h1>
        <p className="mt-2 text-muted-foreground">
          Manage your account profile and preferences.
        </p>
        <p className="text-sm text-destructive">{state.message}</p>
      </div>

      <Form action={formAction} className="grid gap-6">
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

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="email">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              name="email"
              required
              defaultValue={user.email}
              disabled={isPending}
              placeholder="Enter your email"
            />
            {state.errors?.email && <InputError message={state.errors.email} />}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="username">
              Username
            </Label>
            <Input
              id="username"
              required
              name="username"
              defaultValue={user.username}
              disabled={isPending}
              placeholder="Enter your username"
            />
            {state.errors?.username && <InputError message={state.errors.username} />}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="bio">
              Bio
            </Label>
            <Textarea
              id="bio"
              name="bio"
              defaultValue={user.bio}
              placeholder="Tell us about yourself"
              disabled={isPending}
              rows={4}
            />
            {state.errors?.bio && <InputError message={state.errors.bio} />}
          </div>
        </div>

        <div className="flex justify-start">
          <Button type="submit" disabled={isPending} className="w-36">
            {isPending ? 'Saving...' : 'Save changes'}
          </Button>
        </div>
      </Form>
    </div>
  )
}
