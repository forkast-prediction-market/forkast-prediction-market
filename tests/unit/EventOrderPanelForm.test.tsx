import type { ReactNode } from 'react'
import type { OrderValidationResult } from '@/lib/orders/validation'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import EventOrderPanelForm from '@/app/(platform)/event/[slug]/_components/EventOrderPanelForm'
import { ORDER_SIDE, OUTCOME_INDEX } from '@/lib/constants'

const {
  mockOpen,
  mockClose,
  mockSignTypedDataAsync,
  mockHandleValidationError,
  mockHandleSuccess,
  mockHandleError,
  mockNotifyWalletApproval,
  mockBuildOrderPayload,
  mockSubmitOrder,
} = vi.hoisted(() => ({
  mockOpen: vi.fn(),
  mockClose: vi.fn(),
  mockSignTypedDataAsync: vi.fn(),
  mockHandleValidationError: vi.fn(),
  mockHandleSuccess: vi.fn(),
  mockHandleError: vi.fn(),
  mockNotifyWalletApproval: vi.fn(),
  mockBuildOrderPayload: vi.fn(() => ({
    salt: 1n,
    maker: '0xUser',
    signer: '0xUser',
    taker: '0xUser',
    referrer: '0xUser',
    affiliate: '0xUser',
    token_id: 1n,
    maker_amount: 1n,
    taker_amount: 1n,
    expiration: 1n,
    nonce: 1n,
    fee_rate_bps: 1n,
    affiliate_percentage: 0n,
    side: ORDER_SIDE.BUY,
    signature_type: 0,
  })),
  mockSubmitOrder: vi.fn(),
}))

let mockIsConnected = true
let mockEmbeddedWalletInfo: any
let mockUser: { id: string, address: string } | null = { id: 'user-1', address: '0xUser' }
let mockAmountAsNumber = 10
let mockYesPrice = 60
let mockNoPrice = 40
let mockIsBinaryMarket = false
let mockIsLimitOrder = false
let orderState: any
let queryClient: QueryClient

vi.mock('@/lib/appkit', () => ({
  defaultNetwork: { id: 137 },
}))

vi.mock('@/stores/useOrder', () => ({
  useOrder: (selector?: any) => (selector ? selector(orderState) : orderState),
  useAmountAsNumber: () => mockAmountAsNumber,
  useYesPrice: () => mockYesPrice,
  useNoPrice: () => mockNoPrice,
  useIsBinaryMarket: () => mockIsBinaryMarket,
  useIsLimitOrder: () => mockIsLimitOrder,
}))

vi.mock('@/hooks/useBalance', () => ({
  useBalance: () => ({
    balance: { raw: 100, text: '100.00', symbol: 'USDC' },
  }),
}))

vi.mock('@/hooks/useUserOutcomePositions', () => ({
  useUserOutcomePositions: () => ({
    sharesByCondition: {},
  }),
}))

vi.mock('@/hooks/useAppKit', () => ({
  useAppKit: () => ({ open: mockOpen, close: mockClose }),
}))

vi.mock('@reown/appkit/react', async () => {
  const actual = await vi.importActual<typeof import('@reown/appkit/react')>('@reown/appkit/react')
  return {
    ...actual,
    useAppKitAccount: () => ({ isConnected: mockIsConnected, embeddedWalletInfo: mockEmbeddedWalletInfo }),
  }
})

vi.mock('wagmi', () => ({
  useSignTypedData: () => ({ signTypedDataAsync: mockSignTypedDataAsync }),
}))

vi.mock('@/stores/useUser', () => ({
  useUser: () => mockUser,
}))

vi.mock('@/lib/orders', () => ({
  buildOrderPayload: mockBuildOrderPayload,
  submitOrder: mockSubmitOrder,
}))

type ValidateOrderFn = (...args: any[]) => OrderValidationResult
const mockValidateOrder = vi.fn<ValidateOrderFn>(() => ({ ok: true }))
vi.mock('@/lib/orders/validation', () => ({
  validateOrder: (...args: any[]) => mockValidateOrder(...args),
}))

vi.mock('@/app/(platform)/event/[slug]/_components/helpers/feedback', () => ({
  handleOrderSuccessFeedback: (...args: any[]) => mockHandleSuccess(...args),
  handleOrderErrorFeedback: (...args: any[]) => mockHandleError(...args),
  handleValidationError: (...args: any[]) => mockHandleValidationError(...args),
  notifyWalletApprovalPrompt: (...args: any[]) => mockNotifyWalletApproval(...args),
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
  default: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
}))
vi.mock('@/app/(platform)/event/[slug]/_components/EventOrderPanelEarnings', () => ({
  default: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
}))
vi.mock('@/app/(platform)/event/[slug]/_components/EventOrderPanelInput', () => ({
  default: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
}))
vi.mock('@/app/(platform)/event/[slug]/_components/EventOrderPanelLimitControls', () => ({
  default: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
}))
vi.mock('@/app/(platform)/event/[slug]/_components/EventOrderPanelMarketInfo', () => ({
  default: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
}))
vi.mock('@/app/(platform)/event/[slug]/_components/EventOrderPanelMobileMarketInfo', () => ({
  default: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
}))
vi.mock('@/app/(platform)/event/[slug]/_components/EventOrderPanelOutcomeButton', () => ({
  default: ({ children }: { children?: ReactNode }) => <button type="button">{children}</button>,
}))
vi.mock('@/app/(platform)/event/[slug]/_components/EventOrderPanelSubmitButton', () => ({
  default: ({ children }: any) => <button type="submit">{children ?? 'Submit'}</button>,
}))
vi.mock('@/app/(platform)/event/[slug]/_components/EventOrderPanelTermsDisclaimer', () => ({
  default: () => <div />,
}))
vi.mock('@/app/(platform)/event/[slug]/_components/EventOrderPanelUserShares', () => ({
  default: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
}))

