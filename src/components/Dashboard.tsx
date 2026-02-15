"use client";

import { useState } from "react";
import { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { Bookmark } from "@/types/bookmark";
import AddBookmarkForm from "./AddBookmarkForm";
import BookmarkList from "./BookmarkList";

interface DashboardProps {
  user: User;
}

export default function Dashboard({ user }: DashboardProps) {
  const [newBookmark, setNewBookmark] = useState<Bookmark | null>(null);
  const supabase = createClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-800">Smart Bookmark</h1>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              {user.user_metadata?.avatar_url && (
                <img
                  src={user.user_metadata.avatar_url}
                  alt="Profile"
                  className="w-8 h-8 rounded-full"
                />
              )}
              <span className="text-sm text-gray-600 hidden sm:inline">
                {user.user_metadata?.full_name || user.email}
              </span>
            </div>
            <button
              onClick={handleSignOut}
              className="text-sm text-gray-600 hover:text-gray-800 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <AddBookmarkForm userId={user.id} onBookmarkAdded={setNewBookmark} />
        <BookmarkList userId={user.id} newBookmark={newBookmark} />
      </main>
    </div>
  );
}
