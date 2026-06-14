"use client"

import { Bell, UserCircle } from "lucide-react"

export default function Header() {
  return (
    <header className="sticky top-0 z-10 flex h-16 w-full shrink-0 items-center justify-between border-b border-border-default bg-surface px-6 no-print">
      <div className="flex items-center gap-4">
        <span className="text-xl font-bold text-primary">RetailPOS Terminal</span>
      </div>

      <div className="flex items-center gap-2">
        <button className="relative flex h-10 w-10 items-center justify-center rounded-full text-primary transition-colors duration-100 hover:bg-surface-container-low active:bg-active-blue active:text-white">
          <Bell className="h-5 w-5" />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-error"></span>
        </button>
        <button className="ml-2 flex h-10 w-10 items-center justify-center rounded-full border border-border-default bg-card-bg text-primary transition-colors duration-100 hover:bg-surface-container-low active:bg-active-blue active:text-white">
          <UserCircle className="h-5 w-5" />
        </button>
      </div>
    </header>
  )
}
