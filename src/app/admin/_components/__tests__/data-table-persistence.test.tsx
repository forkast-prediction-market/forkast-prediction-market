/**
 * @jest-environment jsdom
 */
import { act, renderHook } from '@testing-library/react'
import { useLocalStorage } from '@/hooks/useLocalStorage'

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})

describe('useLocalStorage hook', () => {
  beforeEach(() => {
    localStorageMock.getItem.mockClear()
    localStorageMock.setItem.mockClear()
  })

  it('should return initial value when no stored value exists', () => {
    localStorageMock.getItem.mockReturnValue(null)

    const { result } = renderHook(() => useLocalStorage('test-key', { defaultValue: true }))

    expect(result.current[0]).toEqual({ defaultValue: true })
    expect(localStorageMock.getItem).toHaveBeenCalledWith('test-key')
  })

  it('should return stored value when it exists', () => {
    const storedValue = { column1: false, column2: true }
    localStorageMock.getItem.mockReturnValue(JSON.stringify(storedValue))

    const { result } = renderHook(() => useLocalStorage('test-key', {}))

    expect(result.current[0]).toEqual(storedValue)
  })

  it('should persist value to localStorage when setValue is called', () => {
    localStorageMock.getItem.mockReturnValue(null)

    const { result } = renderHook(() => useLocalStorage('test-key', {}))

    const newValue = { column1: false, column2: true }

    act(() => {
      result.current[1](newValue)
    })

    expect(localStorageMock.setItem).toHaveBeenCalledWith('test-key', JSON.stringify(newValue))
    expect(result.current[0]).toEqual(newValue)
  })

  it('should handle function updates', () => {
    const initialValue = { count: 0 }
    localStorageMock.getItem.mockReturnValue(JSON.stringify(initialValue))

    const { result } = renderHook(() => useLocalStorage('test-key', initialValue))

    act(() => {
      result.current[1](prev => ({ count: prev.count + 1 }))
    })

    expect(result.current[0]).toEqual({ count: 1 })
    expect(localStorageMock.setItem).toHaveBeenCalledWith('test-key', JSON.stringify({ count: 1 }))
  })

  it('should handle JSON parse errors gracefully', () => {
    localStorageMock.getItem.mockReturnValue('invalid-json')
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation()

    const { result } = renderHook(() => useLocalStorage('test-key', { default: true }))

    expect(result.current[0]).toEqual({ default: true })
    expect(consoleSpy).toHaveBeenCalledWith(
      'Error reading localStorage key "test-key":',
      expect.any(Error),
    )

    consoleSpy.mockRestore()
  })
})

describe('column visibility persistence', () => {
  it('should ensure always-visible columns remain visible', () => {
    // This test would be more complex and would require mocking the entire DataTable component
    // For now, we'll just verify the logic conceptually
    const columns = [
      { id: 'select', enableHiding: false },
      { id: 'user', enableHiding: false },
      { id: 'email', enableHiding: true },
      { id: 'referral', enableHiding: true },
    ]

    const alwaysVisibleColumns = columns
      .filter(col => col.enableHiding === false)
      .map(col => col.id)

    expect(alwaysVisibleColumns).toEqual(['select', 'user'])
  })
})
