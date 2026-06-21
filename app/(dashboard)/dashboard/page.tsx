"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { format, startOfDay, startOfMonth, subDays, isAfter, isSameDay, eachDayOfInterval } from "date-fns"
import { IndianRupee, Users, PackageOpen, Receipt, ClockAlert, TrendingUp, ArrowRight, AlertTriangle, PlusCircle, Activity } from "lucide-react"
import Link from "next/link"

export default function DashboardPage() {
  const [loading, setLoading] = useState(true)
  
  // Metrics
  const [todaySales, setTodaySales] = useState(0)
  const [monthSales, setMonthSales] = useState(0)
  const [outstanding, setOutstanding] = useState(0)
  const [monthBillsCount, setMonthBillsCount] = useState(0)
  const [avgBillValue, setAvgBillValue] = useState(0)
  const [totalCustomers, setTotalCustomers] = useState(0)
  const [lowStockCount, setLowStockCount] = useState(0)
  
  // Charts Data
  const [last7DaysSales, setLast7DaysSales] = useState<{date: string, amount: number}[]>([])
  const [topProducts, setTopProducts] = useState<{name: string, qty: number}[]>([])
  const [paymentStats, setPaymentStats] = useState({ paid: 0, unpaid: 0, partial: 0 })
  
  // Tables
  const [recentBills, setRecentBills] = useState<any[]>([])

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    setLoading(true)
    try {
      // Fetch all bills
      const { data: bills, error: billsError } = await supabase
        .from('bills')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (billsError) throw billsError

      // Fetch products for low stock
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('*')
      
      if (productsError) throw productsError

      const now = new Date()
      const startOfToday = startOfDay(now)
      const startOfThisMonth = startOfMonth(now)
      const sevenDaysAgo = subDays(startOfToday, 6)

      let tSales = 0
      let mSales = 0
      let outstd = 0
      let mBills = 0
      const uniqueCustomers = new Set()
      
      // Chart accumulators
      const dailySalesMap: Record<string, number> = {}
      eachDayOfInterval({ start: sevenDaysAgo, end: now }).forEach(d => {
        dailySalesMap[format(d, 'MMM dd')] = 0
      })
      
      const productQtyMap: Record<string, number> = {}
      const pStats = { paid: 0, unpaid: 0, partial: 0 }

      if (bills) {
        setRecentBills(bills.slice(0, 10))

        bills.forEach(bill => {
          const billDate = new Date(bill.created_at)
          const amount = Number(bill.total_amount || 0)
          const paid = Number(bill.paid_amount || 0)
          
          uniqueCustomers.add(bill.customer_phone)

          // Outstanding
          if (bill.payment_status !== 'paid') {
            outstd += Math.max(0, amount - paid)
          }

          // Today
          if (isSameDay(billDate, now)) {
            tSales += amount
          }

          // This Month
          if (isAfter(billDate, startOfThisMonth) || isSameDay(billDate, startOfThisMonth)) {
            mSales += amount
            mBills++
            
            // Payment Stats (This month)
            if (bill.payment_status === 'paid') pStats.paid++
            else if (bill.payment_status === 'unpaid') pStats.unpaid++
            else if (bill.payment_status === 'partial') pStats.partial++
            
            // Top Products (This month)
            if (bill.items && Array.isArray(bill.items)) {
              bill.items.forEach((item: any) => {
                if (item.name) {
                  productQtyMap[item.name] = (productQtyMap[item.name] || 0) + Number(item.qty || 0)
                }
              })
            }
          }

          // Last 7 Days
          if (isAfter(billDate, sevenDaysAgo) || isSameDay(billDate, sevenDaysAgo)) {
            const dateKey = format(billDate, 'MMM dd')
            if (dailySalesMap[dateKey] !== undefined) {
              dailySalesMap[dateKey] += amount
            }
          }
        })
      }

      setTodaySales(tSales)
      setMonthSales(mSales)
      setOutstanding(outstd)
      setMonthBillsCount(mBills)
      setAvgBillValue(mBills > 0 ? mSales / mBills : 0)
      setTotalCustomers(uniqueCustomers.size)
      
      // Stock
      if (products) {
        const low = products.filter(p => Number(p.current_stock || 0) < 5).length
        setLowStockCount(low)
      }

      // Format 7 days chart
      const chart7Days = Object.keys(dailySalesMap).map(date => ({
        date,
        amount: dailySalesMap[date]
      }))
      setLast7DaysSales(chart7Days)

      // Format top products
      const sortedProducts = Object.keys(productQtyMap)
        .map(name => ({ name, qty: productQtyMap[name] }))
        .sort((a, b) => b.qty - a.qty)
        .slice(0, 5)
      setTopProducts(sortedProducts)
      
      setPaymentStats(pStats)

    } catch (err) {
      console.error('Error fetching dashboard data:', err)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(val)
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    )
  }

  const maxDailySale = Math.max(...last7DaysSales.map(d => d.amount), 1)
  const maxProductQty = Math.max(...topProducts.map(p => p.qty), 1)
  const totalPaymentStatuses = paymentStats.paid + paymentStats.unpaid + paymentStats.partial || 1

  return (
    <div className="mx-auto max-w-7xl animate-in fade-in pb-12">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-text-main">Dashboard Overview</h1>
          <p className="text-sm text-text-muted mt-1">Welcome back. Here's what's happening at Hanuman Paints today.</p>
        </div>
        <div className="flex gap-3">
          <Link href="/unpaid" className="bg-surface-container-highest text-text-main px-4 py-2 rounded-lg text-sm font-bold hover:bg-border-default transition-colors flex items-center gap-2 border border-border-default">
            <ClockAlert className="h-4 w-4" /> Unpaid
          </Link>
          <Link href="/billing" className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-primary-hover transition-colors flex items-center gap-2 shadow-sm">
            <PlusCircle className="h-4 w-4" /> New Bill
          </Link>
        </div>
      </div>

      {/* TOP STATS CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <div className="bg-card-bg rounded-xl border border-border-default p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 bg-primary/10 rounded-lg text-primary">
              <IndianRupee className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-medium text-text-muted">Today's Sales</h3>
          </div>
          <div className="text-2xl font-bold text-text-main">{formatCurrency(todaySales)}</div>
        </div>

        <div className="bg-card-bg rounded-xl border border-border-default p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 bg-active-blue/10 rounded-lg text-active-blue">
              <TrendingUp className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-medium text-text-muted">This Month Sales</h3>
          </div>
          <div className="text-2xl font-bold text-text-main">{formatCurrency(monthSales)}</div>
        </div>

        <div className="bg-card-bg rounded-xl border border-border-default p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 bg-error/10 rounded-lg text-error">
              <ClockAlert className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-medium text-text-muted">Total Outstanding</h3>
          </div>
          <div className="text-2xl font-bold text-error">{formatCurrency(outstanding)}</div>
        </div>

        <div className="bg-card-bg rounded-xl border border-border-default p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 bg-emerald-500/10 rounded-lg text-emerald-600">
              <Receipt className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-medium text-text-muted">Bills This Month</h3>
          </div>
          <div className="text-2xl font-bold text-text-main">{monthBillsCount}</div>
        </div>
      </div>

      {/* SECOND ROW STATS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-card-bg rounded-xl border border-border-default p-5 shadow-sm flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-text-muted mb-1">Average Bill Value</h3>
            <div className="text-xl font-bold text-text-main">{formatCurrency(avgBillValue)}</div>
          </div>
          <div className="h-10 w-10 bg-surface-bg rounded-full flex items-center justify-center text-text-muted">
            <Activity className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-card-bg rounded-xl border border-border-default p-5 shadow-sm flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-text-muted mb-1">Total Customers</h3>
            <div className="text-xl font-bold text-text-main">{totalCustomers}</div>
          </div>
          <div className="h-10 w-10 bg-surface-bg rounded-full flex items-center justify-center text-text-muted">
            <Users className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-card-bg rounded-xl border border-border-default p-5 shadow-sm flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-text-muted mb-1">Low Stock Alerts</h3>
            <div className="text-xl font-bold text-text-main">{lowStockCount} items</div>
          </div>
          <div className={`h-10 w-10 rounded-full flex items-center justify-center ${lowStockCount > 0 ? 'bg-error/10 text-error' : 'bg-surface-bg text-text-muted'}`}>
            {lowStockCount > 0 ? <AlertTriangle className="h-5 w-5" /> : <PackageOpen className="h-5 w-5" />}
          </div>
        </div>
      </div>

      {/* CHARTS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        
        {/* Sales Chart */}
        <div className="bg-card-bg rounded-xl border border-border-default p-6 shadow-sm lg:col-span-2">
          <h3 className="text-base font-bold text-text-main mb-6">Last 7 Days Sales</h3>
          <div className="h-[250px] flex items-end justify-between gap-2 pt-6">
            {last7DaysSales.map((day, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2 group h-full">
                <div className="relative w-full flex justify-center h-full items-end">
                  {/* Tooltip */}
                  <div className="absolute -top-8 bg-text-main text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                    {formatCurrency(day.amount)}
                  </div>
                  {/* Bar */}
                  <div 
                    className="w-full max-w-[40px] bg-primary/80 hover:bg-primary transition-all duration-300 rounded-t-sm"
                    style={{ height: `${Math.max((day.amount / maxDailySale) * 100, 2)}%` }}
                  ></div>
                </div>
                <span className="text-[10px] sm:text-xs text-text-muted font-medium">{day.date}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Payment Status & Top Products Column */}
        <div className="flex flex-col gap-6">
          {/* Payment Status */}
          <div className="bg-card-bg rounded-xl border border-border-default p-6 shadow-sm flex-1">
            <h3 className="text-base font-bold text-text-main mb-4">Payment Status (Month)</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                  <span className="text-text-muted">Paid</span>
                </div>
                <span className="font-bold">{paymentStats.paid}</span>
              </div>
              <div className="w-full bg-surface-container rounded-full h-2">
                <div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${(paymentStats.paid / totalPaymentStatuses) * 100}%` }}></div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-error"></div>
                  <span className="text-text-muted">Unpaid</span>
                </div>
                <span className="font-bold">{paymentStats.unpaid}</span>
              </div>
              <div className="w-full bg-surface-container rounded-full h-2">
                <div className="bg-error h-2 rounded-full" style={{ width: `${(paymentStats.unpaid / totalPaymentStatuses) * 100}%` }}></div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                  <span className="text-text-muted">Partial</span>
                </div>
                <span className="font-bold">{paymentStats.partial}</span>
              </div>
              <div className="w-full bg-surface-container rounded-full h-2">
                <div className="bg-amber-500 h-2 rounded-full" style={{ width: `${(paymentStats.partial / totalPaymentStatuses) * 100}%` }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* TOP PRODUCTS & RECENT BILLS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Top Products */}
        <div className="bg-card-bg rounded-xl border border-border-default p-6 shadow-sm">
          <h3 className="text-base font-bold text-text-main mb-6">Top Selling Products</h3>
          {topProducts.length > 0 ? (
            <div className="space-y-5">
              {topProducts.map((product, i) => (
                <div key={i}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="font-medium text-text-main truncate pr-2">{product.name}</span>
                    <span className="font-bold text-text-muted">{product.qty}</span>
                  </div>
                  <div className="w-full bg-surface-container rounded-full h-1.5">
                    <div className="bg-primary/60 h-1.5 rounded-full" style={{ width: `${(product.qty / maxProductQty) * 100}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-text-muted py-8 text-center">No products sold this month.</div>
          )}
        </div>

        {/* Recent Bills */}
        <div className="bg-card-bg rounded-xl border border-border-default p-0 shadow-sm lg:col-span-2 overflow-hidden flex flex-col">
          <div className="p-6 border-b border-border-default flex items-center justify-between">
            <h3 className="text-base font-bold text-text-main">Recent Bills</h3>
            <Link href="/history" className="text-sm font-medium text-primary hover:text-primary-hover flex items-center gap-1 transition-colors">
              View All <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-surface-container-low text-xs uppercase text-text-muted border-b border-border-default">
                <tr>
                  <th className="px-6 py-3 font-semibold">Bill No</th>
                  <th className="px-6 py-3 font-semibold">Customer</th>
                  <th className="px-6 py-3 font-semibold text-right">Amount</th>
                  <th className="px-6 py-3 font-semibold text-center">Status</th>
                  <th className="px-6 py-3 font-semibold">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-default text-sm">
                {recentBills.map((bill, idx) => (
                  <tr key={idx} className="hover:bg-surface-bg transition-colors">
                    <td className="px-6 py-3 font-medium text-text-main">
                      <Link href="/history" className="hover:text-primary hover:underline">{bill.bill_number}</Link>
                    </td>
                    <td className="px-6 py-3 text-text-muted">{bill.customer_name}</td>
                    <td className="px-6 py-3 text-right font-mono font-medium">{formatCurrency(Number(bill.total_amount))}</td>
                    <td className="px-6 py-3 text-center">
                      <span className={`inline-flex px-2 py-1 text-[10px] font-bold uppercase rounded-full tracking-wider ${
                        bill.payment_status === 'paid' ? 'bg-emerald-500/10 text-emerald-600' :
                        bill.payment_status === 'unpaid' ? 'bg-error/10 text-error' :
                        'bg-amber-500/10 text-amber-600'
                      }`}>
                        {bill.payment_status}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-text-muted text-xs whitespace-nowrap">
                      {format(new Date(bill.created_at), "dd MMM yyyy")}
                    </td>
                  </tr>
                ))}
                {recentBills.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-text-muted">No recent bills found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
