'use client'

import dynamic from 'next/dynamic'
import { User } from '@supabase/supabase-js'

const Dashboard = dynamic(() => import('@/components/Dashboard'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
    </div>
  ),
})

export default function DashboardLoader({ user }: { user: User }) {
  return <Dashboard user={user} />
}
