"use client"

import { Fragment, useState, useMemo, useEffect, useRef, Suspense } from "react"
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
  discountPercent: number;
  hasColorant: boolean;
  colorCode: string;
  colorantCost: number;
  litreDiscount?: number;
}

function BillingContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const editId = searchParams.get('edit')
  
  // Security: Atomic submission lock
  const isSubmitting = useRef(false)

  // Settings
  const [billType, setBillType] = useState<"MRP" | "DPL">("MRP")
  const [billNumber, setBillNumber] = useState("HP-S-001")
  const [billDate, setBillDate] = useState(format(new Date(), "yyyy-MM-dd"))

  // Customer
  const [customerName, setCustomerName] = useState("")
  const [customerPhone, setCustomerPhone] = useState("")
  const [customerAddress, setCustomerAddress] = useState("")

  // Customer Autocomplete State
  const [customerResults, setCustomerResults] = useState<any[]>([])
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false)
  const customerInputRef = useRef<HTMLInputElement>(null)
  const customerDropdownRef = useRef<HTMLDivElement>(null)
  const [customerDropdownStyle, setCustomerDropdownStyle] = useState<React.CSSProperties>({})

  // UI State
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState("")
  const [savedBillId, setSavedBillId] = useState<string | null>(null)

  // Products
  const [items, setItems] = useState<BillItem[]>([
    { id: Date.now().toString(), name: "", size: "", base: "", qty: 1, rate: 0, discountPercent: 0, hasColorant: false, colorCode: "", colorantCost: 0, litreDiscount: 0 }
  ])

  // Global Financial Modifiers
  const [globalGst, setGlobalGst] = useState<number | "">("")

  // Payment (Added Partial Payment Support)
  const [paymentStatus, setPaymentStatus] = useState<"paid" | "unpaid" | "partial">("paid")
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "upi" | "both">("cash")
  const [amountPaid, setAmountPaid] = useState<number | "">("")

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

  // Customer Dropdown Positioning
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (customerDropdownRef.current && !customerDropdownRef.current.contains(event.target as Node) &&
          customerInputRef.current && !customerInputRef.current.contains(event.target as Node)) {
        setShowCustomerDropdown(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  useEffect(() => {
    if (showCustomerDropdown && customerInputRef.current) {
      const rect = customerInputRef.current.getBoundingClientRect()
      setCustomerDropdownStyle({
        position: 'fixed',
        zIndex: 9999,
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width
      })
    }
  }, [showCustomerDropdown, customerName])

  // Customer Search Fetch
  useEffect(() => {
    const fetchCustomers = async () => {
      if (!customerName || customerName.trim().length < 2) {
        setCustomerResults([])
        return
      }
      const { data } = await supabase
        .from('customers')
        .select('name, phone, customer_type, notes')
        .or(`name.ilike.%${customerName}%,phone.ilike.%${customerName}%`)
        .limit(10)
      if (data) setCustomerResults(data)
    }
    const timer = setTimeout(() => {
      if (showCustomerDropdown) fetchCustomers()
    }, 300)
    return () => clearTimeout(timer)
  }, [customerName, showCustomerDropdown])

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
            discountPercent: i.discountPercent || 0,
            hasColorant: i.hasColorant || false,
            colorCode: i.colorCode || "",
            colorantCost: i.colorantCost || 0,
            litreDiscount: i.litreDiscount || 0
          }))
          setItems(loadedItems.length > 0 ? loadedItems : [{ id: Date.now().toString(), name: "", size: "", base: "", qty: 1, rate: 0, discountPercent: 0, hasColorant: false, colorCode: "", colorantCost: 0, litreDiscount: 0 }])

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

  // Calculations (Enforced explicit Float logic)
  const calculatedItems = useMemo(() => {
    return items.map(item => {
      const base = item.qty * item.rate;
      const colorant = item.hasColorant ? (item.colorantCost || 0) : 0;
      const item_with_colorant = base + colorant;
      
      const disc_percent_amount = item_with_colorant * ((item.discountPercent || 0) / 100);
      const litre_disc_amount = billType === 'DPL' ? ((item.litreDiscount || 0) * item.qty) : 0;
      
      const total_item_discount = disc_percent_amount + litre_disc_amount;
      const taxable = Math.max(0, item_with_colorant - total_item_discount);
      
      const gstRate = globalGst === "" ? 0 : Number(globalGst);
      const gst = taxable * (gstRate / 100);
      
      const item_total = Math.max(0, taxable + gst);
      
      return { 
        ...item, 
        basePrice: base, 
        colorant, 
        litre_disc_amount,
        itemDiscount: disc_percent_amount, 
        item_sub: item_with_colorant,
        taxable,
        gst,
        item_total
      }
    })
  }, [items, billType, globalGst])

  const totals = useMemo(() => {
    let subtotal = 0;
    let totalColorant = 0;
    let discount_amount = 0;
    let litre_discount_total = 0;
    let taxable_value = 0;
    let gst_total = 0;

    calculatedItems.forEach(item => {
      subtotal += item.basePrice + item.colorant;
      litre_discount_total += item.litre_disc_amount || 0;
      discount_amount += item.itemDiscount || 0;
      taxable_value += item.taxable || 0;
      gst_total += item.gst || 0;
      if (item.hasColorant) {
        totalColorant += item.colorantCost;
      }
    });

    const cgst = Number((gst_total / 2).toFixed(2));
    const sgst = Number((gst_total / 2).toFixed(2));
    const total_amount = Math.max(0, Math.round(taxable_value + cgst + sgst));

    return {
      subtotal: Number(subtotal.toFixed(2)),
      totalColorant: Number(totalColorant.toFixed(2)),
      litre_discount_total: Number(litre_discount_total.toFixed(2)),
      discount_amount: Number(discount_amount.toFixed(2)),
      taxable_value: Number(taxable_value.toFixed(2)),
      cgst_amount: cgst,
      sgst_amount: sgst,
      total_amount: total_amount
    }
  }, [calculatedItems])

  const handleAddItem = () => {
    setItems([...items, { id: Date.now().toString(), name: "", size: "", base: "", qty: 1, rate: 0, discountPercent: 0, hasColorant: false, colorCode: "", colorantCost: 0, litreDiscount: 0 }])
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
    setItems([{ id: Date.now().toString(), name: "", size: "", base: "", qty: 1, rate: 0, discountPercent: 0, hasColorant: false, colorCode: "", colorantCost: 0, litreDiscount: 0 }])
    setGlobalGst("")
    setPaymentStatus("paid")
    setAmountPaid("")
    await fetchNextBillNumber()
    if (editId) {
      router.push('/history')
    } else {
      router.refresh()
    }
  }

  const handleSave = async (isPrintAction = false) => {
    if (isSubmitting.current) return null; // Double-Click Lock
    
    if (!customerName || !customerPhone || customerPhone.length < 10) {
      alert("Please enter a valid customer name and 10-digit phone number.")
      return null
    }
    if (items.some(i => !i.name || i.qty < 1)) {
      alert("Please ensure all products have a name and quantity.")
      return null
    }
    if (paymentStatus === 'partial' && (amountPaid === "" || amountPaid === 0)) {
      alert("Please enter the partial amount paid by the customer.")
      return null
    }

    isSubmitting.current = true;
    setLoading(true)

    try {
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
        payment_method: paymentStatus === 'unpaid' ? 'unpaid' : paymentMethod,
        bill_type: billType,
        is_deleted: false,
        staff_name: 'Admin',
        paid_amount: paymentStatus === 'partial' ? Number(amountPaid) : (paymentStatus === 'paid' ? totals.total_amount : 0)
      }

      let ledgerData = null;
      if (paymentStatus === 'unpaid' || paymentStatus === 'partial') {
        const balanceDue = paymentStatus === 'partial' ? totals.total_amount - Number(amountPaid) : totals.total_amount;
        
        if (balanceDue > 0) {
          ledgerData = {
            customer_name: customerName,
            customer_phone: customerPhone,
            type: 'receivable',
            amount: balanceDue,
            description: `Bill ${billNumber} Balance`,
            date: billDate,
            status: 'pending',
            due_date: null,
            bill_number: billNumber
          }
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
        return null
      }

      if (insertedData) {
        setSavedBillId(insertedData.id)
      }

      if (ledgerData) {
        const { error: ledgerError } = await supabase.from('ledger').insert([ledgerData])
        if (ledgerError) console.error("Error saving ledger:", ledgerError)
      }

      const warnings: string[] = []
      const deductionPromises = calculatedItems.map(async (item) => {
        if (!item.name || item.qty <= 0) return;
        if (editId) return; // Prevent double-deduction when editing an existing bill
        
        // Use atomic RPC stock deduction to prevent concurrency overrides
        const { data, error } = await supabase.rpc('decrement_stock', {
          p_name: item.name,
          qty: item.qty
        });
        
        if (error || !data) {
           warnings.push(`⚠️ ${item.name} ka stock update fail hua ya kam hai`)
        }
      })
      await Promise.all(deductionPromises)

      // --- CUSTOMER AUTO-SAVE LOGIC ---
      try {
        if (customerPhone && !editId) { // Only do this for new bills, or we might double-count total_value
          const { data: existingCustomer } = await supabase
            .from('customers')
            .select('id, total_orders, total_value')
            .eq('phone', customerPhone)
            .maybeSingle();

          if (existingCustomer) {
            await supabase
              .from('customers')
              .update({
                name: customerName,
                total_orders: (existingCustomer.total_orders || 0) + 1,
                total_value: Number((existingCustomer.total_value || 0)) + totals.total_amount,
                last_visit: new Date().toISOString()
              })
              .eq('id', existingCustomer.id);
          } else {
            await supabase
              .from('customers')
              .insert([{
                name: customerName,
                phone: customerPhone,
                notes: customerAddress || "",
                customer_type: 'retail',
                total_orders: 1,
                total_value: totals.total_amount,
                last_visit: new Date().toISOString()
              }]);
          }
        }
      } catch (custError) {
        console.error("Error auto-saving customer:", custError);
      }
      // --- END CUSTOMER AUTO-SAVE LOGIC ---

      if (warnings.length > 0) {
        setToast(warnings.join(' | '))
      } else {
        setToast("Bill saved successfully!")
      }
      setTimeout(() => setToast(""), 5000)

      if (!isPrintAction) {
        await resetForm();
      }

      return insertedData?.id

    } catch (e: any) {
      alert("System Error: " + e.message)
      return null
    } finally {
      isSubmitting.current = false;
      setLoading(false)
    }
  }

  const handlePrint = async () => {
    const successId = await handleSave(true);

    if (successId || editId) {
      setTimeout(() => {
        const afterPrint = () => {
          resetForm();
          window.removeEventListener('afterprint', afterPrint);
        };
        window.addEventListener('afterprint', afterPrint);
        window.print();
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
                <div className="flex flex-col gap-1.5 relative">
                  <label className="text-sm text-text-muted font-medium">Customer Name <span className="text-error">*</span></label>
                  <input
                    ref={customerInputRef}
                    type="text"
                    value={customerName}
                    onChange={(e) => {
                      setCustomerName(e.target.value)
                      setShowCustomerDropdown(true)
                    }}
                    onClick={() => setShowCustomerDropdown(true)}
                    className="h-10 px-3 rounded border border-border-default bg-surface-container-lowest focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                    placeholder="Enter name"
                  />
                  {showCustomerDropdown && customerResults.length > 0 && (
                    <div 
                      ref={customerDropdownRef} 
                      className="product-dropdown" 
                      style={customerDropdownStyle}
                    >
                      <ul className="py-1">
                        {customerResults.map((c, i) => (
                          <li
                            key={i}
                            onClick={() => {
                              setCustomerName(c.name)
                              setCustomerPhone(c.phone)
                              if (c.notes) setCustomerAddress(c.notes)
                              setShowCustomerDropdown(false)
                            }}
                            className="cursor-pointer px-3 py-2 hover:bg-surface-container border-b border-border-default last:border-0"
                          >
                            <div className="font-medium text-sm text-text-main">{c.name}</div>
                            <div className="text-xs text-text-muted">{c.phone}</div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
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
                      <th className="px-4 py-3 font-semibold w-24 text-right">Disc(%)</th>
                      {billType === 'DPL' && <th className="px-4 py-3 font-semibold w-24 text-right">Litre Disc(₹)</th>}
                      <th className="px-4 py-3 font-semibold text-right">Total</th>
                      <th className="px-4 py-3 w-12"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-default">
                    {calculatedItems.map((item, idx) => (
                      <tr key={item.id} className="hover:bg-surface-bg transition-colors">
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
                                  value={item.colorantCost === 0 ? '' : item.colorantCost}
                                  onChange={(e) => updateItem(item.id, 'colorantCost', e.target.value === '' ? 0 : parseFloat(e.target.value))}
                                  onWheel={(e) => (e.target as HTMLElement).blur()}
                                  className="h-8 w-24 px-2 text-xs rounded border border-border-default focus:border-primary outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                  placeholder="Cost ₹"
                                />
                              </div>
                            )}
                          </div>
                        </td>

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

                        <td className="px-4 py-3 align-middle">
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={item.qty === 0 ? '' : item.qty}
                            onChange={(e) => updateItem(item.id, 'qty', e.target.value === '' ? 0 : parseFloat(e.target.value))}
                            onWheel={(e) => (e.target as HTMLElement).blur()}
                            className="h-9 w-full px-2 text-sm text-center rounded border border-border-default focus:border-primary outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                        </td>

                        <td className="px-4 py-3 align-middle">
                          <input
                            type="number"
                            step="any"
                            value={item.rate === 0 ? '' : item.rate}
                            onChange={(e) => updateItem(item.id, 'rate', e.target.value === '' ? 0 : parseFloat(e.target.value))}
                            onWheel={(e) => (e.target as HTMLElement).blur()}
                            className="h-9 w-full px-2 text-sm text-right rounded border border-border-default focus:border-primary outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            placeholder="0.00"
                          />
                        </td>

                        <td className="px-4 py-3 align-middle">
                          <input
                            type="number"
                            step="any"
                            value={item.discountPercent === 0 ? '' : item.discountPercent}
                            onChange={(e) => updateItem(item.id, 'discountPercent', e.target.value === '' ? 0 : parseFloat(e.target.value))}
                            onWheel={(e) => (e.target as HTMLElement).blur()}
                            className="h-9 w-full px-2 text-sm text-right rounded border border-border-default focus:border-primary outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            placeholder="0%"
                          />
                        </td>
                        {billType === 'DPL' && (
                          <td className="px-4 py-3 align-middle">
                            <input
                              type="number"
                              step="any"
                              value={item.litreDiscount === 0 ? '' : item.litreDiscount}
                              onChange={(e) => updateItem(item.id, 'litreDiscount', e.target.value === '' ? 0 : parseFloat(e.target.value))}
                              onWheel={(e) => (e.target as HTMLElement).blur()}
                              className="h-9 w-full px-2 text-sm text-right rounded border border-border-default focus:border-primary outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              placeholder="0"
                            />
                          </td>
                        )}

                        <td className="px-4 py-3 align-middle text-right">
                          <div className="flex flex-col items-end">
                            <div className="h-9 flex items-center justify-end text-sm font-mono font-medium text-text-main">
                              {formatCurrency(item.item_total)}
                            </div>
                            {(item.itemDiscount > 0 || item.litre_disc_amount > 0) && (
                              <div className="text-[10px] text-text-muted mt-1 whitespace-nowrap">
                                {item.itemDiscount > 0 && `Disc: -₹${item.itemDiscount.toFixed(2)}`}
                                {item.itemDiscount > 0 && item.litre_disc_amount > 0 && ' | '}
                                {item.litre_disc_amount > 0 && `Litre Disc: -₹${item.litre_disc_amount.toFixed(2)}`}
                              </div>
                            )}
                          </div>
                        </td>

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
                    checked={paymentStatus === 'partial'}
                    onChange={() => setPaymentStatus('partial')}
                    className="text-primary focus:ring-primary accent-primary"
                  /> Partial
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

              {paymentStatus !== 'unpaid' && (
                <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-top-2">
                  <div className="flex flex-col gap-1.5">
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
                  {paymentStatus === 'partial' && (
                    <div className="flex flex-col gap-1.5">
                      <label className="text-sm text-text-muted font-medium text-primary">Amount Paid Now (₹)</label>
                      <input
                        type="number"
                        value={amountPaid}
                        onChange={(e) => setAmountPaid(e.target.value === "" ? "" : parseFloat(e.target.value))}
                        onWheel={(e) => (e.target as HTMLElement).blur()}
                        className="h-10 w-full px-3 rounded border border-primary bg-white focus:ring-1 focus:ring-primary outline-none font-bold text-lg"
                        placeholder="0.00"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* GST Card */}
            <div className="bg-card-bg border border-border-default rounded shadow-sm p-5">
              <h3 className="font-semibold text-text-main mb-4 border-b border-border-default pb-2">Global GST</h3>
              <div className="flex flex-wrap gap-2 mb-3">
                {[0, 12, 18, -18].map(pct => (
                  <button
                    key={pct}
                    onClick={() => setGlobalGst(pct)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors border ${globalGst === pct
                        ? 'bg-primary text-white border-primary'
                        : 'bg-surface text-text-muted border-border-default hover:border-primary/50'
                      }`}
                  >
                    {pct > 0 ? `+${pct}%` : `${pct}%`}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-text-muted">Custom %:</span>
                <input
                  type="number"
                  value={globalGst}
                  onChange={(e) => setGlobalGst(e.target.value === "" ? "" : parseFloat(e.target.value))}
                  onWheel={(e) => (e.target as HTMLElement).blur()}
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
                {billType === 'DPL' && totals.litre_discount_total > 0 && (
                  <div className="flex justify-between items-center text-sm text-text-muted animate-in fade-in">
                    <span>Litre Discount Total</span>
                    <span className="font-mono text-error">-{formatCurrency(totals.litre_discount_total)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center text-sm text-text-muted">
                  <span>Discount Total</span>
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
      <div id="bill-print">
        <style>{`
          #bill-print {
            display: none;
          }
          @media print {
            @page {
              size: A4 portrait;
              margin: 10mm;
            }
            body * { 
              visibility: hidden; 
            }
            #bill-print { 
              display: block !important;
              visibility: visible;
              position: absolute;
              top: 0;
              left: 0;
              width: 100%;
            }
            #bill-print * { 
              visibility: visible; 
            }
            .no-print { 
              display: none !important; 
            }
            .bill-page {
              page-break-after: always;
              font-family: sans-serif;
              color: black;
            }
            .bill-page:last-child {
              page-break-after: avoid;
            }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; margin-bottom: 15px; }
            th { border-bottom: 1px solid #000; padding: 8px 4px; text-align: left; }
            td { padding: 8px 4px; vertical-align: top; }
          }
        `}</style>

        {pages.map((pageItems, idx) => (
          <div key={idx} className="bill-page">

            <div style={{ textAlign: 'center', marginBottom: '15px' }}>
              <h2 style={{ margin: '0 0 5px 0', fontSize: '24px' }}>{shopSettings.shop_name}</h2>
              <div style={{ fontSize: '14px' }}>{shopSettings.tagline}</div>
              <div style={{ fontSize: '14px' }}>{shopSettings.address}</div>
              <div style={{ fontSize: '14px' }}>Ph: {shopSettings.phone}</div>
              <h3 style={{ margin: '15px 0 5px 0' }}>TAX INVOICE</h3>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #000', paddingBottom: '10px', marginBottom: '15px', fontSize: '14px' }}>
              <div>
                <strong>Bill To:</strong> {customerName}<br/>
                <strong>Phone:</strong> {customerPhone}
              </div>
              <div style={{ textAlign: 'right' }}>
                <strong>Bill No:</strong> {billNumber}<br/>
                <strong>Date:</strong> {format(new Date(billDate), "dd-MM-yyyy")}<br/>
                <strong>Type:</strong> {billType}
              </div>
            </div>

            <table>
              <thead>
                <tr>
                  <th style={{ width: '32%' }}>Product Name</th>
                  <th style={{ width: '12%', textAlign: 'center' }}>Size</th>
                  <th style={{ width: '8%', textAlign: 'center' }}>Qty</th>
                  <th style={{ width: '16%', textAlign: 'right', padding: '3px 6px' }}>Rate</th>
                  <th style={{ width: '12%', textAlign: 'right', padding: '3px 6px' }}>Disc(%)</th>
                  <th style={{ width: '20%', textAlign: 'right' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((item, i) => (
                  <Fragment key={i}>
                    <tr>
                      <td style={{ fontWeight: 'bold' }}>{item.name}</td>
                      <td style={{ textAlign: 'center' }}>{item.size}</td>
                      <td style={{ textAlign: 'center' }}>{item.qty}</td>
                      <td style={{ textAlign: 'right' }}>{item.rate.toFixed(2)}</td>
                      <td style={{ textAlign: 'right' }}>{item.discountPercent > 0 ? `${item.discountPercent}%` : '-'}</td>
                      <td style={{ textAlign: 'right' }}>{item.item_total.toFixed(2)}</td>
                    </tr>
                    {(item.hasColorant || item.itemDiscount > 0 || item.litre_disc_amount > 0) && (
                      <tr>
                        <td colSpan={6} style={{ paddingTop: '2px', paddingBottom: '10px', color: '#333', fontSize: '13px' }}>
                          {item.hasColorant && <div>└ Color Code: {item.colorCode} {item.base && `| Base: ${item.base}`} | Colorant: ₹{item.colorantCost.toFixed(2)}</div>}
                          {item.itemDiscount > 0 && <span>└ Disc: -₹{item.itemDiscount.toFixed(2)} </span>}
                          {item.itemDiscount > 0 && item.litre_disc_amount > 0 && <span style={{ padding: '0 4px' }}>|</span>}
                          {item.litre_disc_amount > 0 && <span>{item.itemDiscount === 0 ? '└ ' : ''}Litre Disc: -₹{item.litre_disc_amount.toFixed(2)}</span>}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>

            {idx === pages.length - 1 && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px', fontSize: '14px' }}>
                <div style={{ width: '300px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                    <span>Subtotal:</span>
                    <span>₹{totals.subtotal.toFixed(2)}</span>
                  </div>
                  {billType === 'DPL' && totals.litre_discount_total > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', color: 'red' }}>
                      <span>Litre Discount Total:</span>
                      <span>-₹{totals.litre_discount_total.toFixed(2)}</span>
                    </div>
                  )}
                  {totals.discount_amount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', color: 'red' }}>
                      <span>Discount Total:</span>
                      <span>-₹{totals.discount_amount.toFixed(2)}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                    <span>Taxable Value:</span>
                    <span>₹{totals.taxable_value.toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                    <span>GST Total:</span>
                    <span>₹{(totals.cgst_amount + totals.sgst_amount).toFixed(2)}</span>
                  </div>
                  {globalGst !== "" && (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                        <span>CGST ({(Number(globalGst) / 2)}%):</span>
                        <span>{totals.cgst_amount >= 0 ? '+' : '-'}₹{Math.abs(totals.cgst_amount).toFixed(2)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                        <span>SGST ({(Number(globalGst) / 2)}%):</span>
                        <span>{totals.sgst_amount >= 0 ? '+' : '-'}₹{Math.abs(totals.sgst_amount).toFixed(2)}</span>
                      </div>
                    </>
                  )}
                  {totals.totalColorant > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                      <span>Colorant Total:</span>
                      <span>₹{totals.totalColorant.toFixed(2)}</span>
                    </div>
                  )}
                  <div style={{ borderTop: '1px solid #000', margin: '8px 0' }}></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontWeight: 'bold', fontSize: '18px' }}>
                    <span>GRAND TOTAL:</span>
                    <span>₹{totals.total_amount.toFixed(2)}</span>
                  </div>
                  <div style={{ textAlign: 'right', marginTop: '10px', fontWeight: 'bold' }}>
                    Payment: {paymentStatus === 'unpaid' ? 'UNPAID' : 'PAID'}
                  </div>
                </div>
              </div>
            )}
            
          </div>
        ))}
      </div>

      {toast && (
        <div className="fixed bottom-4 right-4 bg-surface-container-highest text-text-main px-4 py-3 rounded shadow-lg flex items-center gap-2 animate-in slide-in-from-bottom-5">
          <CheckCircle2 className="h-5 w-5 text-primary" />
          <span className="font-medium text-sm">{toast}</span>
        </div>
      )}
    </>
  )
}

export default function BillingPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center">Loading Billing System...</div>}>
      <BillingContent />
    </Suspense>
  )
}