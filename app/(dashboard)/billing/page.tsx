"use client"

import { Fragment, useState, useMemo, useEffect, Suspense } from "react"
import { format } from "date-fns"
import { Trash2, Plus, CheckCircle2, Save, Printer } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { ProductCombobox, Product } from "@/components/ProductCombobox"
import { useRouter, useSearchParams } from "next/navigation"

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

  // UI State
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState("")
  const [savedBillId, setSavedBillId] = useState<string | null>(null)

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

  // Products from DB
  const [dbProducts, setDbProducts] = useState<Product[]>([])

  // Shop Settings
  const [shopSettings, setShopSettings] = useState({
    shop_name: "HANUMAN PAINTS",
    tagline: "Authorized Dulux Blue Store",
    address: "Ward No 16, Lohapatty, Madhubani, Bihar",
    phone: "8292889540"
  })

  const fetchNextBillNumber = async () => {
    try {
      const { data, error } = await supabase
        .from('bills')
        .select('bill_number')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (error || !data) {
        setBillNumber('HP-S-001')
        return
      }

      const match = data.bill_number.match(/(\d+)$/)
      const next = match ? parseInt(match[1]) + 1 : 1
      setBillNumber('HP-S-' + next.toString().padStart(3, '0'))
    } catch {
      setBillNumber('HP-S-001')
    }
  }

  useEffect(() => {
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
    fetchShopSettings()

    const fetchProducts = async () => {
      let { data, error } = await supabase
        .from("products")
        .select("id, name, unit, category, type, mrp:base_mrp, is_active")
        .eq("is_active", true)
        .order("name", { ascending: true })

      if (error) {
        const fallback = await supabase
          .from("products")
          .select("id, name, unit, category, type")
          .order("name", { ascending: true })
        if (fallback.data) setDbProducts(fallback.data)
      } else if (data) {
        setDbProducts(data)
      }
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
    let totalColorant = 0;
    calculatedItems.forEach(item => {
      subtotal += item.itemSub
      if (item.hasColorant) {
        totalColorant += item.colorantCost
      }
    })

    const discount_amount = Math.max(0, subtotal * (discountPercent / 100))
    const taxable_value = Math.max(0, subtotal - discount_amount)

    const gstRate = globalGst === "" ? 0 : Number(globalGst)
    const gst_total = Math.max(0, taxable_value * (gstRate / 100))
    const total_amount = Math.max(0, taxable_value + gst_total)

    return {
      subtotal: Math.max(0, subtotal),
      totalColorant: Math.max(0, totalColorant),
      discount_amount: Math.max(0, discount_amount),
      taxable_value: Math.max(0, taxable_value),
      cgst_amount: Math.max(0, gst_total / 2),
      sgst_amount: Math.max(0, gst_total / 2),
      total_amount: Math.max(0, Math.round(total_amount))
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

  const resetForm = async () => {
    setCustomerName("")
    setCustomerPhone("")
    setCustomerAddress("")
    setItems([{ id: Date.now().toString(), name: "", size: "", base: "", qty: 1, rate: 0, hasColorant: false, colorCode: "", colorantCost: 0 }])
    setDiscountPercent(0)
    setGlobalGst("")
    setPaymentStatus("paid")
    await fetchNextBillNumber()
    if (editId) {
      router.push('/admin/history')
    } else {
      router.refresh()
    }
  }

  const handleSave = async (isPrintAction = false) => {
    if (!customerName || !customerPhone || customerPhone.length < 10) {
      alert("Please enter a valid customer name and 10-digit phone number.")
      return null
    }
    if (items.some(i => !i.name || i.qty < 1)) {
      alert("Please ensure all products have a name and quantity.")
      return null
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
        due_date: null,
        bill_number: billNumber
      }
    }

    let insertedData;
    let saveError;

    if (editId) {
      const { data, error } = await supabase
        .from('bills')
        .update(billData)
        .eq('id', editId)
        .select('id')
        .single()
      insertedData = data;
      saveError = error;
    } else {
      const { data, error } = await supabase
        .from('bills')
        .insert([billData])
        .select('id')
        .single()
      insertedData = data;
      saveError = error;
    }

    if (saveError) {
      alert("Error saving bill: " + saveError.message)
      setLoading(false)
      return null
    }

    if (insertedData) {
      setSavedBillId(insertedData.id)
    }

    if (paymentStatus === 'unpaid' && ledgerData) {
      const { error: ledgerError } = await supabase.from('ledger').insert([ledgerData])
      if (ledgerError) console.error("Error saving ledger:", ledgerError)
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

    setLoading(false)

    if (!isPrintAction) {
      await resetForm();
    }

    return insertedData?.id
  }

  const handlePrint = async () => {
    const successId = await handleSave(true);

    if (successId || editId) {
      setTimeout(() => {
        window.print();
        setTimeout(() => {
          resetForm();
        }, 1500);
      }, 300);
    }
  }

  const formatCurrency = (num: number) => {
    return num.toLocaleString('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 })
  }

  // --- PRINT PAGINATION LOGIC ---
  const ITEMS_PER_PAGE = 5;
  const pages = [];
  for (let i = 0; i < calculatedItems.length; i += ITEMS_PER_PAGE) {
    pages.push(calculatedItems.slice(i, i + ITEMS_PER_PAGE));
  }
  if (pages.length === 0) pages.push([]);

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
              <div className="p-5 border-b border-border-default flex justify-between items-center mb-4">
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
                {/* Add Another Product Button */}
                <div className="p-4 border-t border-border-default">
                  <button
                    onClick={handleAddItem}
                    className="text-primary hover:bg-surface-container-highest px-4 py-2 rounded text-sm font-medium flex items-center gap-2 transition-colors border border-transparent hover:border-border-default"
                  >
                    <Plus className="h-4 w-4" /> Add Another Product
                  </button>
                </div>
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
                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors border ${discountPercent === pct
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
                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors border ${globalGst === pct
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
                {totals.totalColorant > 0 && (
                  <div className="flex justify-between items-center text-sm text-text-muted animate-in fade-in">
                    <span>Colorant Total</span>
                    <span className="font-mono text-primary">+{formatCurrency(totals.totalColorant)}</span>
                  </div>
                )}
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
                  onClick={() => handleSave(false)}
                  disabled={loading}
                  className="w-full h-12 bg-white border border-border-default text-text-main rounded font-bold flex items-center justify-center gap-2 hover:bg-surface-container transition-colors shadow-sm active:scale-[0.98] disabled:opacity-70"
                >
                  <Save className="h-5 w-5" /> {loading ? "Saving..." : (editId ? "Save Changes" : "Save Bill")}
                </button>
                <button
                  onClick={handlePrint}
                  disabled={loading}
                  className="w-full h-12 bg-[#16a34a] text-white rounded font-bold flex items-center justify-center gap-2 hover:bg-[#15803d] transition-colors shadow-sm active:scale-[0.98] disabled:opacity-70"
                >
                  <Printer className="h-5 w-5" /> {editId ? "Save Changes & Print" : "Save & Print Bill"}
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* --- HIDDEN PRINT TEMPLATE (ONLY VISIBLE ON PRINTER) --- */}
      {/* Absolute container that breaks out of any parent hiding/layout to ensure full page print */}
      <div className="print-container">
        <style>{`
          .print-container {
            display: none;
          }
          @media print {
            .print-container {
              display: block !important;
              position: fixed !important;
              top: 0 !important;
              left: 0 !important;
              width: 100vw !important;
              height: 100vh !important;
              background: white !important;
              z-index: 999999 !important;
            }
            body > *:not(.print-container) {
              display: none !important;
            }
            @page { size: 148mm 210mm; margin: 0; }
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; margin: 0; background: white; }
            
            .bill-page { 
              width: 148mm;
              height: 209mm;
              overflow: hidden;
              page-break-after: always;
              padding: 10mm;
              background: white;
              font-family: Arial, sans-serif;
              color: black;
              box-sizing: border-box;
            }
            .bill-page:last-child { page-break-after: avoid; }
            
            table { width: 100%; border-collapse: collapse; margin-top: 10px; margin-bottom: 10px; }
            th { border-top: 1px solid #000; border-bottom: 1px solid #000; padding: 6px 4px; text-align: left; font-size: 11px; font-weight: bold; }
            td { padding: 6px 4px; font-size: 11px; border: none; }
            
            .text-right { text-align: right; }
            .text-center { text-align: center; }
            .font-bold { font-weight: bold; }
            
            .totals-container {
              display: flex;
              justify-content: flex-end;
              margin-top: 15px;
            }
            .totals-box {
              width: 60%;
            }
            .totals-row {
              display: flex;
              justify-content: space-between;
              padding: 4px 0;
              font-size: 11px;
            }
            .grand-total-row {
              display: flex;
              justify-content: space-between;
              padding: 8px 0;
              font-size: 13px;
              font-weight: bold;
              border-top: 1px solid #000;
              margin-top: 4px;
            }
          }
        `}</style>

        {pages.map((pageItems, idx) => (
          <div key={idx} className="bill-page mx-auto">

            {/* HEADER (Centered) */}
            <div style={{ textAlign: 'center', marginBottom: '15px' }}>
              <div style={{ fontSize: '20px', fontWeight: 'bold', letterSpacing: '0.5px' }}>
                {shopSettings.shop_name}
              </div>
              <div style={{ fontSize: '11px', marginTop: '2px' }}>{shopSettings.tagline}</div>
              <div style={{ fontSize: '11px' }}>{shopSettings.address}</div>
              <div style={{ fontSize: '11px' }}>Ph: {shopSettings.phone}</div>
            </div>

            {/* TAX INVOICE TITLE */}
            <div style={{ textAlign: 'center', marginBottom: '10px' }}>
              <div style={{ fontSize: '12px', fontWeight: 'bold' }}>TAX INVOICE</div>
              <div style={{ fontSize: '11px', fontWeight: 'bold', marginTop: '2px' }}>Bill: {billNumber}</div>
            </div>

            <div style={{ borderTop: '1px solid #000', marginBottom: '8px' }}></div>

            {/* CUSTOMER & DATE INFO */}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '8px' }}>
              <div>
                <div>Bill To: {customerName}</div>
                <div style={{ marginTop: '2px' }}>Phone: {customerPhone}</div>
              </div>
              <div>
                Date: {new Date(billDate).toLocaleDateString('en-IN')}
              </div>
            </div>

            {/* ITEMS TABLE (Clean horizontal lines only) */}
            <table>
              <thead>
                <tr>
                  <th style={{ width: '8%' }}>S.No</th>
                  <th style={{ width: '38%' }}>Item</th>
                  <th style={{ width: '12%', textAlign: 'center' }}>Size</th>
                  <th style={{ width: '10%', textAlign: 'center' }}>Qty</th>
                  <th style={{ width: '16%', textAlign: 'center' }}>Price</th>
                  <th style={{ width: '16%', textAlign: 'right' }}>Total</th>
                </tr>
              </thead>
              <tbody style={{ borderBottom: '1px solid #000' }}>
                {pageItems.map((item: any, i: number) => (
                  <Fragment key={item.id}>
                    <tr>
                      <td>{idx * ITEMS_PER_PAGE + i + 1}</td>
                      <td>{item.name}</td>
                      <td className="text-center">{item.size}</td>
                      <td className="text-center">{item.qty}</td>
                      <td className="text-center">{item.rate > 0 ? item.rate : ''}</td>
                      <td className="text-right">{item.itemSub > 0 ? item.itemSub.toFixed(2) : ''}</td>
                    </tr>
                    {item.hasColorant && (
                      <tr>
                        <td></td>
                        <td colSpan={5} style={{ paddingLeft: '8px', fontSize: '10px', color: '#333', paddingBottom: '8px' }}>
                          <div>└ Color Code: {item.colorCode}</div>
                          {item.base && <div>└ Base: {item.base}</div>}
                          <div>└ Colorant: ₹{Number(item.colorantCost).toFixed(2)}</div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
                {/* Empty spacer row to ensure the border-bottom looks clean */}
                <tr><td colSpan={6} style={{ padding: '2px' }}></td></tr>
              </tbody>
            </table>

            {/* TOTALS - last page only */}
            {idx === pages.length - 1 ? (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '15px' }}>

                {/* Left side empty space to push totals to right */}
                <div style={{ width: '40%' }}></div>

                {/* Right side totals box */}
                <div style={{ width: '60%', paddingLeft: '20px' }}>
                  <div className="totals-row">
                    <span>Subtotal:</span>
                    <span>₹{Number(totals.subtotal).toFixed(2)}</span>
                  </div>

                  {Number(totals.discount_amount) > 0 && (
                    <div className="totals-row">
                      <span>Discount (-):</span>
                      <span>₹{Number(totals.discount_amount).toFixed(2)}</span>
                    </div>
                  )}

                  <div className="totals-row">
                    <span>Taxable Value:</span>
                    <span>₹{Number(totals.taxable_value).toFixed(2)}</span>
                  </div>

                  {Number(totals.cgst_amount) > 0 && (
                    <>
                      <div className="totals-row">
                        <span>CGST:</span>
                        <span>₹{Number(totals.cgst_amount).toFixed(2)}</span>
                      </div>
                      <div className="totals-row">
                        <span>SGST:</span>
                        <span>₹{Number(totals.sgst_amount).toFixed(2)}</span>
                      </div>
                    </>
                  )}

                  <div className="grand-total-row">
                    <span>GRAND TOTAL:</span>
                    <span>₹{Number(totals.total_amount).toFixed(2)}</span>
                  </div>

                  <div className="totals-row" style={{ marginTop: '10px', fontWeight: 'bold' }}>
                    <span>Payment:</span>
                    <span>{paymentStatus.toUpperCase()}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'right', fontSize: '10px', fontStyle: 'italic', marginTop: '10px' }}>
                Continued on next page...
              </div>
            )}

            {/* FOOTER - Always at the bottom */}
            {idx === pages.length - 1 && (
              <div style={{ marginTop: '40px', textAlign: 'center', fontSize: '9px' }}>
                <div style={{ borderTop: '1px dashed #000', marginBottom: '8px', width: '80%', margin: '0 auto 8px auto' }}></div>
                <div style={{ fontWeight: 'bold', marginBottom: '2px' }}>Terms & Conditions</div>
                <div>Goods once sold cannot be returned.</div>
              </div>
            )}

          </div>
        ))}
      </div>

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-4 right-4 bg-green-600 text-white px-4 py-3 rounded shadow-lg flex items-center gap-2 animate-in slide-in-from-bottom-5 z-50 print:hidden">
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