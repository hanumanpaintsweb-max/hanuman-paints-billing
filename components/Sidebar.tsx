"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Receipt, History, ClockAlert, Users, CalendarDays, Settings, LogOut } from "lucide-react"
import { logoutAdmin } from "@/app/actions/auth"

export default function Sidebar() {
  const pathname = usePathname()

  const navItems = [
    { name: "Billing", path: "/billing", icon: Receipt },
    { name: "Bill History", path: "/history", icon: History },
    { name: "Unpaid Bills", path: "/unpaid", icon: ClockAlert },
    { name: "Customers", path: "/customers", icon: Users },
    { name: "Day Book", path: "/daybook", icon: CalendarDays },
    { name: "Settings", path: "/settings", icon: Settings },
  ]

  const handleLogout = async () => {
    await logoutAdmin()
    window.location.href = "/login"
  }

  return (
    <aside className="fixed left-0 top-0 z-20 flex h-screen w-64 flex-col bg-card-bg border-r border-border-default py-4 no-print shadow-sm">
      <div className="mb-6 px-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-primary/10 border border-primary/20">
            <span className="text-primary font-bold text-lg">HP</span>
          </div>
          <div>
            <h2 className="text-lg font-bold text-primary">Hanuman Paints</h2>
            <p className="text-sm font-medium text-text-muted">Admin Panel</p>
          </div>
        </div>
      </div>
      
      <nav className="flex-1 overflow-y-auto">
        <ul className="flex w-full flex-col gap-1">
          {navItems.map((item) => {
            const isActive = pathname === item.path || pathname.startsWith(item.path + "/")
            const Icon = item.icon
            
            return (
              <li key={item.path}>
                <Link
                  href={item.path}
                  className={`flex items-center gap-3 px-6 py-3 transition-all duration-75 active:scale-[0.98] ${
                    isActive
                      ? "bg-secondary-fixed text-active-blue border-r-4 border-primary font-bold"
                      : "text-text-muted hover:bg-surface-container font-medium"
                  }`}
                >
                  <Icon className={`h-5 w-5 ${isActive ? "text-active-blue" : "text-text-muted"}`} />
                  <span className="text-sm">{item.name}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="mt-auto px-6 pt-4 border-t border-border-default">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-surface-container-highest flex items-center justify-center text-text-main font-bold">
              A
            </div>
            <span className="text-sm font-medium text-text-main">Admin</span>
          </div>
          <button 
            onClick={handleLogout}
            className="p-2 text-text-muted hover:text-error hover:bg-error/10 rounded-full transition-colors"
            title="Logout"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </div>
    </aside>
  )
}
