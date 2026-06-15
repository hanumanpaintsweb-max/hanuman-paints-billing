"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Trash2, Plus, Search, CheckCircle2, Loader2 } from "lucide-react"

interface ProductItem {
  id: string
  name: string
  category: string
  unit: string
  base_mrp: number
  is_active: boolean
}

export default function ProductsPage() {
  const [products, setProducts] = useState<ProductItem[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [toast, setToast] = useState("")

  // Form State for New Product
  const [showAddForm, setShowAddForm] = useState(false)
  const [newName, setNewName] = useState("")
  const [newCategory, setNewCategory] = useState("Paints")
  const [newUnit, setNewUnit] = useState("1L")
  const [newMrp, setNewMrp] = useState<number | "">("")

  // Fetch only active products
  const fetchProducts = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from("products")
      .select("id, name, category, unit, base_mrp, is_active")
      .eq("is_active", true)
      .order("name", { ascending: true })

    if (data) {
      setProducts(data)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchProducts()
  }, [])

  // Soft Delete Logic (Updates is_active to false)
  const handleDeleteProduct = async (id: string, name: string) => {
    const confirmDelete = window.confirm(
      `Are you sure you want to delete "${name}"?\nThis will automatically remove it from the Stock list and Billing selection without breaking old invoices.`
    )
    if (!confirmDelete) return

    setActionLoading(id)
    const { error } = await supabase
      .from("products")
      .update({ is_active: false })
      .eq("id", id)

    if (error) {
      alert("Error deleting product: " + error.message)
    } else {
      setProducts(products.filter((p) => p.id !== id))
      showToast("Product deleted successfully!")
    }
    setActionLoading(null)
  }

  // Add Product Logic
  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName || newMrp === "") {
      alert("Please enter product name and base MRP.")
      return
    }

    setLoading(true)
    const newProductData = {
      name: newName.trim(),
      category: newCategory,
      unit: newUnit,
      base_mrp: Number(newMrp),
      is_active: true,
      current_stock: 0 // Default stock is 0 on creation
    }

    const { data, error } = await supabase
      .from("products")
      .insert([newProductData])
      .select()

    if (error) {
      alert("Error adding product: " + error.message)
    } else {
      if (data) {
        setProducts([...products, data[0]].sort((a, b) => a.name.localeCompare(b.name)))
      }
      showToast("Product added successfully!")
      // Reset Form
      setNewName("")
      setNewMrp("")
      setShowAddForm(false)
    }
    setLoading(false)
  }

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(""), 3000)
  }

  // Filter products based on search
  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.category.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto p-4">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded border border-gray-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Products Master</h1>
          <p className="text-sm text-slate-500">Manage items database and base pricing</p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="h-10 px-4 bg-blue-600 text-white rounded font-medium text-sm flex items-center gap-2 hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Plus className="h-4 w-4" /> {showAddForm ? "Close Form" : "Add New Product"}
        </button>
      </div>

      {/* Add New Product Form Component */}
      {showAddForm && (
        <form onSubmit={handleAddProduct} className="bg-white border border-gray-200 rounded p-5 shadow-sm grid grid-cols-1 md:grid-cols-4 gap-4 items-end animate-in fade-in duration-200">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-600 uppercase">Product Name *</label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Dulux Velvet Touch"
              className="h-10 px-3 rounded border border-gray-300 text-sm focus:border-blue-500 outline-none bg-slate-50"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-600 uppercase">Category</label>
            <select
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              className="h-10 px-3 rounded border border-gray-300 text-sm focus:border-blue-500 outline-none bg-slate-50"
            >
              <option value="Paints">Paints</option>
              <option value="Primers">Primers</option>
              <option value="Putty">Putty</option>
              <option value="Brushes & Tools">Brushes & Tools</option>
              <option value="Thinners & Chemicals">Thinners & Chemicals</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-600 uppercase">Default Size/Unit</label>
            <input
              type="text"
              value={newUnit}
              onChange={(e) => setNewUnit(e.target.value)}
              placeholder="e.g. 1L, 4L, 20KG"
              className="h-10 px-3 rounded border border-gray-300 text-sm focus:border-blue-500 outline-none bg-slate-50"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-600 uppercase">Base MRP (₹) *</label>
            <div className="flex gap-2">
              <input
                type="number"
                value={newMrp}
                onChange={(e) => setNewMrp(e.target.value === "" ? "" : parseFloat(e.target.value))}
                placeholder="0.00"
                className="h-10 px-3 flex-1 rounded border border-gray-300 text-sm text-right focus:border-blue-500 outline-none bg-slate-50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <button
                type="submit"
                disabled={loading}
                className="h-10 px-4 bg-green-600 text-white rounded font-medium text-sm hover:bg-green-700 transition-colors shadow-sm disabled:opacity-50"
              >
                Save
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Search Bar */}
      <div className="relative bg-white rounded border border-gray-200 shadow-sm">
        <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search products by name or category..."
          className="w-full h-10 pl-10 pr-4 text-sm bg-transparent outline-none rounded text-slate-800 focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {/* Products Table Card */}
      <div className="bg-white border border-gray-200 rounded shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center gap-2">
            <Loader2 className="h-6 w-4 animate-spin text-blue-600" />
            <span>Loading database...</span>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            No products found matching the criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3.5">Product Name</th>
                  <th className="px-6 py-3.5">Category</th>
                  <th className="px-6 py-3.5 w-32 text-center">Unit</th>
                  <th className="px-6 py-3.5 w-40 text-right">Base MRP</th>
                  <th className="px-6 py-3.5 w-24 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 text-sm text-slate-700">
                {filteredProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-3.5 font-medium text-slate-900">{product.name}</td>
                    <td className="px-6 py-3.5">
                      <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                        {product.category}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-center font-mono">{product.unit}</td>
                    <td className="px-6 py-3.5 text-right font-mono font-medium">
                      ₹{Number(product.base_mrp).toFixed(2)}
                    </td>
                    <td className="px-6 py-3.5 text-center">
                      <button
                        onClick={() => handleDeleteProduct(product.id, product.name)}
                        disabled={actionLoading === product.id}
                        className="h-8 w-8 inline-flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Delete Product"
                      >
                        {actionLoading === product.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Toast Feedback */}
      {toast && (
        <div className="fixed bottom-4 right-4 bg-slate-900 text-white px-4 py-3 rounded shadow-xl flex items-center gap-2 animate-in slide-in-from-bottom-5 z-50">
          <CheckCircle2 className="h-5 w-5 text-green-400" />
          <span className="text-sm font-medium">{toast}</span>
        </div>
      )}
    </div>
  )
}
