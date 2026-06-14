"use client"

import { Bell, UserCircle } from "lucide-react"

export default function Header() {
  return (
    <header className="sticky top-0 z-10 flex h-16 w-full shrink-0 items-center justify-between border-b border-border-default bg-surface px-6 no-print">
      <div className="flex items-center gap-4">
        <span className="text-xl font-bold text-primary">RetailPOS Terminal</span>
      </div>

      <div className="flex items-center gap-2">
        <button 
          onClick={async () => {
            const { supabase } = await import('@/lib/supabase')
            await supabase.auth.signOut()
            window.location.href = '/login'
          }}
          className="px-4 py-1.5 text-sm font-bold bg-error text-white rounded hover:bg-red-700 transition-colors shadow-sm"
        >
          Logout
        </button>
      </div>
    </header>
  )
}
