"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Trash2, Plus, Search, CheckCircle2, Loader2, Pencil, X, Save } from "lucide-react"

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

  // Inline Edit State
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState("")
  const [editCategory, setEditCategory] = useState("")
  const [editUnit, setEditUnit] = useState("")
  const [editMrp, setEditMrp] = useState<number | "">("")

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
    const confirmDelete = window.confirm(`Are you sure you want to delete "${name}"?`)
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
      id: crypto.randomUUID(),
      name: newName.trim(),
      category: newCategory,
      categoryId: newCategory,
      unit: newUnit,
      base_mrp: Number(newMrp),
      is_active: true,
      current_stock: 0
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
      setNewName("")
      setNewMrp("")
      setShowAddForm(false)
    }
    setLoading(false)
  }

  // Start Editing
  const startEdit = (product: ProductItem) => {
    setEditingId(product.id)
    setEditName(product.name)
    setEditCategory(product.category)
    setEditUnit(product.unit)
    setEditMrp(product.base_mrp)
  }

  // Cancel Editing
  const cancelEdit = () => {
    setEditingId(null)
  }

  // Save Edit
  const handleSaveEdit = async (id: string) => {
    if (!editName || editMrp === "") {
      alert("Please enter product name and base MRP.")
      return
    }

    setActionLoading(id)
    const updatedData = {
      name: editName.trim(),
      category: editCategory,
      categoryId: editCategory,
      unit: editUnit,
      base_mrp: Number(editMrp)
    }

    const { error } = await supabase
      .from("products")
      .update(updatedData)
      .eq("id", id)

    if (error) {
      alert("Error updating product: " + error.message)
    } else {
      setProducts(products.map((p) => (p.id === id ? { ...p, ...updatedData } : p)))
      showToast("Product updated successfully!")
      setEditingId(null)
    }
    setActionLoading(null)
  }

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(""), 3000)
  }

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.category.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="flex flex-col gap-4 max-w-6xl mx-auto p-4">
      {/* Top Action Bar */}
      <div className="flex justify-between items-center bg-white p-4 rounded border border-gray-200 shadow-sm">
        <h1 className="text-xl font-bold text-slate-900">Products List</h1>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="h-9 px-4 bg-blue-600 text-white rounded font-medium text-sm flex items-center gap-2 hover:bg-blue-700 transition-colors shadow-sm"
        >
          {showAddForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showAddForm ? "Cancel" : "Add Product"}
        </button>
      </div>

      {/* Add New Product Form */}
      {showAddForm && (
        <form onSubmit={handleAddProduct} className="bg-white border border-gray-200 rounded p-4 shadow-sm grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
          <div className="flex flex-col gap-1 md:col-span-2">
            <label className="text-xs font-semibold text-slate-600 uppercase">Product Name *</label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Dulux Velvet Touch"
              className="h-9 px-3 rounded border border-gray-300 text-sm focus:border-blue-500 outline-none"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-600 uppercase">Category</label>
            <select
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              className="h-9 px-3 rounded border border-gray-300 text-sm focus:border-blue-500 outline-none"
            >
              <option value="Paints">Paints</option>
              <option value="Primers">Primers</option>
              <option value="Putty">Putty</option>
              <option value="Brushes & Tools">Brushes & Tools</option>
              <option value="Thinners & Chemicals">Thinners & Chemicals</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-600 uppercase">Unit</label>
            <input
              type="text"
              value={newUnit}
              onChange={(e) => setNewUnit(e.target.value)}
              placeholder="e.g. 1L, 4L"
              className="h-9 px-3 rounded border border-gray-300 text-sm focus:border-blue-500 outline-none"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-600 uppercase">Base MRP (₹) *</label>
            <input
              type="number"
              value={newMrp}
              onChange={(e) => setNewMrp(e.target.value === "" ? "" : parseFloat(e.target.value))}
              placeholder="0.00"
              className="w-full h-9 px-3 rounded border border-gray-300 text-sm focus:border-blue-500 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
          </div>
          <div className="md:col-span-5 flex justify-end mt-2">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-green-600 text-white rounded font-medium text-sm hover:bg-green-700 transition-colors shadow-sm disabled:opacity-50"
            >
              Save
            </button>
          </div>
        </form>
      )}

      {/* Search Bar */}
      <div className="relative bg-white rounded border border-gray-200 shadow-sm">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search products by name or category..."
          className="w-full h-9 pl-9 pr-4 text-sm bg-transparent outline-none rounded text-slate-800"
        />
      </div>

      {/* Products Table */}
      <div className="bg-white border border-gray-200 rounded shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500 flex flex-col items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
            <span>Loading...</span>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="p-8 text-center text-slate-500">No products found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3">Product Name</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3 w-24 text-center">Unit</th>
                  <th className="px-4 py-3 w-32 text-right">Base MRP</th>
                  <th className="px-4 py-3 w-32 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 text-sm text-slate-700">
                {filteredProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-slate-50 transition-colors">
                    {editingId === product.id ? (
                      <>
                        {/* INLINE EDIT MODE */}
                        <td className="px-4 py-2">
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="w-full h-8 px-2 rounded border border-gray-300 text-sm focus:border-blue-500 outline-none bg-white"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <select
                            value={editCategory}
                            onChange={(e) => setEditCategory(e.target.value)}
                            className="w-full h-8 px-2 rounded border border-gray-300 text-sm focus:border-blue-500 outline-none bg-white"
                          >
                            <option value="Paints">Paints</option>
                            <option value="Primers">Primers</option>
                            <option value="Putty">Putty</option>
                            <option value="Brushes & Tools">Brushes & Tools</option>
                            <option value="Thinners & Chemicals">Thinners & Chemicals</option>
                          </select>
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="text"
                            value={editUnit}
                            onChange={(e) => setEditUnit(e.target.value)}
                            className="w-full h-8 px-2 text-center rounded border border-gray-300 text-sm focus:border-blue-500 outline-none bg-white"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="number"
                            value={editMrp}
                            onChange={(e) => setEditMrp(e.target.value === "" ? "" : parseFloat(e.target.value))}
                            className="w-full h-8 px-2 text-right rounded border border-gray-300 text-sm focus:border-blue-500 outline-none bg-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                        </td>
                        <td className="px-4 py-2 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleSaveEdit(product.id)}
                              disabled={actionLoading === product.id}
                              className="p-1.5 bg-green-100 text-green-700 hover:bg-green-200 rounded"
                              title="Save Changes"
                            >
                              {actionLoading === product.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                            </button>
                            <button
                              onClick={cancelEdit}
                              disabled={actionLoading === product.id}
                              className="p-1.5 bg-gray-200 text-gray-700 hover:bg-gray-300 rounded"
                              title="Cancel"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        {/* VIEW MODE */}
                        <td className="px-4 py-3 font-medium text-slate-900">{product.name}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                            {product.category}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">{product.unit}</td>
                        <td className="px-4 py-3 text-right font-medium">₹{Number(product.base_mrp).toFixed(2)}</td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => startEdit(product)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                              title="Edit Product"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteProduct(product.id, product.name)}
                              disabled={actionLoading === product.id}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                              title="Delete Product"
                            >
                              {actionLoading === product.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {toast && (
        <div className="fixed bottom-4 right-4 bg-slate-900 text-white px-4 py-3 rounded shadow-xl flex items-center gap-2 z-50 animate-in slide-in-from-bottom-5">
          <CheckCircle2 className="h-5 w-5 text-green-400" />
          <span className="text-sm font-medium">{toast}</span>
        </div>
      )}
    </div>
  )
}
