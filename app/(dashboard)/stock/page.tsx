"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Search, BarChart, Package, AlertTriangle, XCircle, Loader2, Save } from "lucide-react"

const CATEGORIES = ["Emulsion", "Enamel", "Primer", "Putty", "Thinner", "Waterproofing", "Hardware", "Tools/Brushes", "Other"]

export default function StockPage() {
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'out'>('all')

  const [saving, setSaving] = useState(false)
  const [modifiedIds, setModifiedIds] = useState<Set<string>>(new Set())

  const fetchStock = async () => {
    setLoading(true)
    
    let { data, error } = await supabase
      .from('products')
      .select('id, name, category, unit, current_stock, is_active')
      .eq('is_active', true)
      .order('name')

    if (data) {
      setProducts(data)
    }
    
    setLoading(false)
  }

  useEffect(() => {
    fetchStock()
  }, [])

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase())
    const matchesCategory = categoryFilter === "all" || p.category === categoryFilter
    
    let matchesStock = true;
    if (stockFilter === 'low') {
      matchesStock = p.current_stock > 0 && p.current_stock < 5;
    } else if (stockFilter === 'out') {
      matchesStock = p.current_stock <= 0;
    }
    
    return matchesSearch && matchesCategory && matchesStock;
  })

  const totals = {
    totalProducts: products.length,
    lowStock: products.filter(p => p.current_stock > 0 && p.current_stock < 5).length,
    outOfStock: products.filter(p => p.current_stock <= 0).length
  }

  const handleStockUpdate = (id: string, newStock: string) => {
    const numericStock = parseFloat(newStock);
    if (!isNaN(numericStock)) {
      setProducts(products.map(p => p.id === id ? { ...p, current_stock: numericStock } : p));
      setModifiedIds(prev => {
        const next = new Set(prev)
        next.add(id)
        return next
      })
    }
  }

  const handleSaveChanges = async () => {
    setSaving(true)
    let hasError = false
    
    const promises = Array.from(modifiedIds).map(async (id) => {
      const p = products.find(prod => prod.id === id)
      if (p) {
        const updatePayload: any = { current_stock: p.current_stock }
        const { error } = await supabase.from('products').update(updatePayload).eq('id', p.id)
        if (error) {
           console.error("Failed to update", p.name, error)
           hasError = true
        }
      }
    })
    
    await Promise.all(promises)
    
    if (hasError) {
      alert("Some changes failed to save.")
    } else {
      alert("Changes saved successfully!")
      setModifiedIds(new Set())
    }
    
    setSaving(false)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-text-main flex items-center gap-2">
          <BarChart className="h-6 w-6 text-primary" /> Stock Management
        </h1>
        {modifiedIds.size > 0 && (
          <button 
            onClick={handleSaveChanges}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded font-bold shadow hover:bg-active-blue transition-colors disabled:opacity-70"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Changes ({modifiedIds.size})
          </button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div 
          onClick={() => setStockFilter('all')}
          className={`border rounded p-5 shadow-sm cursor-pointer transition-all ${
            stockFilter === 'all' 
              ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-200' 
              : 'bg-card-bg border-border-default hover:border-blue-300 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center gap-3 mb-2 text-text-muted">
            <Package className="h-5 w-5 text-blue-500" />
            <span className="font-medium">Total Products</span>
          </div>
          <h2 className="text-2xl font-bold text-text-main font-mono">{totals.totalProducts}</h2>
        </div>
        
        <div 
          onClick={() => setStockFilter('low')}
          className={`border rounded p-5 shadow-sm cursor-pointer transition-all ${
            stockFilter === 'low'
              ? 'bg-red-50 border-red-500 ring-2 ring-red-200'
              : 'bg-error/5 border-error/30 hover:border-red-300 hover:bg-red-50/50'
          }`}
        >
          <div className="flex items-center gap-3 mb-2 text-error">
            <AlertTriangle className="h-5 w-5" />
            <span className="font-medium">Low Stock (&lt;5)</span>
          </div>
          <h2 className="text-2xl font-bold text-error font-mono">{totals.lowStock}</h2>
        </div>
        
        <div 
          onClick={() => setStockFilter('out')}
          className={`border rounded p-5 shadow-sm cursor-pointer transition-all ${
            stockFilter === 'out'
              ? 'bg-gray-100 border-gray-500 ring-2 ring-gray-200'
              : 'bg-gray-50 border-gray-300 hover:border-gray-400 hover:bg-gray-100/50'
          }`}
        >
          <div className="flex items-center gap-3 mb-2 text-gray-700">
            <XCircle className="h-5 w-5" />
            <span className="font-medium">Out of Stock</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-700 font-mono">{totals.outOfStock}</h2>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-card-bg border border-border-default rounded shadow-sm flex flex-col">
        <div className="p-4 border-b border-border-default flex flex-col md:flex-row gap-4 items-center">
          <div className="relative w-full md:max-w-md">
            <Search className="absolute left-3 top-2.5 h-5 w-5 text-text-muted" />
            <input 
              type="text" 
              placeholder="Search products..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 w-full pl-10 pr-3 rounded border border-border-default bg-surface-container-lowest focus:border-primary outline-none"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="h-10 w-full md:w-48 px-3 rounded border border-border-default bg-surface-container-lowest focus:border-primary outline-none"
          >
            <option value="all">All Categories</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead className="bg-surface-container-low text-xs uppercase text-text-muted border-b border-border-default">
              <tr>
                <th className="px-6 py-4 font-semibold">Product Name</th>
                <th className="px-6 py-4 font-semibold">Category</th>
                <th className="px-6 py-4 font-semibold text-center">Unit</th>
                <th className="px-6 py-4 font-semibold text-center">Current Stock</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-default text-sm">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-text-muted">Loading stock...</td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-text-muted">No products found.</td>
                </tr>
              ) : (
                filteredProducts.map(p => (
                  <tr key={p.id} className="hover:bg-surface-bg transition-colors">
                    <td className="px-6 py-3 font-medium text-text-main">{p.name}</td>
                    <td className="px-6 py-3 text-text-muted">{p.category}</td>
                    <td className="px-6 py-3 text-center text-text-muted">{p.unit || '-'}</td>
                    <td className="px-6 py-3 text-center">
                      <input 
                        type="number"
                        step="any"
                        value={p.current_stock}
                        onChange={(e) => handleStockUpdate(p.id, e.target.value)}
                        className={`w-20 px-2 py-1.5 text-center border border-border-default rounded focus:border-primary outline-none font-mono text-sm font-bold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                          p.current_stock <= 0 ? 'bg-gray-100 text-gray-700' : 
                          p.current_stock < 5 ? 'bg-red-100 text-red-700' : 
                          'text-text-main bg-transparent'
                        }`}
                      />
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
