"use client"

import Sidebar from "@/components/Sidebar"
import Header from "@/components/Header"
import { useState, useEffect } from "react"
import { Menu } from "lucide-react"
import { usePathname } from "next/navigation"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1400) {
        setIsSidebarOpen(true)
      } else {
        setIsSidebarOpen(false)
      }
    }
    
    // Initial check
    handleResize()
    
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Close sidebar on mobile when route changes
  useEffect(() => {
    if (window.innerWidth < 1400) {
      setIsSidebarOpen(false)
    }
  }, [pathname])

  return (
    <>
      <button 
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="fixed top-4 left-4 z-[1001] bg-white border border-border-default rounded-lg p-2 cursor-pointer shadow-sm print:hidden hover:bg-surface-container transition-colors"
      >
        <Menu className="h-5 w-5 text-text-main" />
      </button>

      {/* Overlay */}
      <div 
        className={`fixed inset-0 bg-black/30 z-[999] print:hidden transition-opacity duration-200 ${isSidebarOpen ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'}`}
        onClick={() => setIsSidebarOpen(false)}
      />

      {/* Sidebar Container */}
      <div 
        className={`fixed left-0 top-0 h-screen w-64 z-[1000] transition-transform duration-200 ease-in-out print:hidden bg-card-bg ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <Sidebar />
      </div>

      <div className="flex h-screen flex-1 flex-col relative w-full overflow-hidden">
        <div className="pl-14">
          <Header />
        </div>
        <main className="flex-1 overflow-y-auto bg-surface-bg p-6 lg:p-8">
          {children}
        </main>
      </div>
    </>
  )
}
