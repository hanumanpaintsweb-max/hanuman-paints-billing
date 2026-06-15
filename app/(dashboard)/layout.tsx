import Sidebar from "@/components/Sidebar"
import Header from "@/components/Header"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <div className="print:hidden">
        <Sidebar />
      </div>
      <div className="ml-64 flex h-screen flex-1 flex-col relative overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto bg-surface-bg p-6">
          {children}
        </main>
      </div>
    </>
  )
}
