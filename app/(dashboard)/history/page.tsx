"use client"

import { useState, useEffect, Suspense, Fragment } from "react"
import { supabase } from "@/lib/supabase"
import { format } from "date-fns"
import { Search, Eye, Edit, Trash2, ChevronLeft, ChevronRight, X } from "lucide-react"
import { useRouter } from "next/navigation"

function HistoryContent() {
  const router = useRouter()
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

  // Preview Modal
  const [previewBill, setPreviewBill] = useState<any>(null)

  // Print Settings
  const [shopSettings, setShopSettings] = useState({
    shop_name: "HANUMAN PAINTS",
    tagline: "Authorized Dulux Blue Store",
    address: "Ward No 16, Lohapatty, Madhubani, Bihar",
    phone: "8292889540"
  })

  const fetchBills = async () => {
    setLoading(true)
    // Fix: use neq true to include nulls if any, to avoid hiding bills
    let query = supabase
      .from("bills")
      .select("*")
      .neq("is_deleted", true)

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
    
    // Add cache busting query param trick just in case for client-side caching
    query = query.order("created_at", { ascending: false }).range(from, to)

    const { data, error } = await query
    if (data) {
      setBills(data)
    }
    setLoading(false)
  }

  const fetchShopSettings = async () => {
    const { data } = await supabase.from('shop_settings').select('*').limit(1).maybeSingle()
    if (data) {
      setShopSettings({
        shop_name: data.shop_name?.toUpperCase() || "HANUMAN PAINTS",
        tagline: data.tagline || "Authorized Dulux Blue Store",
        address: data.address || "Ward No 16, Lohapatty, Madhubani, Bihar",
        phone: data.phone || "8292889540"
      })
    }
  }

  useEffect(() => {
    fetchBills()
    fetchShopSettings()
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

  const handleEdit = (id: string) => {
    router.push(`/billing?edit=${id}`)
  }

  const handlePrintPreview = () => {
    window.print()
  }


  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center print:hidden">
        <h1 className="text-2xl font-bold text-text-main">Bill History</h1>
      </div>

      {/* Filters Card */}
      <div className="bg-card-bg border border-border-default rounded p-4 flex flex-col md:flex-row gap-4 items-end shadow-sm print:hidden">
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
      <div className="bg-card-bg border border-border-default rounded shadow-sm overflow-hidden flex flex-col print:hidden">
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
                        <button onClick={() => setPreviewBill(bill)} className="text-text-muted hover:text-primary transition-colors" title="View">
                          <Eye className="h-4 w-4" />
                        </button>
                        <button onClick={() => handleEdit(bill.id)} className="text-text-muted hover:text-active-blue transition-colors" title="Edit">
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

      {/* Preview Modal */}
      {previewBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 print:p-0 print:bg-white print:block">
          <div className="bg-white w-full max-w-2xl rounded-lg shadow-2xl flex flex-col max-h-[90vh] print:shadow-none print:max-h-none print:w-full">
            <div className="p-4 border-b border-border-default flex justify-between items-center bg-surface rounded-t-lg print:hidden">
              <h2 className="text-lg font-bold">Preview Bill: {previewBill.bill_number}</h2>
              <div className="flex items-center gap-3">

                <button onClick={handlePrintPreview} className="px-4 py-1.5 bg-primary text-white text-sm font-bold rounded shadow-sm hover:bg-active-blue">
                  Print
                </button>
                <button onClick={() => setPreviewBill(null)} className="text-text-muted hover:text-text-main">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            
            <div className="p-8 overflow-y-auto print:p-2 text-black font-sans bg-white text-[11px] leading-snug">
              {/* Print Header */}
              <div className="text-center border-b border-black pb-2 mb-3 relative min-h-[80px]" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                <img src="/logo.png" alt="Logo" className="absolute top-0 -left-2 h-12 w-auto object-contain print:block print:max-w-[100px]" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }} />
                <h1 className="text-[20px] font-bold uppercase tracking-wide m-0 p-0 leading-tight">{shopSettings.shop_name}</h1>
                <div className="text-[12px] m-0 p-0">{shopSettings.tagline}</div>
                <div className="text-[12px] m-0 p-0">{shopSettings.address}</div>
                <div className="text-[12px] m-0 p-0">Ph: {shopSettings.phone}</div>
                <div className="mt-2 font-bold text-[14px] uppercase">
                  {previewBill.bill_type === 'DPL' ? 'DPL INVOICE' : 'TAX INVOICE'}
                </div>
                <div className="text-[12px] font-bold mt-1">Bill: {previewBill.bill_number}</div>
              </div>

              {/* Print Customer Info */}
              <div className="flex justify-between mb-4 border-b border-black pb-3 text-[12px]">
                <div>
                  <div><span className="font-semibold">Bill To:</span> {previewBill.customer_name}</div>
                  <div><span className="font-semibold">Phone:</span> {previewBill.customer_phone}</div>
                  {previewBill.customer_address && <div><span className="font-semibold">Address:</span> {previewBill.customer_address}</div>}
                </div>
                <div className="text-right">
                  <div><span className="font-semibold">Date:</span> {format(new Date(previewBill.created_at), 'dd/MM/yyyy')}</div>
                </div>
              </div>

              {/* Print Table */}
              <table className="w-full text-left border-collapse mb-4 text-[12px]">
                <thead className="border-y border-black font-semibold">
                  <tr>
                    <th className="py-2">S.No</th>
                    <th className="py-2">Item</th>
                    <th className="py-2">Size</th>
                    <th className="py-2 text-center">Qty</th>
                    <th className="py-2 text-right">Price</th>
                    <th className="py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="border-b border-black">
                  {previewBill.items?.map((item: any, idx: number) => (
                    <Fragment key={item.id || idx}>
                      <tr>
                        <td className="py-2 align-top">{idx + 1}</td>
                        <td className="py-2 align-top">
                          <div className="font-medium">{item.name}</div>
                          {item.hasColorant && (
                            <div className="pl-2 text-[10px] text-gray-700 mt-1">
                              └ Color Code: {item.colorCode} <br/>
                              └ Colorant: ₹{item.colorantCost?.toFixed(2)}
                            </div>
                          )}
                        </td>
                        <td className="py-2 align-top">{item.size}</td>
                        <td className="py-2 align-top text-center">{item.qty}</td>
                        <td className="py-2 align-top text-right">{Number(item.rate || 0).toFixed(2)}</td>
                        <td className="py-2 align-top text-right font-mono">{Number(item.item_total || item.itemSub || 0).toFixed(2)}</td>
                      </tr>
                      {(item.litre_disc_amount > 0 || item.itemDiscount > 0) && (
                        <tr>
                          <td></td>
                          <td colSpan={5} className="pt-0 pb-2 pl-2 text-[10px] text-gray-700">
                            {item.itemDiscount > 0 && `└ Disc: -₹${item.itemDiscount.toFixed(2)} `}
                            {item.itemDiscount > 0 && item.litre_disc_amount > 0 && '| '}
                            {item.litre_disc_amount > 0 && `${item.itemDiscount === 0 ? '└ ' : ''}Litre Disc: -₹${item.litre_disc_amount.toFixed(2)}`}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>

              {/* Print Totals */}
              <div className="flex justify-end pt-2 text-[12px]">
                <div className="w-[250px]">
                  <div className="flex justify-between py-1">
                    <span>Subtotal:</span>
                    <span className="font-mono">₹{previewBill.subtotal?.toFixed(2)}</span>
                  </div>
                  {previewBill.bill_type === 'DPL' && previewBill.items?.reduce((sum: number, i: any) => sum + (i.litre_disc_amount || 0), 0) > 0 && (
                    <div className="flex justify-between py-1 text-red-600">
                      <span>Litre Disc Total:</span>
                      <span className="font-mono">-₹{previewBill.items?.reduce((sum: number, i: any) => sum + (i.litre_disc_amount || 0), 0).toFixed(2)}</span>
                    </div>
                  )}
                  {previewBill.discount_amount > 0 && (
                    <div className="flex justify-between py-1 text-red-600">
                      <span>Discount Total:</span>
                      <span className="font-mono">-₹{previewBill.discount_amount?.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between py-1">
                    <span>Taxable Value:</span>
                    <span className="font-mono">₹{previewBill.taxable_value?.toFixed(2)}</span>
                  </div>
                  {previewBill.cgst_amount > 0 && (
                    <>
                      <div className="flex justify-between py-1">
                        <span>CGST:</span>
                        <span className="font-mono">₹{previewBill.cgst_amount?.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span>SGST:</span>
                        <span className="font-mono">₹{previewBill.sgst_amount?.toFixed(2)}</span>
                      </div>
                    </>
                  )}
                  <div className="flex justify-between py-2 border-t border-black font-bold text-[16px] mt-2">
                    <span>GRAND TOTAL:</span>
                    <span className="font-mono">₹{previewBill.total_amount?.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between py-1 mt-2 font-semibold">
                    <span>Payment:</span>
                    <span className="uppercase">{previewBill.payment_status}</span>
                  </div>
                </div>
              </div>

              {/* Print Footer */}
              <div className="mt-12 pt-3 border-t border-black border-dashed text-center text-[10px]">
                <div className="font-semibold mb-1">Terms & Conditions</div>
                <div>Goods once sold cannot be returned.</div>
                {previewBill.bill_type === 'DPL' && <div className="mt-1 font-bold">* Dealer Price List</div>}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function HistoryPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-text-muted">Loading history...</div>}>
      <HistoryContent />
    </Suspense>
  )
}
