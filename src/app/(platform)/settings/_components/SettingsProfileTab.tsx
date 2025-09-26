'use client'

import type { User } from '@/types'
import Form from 'next/form'
import Image from 'next/image'
import { useActionState, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { updateUserAction } from '@/app/(platform)/settings/actions/update-profile'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { InputError } from '@/components/ui/input-error'
import { Label } from '@/components/ui/label'
import { useUser } from '@/stores/useUser'

export default function SettingsProfileTab({ user }: { user: User }) {
  const [state, formAction, isPending] = useActionState((_: any, formData: any) => updateUserAction(formData), {})
  const fileInputRef = useRef<HTMLInputElement>(null)
  const prevPending = useRef(false)
  const [previewImage, setPreviewImage] = useState<string | null>(null)

  useEffect(() => {
    if (prevPending.current && !isPending && !state.errors && !state.error) {
      useUser.setState({ ...user })
      toast.success('Profile updated successfully!')
    }
    prevPending.current = isPending
  }, [isPending, state, user])

  useEffect(() => {
    return () => {
      if (previewImage) {
        URL.revokeObjectURL(previewImage)
      }
    }
  }, [previewImage])

  function generatePreviewUrl(file: File): string {
    return URL.createObjectURL(file)
  }

  function clearPreview() {
    if (previewImage) {
      URL.revokeObjectURL(previewImage)
      setPreviewImage(null)
    }
  }

  function handleUploadClick() {
    fileInputRef.current?.click()
  }

  return (
    <div className="grid gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Profile Settings</h1>
        <p className="mt-2 text-muted-foreground">
          Manage your account profile and preferences.
        </p>
        <p className="text-sm text-destructive">{state.error}</p>
      </div>

      <Form action={formAction} className="grid gap-6" formEncType="multipart/form-data">
        <div className="rounded-lg border p-6">
          <div className="flex items-center gap-4">
            <div className={`
              flex size-16 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-primary
              to-primary/60
            `}
            >
              {previewImage || user.image
                ? (
                    <Image
                      width={42}
                      height={42}
                      src={previewImage || user.image || ''}
                      alt="Profile"
                      className="size-full object-cover"
                    />
                  )
                : (
                    <span className="text-lg font-semibold text-white">
                      U
                    </span>
                  )}
            </div>
            <div className="flex flex-col gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleUploadClick}
                disabled={isPending}
              >
                Upload
              </Button>
              {state.errors?.image && <InputError message={state.errors.image} />}
              <p className="text-xs text-muted-foreground">Max 5MB, JPG/PNG/WEBP only</p>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            name="image"
            className="hidden"
            disabled={isPending}
            accept="image/png,image/jpeg,image/webp"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) {
                if (file.size > 5 * 1024 * 1024) {
                  toast.error('File too big! Max 5MB.')
                  e.target.value = ''
                  clearPreview()
                }
                else {
                  clearPreview()
                  const previewUrl = generatePreviewUrl(file)
                  setPreviewImage(previewUrl)
                }
              }
              else {
                clearPreview()
              }
            }}
          />
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
              maxLength={30}
              defaultValue={user.username}
              disabled={isPending}
              placeholder="Enter your username"
            />
            {state.errors?.username && <InputError message={state.errors.username} />}
          </div>
        </div>

        <Button type="submit" disabled={isPending} className="w-36">
          {isPending ? 'Saving...' : 'Save changes'}
        </Button>
      </Form>
    </div>
  )
}
