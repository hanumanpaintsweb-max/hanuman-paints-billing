"use client"

import { Bell } from "lucide-react"

export default function Header() {
  return (
    <header className="sticky top-0 z-10 flex h-16 w-full shrink-0 items-center justify-between border-b border-border-default bg-surface px-6 no-print">
      <div className="flex items-center gap-4">
        <span className="text-xl font-bold text-primary">RetailPOS Terminal</span>
      </div>
    </header>
  )
}
