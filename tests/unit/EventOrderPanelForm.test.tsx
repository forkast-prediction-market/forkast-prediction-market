import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import EventOrderPanelForm from '@/app/(platform)/event/[slug]/_components/EventOrderPanelForm'
import { ORDER_SIDE, OUTCOME_INDEX } from '@/lib/constants'

const {
  mockOpen,
  mockClose,
  mockSignTypedDataAsync,
  mockTriggerConfetti,
  mockToastError,
  mockToastSuccess,
  mockToastInfo,
  storeOrderActionMock,
  mockCalculateSellAmount,
  mockGetAvgSellPrice,
} = vi.hoisted(() => ({
  mockOpen: vi.fn(),
  mockClose: vi.fn(),
  mockSignTypedDataAsync: vi.fn(),
  mockTriggerConfetti: vi.fn(),
  mockToastError: vi.fn(),
  mockToastSuccess: vi.fn(),
  mockToastInfo: vi.fn(),
  storeOrderActionMock: vi.fn(),
  mockCalculateSellAmount: vi.fn(() => 12.34),
  mockGetAvgSellPrice: vi.fn(() => '42'),
}))

let mockIsConnected = true
let mockEmbeddedWalletInfo: any
let mockUser: { address: string } | null = { address: '0xUser' }
let mockAmountAsNumber = 10
let mockYesPrice = 60
let mockIsBinaryMarket = false
let mockIsLimitOrder = false
let orderState: any
let queryClient: QueryClient
const fetchMock = vi.fn()
const originalFetch = globalThis.fetch

beforeAll(() => {
  globalThis.fetch = fetchMock
})

afterAll(() => {
  globalThis.fetch = originalFetch
})

vi.mock('@/lib/appkit', () => ({
  defaultNetwork: { id: 137 },
}))

vi.mock('@/stores/useOrder', () => ({
  useOrder: (selector?: any) => (selector ? selector(orderState) : orderState),
  useAmountAsNumber: () => mockAmountAsNumber,
  useYesPrice: () => mockYesPrice,
  useNoPrice: () => 100 - mockYesPrice,
  useIsBinaryMarket: () => mockIsBinaryMarket,
  useIsLimitOrder: () => mockIsLimitOrder,
  calculateSellAmount: mockCalculateSellAmount,
  getAvgSellPrice: mockGetAvgSellPrice,
}))

vi.mock('@reown/appkit/react', () => ({
  useAppKit: () => ({ open: mockOpen, close: mockClose }),
  useAppKitAccount: () => ({ isConnected: mockIsConnected, embeddedWalletInfo: mockEmbeddedWalletInfo }),
}))

vi.mock('wagmi', () => ({
  useSignTypedData: () => ({ signTypedDataAsync: mockSignTypedDataAsync }),
}))

vi.mock('sonner', () => ({
  toast: {
    error: mockToastError,
    success: mockToastSuccess,
    info: mockToastInfo,
  },
}))

vi.mock('@/lib/utils', () => ({
  cn: (...inputs: any[]) => inputs.filter(Boolean).join(' '),
  triggerConfetti: mockTriggerConfetti,
}))

vi.mock('@/app/(platform)/event/[slug]/_actions/store-order', () => ({
  storeOrderAction: storeOrderActionMock,
}))

vi.mock('@/stores/useUser', () => ({
  useUser: () => mockUser,
}))

vi.mock('next/form', () => ({
  default: ({ action, children, className }: any) => (
    <form
      data-testid="event-order-form"
      className={className}
      onSubmit={(event) => {
        event.preventDefault()
        return action()
      }}
    >
      {children}
    </form>
  ),
}))

vi.mock('@/app/(platform)/event/[slug]/_components/EventOrderPanelBuySellTabs', () => ({
  default: () => <div data-testid="tabs" />,
}))
vi.mock('@/app/(platform)/event/[slug]/_components/EventOrderPanelEarnings', () => ({
  default: () => <div data-testid="earnings" />,
}))
vi.mock('@/app/(platform)/event/[slug]/_components/EventOrderPanelInput', () => ({
  default: () => <div data-testid="input" />,
}))
vi.mock('@/app/(platform)/event/[slug]/_components/EventOrderPanelLimitControls', () => ({
  default: () => <div data-testid="limit-controls" />,
}))
vi.mock('@/app/(platform)/event/[slug]/_components/EventOrderPanelMarketInfo', () => ({
  default: () => <div data-testid="market-info" />,
}))
vi.mock('@/app/(platform)/event/[slug]/_components/EventOrderPanelMobileMarketInfo', () => ({
  default: () => <div data-testid="mobile-market-info" />,
}))
vi.mock('@/app/(platform)/event/[slug]/_components/EventOrderPanelOutcomeButton', () => ({
  default: () => <button type="button">Outcome</button>,
}))
vi.mock('@/app/(platform)/event/[slug]/_components/EventOrderPanelSubmitButton', () => ({
  default: () => <button type="submit">Submit</button>,
}))
vi.mock('@/app/(platform)/event/[slug]/_components/EventOrderPanelTermsDisclaimer', () => ({
  default: () => <div data-testid="disclaimer" />,
}))
vi.mock('@/app/(platform)/event/[slug]/_components/EventOrderPanelUserShares', () => ({
  default: () => <div data-testid="user-shares" />,
}))
vi.mock('@/app/(platform)/event/[slug]/_components/EventTradeToast', () => ({
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}))

