# Implementation Plan

- [x] 1. Create pagination store with Zustand

  - Implement store for managing infinite scroll state (currentPage, hasMore, isLoading, error)
  - Add actions for setLoading, setError, setHasMore, incrementPage, reset
  - Write unit tests for store actions and state transitions
  - _Requirements: 3.3, 4.4_

- [x] 2. Implement useIntersectionObserver hook

  - Create custom hook to detect when trigger element enters viewport
  - Configure threshold and rootMargin for 200px early loading
  - Add cleanup logic for observer on component unmount
  - Write unit tests for intersection detection and cleanup
  - _Requirements: 1.1, 3.4_

- [x] 3. Create useInfiniteEvents hook

  - Implement hook to manage infinite loading logic with debouncing
  - Add request deduplication and AbortController for cancellation
  - Integrate with pagination store for state management
  - Handle filter changes by resetting pagination state
  - Write unit tests for loading, error handling, and filter reset scenarios
  - _Requirements: 1.4, 2.4, 3.3, 3.4_

- [x] 4. Extend EventModel with pagination support

  - Add offset and limit parameters to listEvents method
  - Implement hasMore calculation based on total count vs loaded count
  - Update database query to include total count for pagination
  - Write unit tests for pagination logic and hasMore calculation
  - _Requirements: 1.1, 2.1, 2.2, 2.3_

- [x] 5. Create client-side events API endpoint

  - Implement /api/events route for client-side pagination requests
  - Support all existing filter parameters (tag, search, bookmarked)
  - Add offset and limit query parameters for pagination
  - Return events array with hasMore and total metadata
  - Write integration tests for API endpoint with different filter combinations
  - _Requirements: 2.1, 2.2, 2.3, 4.4_

- [x] 6. Implement InfiniteEventsLoader component

  - Create trigger component for intersection observer
  - Render loading spinner, error states, and end-of-list message
  - Add "Try Again" button for error recovery with exponential backoff
  - Implement proper loading state transitions
  - Write unit tests for component states and user interactions
  - _Requirements: 1.2, 1.3, 1.4_

- [x] 7. Create EventsGridContainer component

  - Implement container that orchestrates infinite scroll functionality
  - Integrate useInfiniteEvents and useIntersectionObserver hooks
  - Handle initial events from SSR and progressive client-side loading
  - Manage filter changes and automatic pagination reset
  - Write integration tests for filter changes and pagination reset
  - _Requirements: 2.4, 4.1, 4.4_

- [x] 8. Update HomePage to use new infinite scroll architecture

  - Modify page.tsx to pass initial events to EventsGridContainer
  - Maintain SSR for initial 20 events for SEO compatibility
  - Ensure backward compatibility with existing FilterToolbar
  - Preserve all existing URL parameters and routing behavior
  - Write integration tests for SSR + client-side hydration
  - _Requirements: 4.1, 4.2, 4.3_

- [x] 9. Add performance optimizations

  - Implement request caching with 5-minute TTL for same filter parameters
  - Add memory cleanup for large event lists (virtualization threshold)
  - Optimize re-renders with proper memoization of event handlers
  - Add performance monitoring for scroll events and API calls
  - Write performance tests for large datasets and memory usage
  - _Requirements: 3.1, 3.2, 3.3_

- [x] 10. Implement comprehensive error handling

  - Add network error detection and retry logic with exponential backoff
  - Handle edge cases like rapid filter changes and component unmounting
  - Implement proper error boundaries for infinite scroll components
  - Add user-friendly error messages and recovery options
  - Write unit tests for all error scenarios and recovery mechanisms
  - _Requirements: 1.4, 3.4_

- [x] 11. Add end-to-end tests for infinite scroll functionality
  - Test scroll-to-load behavior with different viewport sizes
  - Verify filter application maintains infinite scroll state correctly
  - Test network failure scenarios and recovery mechanisms
  - Validate SSR initial load + client-side progressive loading
  - Test performance with large datasets and rapid scrolling
  - _Requirements: 1.1, 1.2, 1.3, 2.4, 3.1_
