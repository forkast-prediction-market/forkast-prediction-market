"use client";

import type { Event } from "@/types";
import React, { useCallback, useEffect, useMemo } from "react";
import EventsEmptyState from "@/app/event/[slug]/_components/EventsEmptyState";
import { ErrorBoundary } from "@/components/error/ErrorBoundary";
import EventCard from "@/components/event/EventCard";
import { OpenCardProvider } from "@/components/event/EventOpenCardContext";
import InfiniteEventsLoader from "@/components/event/InfiniteEventsLoader";
import { useInfiniteEvents } from "@/hooks/useInfiniteEvents";
import { useIntersectionObserver } from "@/hooks/useIntersectionObserver";
import { useVirtualization } from "@/hooks/useVirtualization";
import { getMemoryUsage, performanceMonitor } from "@/lib/performance";

interface EventsGridContainerProps {
  initialEvents: Event[];
  tag: string;
  search: string;
  bookmarked: string;
}

const ITEM_HEIGHT = 400; // Approximate height of EventCard
const CONTAINER_HEIGHT = 800; // Viewport height for virtualization
const VIRTUALIZATION_THRESHOLD = 100;

export default function EventsGridContainer({
  initialEvents,
  tag,
  search,
  bookmarked,
}: EventsGridContainerProps) {
  const {
    events,
    isLoading,
    isError,
    hasMore,
    loadMore,
    reset,
    retryCount,
    errorMessage,
  } = useInfiniteEvents({
    initialEvents,
    tag,
    search,
    bookmarked,
  });

  // Memoized load more function to prevent unnecessary re-renders
  const memoizedLoadMore = useCallback(() => {
    performanceMonitor.record("scroll_trigger", 0, {
      eventsCount: events.length,
      memoryUsage: getMemoryUsage(),
    });
    loadMore();
  }, [loadMore, events.length]);

  // Set up intersection observer for infinite scroll trigger
  const triggerRef = useIntersectionObserver({
    threshold: 0,
    rootMargin: "200px",
    onIntersect: memoizedLoadMore,
    enabled: hasMore && !isLoading && !isError,
  });

  // Virtualization for large lists
  const { virtualItems, totalHeight, scrollElementProps, shouldVirtualize } =
    useVirtualization({
      items: events,
      itemHeight: ITEM_HEIGHT,
      containerHeight: CONTAINER_HEIGHT,
      threshold: VIRTUALIZATION_THRESHOLD,
    });

  // Memoized event cards to prevent unnecessary re-renders
  const eventCards = useMemo(() => {
    const itemsToRender = shouldVirtualize
      ? virtualItems
      : events.map((event, index) => ({
          index,
          start: index * ITEM_HEIGHT,
          end: (index + 1) * ITEM_HEIGHT,
          item: event,
        }));

    return itemsToRender.map(({ start, item }) => (
      <div
        key={item.id}
        style={
          shouldVirtualize
            ? {
                position: "absolute",
                top: start,
                left: 0,
                right: 0,
                height: ITEM_HEIGHT,
              }
            : undefined
        }
      >
        <ErrorBoundary
          fallback={
            <div className="flex items-center justify-center p-4 text-sm text-muted-foreground">
              Failed to render event card
            </div>
          }
        >
          <EventCard event={item} />
        </ErrorBoundary>
      </div>
    ));
  }, [events, virtualItems, shouldVirtualize]);

  // Performance monitoring for render cycles
  useEffect(() => {
    performanceMonitor.record("events_render", 0, {
      eventsCount: events.length,
      shouldVirtualize,
      virtualizedItems: shouldVirtualize ? virtualItems.length : 0,
      memoryUsage: getMemoryUsage(),
    });
  }, [events.length, shouldVirtualize, virtualItems.length]);

  // Memory cleanup for large lists
  useEffect(() => {
    const memoryUsage = getMemoryUsage();
    if (memoryUsage && memoryUsage.usagePercentage > 80) {
      console.warn("High memory usage detected:", memoryUsage);
      performanceMonitor.record("memory_warning", memoryUsage.usagePercentage, {
        eventsCount: events.length,
        shouldVirtualize,
      });
    }
  }, [events.length, shouldVirtualize]);

  // Handle error recovery when filters change
  useEffect(() => {
    // Reset error state when filters change to allow fresh attempts
    if (isError) {
      reset();
    }
  }, [tag, search, bookmarked, isError, reset]);

  // Handle empty state
  if (events.length === 0 && !isLoading && !isError) {
    return <EventsEmptyState tag={tag} searchQuery={search} />;
  }

  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        performanceMonitor.record("events_grid_error", 0, {
          errorMessage: error.message,
          componentStack: errorInfo.componentStack,
          eventsCount: events.length,
        });
      }}
    >
      <OpenCardProvider>
        {shouldVirtualize ? (
          <div {...scrollElementProps}>
            <div style={{ height: totalHeight, position: "relative" }}>
              {eventCards}
            </div>
            {/* Infinite scroll loader/trigger */}
            <InfiniteEventsLoader
              triggerRef={triggerRef}
              onLoadMore={memoizedLoadMore}
              isLoading={isLoading}
              hasMore={hasMore}
              isError={isError}
              errorMessage={errorMessage || undefined}
              retryCount={retryCount}
            />
          </div>
        ) : (
          <>
            {/* Render all loaded events */}
            {eventCards}

            {/* Infinite scroll loader/trigger */}
            <InfiniteEventsLoader
              triggerRef={triggerRef}
              onLoadMore={memoizedLoadMore}
              isLoading={isLoading}
              hasMore={hasMore}
              isError={isError}
              errorMessage={errorMessage || undefined}
              retryCount={retryCount}
            />
          </>
        )}
      </OpenCardProvider>
    </ErrorBoundary>
  );
}
