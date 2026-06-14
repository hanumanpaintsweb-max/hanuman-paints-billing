"use client"

import { useState, useEffect, useMemo, Suspense, Fragment } from "react"
import { format } from "date-fns"
import { supabase } from "@/lib/supabase"
import { Plus, Trash2, Printer, Save, MessageCircle, CheckCircle2 } from "lucide-react"
import { ProductCombobox, Product } from "@/components/ProductCombobox"
import { useSearchParams, useRouter } from "next/navigation"

interface BillItem {
  id: string;
  name: string;
  size: string;
  base: string;
  qty: number;
  rate: number;
  hasColorant: boolean;
  colorCode: string;
  colorantCost: number;
}

function BillingContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const editId = searchParams.get('edit')

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
    { id: Date.now().toString(), name: "", size: "", base: "", qty: 1, rate: 0, hasColorant: false, colorCode: "", colorantCost: 0 }
  ])

  // Global Financial Modifiers
  const [discountPercent, setDiscountPercent] = useState<number>(0)
  const [globalGst, setGlobalGst] = useState<number | "">("")

  // Payment
  const [paymentStatus, setPaymentStatus] = useState<"paid" | "unpaid">("paid")
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "upi" | "both">("cash")

  // UI State
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState("")
  
  // Products from DB
  const [dbProducts, setDbProducts] = useState<Product[]>([])

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
    const fetchProducts = async () => {
      const { data } = await supabase
        .from("products")
        .select("id, name, unit, category, type, mrp")
        .eq("is_active", true)
        .order("name", { ascending: true })
      
      if (data) setDbProducts(data)
    }
    fetchProducts()

    const loadEditBill = async () => {
      if (editId) {
        const { data } = await supabase.from('bills').select('*').eq('id', editId).single()
        if (data) {
          setBillNumber(data.bill_number)
          setCustomerName(data.customer_name)
          setCustomerPhone(data.customer_phone)
          setCustomerAddress(data.customer_address || "")
          
          // Re-map items in case old bills don't have 'base' property or have legacy GST
          const loadedItems = (data.items || []).map((i: any) => ({
            id: i.id || Date.now().toString(),
            name: i.name || "",
            size: i.size || "",
            base: i.base || "",
            qty: i.qty || 1,
            rate: i.rate !== undefined ? i.rate : (i.price || 0),
            hasColorant: i.hasColorant || false,
            colorCode: i.colorCode || "",
            colorantCost: i.colorantCost || 0
          }))
          setItems(loadedItems.length > 0 ? loadedItems : [{ id: Date.now().toString(), name: "", size: "", base: "", qty: 1, rate: 0, hasColorant: false, colorCode: "", colorantCost: 0 }])

          if (data.subtotal && data.subtotal > 0 && data.discount_amount) {
            setDiscountPercent((data.discount_amount / data.subtotal) * 100)
          }
          
          // Reverse-calculate global GST percent if cgst/sgst exists
          if (data.taxable_value && data.taxable_value > 0 && data.cgst_amount) {
            const gst_total = (data.cgst_amount + data.sgst_amount)
            const computedGst = Math.round((gst_total / data.taxable_value) * 100)
            setGlobalGst(computedGst > 0 ? computedGst : "")
          }

          setPaymentStatus(data.payment_status)
          setPaymentMethod(data.payment_method || 'cash')
          setBillType(data.bill_type)
        }
      } else {
        fetchNextBillNumber()
      }
    }
    loadEditBill()
  }, [editId])

  // Calculations
  const calculatedItems = useMemo(() => {
    return items.map(item => {
      const basePrice = Math.max(0, item.qty * item.rate)
      const colorant = Math.max(0, item.hasColorant ? item.colorantCost : 0)
      const itemSub = Math.max(0, basePrice + colorant)
      return { ...item, basePrice, colorant, itemSub }
    })
  }, [items])

  const totals = useMemo(() => {
    let subtotal = 0;
    calculatedItems.forEach(item => subtotal += item.itemSub)
    
    const discount_amount = Math.max(0, subtotal * (discountPercent / 100))
    const taxable_value = Math.max(0, subtotal - discount_amount)
    
    const gstRate = globalGst === "" ? 0 : Number(globalGst)
    const gst_total = Math.max(0, taxable_value * (gstRate / 100))
    const total_amount = Math.max(0, taxable_value + gst_total)

    return {
      subtotal: Math.max(0, subtotal),
      discount_amount: Math.max(0, discount_amount),
      taxable_value: Math.max(0, taxable_value),
      cgst_amount: Math.max(0, gst_total / 2),
      sgst_amount: Math.max(0, gst_total / 2),
      total_amount: Math.max(0, Math.round(total_amount)) // rounding final total
    }
  }, [calculatedItems, discountPercent, globalGst])

  const handleAddItem = () => {
    setItems([...items, { id: Date.now().toString(), name: "", size: "", base: "", qty: 1, rate: 0, hasColorant: false, colorCode: "", colorantCost: 0 }])
  }

  const handleRemoveItem = (id: string) => {
    setItems(items.filter(i => i.id !== id))
  }

  const updateItem = (id: string, field: keyof BillItem, value: any) => {
    setItems(items.map(i => i.id === id ? { ...i, [field]: value } : i))
  }

  const handleProductSelect = (id: string, name: string, unit?: string, mrp?: number) => {
    setItems(items.map(i => {
      if (i.id === id) {
        return { 
          ...i, 
          name, 
          size: unit !== undefined ? unit : i.size,
          rate: mrp !== undefined && mrp !== null ? mrp : i.rate
        }
      }
      return i
    }))
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

    const billData: any = {
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
      payment_method: paymentStatus === 'paid' ? paymentMethod : 'unpaid',
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
        due_date: null, // Due date removed per request
        bill_number: billNumber
      }
    }

    // Insert bill directly
    const { error } = await supabase
      .from('bills')
      .insert([billData])

    if (error) {
      alert("Error saving bill: " + error.message)
      setLoading(false)
      return
    }

    // If unpaid, save ledger separately
    if (paymentStatus === 'unpaid' && ledgerData) {
      const { error: ledgerError } = await supabase
        .from('ledger')
        .insert([ledgerData])
      
      if (ledgerError) {
        console.error("Error saving ledger:", ledgerError)
      }
    }

    const warnings: string[] = []
    const deductionPromises = calculatedItems.map(async (item) => {
      if (!item.name || item.qty <= 0) return;
      const { data: pData } = await supabase.from('products').select('id, current_stock').eq('name', item.name).maybeSingle();
      if (pData) {
        if (pData.current_stock >= item.qty) {
          await supabase.from('products').update({ current_stock: pData.current_stock - item.qty }).eq('id', pData.id)
        } else {
          warnings.push(`⚠️ ${item.name} ka stock kam hai`)
        }
      }
    })
    await Promise.all(deductionPromises)

    if (warnings.length > 0) {
      setToast(warnings.join(' | '))
    } else {
      setToast("Bill saved successfully!")
    }
    setTimeout(() => setToast(""), 5000)

    // Reset Form
    setCustomerName("")
    setCustomerPhone("")
    setCustomerAddress("")
    setItems([{ id: Date.now().toString(), name: "", size: "", base: "", qty: 1, rate: 0, hasColorant: false, colorCode: "", colorantCost: 0 }])
    setDiscountPercent(0)
    setGlobalGst("")
    setPaymentStatus("paid")
    
    // DB se fresh fetch karo bill number ke liye
    await fetchNextBillNumber()

    // Refresh history router cache
    router.refresh()
    
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

  // Print Chunking (7 items per page)
  const ITEMS_PER_PAGE = 7
  const printChunks = []
  for (let i = 0; i < calculatedItems.length; i += ITEMS_PER_PAGE) {
    printChunks.push(calculatedItems.slice(i, i + ITEMS_PER_PAGE))
  }
  if (printChunks.length === 0) printChunks.push([])

  return (
    <>
      <div className="flex flex-col gap-6 print:hidden">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-text-main flex items-center gap-3">
              {editId ? "Edit Bill" : "New Bill"}
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
              
              <div className="overflow-x-auto min-h-[300px]">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-surface-container-low text-xs uppercase text-text-muted border-b border-border-default">
                    <tr>
                      <th className="px-4 py-3 font-semibold min-w-[200px]">Product Name</th>
                      <th className="px-4 py-3 font-semibold w-32">Size & Base</th>
                      <th className="px-4 py-3 font-semibold w-24">Qty</th>
                      <th className="px-4 py-3 font-semibold w-32 text-right">Price/Unit</th>
                      <th className="px-4 py-3 font-semibold text-right">Total</th>
                      <th className="px-4 py-3 w-12"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-default">
                    {calculatedItems.map((item, idx) => (
                      <tr key={item.id} className="hover:bg-surface-bg transition-colors">
                        {/* Name Column */}
                        <td className="px-4 py-3 align-middle">
                          <div className="flex flex-col gap-2">
                            <ProductCombobox 
                              value={item.name} 
                              onChange={(name, unit, mrp) => handleProductSelect(item.id, name, unit, mrp)}
                              products={dbProducts} 
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
                                  className="h-8 w-24 px-2 text-xs rounded border border-border-default focus:border-primary outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                  placeholder="Cost ₹"
                                />
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Size & Base Column */}
                        <td className="px-4 py-3 align-middle">
                          <div className="flex flex-col gap-2">
                            <input 
                              type="text" 
                              value={item.size}
                              onChange={(e) => updateItem(item.id, 'size', e.target.value)}
                              className="h-9 w-full px-2 text-sm rounded border border-border-default focus:border-primary outline-none"
                              placeholder="Size e.g. 1L"
                            />
                            <input 
                              type="text" 
                              value={item.base}
                              onChange={(e) => updateItem(item.id, 'base', e.target.value)}
                              className="h-9 w-full px-2 text-sm rounded border border-border-default focus:border-primary outline-none"
                              placeholder="Base (Opt)"
                            />
                          </div>
                        </td>

                        {/* Qty Column */}
                        <td className="px-4 py-3 align-middle">
                          <input 
                            type="number" 
                            min="1"
                            value={item.qty || ''}
                            onChange={(e) => updateItem(item.id, 'qty', parseInt(e.target.value) || 0)}
                            className="h-9 w-full px-2 text-sm text-center rounded border border-border-default focus:border-primary outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                        </td>

                        {/* Price Column */}
                        <td className="px-4 py-3 align-middle">
                          <input 
                            type="number" 
                            value={item.rate || ''}
                            onChange={(e) => updateItem(item.id, 'rate', parseFloat(e.target.value) || 0)}
                            className="h-9 w-full px-2 text-sm text-right rounded border border-border-default focus:border-primary outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            placeholder="0.00"
                          />
                        </td>

                        {/* Total Column */}
                        <td className="px-4 py-3 align-middle text-right">
                          <div className="h-9 flex items-center justify-end text-sm font-mono font-medium text-text-main">
                            {formatCurrency(item.itemSub)}
                          </div>
                        </td>

                        {/* Remove Action Column */}
                        <td className="px-4 py-3 align-middle text-center">
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
            </div>

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
                  className="h-9 w-24 px-3 rounded border border-border-default focus:border-primary outline-none text-sm text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
            </div>

            {/* GST Card */}
            <div className="bg-card-bg border border-border-default rounded shadow-sm p-5">
              <h3 className="font-semibold text-text-main mb-4 border-b border-border-default pb-2">Global GST</h3>
              <div className="flex flex-wrap gap-2 mb-3">
                {[0, 12, 18].map(pct => (
                  <button 
                    key={pct}
                    onClick={() => setGlobalGst(pct)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors border ${
                      globalGst === pct 
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
                  value={globalGst}
                  onChange={(e) => setGlobalGst(e.target.value === "" ? "" : parseFloat(e.target.value))}
                  className="h-9 w-24 px-3 rounded border border-border-default focus:border-primary outline-none text-sm text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
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
      <div className="hidden print:flex flex-col items-center w-full bg-white text-black font-sans">
        <style type="text/css" media="print">
          {`
            @page {
              size: A5 portrait;
              margin: 6mm;
            }
            * {
              -webkit-print-color-adjust: exact;
            }
            .bill-page {
              width: 148mm;
              min-height: 205mm;
              display: flex;
              flex-direction: column;
              font-family: Arial, sans-serif;
              font-size: 11px;
              page-break-after: always;
            }
            .bill-page:last-child {
              page-break-after: avoid;
            }
            .bill-header {
              text-align: center;
              border-bottom: 2px solid black;
              padding-bottom: 4px;
              margin-bottom: 4px;
            }
            .bill-header h1 { 
              font-size: 18px; 
              font-weight: 900;
              margin: 0;
              letter-spacing: 1px;
            }
            .bill-header h2 { 
              font-size: 11px;
              margin: 2px 0;
            }
            .bill-info {
              display: flex;
              justify-content: space-between;
              border-bottom: 1px solid black;
              padding: 3px 0;
              font-size: 10px;
            }
            .customer-info {
              border-bottom: 1px solid black;
              padding: 3px 0;
              font-size: 10px;
            }
            .print-table {
              width: 100%;
              border-collapse: collapse;
              flex: 1;
            }
            .print-table th {
              background: #000;
              color: #fff;
              padding: 3px 2px;
              font-size: 9px;
              text-align: center;
              border: 1px solid black;
            }
            .print-table td {
              padding: 4px 2px;
              border: 1px solid black;
              font-size: 10px;
              vertical-align: top;
            }
            .totals {
              border-top: 2px solid black;
              margin-top: 4px;
              padding-top: 4px;
            }
            .total-row {
              display: flex;
              justify-content: space-between;
              font-size: 10px;
              padding: 1px 0;
            }
            .grand-total {
              display: flex;
              justify-content: space-between;
              font-size: 14px;
              font-weight: 900;
              border-top: 2px solid black;
              border-bottom: 2px solid black;
              padding: 3px 0;
              margin: 3px 0;
            }
            .footer {
              margin-top: auto;
              border-top: 1px dashed black;
              padding-top: 3px;
              font-size: 8px;
              text-align: center;
            }
          `}
        </style>

        {printChunks.map((chunk, pageIndex) => (
          <div key={pageIndex} className="bill-page bg-white text-black">
            
            {/* Header always */}
            <div className="bill-header">
              <h1>HANUMAN PAINTS</h1>
              <h2>Authorized Dulux Blue Store, Lohapatty, Madhubani Ph:8292889540</h2>
              <h2>{billType === 'DPL' ? 'DPL INVOICE' : 'TAX INVOICE'}</h2>
            </div>
            
            <div className="bill-info">
              <span><b>Bill:</b> {billNumber}</span>
              <span><b>Dt:</b> {format(new Date(billDate), 'dd/MM/yyyy')}</span>
            </div>

            {/* CustomerInfo */}
            <div className="customer-info">
              <div className="flex justify-between">
                <div>
                  <div><b>Customer:</b> {customerName}</div>
                  <div><b>Phone:</b> {customerPhone}</div>
                  {customerAddress && <div><b>Address:</b> {customerAddress}</div>}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div>Page: {pageIndex + 1} of {printChunks.length}</div>
                </div>
              </div>
            </div>

            {/* ItemsTable */}
            <table className="print-table">
              <thead>
                <tr>
                  <th style={{ width: '8%' }}>S.No</th>
                  <th style={{ width: '40%', textAlign: 'left' }}>Item Description</th>
                  <th style={{ width: '12%' }}>Size</th>
                  <th style={{ width: '8%' }}>Qty</th>
                  <th style={{ width: '16%', textAlign: 'right' }}>Rate</th>
                  <th style={{ width: '16%', textAlign: 'right' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {chunk.map((item, idx) => (
                  <Fragment key={item.id}>
                    <tr>
                      <td style={{ textAlign: 'center' }}>{pageIndex * ITEMS_PER_PAGE + idx + 1}</td>
                      <td>{item.name} {item.base && `| Base: ${item.base}`}</td>
                      <td style={{ textAlign: 'center' }}>{item.size}</td>
                      <td style={{ textAlign: 'center' }}>{item.qty}</td>
                      <td style={{ textAlign: 'right' }}>{item.rate.toFixed(2)}</td>
                      <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{item.itemSub.toFixed(2)}</td>
                    </tr>
                    {item.hasColorant && (
                      <tr>
                        <td></td>
                        <td style={{ paddingLeft: '8px', fontSize: '9px', color: '#444' }}>
                          └ Color: {item.colorCode} | Colorant: ₹{item.colorantCost.toFixed(2)}
                        </td>
                        <td colSpan={4}></td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
            
            {/* Totals only on last page */}
            {pageIndex === printChunks.length - 1 && (
              <div className="totals">
                <div className="total-row">
                  <span>Subtotal:</span>
                  <span>₹{totals.subtotal.toFixed(2)}</span>
                </div>
                {totals.discount_amount > 0 && (
                  <div className="total-row">
                    <span>Discount (-):</span>
                    <span>₹{totals.discount_amount.toFixed(2)}</span>
                  </div>
                )}
                <div className="total-row">
                  <span>Taxable:</span>
                  <span>₹{totals.taxable_value.toFixed(2)}</span>
                </div>
                {totals.cgst_amount > 0 && (
                  <>
                    <div className="total-row">
                      <span>CGST ({globalGst === "" ? 0 : globalGst}%):</span>
                      <span>₹{totals.cgst_amount.toFixed(2)}</span>
                    </div>
                    <div className="total-row">
                      <span>SGST ({globalGst === "" ? 0 : globalGst}%):</span>
                      <span>₹{totals.sgst_amount.toFixed(2)}</span>
                    </div>
                  </>
                )}
                <div className="grand-total">
                  <span>GRAND TOTAL:</span>
                  <span>₹{totals.total_amount.toFixed(2)}</span>
                </div>
                <div className="total-row" style={{ fontWeight: 'bold' }}>
                  <span>Payment Status:</span>
                  <span style={{ textTransform: 'uppercase' }}>{paymentStatus}</span>
                </div>
              </div>
            )}
            
            {/* Footer */}
            <div className="footer">
              <b>Terms:</b> Goods once sold cannot be returned.
              {billType === 'DPL' && <div><b>* Dealer Price List</b></div>}
            </div>
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

export default function BillingPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-text-muted">Loading billing...</div>}>
      <BillingContent />
    </Suspense>
  )
}
