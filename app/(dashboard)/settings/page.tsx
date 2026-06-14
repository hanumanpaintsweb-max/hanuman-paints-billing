"use client"

import { Store } from "lucide-react"

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto w-full">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-text-main">Settings</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Shop Info Card */}
        <div className="bg-card-bg border border-border-default rounded shadow-sm overflow-hidden h-fit">
          <div className="p-4 border-b border-border-default bg-surface flex items-center gap-2">
            <Store className="h-5 w-5 text-primary" />
            <h2 className="font-bold text-text-main">Shop Information</h2>
          </div>
          <div className="p-6 flex flex-col gap-4">
            <div>
              <p className="text-sm text-text-muted mb-1">Store Name</p>
              <p className="font-semibold text-lg text-text-main">Hanuman Paints</p>
            </div>
            <div>
              <p className="text-sm text-text-muted mb-1">Tagline</p>
              <p className="font-medium text-text-main">Authorized Dulux Blue Store</p>
            </div>
            <div>
              <p className="text-sm text-text-muted mb-1">Address</p>
              <p className="font-medium text-text-main">Ward No 16, Lohapatty, Madhubani</p>
            </div>
            <div>
              <p className="text-sm text-text-muted mb-1">Phone</p>
              <p className="font-medium text-text-main">Ph: 8292889540</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
