"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Bookmark } from "@/types/bookmark";
import BookmarkItem from "./BookmarkItem";

interface BookmarkListProps {
  userId: string;
  newBookmark?: Bookmark | null;
}

export default function BookmarkList({
  userId,
  newBookmark,
}: BookmarkListProps) {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const lastAddedId = useRef<string | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const supabase = createClient();

  // Immediately prepend a newly added bookmark from the form (same-tab instant update)
  useEffect(() => {
    if (newBookmark && newBookmark.id !== lastAddedId.current) {
      lastAddedId.current = newBookmark.id;
      setBookmarks((prev) => {
        if (prev.some((b) => b.id === newBookmark.id)) return prev;
        return [newBookmark, ...prev];
      });
    }
  }, [newBookmark]);

  // Fetch all bookmarks from DB
  const fetchBookmarks = useCallback(async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from("bookmarks")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (fetchError) throw fetchError;
      setBookmarks(data || []);
      setError(null);
    } catch (err) {
      console.error("Error loading bookmarks:", err);
      setError(err instanceof Error ? err.message : "Failed to load bookmarks");
    } finally {
      setIsLoading(false);
    }
  }, [supabase, userId]);

  // Optimistic delete handler with rollback on failure
  const handleDeleteBookmark = async (bookmarkId: string) => {
    const previousBookmarks = bookmarks;
    setBookmarks((prev) => prev.filter((b) => b.id !== bookmarkId));

    try {
      const { error: deleteError } = await supabase
        .from("bookmarks")
        .delete()
        .eq("id", bookmarkId)
        .eq("user_id", userId);

      if (deleteError) throw deleteError;
    } catch (err) {
      console.error("Failed to delete bookmark:", err);
      setBookmarks(previousBookmarks);
      throw err;
    }
  };

  useEffect(() => {
    // Fetch initial bookmarks
    fetchBookmarks();

    // ── Realtime subscription (instant cross-tab sync when Supabase Realtime is enabled) ──
    const channelName = `bookmarks-${userId}-${Math.random().toString(36).slice(2)}`;

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bookmarks",
        },
        (payload) => {
          // Filter client-side to avoid UUID filter issues on the server
          if (payload.eventType === "INSERT") {
            const inserted = payload.new as Bookmark;
            if (inserted.user_id !== userId) return;
            setBookmarks((prev) => {
              if (prev.some((b) => b.id === inserted.id)) return prev;
              return [inserted, ...prev];
            });
          }

          if (payload.eventType === "DELETE") {
            const deleted = payload.old as Bookmark;
            if (deleted.user_id !== userId) return;
            setBookmarks((prev) => prev.filter((b) => b.id !== deleted.id));
          }

          if (payload.eventType === "UPDATE") {
            const updated = payload.new as Bookmark;
            if (updated.user_id !== userId) return;
            setBookmarks((prev) =>
              prev.map((b) => (b.id === updated.id ? updated : b)),
            );
          }
        },
      )
      .subscribe((status, err) => {
        if (status === "SUBSCRIBED") {
          console.log("Realtime connected for bookmarks");
        } else if (status === "CHANNEL_ERROR") {
          console.error("Realtime channel error:", err);
        } else if (status === "TIMED_OUT") {
          console.error(
            "Realtime timed out — check Supabase Dashboard → Database → Replication",
          );
        }
      });

    // ── Polling fallback (guarantees cross-tab sync even if Realtime isn't enabled) ──
    // Polls every 3 seconds while the tab is visible
    const startPolling = () => {
      if (pollIntervalRef.current) return;
      pollIntervalRef.current = setInterval(() => {
        fetchBookmarks();
      }, 3000);
    };

    const stopPolling = () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };

    // Start polling immediately
    startPolling();

    // Pause polling when tab is hidden, resume + refetch when visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        fetchBookmarks();
        startPolling();
      } else {
        stopPolling();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Cleanup
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      stopPolling();
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4">
        <p className="font-medium mb-1">Unable to load bookmarks</p>
        <p className="text-sm text-red-600">
          Please make sure your database is set up correctly. Check the console
          for details.
        </p>
      </div>
    );
  }

  if (bookmarks.length === 0) {
    return (
      <div className="text-center py-12">
        <svg
          className="mx-auto h-12 w-12 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
          />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900">No bookmarks</h3>
        <p className="mt-1 text-sm text-gray-500">
          Get started by adding your first bookmark.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">
        Your Bookmarks ({bookmarks.length})
      </h2>
      {bookmarks.map((bookmark) => (
        <BookmarkItem
          key={bookmark.id}
          bookmark={bookmark}
          onDelete={handleDeleteBookmark}
        />
      ))}
    </div>
  );
}
