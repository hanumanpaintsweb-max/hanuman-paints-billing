"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { format } from "date-fns"
import { Search, Eye, Edit, Trash2, ChevronLeft, ChevronRight, Filter } from "lucide-react"

export default function HistoryPage() {
  const [bills, setBills] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  
  // Filters
  const [search, setSearch] = useState("")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")

  // Pagination
  const [page, setPage] = useState(1)
  const itemsPerPage = 20

  const fetchBills = async () => {
    setLoading(true)
    let query = supabase
      .from("bills")
      .select("*")
      .eq("is_deleted", false)

    if (search) {
      query = query.or(`bill_number.ilike.%${search}%,customer_name.ilike.%${search}%,customer_phone.ilike.%${search}%`)
    }
    if (statusFilter !== "all") {
      query = query.eq("payment_status", statusFilter)
    }
    if (dateFrom) {
      query = query.gte("created_at", new Date(dateFrom).toISOString())
    }
    if (dateTo) {
      const toDate = new Date(dateTo)
      toDate.setHours(23, 59, 59, 999)
      query = query.lte("created_at", toDate.toISOString())
    }

    // Pagination
    const from = (page - 1) * itemsPerPage
    const to = from + itemsPerPage - 1
    query = query.order("created_at", { ascending: false }).range(from, to)

    const { data, error } = await query
    if (data) {
      setBills(data)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchBills()
  }, [search, statusFilter, dateFrom, dateTo, page])

  const handleDelete = async (id: string) => {
    const pin = prompt("Type '1234' to confirm deletion:")
    if (pin === "1234") {
      await supabase.from("bills").update({ is_deleted: true }).eq("id", id)
      fetchBills()
    } else if (pin !== null) {
      alert("Incorrect PIN.")
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-text-main">Bill History</h1>
      </div>

      {/* Filters Card */}
      <div className="bg-card-bg border border-border-default rounded p-4 flex flex-col md:flex-row gap-4 items-end shadow-sm">
        <div className="flex-1 flex flex-col gap-1.5 w-full">
          <label className="text-sm text-text-muted font-medium">Search</label>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-5 w-5 text-text-muted" />
            <input 
              type="text" 
              placeholder="Name, Phone or Bill No" 
              value={search}
              onChange={(e) => {setSearch(e.target.value); setPage(1)}}
              className="h-10 w-full pl-10 pr-3 rounded border border-border-default bg-surface-container-lowest focus:border-primary outline-none"
            />
          </div>
        </div>
        
        <div className="flex flex-col gap-1.5">
          <label className="text-sm text-text-muted font-medium">From</label>
          <input 
            type="date" 
            value={dateFrom}
            onChange={(e) => {setDateFrom(e.target.value); setPage(1)}}
            className="h-10 px-3 rounded border border-border-default bg-surface-container-lowest focus:border-primary outline-none"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm text-text-muted font-medium">To</label>
          <input 
            type="date" 
            value={dateTo}
            onChange={(e) => {setDateTo(e.target.value); setPage(1)}}
            className="h-10 px-3 rounded border border-border-default bg-surface-container-lowest focus:border-primary outline-none"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm text-text-muted font-medium">Status</label>
          <select 
            value={statusFilter}
            onChange={(e) => {setStatusFilter(e.target.value); setPage(1)}}
            className="h-10 px-3 rounded border border-border-default bg-surface-container-lowest focus:border-primary outline-none min-w-[120px]"
          >
            <option value="all">All</option>
            <option value="paid">Paid</option>
            <option value="unpaid">Unpaid</option>
          </select>
        </div>
      </div>

      {/* Table Card */}
      <div className="bg-card-bg border border-border-default rounded shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead className="bg-surface-container-low text-xs uppercase text-text-muted border-b border-border-default">
              <tr>
                <th className="px-6 py-4 font-semibold">Bill No</th>
                <th className="px-6 py-4 font-semibold">Date</th>
                <th className="px-6 py-4 font-semibold">Customer</th>
                <th className="px-6 py-4 font-semibold text-right">Amount</th>
                <th className="px-6 py-4 font-semibold text-center">Status</th>
                <th className="px-6 py-4 font-semibold text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-default text-sm">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-text-muted">Loading...</td>
                </tr>
              ) : bills.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-text-muted">No bills found.</td>
                </tr>
              ) : (
                bills.map(bill => (
                  <tr key={bill.id} className="hover:bg-surface-bg transition-colors">
                    <td className="px-6 py-4 font-medium">{bill.bill_number}</td>
                    <td className="px-6 py-4">{format(new Date(bill.created_at), "dd MMM yyyy, hh:mm a")}</td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-text-main">{bill.customer_name}</div>
                      <div className="text-xs text-text-muted">{bill.customer_phone}</div>
                    </td>
                    <td className="px-6 py-4 text-right font-mono font-medium">
                      ₹{bill.total_amount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                        bill.payment_status === 'paid' ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-red-100 text-red-700 border border-red-200'
                      }`}>
                        {bill.payment_status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center items-center gap-3">
                        <button className="text-text-muted hover:text-primary transition-colors" title="View">
                          <Eye className="h-4 w-4" />
                        </button>
                        <button className="text-text-muted hover:text-active-blue transition-colors" title="Edit">
                          <Edit className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(bill.id)}
                          className="text-text-muted hover:text-error transition-colors" 
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        <div className="p-4 border-t border-border-default flex items-center justify-between bg-surface-bg">
          <div className="text-sm text-text-muted">
            Showing Page {page}
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="h-8 px-3 rounded border border-border-default bg-white text-text-main disabled:opacity-50 hover:bg-surface-container transition-colors flex items-center gap-1 text-sm"
            >
              <ChevronLeft className="h-4 w-4" /> Prev
            </button>
            <button 
              onClick={() => setPage(p => p + 1)}
              disabled={bills.length < itemsPerPage}
              className="h-8 px-3 rounded border border-border-default bg-white text-text-main disabled:opacity-50 hover:bg-surface-container transition-colors flex items-center gap-1 text-sm"
            >
              Next <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