describe('eventOrderPanelForm', () => {
  beforeEach(() => {
    mockOpen.mockClear()
    mockClose.mockClear()
    mockSignTypedDataAsync.mockReset()
    mockTriggerConfetti.mockClear()
    mockToastError.mockClear()
    mockToastSuccess.mockClear()
    storeOrderActionMock.mockReset()
    mockCalculateSellAmount.mockClear()
    mockCalculateSellAmount.mockReturnValue(12.34)
    mockGetAvgSellPrice.mockClear()
    mockGetAvgSellPrice.mockReturnValue('42')

    queryClient = new QueryClient()
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ data: [] }),
    } as any)

    mockIsConnected = true
    mockEmbeddedWalletInfo = undefined
    mockUser = { address: '0xUser' }
    mockAmountAsNumber = 10
    mockYesPrice = 60
    mockIsBinaryMarket = false
    mockIsLimitOrder = false

    orderState = {
      amount: '10.00',
      limitPrice: '0',
      limitShares: '0',
      side: ORDER_SIDE.BUY,
      type: 'MARKET',
      isLoading: false,
      market: {
        condition_id: 'cond-123',
        probability: 50,
      },
      outcome: {
        outcome_index: OUTCOME_INDEX.YES,
        outcome_text: 'Outcome A',
        token_id: '42',
      },
      event: null,
      lastMouseEvent: null,
      setIsLoading: vi.fn(),
      setAmount: vi.fn(),
      setUserShares: vi.fn(),
    }
  })

  function renderComponent(isMobile = false) {
    return render(
      <QueryClientProvider client={queryClient}>
        <EventOrderPanelForm isMobile={isMobile} event={{ slug: 'event-slug', title: 'Sample Event' } as any} />
      </QueryClientProvider>,
    )
  }

  it('opens the wallet modal when the user is not connected', async () => {
    mockIsConnected = false

    renderComponent()
    fireEvent.submit(screen.getByTestId('event-order-form'))

    await Promise.resolve()

    expect(mockOpen).toHaveBeenCalledTimes(1)
    expect(mockSignTypedDataAsync).not.toHaveBeenCalled()
    expect(storeOrderActionMock).not.toHaveBeenCalled()
  })

  it('shows a validation error when limit order price is invalid', async () => {
    mockIsLimitOrder = true
    orderState.type = 'LIMIT'
    orderState.limitPrice = 'not-a-number'
    orderState.limitShares = '0'

    renderComponent()
    fireEvent.submit(screen.getByTestId('event-order-form'))

    await waitFor(() =>
      expect(mockToastError).toHaveBeenCalledWith('Invalid limit price', expect.objectContaining({ description: expect.any(String) })),
    )
    expect(mockSignTypedDataAsync).not.toHaveBeenCalled()
  })

  it('submits a valid market buy order and triggers success handlers', async () => {
    mockSignTypedDataAsync.mockResolvedValue('0xsigned')
    storeOrderActionMock.mockResolvedValue(null)

    renderComponent()
    fireEvent.submit(screen.getByTestId('event-order-form'))

    await waitFor(() => expect(storeOrderActionMock).toHaveBeenCalledTimes(1))

    expect(mockSignTypedDataAsync).toHaveBeenCalledTimes(1)
    expect(mockOpen).toHaveBeenCalledWith(expect.objectContaining({ view: 'ApproveTransaction' }))
    expect(mockClose).toHaveBeenCalled()

    const payload = storeOrderActionMock.mock.calls[0][0]

    expect(payload).toMatchObject({
      salt: '333000003',
      token_id: '42',
      maker_amount: expect.any(String),
      taker_amount: expect.any(String),
      side: orderState.side,
      type: orderState.type,
      condition_id: orderState.market.condition_id,
      slug: 'event-slug',
      signature: '0xsigned',
    })

    expect(orderState.setIsLoading).toHaveBeenNthCalledWith(1, true)
    expect(orderState.setIsLoading).toHaveBeenLastCalledWith(false)
    expect(orderState.setAmount).toHaveBeenCalledWith('0.00')
    expect(mockTriggerConfetti).toHaveBeenCalledWith('yes', null)
    expect(mockToastSuccess).toHaveBeenCalledWith(
      'Buy $10.00 on Outcome A',
      expect.objectContaining({ description: expect.any(Object) }),
    )
  })

  it('avoids opening the approve transaction modal for embedded wallets', async () => {
    mockEmbeddedWalletInfo = { user: {}, authProvider: 'email', accountType: 'eoa', isSmartAccountDeployed: false }
    mockSignTypedDataAsync.mockResolvedValue('0xsigned')
    storeOrderActionMock.mockResolvedValue(null)

    renderComponent()
    fireEvent.submit(screen.getByTestId('event-order-form'))

    await waitFor(() => expect(storeOrderActionMock).toHaveBeenCalledTimes(1))

    expect(mockSignTypedDataAsync).toHaveBeenCalledTimes(1)
    expect(mockOpen).not.toHaveBeenCalled()
    expect(mockClose).not.toHaveBeenCalled()
  })

  it('shows an error toast when the trade fails to persist', async () => {
    mockSignTypedDataAsync.mockResolvedValue('0xsigned')
    storeOrderActionMock.mockResolvedValue({ error: 'No liquidity' })

    renderComponent()
    fireEvent.submit(screen.getByTestId('event-order-form'))

    await waitFor(() => expect(mockToastError).toHaveBeenCalledWith('Trade failed', expect.any(Object)))

    expect(orderState.setAmount).not.toHaveBeenCalledWith('0.00')
    expect(mockTriggerConfetti).not.toHaveBeenCalled()
    expect(mockOpen).toHaveBeenCalledWith(expect.objectContaining({ view: 'ApproveTransaction' }))
    expect(mockClose).toHaveBeenCalled()
  })
})
