"use client"

import { useState, useEffect, useMemo } from "react"
import { format } from "date-fns"
import { supabase } from "@/lib/supabase"
import { Plus, Trash2, Printer, Save, MessageCircle, AlertCircle, CheckCircle2 } from "lucide-react"

interface BillItem {
  id: string;
  name: string;
  size: string;
  qty: number;
  price: number;
  gstRate: number;
  hasColorant: boolean;
  colorCode: string;
  colorantCost: number;
}

export default function BillingPage() {
  // Settings
  const [billType, setBillType] = useState<"MRP" | "DPL">("MRP")
  const [billNumber, setBillNumber] = useState("HP-S-001")
  const [billDate, setBillDate] = useState(format(new Date(), "yyyy-MM-dd"))
  
  // Customer
  const [customerName, setCustomerName] = useState("")
  const [customerPhone, setCustomerPhone] = useState("")
  const [customerAddress, setCustomerAddress] = useState("")

  // Products
  const [items, setItems] = useState<BillItem[]>([
    { id: Date.now().toString(), name: "", size: "", qty: 1, price: 0, gstRate: 0, hasColorant: false, colorCode: "", colorantCost: 0 }
  ])

  // Discount
  const [discountPercent, setDiscountPercent] = useState<number>(0)

  // Payment
  const [paymentStatus, setPaymentStatus] = useState<"paid" | "unpaid">("paid")
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "upi" | "both">("cash")
  const [dueDate, setDueDate] = useState("")

  // UI State
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState("")

  const fetchNextBillNumber = async () => {
    const { data } = await supabase
      .from("bills")
      .select("bill_number")
      .order("created_at", { ascending: false })
      .limit(1)
      
    if (data && data.length > 0) {
      const match = data[0].bill_number.match(/HP-S-(\d+)/)
      if (match) {
        const nextNum = parseInt(match[1]) + 1
        setBillNumber(`HP-S-${nextNum.toString().padStart(3, '0')}`)
        return
      }
    }
    setBillNumber("HP-S-001")
  }

  useEffect(() => {
    fetchNextBillNumber()
  }, [])

  // Calculations
  const calculatedItems = useMemo(() => {
    return items.map(item => {
      const base = Math.max(0, item.qty * item.price)
      const colorant = Math.max(0, item.hasColorant ? item.colorantCost : 0)
      const itemSub = Math.max(0, base + colorant)
      const disc = Math.max(0, itemSub * (discountPercent / 100))
      const taxable = Math.max(0, itemSub - disc)
      const gst = Math.max(0, taxable * (item.gstRate / 100))
      const total = Math.max(0, taxable + gst)

      return { ...item, base, colorant, itemSub, disc, taxable, gst, total }
    })
  }, [items, discountPercent])

  const totals = useMemo(() => {
    let subtotal = 0, discount_amount = 0, taxable_value = 0, gst_total = 0, total_amount = 0;
    
    calculatedItems.forEach(item => {
      subtotal += item.itemSub
      discount_amount += item.disc
      taxable_value += item.taxable
      gst_total += item.gst
      total_amount += item.total
    })

    return {
      subtotal: Math.max(0, subtotal),
      discount_amount: Math.max(0, discount_amount),
      taxable_value: Math.max(0, taxable_value),
      cgst_amount: Math.max(0, gst_total / 2),
      sgst_amount: Math.max(0, gst_total / 2),
      total_amount: Math.max(0, Math.round(total_amount)) // rounding final total
    }
  }, [calculatedItems])

  const handleAddItem = () => {
    setItems([...items, { id: Date.now().toString(), name: "", size: "", qty: 1, price: 0, gstRate: 0, hasColorant: false, colorCode: "", colorantCost: 0 }])
  }

  const handleRemoveItem = (id: string) => {
    setItems(items.filter(i => i.id !== id))
  }

  const updateItem = (id: string, field: keyof BillItem, value: any) => {
    setItems(items.map(i => i.id === id ? { ...i, [field]: value } : i))
  }

  const handleSave = async () => {
    if (!customerName || !customerPhone || customerPhone.length < 10) {
      alert("Please enter a valid customer name and 10-digit phone number.")
      return
    }
    if (items.some(i => !i.name || i.qty < 1)) {
      alert("Please ensure all products have a name and quantity.")
      return
    }

    setLoading(true)

    const billData = {
      bill_number: billNumber,
      customer_name: customerName,
      customer_phone: customerPhone,
      customer_address: customerAddress,
      customer_gstin: null,
      items: calculatedItems,
      subtotal: totals.subtotal,
      discount_amount: totals.discount_amount,
      taxable_value: totals.taxable_value,
      cgst_amount: totals.cgst_amount,
      sgst_amount: totals.sgst_amount,
      total_amount: totals.total_amount,
      payment_status: paymentStatus,
      payment_method: paymentStatus === 'paid' ? paymentMethod : null,
      bill_type: billType,
      is_deleted: false,
      staff_name: 'Admin'
    }

    let ledgerData = null;
    if (paymentStatus === 'unpaid') {
      ledgerData = {
        customer_name: customerName,
        customer_phone: customerPhone,
        type: 'receivable',
        amount: totals.total_amount,
        description: 'Bill ' + billNumber,
        date: billDate,
        status: 'pending',
        due_date: dueDate || billDate,
        bill_number: billNumber
      }
    }

    const { error } = await supabase.rpc('save_bill_with_ledger', {
      p_bill: billData,
      p_ledger: ledgerData
    })

    if (error) {
      alert("Error saving bill: " + error.message)
      setLoading(false)
      return
    }

    setToast("Bill saved successfully!")
    setTimeout(() => setToast(""), 3000)

    // Reset Form
    setCustomerName("")
    setCustomerPhone("")
    setCustomerAddress("")
    setItems([{ id: Date.now().toString(), name: "", size: "", qty: 1, price: 0, gstRate: 0, hasColorant: false, colorCode: "", colorantCost: 0 }])
    setDiscountPercent(0)
    setPaymentStatus("paid")
    
    await fetchNextBillNumber()
    setLoading(false)
  }

  const formatCurrency = (num: number) => {
    return num.toLocaleString('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 })
  }

  const handlePrint = () => {
    window.print()
  }

  const handleWhatsApp = () => {
    const text = `*Hanuman Paints*
Bill No: ${billNumber}
Customer: ${customerName}
Total: ${formatCurrency(totals.total_amount)}
Status: ${paymentStatus.toUpperCase()}
Date: ${format(new Date(billDate), 'dd/MM/yyyy')}`
    
    const url = `https://wa.me/91${customerPhone}?text=${encodeURIComponent(text)}`
    window.open(url, '_blank')
  }

  // Print Chunking (5 items per page)
  const printChunks = []
  for (let i = 0; i < calculatedItems.length; i += 5) {
    printChunks.push(calculatedItems.slice(i, i + 5))
  }
  if (printChunks.length === 0) printChunks.push([])

  return (
    <>
      <div className="flex flex-col gap-6 print:hidden">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-text-main flex items-center gap-3">
              New Bill
              <span className="bg-primary/10 text-primary text-sm px-2 py-1 rounded font-mono border border-primary/20">
                {billNumber}
              </span>
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <input 
              type="date" 
              value={billDate}
              onChange={(e) => setBillDate(e.target.value)}
              className="h-10 px-3 rounded border border-border-default bg-card-bg text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
            />
            <div className="flex rounded border border-border-default bg-card-bg p-1">
              <button 
                onClick={() => setBillType("MRP")}
                className={`px-4 py-1.5 text-sm font-medium rounded transition-colors ${billType === "MRP" ? "bg-primary text-white shadow-sm" : "text-text-muted hover:text-text-main"}`}
              >
                MRP Bill
              </button>
              <button 
                onClick={() => setBillType("DPL")}
                className={`px-4 py-1.5 text-sm font-medium rounded transition-colors ${billType === "DPL" ? "bg-primary text-white shadow-sm" : "text-text-muted hover:text-text-main"}`}
              >
                DPL Bill
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          
          {/* Main Form Left Column */}
          <div className="xl:col-span-8 flex flex-col gap-6">
            
            {/* Customer Card */}
            <div className="bg-card-bg border border-border-default rounded shadow-sm p-5">
              <h3 className="font-semibold text-text-main mb-4 border-b border-border-default pb-2">Customer Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm text-text-muted font-medium">Customer Name <span className="text-error">*</span></label>
                  <input 
                    type="text" 
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="h-10 px-3 rounded border border-border-default bg-surface-container-lowest focus:border-primary focus:ring-1 focus:ring-primary outline-none" 
                    placeholder="Enter name"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm text-text-muted font-medium">Phone Number <span className="text-error">*</span></label>
                  <input 
                    type="text"
                    maxLength={10}
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="h-10 px-3 rounded border border-border-default bg-surface-container-lowest focus:border-primary focus:ring-1 focus:ring-primary outline-none" 
                    placeholder="10 digit number"
                  />
                </div>
                <div className="flex flex-col gap-1.5 md:col-span-2">
                  <label className="text-sm text-text-muted font-medium">Address (Optional)</label>
                  <input 
                    type="text" 
                    value={customerAddress}
                    onChange={(e) => setCustomerAddress(e.target.value)}
                    className="h-10 px-3 rounded border border-border-default bg-surface-container-lowest focus:border-primary focus:ring-1 focus:ring-primary outline-none" 
                    placeholder="Enter full address"
                  />
                </div>
              </div>
            </div>

            {/* Products Card */}
            <div className="bg-card-bg border border-border-default rounded shadow-sm overflow-hidden">
              <div className="p-5 border-b border-border-default">
                <h3 className="font-semibold text-text-main">Products</h3>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-surface-container-low text-xs uppercase text-text-muted border-b border-border-default">
                    <tr>
                      <th className="px-4 py-3 font-semibold min-w-[200px]">Product Name</th>
                      <th className="px-4 py-3 font-semibold w-24">Size</th>
                      <th className="px-4 py-3 font-semibold w-24">Qty</th>
                      <th className="px-4 py-3 font-semibold w-32 text-right">Price/Unit</th>
                      <th className="px-4 py-3 font-semibold w-24">GST %</th>
                      <th className="px-4 py-3 font-semibold text-right">Total</th>
                      <th className="px-4 py-3 w-12"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-default">
                    {calculatedItems.map((item, idx) => (
                      <tr key={item.id} className="hover:bg-surface-bg transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-2">
                            <input 
                              type="text" 
                              value={item.name}
                              onChange={(e) => updateItem(item.id, 'name', e.target.value)}
                              className="h-9 w-full px-2 text-sm rounded border border-border-default focus:border-primary focus:ring-1 outline-none"
                              placeholder="Product name"
                            />
                            <div className="flex items-center gap-2 mt-1">
                              <label className="flex items-center gap-1.5 text-xs text-text-muted cursor-pointer">
                                <input 
                                  type="checkbox" 
                                  checked={item.hasColorant}
                                  onChange={(e) => updateItem(item.id, 'hasColorant', e.target.checked)}
                                  className="rounded text-primary focus:ring-primary accent-primary"
                                />
                                + Colorant
                              </label>
                            </div>
                            {item.hasColorant && (
                              <div className="flex gap-2">
                                <input 
                                  type="text" 
                                  value={item.colorCode}
                                  onChange={(e) => updateItem(item.id, 'colorCode', e.target.value)}
                                  className="h-8 w-24 px-2 text-xs rounded border border-border-default focus:border-primary outline-none"
                                  placeholder="Color Code"
                                />
                                <input 
                                  type="number" 
                                  value={item.colorantCost || ''}
                                  onChange={(e) => updateItem(item.id, 'colorantCost', parseFloat(e.target.value) || 0)}
                                  className="h-8 w-24 px-2 text-xs rounded border border-border-default focus:border-primary outline-none"
                                  placeholder="Cost ₹"
                                />
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 align-top">
                          <input 
                            type="text" 
                            value={item.size}
                            onChange={(e) => updateItem(item.id, 'size', e.target.value)}
                            className="h-9 w-full px-2 text-sm rounded border border-border-default focus:border-primary outline-none"
                            placeholder="e.g. 1L"
                          />
                        </td>
                        <td className="px-4 py-3 align-top">
                          <input 
                            type="number" 
                            min="1"
                            value={item.qty || ''}
                            onChange={(e) => updateItem(item.id, 'qty', parseInt(e.target.value) || 0)}
                            className="h-9 w-full px-2 text-sm text-center rounded border border-border-default focus:border-primary outline-none"
                          />
                        </td>
                        <td className="px-4 py-3 align-top">
                          <input 
                            type="number" 
                            value={item.price || ''}
                            onChange={(e) => updateItem(item.id, 'price', parseFloat(e.target.value) || 0)}
                            className="h-9 w-full px-2 text-sm text-right rounded border border-border-default focus:border-primary outline-none"
                            placeholder="0.00"
                          />
                        </td>
                        <td className="px-4 py-3 align-top">
                          <select 
                            value={item.gstRate}
                            onChange={(e) => updateItem(item.id, 'gstRate', parseFloat(e.target.value))}
                            className="h-9 w-full px-2 text-sm rounded border border-border-default bg-white focus:border-primary outline-none appearance-none"
                          >
                            <option value="0">0%</option>
                            <option value="5">5%</option>
                            <option value="12">12%</option>
                            <option value="18">18%</option>
                          </select>
                        </td>
                        <td className="px-4 py-3 align-top text-right">
                          <div className="h-9 flex items-center justify-end text-sm font-mono font-medium text-text-main">
                            {formatCurrency(item.total)}
                          </div>
                        </td>
                        <td className="px-4 py-3 align-top text-center">
                          {items.length > 1 && (
                            <button 
                              onClick={() => handleRemoveItem(item.id)}
                              className="h-9 w-9 inline-flex items-center justify-center text-text-muted hover:text-error hover:bg-error/10 rounded transition-colors"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="p-4 bg-surface-container-low border-t border-border-default">
                <button 
                  onClick={handleAddItem}
                  className="flex items-center gap-2 text-sm font-medium text-primary hover:text-active-blue"
                >
                  <Plus className="h-4 w-4" /> Add Product
                </button>
              </div>
            </div>

          </div>

          {/* Sidebar Right Column */}
          <div className="xl:col-span-4 flex flex-col gap-6">
            
            {/* Discount Card */}
            <div className="bg-card-bg border border-border-default rounded shadow-sm p-5">
              <h3 className="font-semibold text-text-main mb-4 border-b border-border-default pb-2">Discount</h3>
              <div className="flex flex-wrap gap-2 mb-3">
                {[0, 5, 10, 15].map(pct => (
                  <button 
                    key={pct}
                    onClick={() => setDiscountPercent(pct)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors border ${
                      discountPercent === pct 
                        ? 'bg-primary text-white border-primary' 
                        : 'bg-surface text-text-muted border-border-default hover:border-primary/50'
                    }`}
                  >
                    {pct}%
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-text-muted">Custom %:</span>
                <input 
                  type="number" 
                  value={discountPercent || ''}
                  onChange={(e) => setDiscountPercent(parseFloat(e.target.value) || 0)}
                  className="h-9 w-24 px-3 rounded border border-border-default focus:border-primary outline-none text-sm text-right"
                />
              </div>
            </div>

            {/* Payment Card */}
            <div className="bg-card-bg border border-border-default rounded shadow-sm p-5">
              <h3 className="font-semibold text-text-main mb-4 border-b border-border-default pb-2">Payment Details</h3>
              <div className="flex gap-4 mb-4">
                <label className="flex items-center gap-2 cursor-pointer text-sm font-medium">
                  <input 
                    type="radio" 
                    checked={paymentStatus === 'paid'}
                    onChange={() => setPaymentStatus('paid')}
                    className="text-primary focus:ring-primary accent-primary"
                  /> Paid
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-sm font-medium">
                  <input 
                    type="radio" 
                    checked={paymentStatus === 'unpaid'}
                    onChange={() => setPaymentStatus('unpaid')}
                    className="text-primary focus:ring-primary accent-primary"
                  /> Unpaid
                </label>
              </div>

              {paymentStatus === 'paid' && (
                <div className="flex flex-col gap-1.5 animate-in fade-in slide-in-from-top-2">
                  <label className="text-sm text-text-muted">Payment Mode</label>
                  <select 
                    value={paymentMethod}
                    onChange={(e: any) => setPaymentMethod(e.target.value)}
                    className="h-10 w-full px-3 rounded border border-border-default bg-white focus:border-primary outline-none"
                  >
                    <option value="cash">Cash</option>
                    <option value="upi">UPI</option>
                    <option value="both">Both</option>
                  </select>
                </div>
              )}

              {paymentStatus === 'unpaid' && (
                <div className="flex flex-col gap-1.5 animate-in fade-in slide-in-from-top-2">
                  <label className="text-sm text-text-muted">Due Date</label>
                  <input 
                    type="date" 
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="h-10 w-full px-3 rounded border border-border-default focus:border-primary outline-none"
                  />
                </div>
              )}
            </div>

            {/* Summary Card */}
            <div className="bg-card-bg border border-border-default rounded shadow-sm p-5 bg-gradient-to-br from-surface to-surface-bg">
              <div className="flex flex-col gap-3">
                <div className="flex justify-between items-center text-sm text-text-muted">
                  <span>Subtotal</span>
                  <span className="font-mono">{formatCurrency(totals.subtotal)}</span>
                </div>
                <div className="flex justify-between items-center text-sm text-text-muted">
                  <span>Discount</span>
                  <span className="font-mono text-error">-{formatCurrency(totals.discount_amount)}</span>
                </div>
                <div className="flex justify-between items-center text-sm text-text-muted">
                  <span>Taxable Value</span>
                  <span className="font-mono">{formatCurrency(totals.taxable_value)}</span>
                </div>
                <div className="flex justify-between items-center text-sm text-text-muted border-b border-border-default pb-3">
                  <span>GST Total</span>
                  <span className="font-mono">{formatCurrency(totals.cgst_amount + totals.sgst_amount)}</span>
                </div>
                <div className="flex justify-between items-end pt-2">
                  <span className="text-base font-bold text-text-main">GRAND TOTAL</span>
                  <span className="text-3xl font-bold tracking-tight text-primary font-mono">{formatCurrency(totals.total_amount)}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-3 mt-6">
                <button 
                  onClick={handleSave}
                  disabled={loading}
                  className="w-full h-12 bg-primary text-white rounded font-bold flex items-center justify-center gap-2 hover:bg-active-blue transition-colors shadow-sm active:scale-[0.98] disabled:opacity-70"
                >
                  <Save className="h-5 w-5" /> {loading ? "Saving..." : "Save Bill"}
                </button>
                <div className="flex gap-3">
                  <button 
                    onClick={handlePrint}
                    className="flex-1 h-11 bg-white border border-border-default text-text-main rounded font-medium flex items-center justify-center gap-2 hover:bg-surface-container transition-colors active:scale-[0.98]"
                  >
                    <Printer className="h-4 w-4" /> Print
                  </button>
                  <button 
                    onClick={handleWhatsApp}
                    className="flex-1 h-11 bg-[#25D366] text-white rounded font-medium flex items-center justify-center gap-2 hover:bg-[#20bd5a] transition-colors active:scale-[0.98]"
                  >
                    <MessageCircle className="h-4 w-4" /> WhatsApp
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Print Overlay (Only visible during print) */}
      <div className="hidden print:block w-full text-black font-sans bg-white">
        {printChunks.map((chunk, pageIndex) => (
          <div key={pageIndex} className="page-break-after-always pb-4 pt-4 px-2 text-[11px] leading-snug">
            {/* Print Header */}
            <div className="text-center border-b border-black pb-2 mb-2">
              <h1 className="text-[18px] font-bold uppercase tracking-wide m-0 p-0 leading-tight">HANUMAN PAINTS</h1>
              <div className="text-[10px] m-0 p-0">Authorized Dulux Blue Store</div>
              <div className="text-[10px] m-0 p-0">Ward No 16, Lohapatty, Madhubani, Bihar</div>
              <div className="text-[10px] m-0 p-0">Ph: 8292889540</div>
              <div className="mt-2 font-bold text-[12px] uppercase">
                {billType === 'DPL' ? 'DPL INVOICE' : 'TAX INVOICE'}
              </div>
              <div className="text-[10px] font-bold">Bill: {billNumber}</div>
            </div>

            {/* Print Customer Info */}
            <div className="flex justify-between mb-3 border-b border-black pb-2">
              <div>
                <div><span className="font-semibold">Bill To:</span> {customerName}</div>
                <div><span className="font-semibold">Phone:</span> {customerPhone}</div>
                {customerAddress && <div><span className="font-semibold">Address:</span> {customerAddress}</div>}
              </div>
              <div className="text-right">
                <div><span className="font-semibold">Date:</span> {format(new Date(billDate), 'dd/MM/yyyy')}</div>
                <div><span className="font-semibold">Page:</span> {pageIndex + 1} of {printChunks.length}</div>
              </div>
            </div>

            {/* Print Table */}
            <table className="w-full text-left border-collapse mb-2">
              <thead className="border-y border-black font-semibold">
                <tr>
                  <th className="py-1">S.No</th>
                  <th className="py-1">Item</th>
                  <th className="py-1">Size</th>
                  <th className="py-1 text-center">Qty</th>
                  <th className="py-1 text-right">Price</th>
                  <th className="py-1 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="border-b border-black">
                {chunk.map((item, idx) => (
                  <tr key={item.id}>
                    <td className="py-1 align-top">{pageIndex * 5 + idx + 1}</td>
                    <td className="py-1 align-top">
                      <div className="font-medium">{item.name}</div>
                      {item.hasColorant && (
                        <div className="pl-2 text-[9px] text-gray-700">
                          └ Color Code: {item.colorCode} <br/>
                          └ Colorant: ₹{item.colorantCost.toFixed(2)}
                        </div>
                      )}
                    </td>
                    <td className="py-1 align-top">{item.size}</td>
                    <td className="py-1 align-top text-center">{item.qty}</td>
                    <td className="py-1 align-top text-right">{item.price.toFixed(2)}</td>
                    <td className="py-1 align-top text-right font-mono">{item.total.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Print Totals (Only on Last Page) */}
            {pageIndex === printChunks.length - 1 && (
              <div className="flex justify-end pt-2">
                <div className="w-[200px]">
                  <div className="flex justify-between py-0.5">
                    <span>Subtotal:</span>
                    <span className="font-mono">₹{totals.subtotal.toFixed(2)}</span>
                  </div>
                  {totals.discount_amount > 0 && (
                    <div className="flex justify-between py-0.5">
                      <span>Discount (-):</span>
                      <span className="font-mono">₹{totals.discount_amount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between py-0.5">
                    <span>Taxable Value:</span>
                    <span className="font-mono">₹{totals.taxable_value.toFixed(2)}</span>
                  </div>
                  {totals.cgst_amount > 0 && (
                    <>
                      <div className="flex justify-between py-0.5">
                        <span>CGST:</span>
                        <span className="font-mono">₹{totals.cgst_amount.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between py-0.5">
                        <span>SGST:</span>
                        <span className="font-mono">₹{totals.sgst_amount.toFixed(2)}</span>
                      </div>
                    </>
                  )}
                  <div className="flex justify-between py-1 border-t border-black font-bold text-[14px] mt-1">
                    <span>GRAND TOTAL:</span>
                    <span className="font-mono">₹{totals.total_amount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between py-1 mt-2 font-semibold">
                    <span>Payment:</span>
                    <span className="uppercase">{paymentStatus}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Print Footer */}
            {pageIndex === printChunks.length - 1 && (
              <div className="mt-8 pt-2 border-t border-black border-dashed text-center text-[9px]">
                <div className="font-semibold mb-1">Terms & Conditions</div>
                <div>Goods once sold cannot be returned.</div>
                {billType === 'DPL' && <div className="mt-1 font-bold">* Dealer Price List</div>}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-4 right-4 bg-green-600 text-white px-4 py-3 rounded shadow-lg flex items-center gap-2 animate-in slide-in-from-bottom-5 z-50">
          <CheckCircle2 className="h-5 w-5" />
          <span className="font-medium">{toast}</span>
        </div>
      )}
    </>
  )
}
