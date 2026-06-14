"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { format, addDays, subDays } from "date-fns"
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Printer, IndianRupee, FileText, CheckCircle, Clock } from "lucide-react"

export default function DayBookPage() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [bills, setBills] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const fetchDaybook = async () => {
    setLoading(true)
    
    // Create UTC bounds for the selected local date
    const startOfDay = new Date(selectedDate)
    startOfDay.setHours(0, 0, 0, 0)
    
    const endOfDay = new Date(selectedDate)
    endOfDay.setHours(23, 59, 59, 999)

    const { data } = await supabase
      .from("bills")
      .select("*")
      .eq("is_deleted", false)
      .gte("created_at", startOfDay.toISOString())
      .lte("created_at", endOfDay.toISOString())
      .order("created_at", { ascending: true })

    if (data) {
      setBills(data)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchDaybook()
  }, [selectedDate])

  const navigateDate = (days: number) => {
    setSelectedDate(prev => days === 0 ? new Date() : (days > 0 ? addDays(prev, days) : subDays(prev, Math.abs(days))))
  }

  const totals = {
    sales: bills.reduce((sum, b) => sum + Number(b.total_amount), 0),
    count: bills.length,
    collected: bills.filter(b => b.payment_status === 'paid').reduce((sum, b) => sum + Number(b.total_amount), 0),
    unpaid: bills.filter(b => b.payment_status === 'unpaid').reduce((sum, b) => sum + Number(b.total_amount), 0),
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden">
        <h1 className="text-2xl font-bold text-text-main">Day Book</h1>
        
        <div className="flex items-center gap-2">
          <button onClick={() => navigateDate(-1)} className="h-10 px-3 rounded border border-border-default bg-white hover:bg-surface-container flex items-center gap-1 transition-colors">
            <ChevronLeft className="h-4 w-4" /> Prev
          </button>
          <div className="relative">
            <CalendarIcon className="absolute left-3 top-2.5 h-5 w-5 text-text-muted" />
            <input 
              type="date"
              value={format(selectedDate, "yyyy-MM-dd")}
              onChange={(e) => setSelectedDate(new Date(e.target.value))}
              className="h-10 pl-10 pr-3 rounded border border-border-default bg-white focus:border-primary outline-none font-medium"
            />
          </div>
          <button onClick={() => navigateDate(0)} className="h-10 px-4 rounded border border-border-default bg-white hover:bg-surface-container font-medium transition-colors">
            Today
          </button>
          <button onClick={() => navigateDate(1)} className="h-10 px-3 rounded border border-border-default bg-white hover:bg-surface-container flex items-center gap-1 transition-colors">
            Next <ChevronRight className="h-4 w-4" />
          </button>
          <button onClick={() => window.print()} className="h-10 px-4 ml-2 rounded bg-primary text-white hover:bg-active-blue font-medium flex items-center gap-2 transition-colors">
            <Printer className="h-4 w-4" /> Print
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 print:grid-cols-4">
        <div className="bg-card-bg border border-border-default rounded p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-2 text-text-muted">
            <IndianRupee className="h-5 w-5 text-primary" />
            <span className="font-medium">Total Sales</span>
          </div>
          <h2 className="text-2xl font-bold text-text-main font-mono">₹{totals.sales.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h2>
        </div>
        <div className="bg-card-bg border border-border-default rounded p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-2 text-text-muted">
            <FileText className="h-5 w-5 text-blue-500" />
            <span className="font-medium">Bills Count</span>
          </div>
          <h2 className="text-2xl font-bold text-text-main font-mono">{totals.count}</h2>
        </div>
        <div className="bg-card-bg border border-border-default rounded p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-2 text-text-muted">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <span className="font-medium">Collected</span>
          </div>
          <h2 className="text-2xl font-bold text-text-main font-mono text-green-600">₹{totals.collected.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h2>
        </div>
        <div className="bg-card-bg border border-border-default rounded p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-2 text-text-muted">
            <Clock className="h-5 w-5 text-red-500" />
            <span className="font-medium">Unpaid Added</span>
          </div>
          <h2 className="text-2xl font-bold text-text-main font-mono text-red-600">₹{totals.unpaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h2>
        </div>
      </div>

      {/* Transaction Table */}
      <div className="bg-card-bg border border-border-default rounded shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border-default hidden print:block">
          <h2 className="text-lg font-bold">Day Book - {format(selectedDate, "dd MMM yyyy")}</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-surface-container-low text-xs uppercase text-text-muted border-b border-border-default">
              <tr>
                <th className="px-6 py-4 font-semibold">Time</th>
                <th className="px-6 py-4 font-semibold">Bill No</th>
                <th className="px-6 py-4 font-semibold">Customer</th>
                <th className="px-6 py-4 font-semibold text-right">Amount</th>
                <th className="px-6 py-4 font-semibold text-center">Status</th>
                <th className="px-6 py-4 font-semibold text-center">Mode</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-default text-sm">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-text-muted">Loading transactions...</td>
                </tr>
              ) : bills.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-text-muted">No transactions on this date.</td>
                </tr>
              ) : (
                bills.map(bill => (
                  <tr key={bill.id} className="hover:bg-surface-bg transition-colors">
                    <td className="px-6 py-3 text-text-muted">{format(new Date(bill.created_at), "hh:mm a")}</td>
                    <td className="px-6 py-3 font-medium">{bill.bill_number}</td>
                    <td className="px-6 py-3">{bill.customer_name}</td>
                    <td className="px-6 py-3 text-right font-mono font-medium">₹{Number(bill.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td className="px-6 py-3 text-center">
                      <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${
                        bill.payment_status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {bill.payment_status}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-center text-text-muted uppercase text-xs font-semibold">
                      {bill.payment_method || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
