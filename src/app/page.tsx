import React, { Suspense } from "react";
import EventCardSkeleton from "@/components/event/EventCardSkeleton";
import EventsGridContainer from "@/components/event/EventsGridContainer";
import FilterToolbar from "@/components/layout/FilterToolbar";
import { EventModel } from "@/lib/db/events";
import { UserModel } from "@/lib/db/users";

function HomePageSkeleton() {
  const skeletons = Array.from({ length: 20 }, (_, i) => `skeleton-${i}`);
  return skeletons.map((id) => <EventCardSkeleton key={id} />);
}

async function EventsContent({
  tag,
  search,
  bookmarked,
}: {
  tag: string;
  search: string;
  bookmarked: string;
}) {
  const user = await UserModel.getCurrentUser();

  // Load initial 20 events for SSR (SEO compatibility)
  const { data: initialEvents, error } = await EventModel.listEvents({
    tag,
    search,
    userId: user?.id,
    bookmarked: bookmarked === "true",
    limit: 20,
    offset: 0,
  });

  if (error) {
    return <></>;
  }

  return (
    <EventsGridContainer
      initialEvents={initialEvents || []}
      tag={tag}
      search={search}
      bookmarked={bookmarked}
    />
  );
}

export default async function HomePage({ searchParams }: PageProps<"/">) {
  const params = await searchParams;
  const search = (params.search as string) ?? "";
  const tag = (params.tag as string) ?? "trending";
  const bookmarked = (params.bookmarked as string) ?? "false";

  return (
    <main className="container grid gap-4 py-4">
      <FilterToolbar search={search} bookmarked={bookmarked} />

      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        <Suspense fallback={<HomePageSkeleton />}>
          <EventsContent tag={tag} search={search} bookmarked={bookmarked} />
        </Suspense>
      </div>
    </main>
  );
}