describe('eventOrderPanelForm', () => {
  beforeEach(() => {
    mockOpen.mockClear()
    mockClose.mockClear()
    mockSignTypedDataAsync.mockReset()
    mockHandleValidationError.mockClear()
    mockHandleSuccess.mockClear()
    mockHandleError.mockClear()
    mockNotifyWalletApproval.mockClear()
    mockBuildOrderPayload.mockClear()
    mockSubmitOrder.mockClear()
    mockValidateOrder.mockClear()

    queryClient = new QueryClient()
    mockIsConnected = true
    mockEmbeddedWalletInfo = undefined
    mockUser = { id: 'user-1', address: '0xUser' }
    mockAmountAsNumber = 10
    mockYesPrice = 60
    mockNoPrice = 40
    mockIsBinaryMarket = false
    mockIsLimitOrder = false

    orderState = {
      amount: '10.00',
      limitPrice: '0',
      limitShares: '0',
      side: ORDER_SIDE.BUY,
      type: 'MARKET',
      limitExpirationEnabled: false,
      limitExpirationOption: 'end-of-day',
      isLoading: false,
      market: {
        condition_id: 'cond-123',
        probability: 50,
        outcomes: [
          { outcome_index: OUTCOME_INDEX.YES, outcome_text: 'Yes', token_id: '1', buy_price: 50 },
          { outcome_index: OUTCOME_INDEX.NO, outcome_text: 'No', token_id: '2', buy_price: 50 },
        ],
      },
      outcome: {
        outcome_index: OUTCOME_INDEX.YES,
        outcome_text: 'Yes',
        token_id: '1',
        buy_price: 50,
      },
      event: null,
      lastMouseEvent: null,
      userShares: {},
      inputRef: { current: null },
      setIsLoading: vi.fn(),
      setAmount: vi.fn(),
      setUserShares: vi.fn(),
      setSide: vi.fn(),
      setType: vi.fn(),
      setLimitPrice: vi.fn(),
      setLimitShares: vi.fn(),
      setLimitExpirationEnabled: vi.fn(),
      setLimitExpirationOption: vi.fn(),
      setIsMobileOrderPanelOpen: vi.fn(),
      setLastMouseEvent: vi.fn(),
      setOutcome: vi.fn(),
    }
  })

  function renderComponent(isMobile = false) {
    return render(
      <QueryClientProvider client={queryClient}>
        <EventOrderPanelForm isMobile={isMobile} event={{ slug: 'event-slug', title: 'Sample Event' } as any} />
      </QueryClientProvider>,
    )
  }

  it('invokes validation helper when prerequisites are missing', async () => {
    mockValidateOrder.mockReturnValueOnce({ ok: false, reason: 'NOT_CONNECTED' })
    mockIsConnected = false

    renderComponent()
    fireEvent.submit(screen.getByTestId('event-order-form'))

    await waitFor(() => expect(mockHandleValidationError).toHaveBeenCalledWith('NOT_CONNECTED', expect.anything()))
    expect(mockSignTypedDataAsync).not.toHaveBeenCalled()
    expect(mockSubmitOrder).not.toHaveBeenCalled()
  })

  it('submits an order and triggers success feedback', async () => {
    mockSignTypedDataAsync.mockResolvedValue('0xsigned')
    mockSubmitOrder.mockResolvedValue({})

    renderComponent()
    fireEvent.submit(screen.getByTestId('event-order-form'))

    await waitFor(() => expect(mockSubmitOrder).toHaveBeenCalledTimes(1))

    expect(mockBuildOrderPayload).toHaveBeenCalled()
    expect(mockSignTypedDataAsync).toHaveBeenCalled()
    expect(mockNotifyWalletApproval).toHaveBeenCalled()
    expect(mockHandleSuccess).toHaveBeenCalledWith(expect.objectContaining({
      eventSlug: 'event-slug',
      side: ORDER_SIDE.BUY,
    }))
    expect(orderState.setIsLoading).toHaveBeenNthCalledWith(1, true)
    expect(orderState.setIsLoading).toHaveBeenLastCalledWith(false)
  })

  it('does not show wallet approval prompt for embedded wallets', async () => {
    mockEmbeddedWalletInfo = { user: {}, authProvider: 'email' }
    mockSignTypedDataAsync.mockResolvedValue('0xsigned')
    mockSubmitOrder.mockResolvedValue({})

    renderComponent()
    fireEvent.submit(screen.getByTestId('event-order-form'))

    await waitFor(() => expect(mockSubmitOrder).toHaveBeenCalledTimes(1))

    expect(mockNotifyWalletApproval).not.toHaveBeenCalled()
  })

  it('routes submission errors to feedback helper', async () => {
    mockSignTypedDataAsync.mockResolvedValue('0xsigned')
    mockSubmitOrder.mockResolvedValue({ error: 'No liquidity' })

    renderComponent()
    fireEvent.submit(screen.getByTestId('event-order-form'))

    await waitFor(() => expect(mockHandleError).toHaveBeenCalledWith('Trade failed', 'No liquidity'))
  })
})
