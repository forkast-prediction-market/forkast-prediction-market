import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  createAppKit: vi.fn(),
  setThemeMode: vi.fn(),
}))

vi.mock('@reown/appkit/react', () => ({
  __esModule: true,
  createAppKit: mocks.createAppKit,
  useAppKitTheme: () => ({ setThemeMode: mocks.setThemeMode }),
}))

vi.mock('@/lib/appkit', () => ({
  __esModule: true,
  projectId: 'test-project',
  defaultNetwork: { id: 1 },
  networks: [{ id: 1 }],
  wagmiAdapter: {},
  wagmiConfig: {},
}))

describe('appKitProvider SSR guard', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.unstubAllGlobals()
    mocks.createAppKit.mockReset()
    mocks.setThemeMode.mockReset()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('does not initialize AppKit during SSR import', async () => {
    const globalAny = globalThis as any
    const originalWindow = globalAny.window
    globalAny.window = undefined

    try {
      await import('@/providers/AppKitProvider')

      expect(mocks.createAppKit).not.toHaveBeenCalled()
    }
    finally {
      globalAny.window = originalWindow
    }
  })
})
