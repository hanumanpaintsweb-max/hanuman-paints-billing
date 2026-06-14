"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { format } from "date-fns"
import { Users, Search, Receipt } from "lucide-react"

export default function CustomersPage() {
  const [customers, setCustomers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  // Modal State
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null)
  const [customerBills, setCustomerBills] = useState<any[]>([])
  const [modalLoading, setModalLoading] = useState(false)

  const fetchCustomers = async () => {
    setLoading(true)
    const { data } = await supabase
      .from("bills")
      .select("*")
      .eq("is_deleted", false)

    if (data) {
      // Group by customer_phone
      const grouped: Record<string, any> = {}
      data.forEach(bill => {
        const phone = bill.customer_phone
        if (!grouped[phone]) {
          grouped[phone] = {
            name: bill.customer_name,
            phone: phone,
            billsCount: 0,
            totalValue: 0,
            lastBillDate: bill.created_at
          }
        }
        grouped[phone].billsCount += 1
        grouped[phone].totalValue += Number(bill.total_amount)
        if (new Date(bill.created_at) > new Date(grouped[phone].lastBillDate)) {
          grouped[phone].lastBillDate = bill.created_at
          grouped[phone].name = bill.customer_name // take latest name
        }
      })
      setCustomers(Object.values(grouped).sort((a, b) => b.totalValue - a.totalValue))
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchCustomers()
  }, [])

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    c.phone.includes(search)
  )

  const openModal = async (phone: string) => {
    setSelectedCustomer(phone)
    setModalLoading(true)
    const { data } = await supabase
      .from("bills")
      .select("*")
      .eq("customer_phone", phone)
      .eq("is_deleted", false)
      .order("created_at", { ascending: false })
    
    if (data) setCustomerBills(data)
    setModalLoading(false)
  }

  return (
    <div className="flex flex-col gap-6 relative">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-text-main flex items-center gap-2">
          <Users className="h-6 w-6 text-primary" /> Customers Directory
        </h1>
      </div>

      <div className="bg-card-bg border border-border-default rounded shadow-sm flex flex-col">
        <div className="p-4 border-b border-border-default">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-2.5 h-5 w-5 text-text-muted" />
            <input 
              type="text" 
              placeholder="Search by name or phone..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 w-full pl-10 pr-3 rounded border border-border-default bg-surface-container-lowest focus:border-primary outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead className="bg-surface-container-low text-xs uppercase text-text-muted border-b border-border-default">
              <tr>
                <th className="px-6 py-4 font-semibold">Name</th>
                <th className="px-6 py-4 font-semibold">Phone</th>
                <th className="px-6 py-4 font-semibold text-center">Total Bills</th>
                <th className="px-6 py-4 font-semibold text-right">Total Value</th>
                <th className="px-6 py-4 font-semibold">Last Visit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-default text-sm">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-text-muted">Loading customers...</td>
                </tr>
              ) : filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-text-muted">No customers found.</td>
                </tr>
              ) : (
                filteredCustomers.map((customer, idx) => (
                  <tr 
                    key={idx} 
                    onClick={() => openModal(customer.phone)}
                    className="hover:bg-surface-container cursor-pointer transition-colors"
                  >
                    <td className="px-6 py-4 font-medium text-text-main">{customer.name}</td>
                    <td className="px-6 py-4 text-text-muted">{customer.phone}</td>
                    <td className="px-6 py-4 text-center font-bold text-primary">{customer.billsCount}</td>
                    <td className="px-6 py-4 text-right font-mono font-medium">
                      ₹{customer.totalValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 text-text-muted">
                      {format(new Date(customer.lastBillDate), "dd MMM yyyy")}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Customer Bills Modal */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card-bg w-full max-w-4xl rounded-lg shadow-xl flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-border-default flex justify-between items-center bg-surface">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Receipt className="h-5 w-5 text-primary" /> Billing History ({selectedCustomer})
              </h2>
              <button 
                onClick={() => setSelectedCustomer(null)}
                className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-surface-container text-text-muted transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="p-4 overflow-y-auto">
              {modalLoading ? (
                <p className="text-center text-text-muted py-8">Loading bills...</p>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead className="bg-surface-container-low text-xs uppercase text-text-muted">
                    <tr>
                      <th className="px-4 py-2">Date</th>
                      <th className="px-4 py-2">Bill No</th>
                      <th className="px-4 py-2 text-right">Amount</th>
                      <th className="px-4 py-2 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-default text-sm">
                    {customerBills.map(bill => (
                      <tr key={bill.id}>
                        <td className="px-4 py-3">{format(new Date(bill.created_at), "dd MMM yyyy")}</td>
                        <td className="px-4 py-3 font-medium">{bill.bill_number}</td>
                        <td className="px-4 py-3 text-right font-mono">₹{Number(bill.total_amount).toLocaleString('en-IN')}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${
                            bill.payment_status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {bill.payment_status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
