"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { format, differenceInDays } from "date-fns"
import { CheckCircle, AlertCircle, Clock, X } from "lucide-react"

export default function UnpaidBillsPage() {
  const [ledgers, setLedgers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Payment Modal State
  const [payModalOpen, setPayModalOpen] = useState(false)
  const [selectedLedger, setSelectedLedger] = useState<any>(null)
  const [payAmount, setPayAmount] = useState<number | "">("")

  const fetchUnpaid = async () => {
    setLoading(true)
    const { data } = await supabase
      .from("ledger")
      .select("*")
      .eq("status", "pending")
      .order("due_date", { ascending: true })

    if (data) setLedgers(data)
    setLoading(false)
  }

  useEffect(() => {
    fetchUnpaid()
  }, [])

  const openPayModal = (ledger: any) => {
    setSelectedLedger(ledger)
    setPayAmount(ledger.amount) // Default to full amount
    setPayModalOpen(true)
  }

  const handleProcessPayment = async () => {
    if (!selectedLedger || payAmount === "" || Number(payAmount) <= 0) return
    
    const amountPaid = Number(payAmount)
    const currentDue = Number(selectedLedger.amount)
    
    if (amountPaid >= currentDue) {
      // Full payment
      if (selectedLedger.bill_number) {
        await supabase.from("bills").update({ payment_status: 'paid' }).eq("bill_number", selectedLedger.bill_number)
      }
      await supabase.from("ledger").update({ status: 'paid', amount: 0 }).eq("id", selectedLedger.id)
    } else {
      // Partial payment
      const remaining = currentDue - amountPaid
      if (selectedLedger.bill_number) {
        // Safe update since amount_paid doesn't exist natively, we update status to 'partial'
        await supabase.from("bills").update({ payment_status: 'partial' }).eq("bill_number", selectedLedger.bill_number)
      }
      
      // Reduce outstanding balance on the ledger
      await supabase.from("ledger").update({ amount: remaining }).eq("id", selectedLedger.id)
      
      // Record the partial payment as a received entry
      await supabase.from("ledger").insert({
        customer_name: selectedLedger.customer_name,
        customer_phone: selectedLedger.customer_phone,
        type: "received",
        amount: amountPaid,
        description: `Partial payment received for ${selectedLedger.bill_number || 'ledger ' + selectedLedger.id}`,
        status: "paid",
        date: new Date().toISOString().split('T')[0]
      })
    }
    
    setPayModalOpen(false)
    setSelectedLedger(null)
    setPayAmount("")
    fetchUnpaid()
  }

  const totalOutstanding = ledgers.reduce((sum, item) => sum + Number(item.amount), 0)
  
  const getStatusColor = (dueDateStr: string) => {
    if (!dueDateStr) return "bg-gray-100 text-gray-700 border-gray-200"
    
    const dueDate = new Date(dueDateStr)
    dueDate.setHours(0,0,0,0)
    const today = new Date()
    today.setHours(0,0,0,0)

    const diff = differenceInDays(today, dueDate)
    
    if (diff > 0) return "bg-red-100 text-red-700 border-red-200" // overdue
    if (diff === 0) return "bg-yellow-100 text-yellow-700 border-yellow-200" // today
    return "bg-green-100 text-green-700 border-green-200" // future
  }

  const getOverdueText = (dueDateStr: string) => {
    if (!dueDateStr) return "-"
    
    const dueDate = new Date(dueDateStr)
    dueDate.setHours(0,0,0,0)
    const today = new Date()
    today.setHours(0,0,0,0)

    const diff = differenceInDays(today, dueDate)
    
    if (diff > 0) return `${diff} days overdue`
    if (diff === 0) return "Due Today"
    return `Due in ${Math.abs(diff)} days`
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-text-main">Unpaid Bills</h1>
      </div>

      {/* Top Summary Card */}
      <div className="bg-card-bg border border-border-default rounded p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-error/10 text-error rounded-full border border-error/20">
            <AlertCircle className="h-8 w-8" />
          </div>
          <div>
            <p className="text-sm font-medium text-text-muted">Total Outstanding</p>
            <h2 className="text-3xl font-bold text-text-main font-mono">
              ₹{totalOutstanding.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </h2>
          </div>
        </div>
      </div>

      {/* Table Card */}
      <div className="bg-card-bg border border-border-default rounded shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead className="bg-surface-container-low text-xs uppercase text-text-muted border-b border-border-default">
              <tr>
                <th className="px-6 py-4 font-semibold">Customer</th>
                <th className="px-6 py-4 font-semibold">Bill No</th>
                <th className="px-6 py-4 font-semibold text-right">Amount</th>
                <th className="px-6 py-4 font-semibold">Due Date</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-default text-sm">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-text-muted">Loading...</td>
                </tr>
              ) : ledgers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-text-muted">
                    <div className="flex flex-col items-center gap-2">
                      <CheckCircle className="h-8 w-8 text-green-500" />
                      <p>All bills are paid!</p>
                    </div>
                  </td>
                </tr>
              ) : (
                ledgers.map(ledger => (
                  <tr key={ledger.id} className="hover:bg-surface-bg transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-text-main">{ledger.customer_name}</div>
                      <div className="text-xs text-text-muted">{ledger.customer_phone}</div>
                    </td>
                    <td className="px-6 py-4 font-medium">{ledger.bill_number || '-'}</td>
                    <td className="px-6 py-4 text-right font-mono font-medium text-error">
                      ₹{Number(ledger.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4">
                      {ledger.due_date ? format(new Date(ledger.due_date), "dd MMM yyyy") : "-"}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-xs font-bold border flex w-max items-center gap-1 ${getStatusColor(ledger.due_date)}`}>
                        <Clock className="h-3 w-3" /> {getOverdueText(ledger.due_date)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => openPayModal(ledger)}
                        className="h-8 px-3 bg-green-600 text-white rounded text-xs font-bold hover:bg-green-700 transition-colors shadow-sm active:scale-[0.98] inline-flex items-center gap-1"
                      >
                        <CheckCircle className="h-3 w-3" /> Pay / Update
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment Modal */}
      {payModalOpen && selectedLedger && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white w-full max-w-md rounded-lg shadow-2xl flex flex-col">
            <div className="p-4 border-b border-border-default flex justify-between items-center bg-surface rounded-t-lg">
              <h2 className="text-lg font-bold">Process Payment</h2>
              <button onClick={() => setPayModalOpen(false)} className="text-text-muted hover:text-text-main">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-6 flex flex-col gap-4">
              <div className="flex justify-between items-center bg-error/10 text-error p-3 rounded font-bold">
                <span>Total Due:</span>
                <span className="font-mono text-xl">₹{Number(selectedLedger.amount).toLocaleString('en-IN')}</span>
              </div>
              
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-text-main">Amount Being Paid</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 font-bold text-text-muted">₹</span>
                  <input 
                    type="number"
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value === "" ? "" : Number(e.target.value))}
                    className="h-10 w-full pl-8 pr-3 rounded border border-border-default bg-surface-container-lowest focus:border-primary outline-none font-mono text-lg [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    autoFocus
                  />
                </div>
              </div>

              {payAmount !== "" && Number(payAmount) > 0 && Number(payAmount) <= Number(selectedLedger.amount) && (
                <div className="flex justify-between items-center bg-green-50 text-green-700 p-3 rounded font-medium border border-green-200 mt-2">
                  <span>Remaining Due:</span>
                  <span className="font-mono text-lg">₹{(Number(selectedLedger.amount) - Number(payAmount)).toLocaleString('en-IN')}</span>
                </div>
              )}

              <button
                onClick={handleProcessPayment}
                disabled={payAmount === "" || Number(payAmount) <= 0 || Number(payAmount) > Number(selectedLedger.amount)}
                className="mt-4 flex w-full items-center justify-center rounded bg-primary py-3 text-sm font-bold text-white shadow hover:bg-active-blue transition-colors disabled:opacity-50"
              >
                Confirm Payment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
