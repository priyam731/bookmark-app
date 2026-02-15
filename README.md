![Untitled design](https://github.com/user-attachments/assets/f437bfdc-afad-41db-bd82-4aa2699ba43a)

A real-time  smart bookmark manager built with Next.js 14, Supabase, and Tailwind CSS. Users can sign in with Google OAuth, add/delete bookmarks, and see changes sync in real-time across multiple tabs.

## Features

- **Google OAuth Authentication** - Sign in with Google (no email/password)
- **Add Bookmarks** - Save URLs with custom titles
- **Delete Bookmarks** - Remove bookmarks you no longer need
- **Real-time Sync** - Bookmarks update instantly across all open tabs without page refresh
- **Private Bookmarks** - Each user can only see their own bookmarks (Row Level Security)
- **Responsive Design** - Works on desktop and mobile

## Tech Stack

- **Frontend:** Next.js 14 (App Router), React, TypeScript
- **Styling:** Tailwind CSS
- **Backend:** Supabase (Auth, PostgreSQL Database, Realtime)
- **Deployment:** Vercel

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account
- Google Cloud Console account (for OAuth)

### 1. Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/bookmark-app.git
cd bookmark-app
npm install
```

### 2. Set up Supabase

1. Create a new project at [supabase.com](https://supabase.com)

2. Run the following SQL in the SQL Editor to create the bookmarks table:

3. Enable Realtime for the bookmarks table:
   - Go to **Database → Replication**
   - Enable replication for the `bookmarks` table

4. Set up Google OAuth:
   - Go to **Authentication → Providers → Google**
   - Enable Google provider
   - Follow the instructions to create OAuth credentials in Google Cloud Console
   - Add your Supabase callback URL: `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`

### 3. Configure environment variables

Create a `.env.local` file:

```bash
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### 4. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 5. Deploy to Vercel

1. Push your code to GitHub
2. Import the repository in Vercel
3. Add the environment variables in Vercel dashboard
4. Deploy

**Important:** After deploying, update:
- **Supabase** → Authentication → URL Configuration:
  - Site URL: `https://your-app.vercel.app`
  - Redirect URLs: Add `https://your-app.vercel.app/auth/callback`
- **Google Cloud Console** → OAuth Client:
  - Add `https://your-app.vercel.app/auth/callback` to authorized redirect URIs

## Project Structure

```
src/
├── app/
│   ├── auth/callback/route.ts    # OAuth callback handler
│   ├── login/page.tsx            # Login page with Google OAuth
│   ├── layout.tsx                # Root layout
│   ├── page.tsx                  # Main dashboard (protected)
│   └── globals.css               # Global styles
├── components/
│   ├── AddBookmarkForm.tsx       # Form to add bookmarks
│   ├── BookmarkItem.tsx          # Individual bookmark display
│   ├── BookmarkList.tsx          # List with real-time subscription
│   └── Dashboard.tsx             # Main dashboard layout
├── lib/supabase/
│   ├── client.ts                 # Browser Supabase client
│   ├── server.ts                 # Server Supabase client
│   └── middleware.ts             # Middleware Supabase client
├── types/
│   └── bookmark.ts               # TypeScript type definitions
└── middleware.ts                 # Auth middleware
```

## Problems Encountered & Solutions

### 1. Real-time updates not working across tabs

**Problem:** Initially, bookmarks added in one tab weren't appearing in other tabs.

**Solution:** The issue was that table replication wasn't enabled in Supabase. Fixed by:
- Going to Database → Replication in Supabase dashboard
- Enabling replication for the `bookmarks` table
- This allows Supabase to broadcast INSERT/DELETE events to all subscribed clients
- Polling remains as a fallback for reliability

### 2. OAuth redirect mismatch errors

**Problem:** After deploying to Vercel, Google OAuth would fail with redirect URI mismatch.

**Solution:** OAuth requires exact URL matching. Fixed by:
- Adding the Vercel production URL to Google Cloud Console's authorized redirect URIs
- Adding the same URL to Supabase's redirect URL allowlist
- Making sure to use `https://` not `http://`

### 3. Session not persisting after page refresh

**Problem:** Users were getting logged out on page refresh.

**Solution:** Implemented Supabase SSR middleware pattern:
- Created `middleware.ts` that runs on every request
- The middleware refreshes the auth session using cookies
- This ensures the session stays valid between requests

### 4. Duplicate bookmarks appearing in real-time

**Problem:** Sometimes the same bookmark would appear twice when added.

**Solution:** Added deduplication check in the real-time INSERT handler:
```typescript
setBookmarks((prev) => {
  if (prev.some((b) => b.id === newBookmark.id)) return prev;
  return [newBookmark, ...prev];
});
```

### 5. Users seeing other users' bookmarks

**Problem:** Initially, all bookmarks were visible to all users.

**Solution:** Implemented Row Level Security (RLS) policies:
- Each policy checks `auth.uid() = user_id`
- Added filter to real-time subscription: `filter: \`user_id=eq.${userId}\``
- This ensures complete data isolation between users

## License

MIT
