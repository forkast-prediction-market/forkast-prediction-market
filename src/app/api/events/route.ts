import { NextRequest, NextResponse } from "next/server";
import { EventModel } from "@/lib/db/events";
import { UserModel } from "@/lib/db/users";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const tag = searchParams.get("tag") || "trending";
    const search = searchParams.get("search") || "";
    const bookmarked = searchParams.get("bookmarked") === "true";
    const offsetParam = searchParams.get("offset");
    const limitParam = searchParams.get("limit");

    const parsedOffset = offsetParam ? parseInt(offsetParam, 10) : 0;
    const parsedLimit = limitParam ? parseInt(limitParam, 10) : 20;

    const offset = Math.max(0, isNaN(parsedOffset) ? 0 : parsedOffset);
    const limit = Math.max(
      1,
      Math.min(100, isNaN(parsedLimit) ? 20 : parsedLimit)
    );

    // Get user for bookmarked events
    let userId = "";
    if (bookmarked) {
      const user = await UserModel.getCurrentUser();
      if (!user) {
        return NextResponse.json(
          { error: "Authentication required for bookmarked events" },
          { status: 401 }
        );
      }
      userId = user.id;
    }

    // Call the extended EventModel method
    const {
      data: events,
      error,
      hasMore,
      total,
    } = await EventModel.listEventsWithPagination({
      tag,
      search: search || undefined,
      userId: userId || undefined,
      bookmarked,
      offset,
      limit,
    });

    if (error) {
      console.error("Error fetching events:", error);
      return NextResponse.json(
        { error: "Failed to fetch events" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      events: events || [],
      hasMore,
      total,
    });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
