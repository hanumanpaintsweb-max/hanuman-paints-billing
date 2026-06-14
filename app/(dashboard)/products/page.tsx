"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Search, Plus, Edit, Package, EyeOff, Loader2 } from "lucide-react"

const CATEGORIES = ["Emulsion", "Enamel", "Primer", "Putty", "Thinner", "Waterproofing", "Hardware", "Tools/Brushes", "Other"]

export default function ProductsPage() {
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    category: "Emulsion",
    unit: "",
    type: "direct",
    current_stock: 0
  })
  const [saving, setSaving] = useState(false)

  const fetchProducts = async () => {
    setLoading(true)
    const { data } = await supabase
      .from("products")
      .select("*")
      .eq("is_active", true)
      .order("category", { ascending: true })
      .order("name", { ascending: true })

    if (data) setProducts(data)
    setLoading(false)
  }

  useEffect(() => {
    fetchProducts()
  }, [])

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase())
    const matchesCategory = categoryFilter === "all" || p.category === categoryFilter
    return matchesSearch && matchesCategory
  })

  const openAddModal = () => {
    setEditingId(null)
    setFormData({ name: "", category: "Emulsion", unit: "", type: "direct", current_stock: 0 })
    setIsModalOpen(true)
  }

  const openEditModal = (product: any) => {
    setEditingId(product.id)
    setFormData({
      name: product.name,
      category: product.category,
      unit: product.unit || "",
      type: product.type || "direct",
      current_stock: product.current_stock
    })
    setIsModalOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    if (editingId) {
      await supabase
        .from("products")
        .update({
          name: formData.name,
          category: formData.category,
          unit: formData.unit,
          type: formData.type,
          current_stock: formData.current_stock
        })
        .eq("id", editingId)
    } else {
      await supabase
        .from("products")
        .insert([{
          name: formData.name,
          category: formData.category,
          unit: formData.unit,
          type: formData.type,
          current_stock: formData.current_stock,
          is_active: true
        }])
    }

    setIsModalOpen(false)
    setSaving(false)
    fetchProducts()
  }

  const handleDeactivate = async (id: string) => {
    if (confirm("Deactivate this product? It will be hidden from billing.")) {
      await supabase.from("products").update({ is_active: false }).eq("id", id)
      fetchProducts()
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-text-main flex items-center gap-2">
          <Package className="h-6 w-6 text-primary" /> Products Database
        </h1>
        <button 
          onClick={openAddModal}
          className="h-10 px-4 bg-primary text-white rounded font-medium flex items-center gap-2 hover:bg-active-blue transition-colors shadow-sm"
        >
          <Plus className="h-4 w-4" /> Add Product
        </button>
      </div>

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
                <th className="px-6 py-4 font-semibold">Unit</th>
                <th className="px-6 py-4 font-semibold text-center">Type</th>
                <th className="px-6 py-4 font-semibold text-center">Stock</th>
                <th className="px-6 py-4 font-semibold text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-default text-sm">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-text-muted">Loading products...</td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-text-muted">No products found.</td>
                </tr>
              ) : (
                filteredProducts.map(p => (
                  <tr key={p.id} className="hover:bg-surface-bg transition-colors">
                    <td className="px-6 py-3 font-medium text-text-main">{p.name}</td>
                    <td className="px-6 py-3 text-text-muted">{p.category}</td>
                    <td className="px-6 py-3 text-text-muted">{p.unit || '-'}</td>
                    <td className="px-6 py-3 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${p.type === 'base' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'}`}>
                        {p.type || 'direct'}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-center font-mono font-medium">
                      {p.current_stock}
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex items-center justify-center gap-3">
                        <button onClick={() => openEditModal(p)} className="text-text-muted hover:text-primary transition-colors" title="Edit">
                          <Edit className="h-4 w-4" />
                        </button>
                        <button onClick={() => handleDeactivate(p.id)} className="text-text-muted hover:text-error transition-colors" title="Deactivate">
                          <EyeOff className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card-bg w-full max-w-md rounded-lg shadow-xl flex flex-col">
            <div className="p-4 border-b border-border-default flex justify-between items-center bg-surface rounded-t-lg">
              <h2 className="text-lg font-bold">{editingId ? "Edit Product" : "Add New Product"}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-text-muted hover:text-text-main">✕</button>
            </div>
            <form onSubmit={handleSave} className="p-5 flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">Product Name <span className="text-error">*</span></label>
                <input 
                  required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
                  className="h-10 px-3 rounded border border-border-default focus:border-primary outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium">Category</label>
                  <select 
                    value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}
                    className="h-10 px-3 rounded border border-border-default focus:border-primary outline-none"
                  >
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium">Type</label>
                  <select 
                    value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}
                    className="h-10 px-3 rounded border border-border-default focus:border-primary outline-none"
                  >
                    <option value="direct">Direct</option>
                    <option value="base">Base</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium">Unit Size</label>
                  <input 
                    type="text" placeholder="e.g. 1L, 4L" value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})}
                    className="h-10 px-3 rounded border border-border-default focus:border-primary outline-none"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium">Initial Stock</label>
                  <input 
                    type="number" min="0" value={formData.current_stock} onChange={e => setFormData({...formData, current_stock: parseInt(e.target.value) || 0})}
                    className="h-10 px-3 rounded border border-border-default focus:border-primary outline-none"
                  />
                </div>
              </div>
              <div className="mt-2 flex justify-end gap-3 border-t border-border-default pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-text-muted hover:text-text-main">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="px-4 py-2 bg-primary text-white rounded text-sm font-bold shadow-sm hover:bg-active-blue disabled:opacity-70 flex items-center gap-2">
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />} {editingId ? "Update" : "Add"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
