export function calculateWinnings(amount: number, price: number): number {
  return amount / price - amount
}

export const mockUser = {
  portfolio: 2847.32,
  cash: 1205.67,
  isConnected: true,
  shares: {
    '1-yes': 2.3,
    '1-no': 0,
    '2-yes': 5.7,
    '2-no': 1.2,
    '3-yes': 0,
    '3-no': 3.4,
    '4-yes': 1.8,
    '4-no': 0,
    '5-brazil': 0.5,
    '5-france': 1.1,
    '5-england': 0,
    '5-argentina': 0,
    '5-other': 0,
    '6-yes': 0,
    '6-no': 0.9,
  },
}
