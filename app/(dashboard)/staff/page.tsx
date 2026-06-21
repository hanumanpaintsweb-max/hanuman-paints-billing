"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { PlusCircle, Search, User, Phone, CheckCircle2, XCircle } from "lucide-react"

type StaffMember = {
  id: string
  name: string
  phone: string
  is_active: boolean
  created_at: string
}

export default function StaffPage() {
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)

  const [newName, setNewName] = useState("")
  const [newPhone, setNewPhone] = useState("")
  const [isAdding, setIsAdding] = useState(false)

  useEffect(() => {
    fetchStaff()
  }, [])

  const fetchStaff = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('staff')
      .select('*')
      .order('name', { ascending: true })

    if (data) {
      setStaff(data)
    }
    setLoading(false)
  }

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim()) return

    setIsAdding(true)
    const { data, error } = await supabase
      .from('staff')
      .insert([
        {
          name: newName,
          phone: newPhone,
          is_active: true
        }
      ])
      .select()
      .single()

    if (error) {
      alert("Error adding staff: " + error.message)
    } else if (data) {
      setStaff([...staff, data].sort((a, b) => a.name.localeCompare(b.name)))
      setNewName("")
      setNewPhone("")
    }
    setIsAdding(false)
  }

  const toggleStaffStatus = async (id: string, currentStatus: boolean) => {
    const newStatus = !currentStatus
    const { error } = await supabase
      .from('staff')
      .update({ is_active: newStatus })
      .eq('id', id)

    if (error) {
      alert("Error updating status: " + error.message)
    } else {
      setStaff(staff.map(s => s.id === id ? { ...s, is_active: newStatus } : s))
    }
  }

  const filteredStaff = staff.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase()) || 
    s.phone?.includes(search)
  )

  return (
    <div className="flex-1 overflow-auto bg-background min-h-screen">
      <div className="p-4 md:p-6 lg:p-8 max-w-5xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-card-bg p-5 rounded-lg border border-border-default shadow-sm">
          <div>
            <h1 className="text-2xl font-bold text-text-main flex items-center gap-2">
              <User className="h-6 w-6 text-primary" />
              Staff Management
            </h1>
            <p className="text-text-muted text-sm mt-1">Manage store employees and their billing access.</p>
          </div>
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
            <input
              type="text"
              placeholder="Search staff..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-surface-bg border border-border-default rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          
          {/* Add Staff Form */}
          <div className="md:col-span-1 bg-card-bg rounded-lg border border-border-default shadow-sm overflow-hidden sticky top-6">
            <div className="p-4 border-b border-border-default bg-surface-container-lowest">
              <h2 className="font-semibold text-text-main flex items-center gap-2">
                <PlusCircle className="h-4 w-4 text-primary" />
                Add New Staff
              </h2>
            </div>
            <div className="p-4">
              <form onSubmit={handleAddStaff} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-text-main">Staff Name <span className="text-error">*</span></label>
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Enter name"
                    className="w-full px-3 py-2 bg-surface-bg border border-border-default rounded-md text-sm focus:outline-none focus:border-primary transition-colors"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-text-main">Phone Number</label>
                  <input
                    type="text"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="Enter phone"
                    className="w-full px-3 py-2 bg-surface-bg border border-border-default rounded-md text-sm focus:outline-none focus:border-primary transition-colors"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isAdding || !newName.trim()}
                  className="w-full py-2 bg-primary text-white rounded-md font-medium hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isAdding ? 'Adding...' : 'Add Staff'}
                </button>
              </form>
            </div>
          </div>

          {/* Staff List */}
          <div className="md:col-span-2 bg-card-bg rounded-lg border border-border-default shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container-lowest border-b border-border-default">
                    <th className="p-4 font-semibold text-text-main text-sm">Name</th>
                    <th className="p-4 font-semibold text-text-main text-sm">Phone</th>
                    <th className="p-4 font-semibold text-text-main text-sm">Status</th>
                    <th className="p-4 font-semibold text-text-main text-sm text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-default">
                  {loading ? (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-text-muted">Loading staff...</td>
                    </tr>
                  ) : filteredStaff.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-text-muted">
                        No staff members found.
                      </td>
                    </tr>
                  ) : (
                    filteredStaff.map((s) => (
                      <tr key={s.id} className="hover:bg-surface-bg transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs uppercase">
                              {s.name.substring(0, 2)}
                            </div>
                            <span className="font-medium text-text-main">{s.name}</span>
                          </div>
                        </td>
                        <td className="p-4 text-sm text-text-muted">
                          {s.phone ? (
                            <span className="flex items-center gap-1"><Phone className="h-3 w-3"/> {s.phone}</span>
                          ) : (
                            <span className="text-border-default">-</span>
                          )}
                        </td>
                        <td className="p-4">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${
                            s.is_active 
                              ? 'bg-green-500/10 text-green-600 border-green-500/20' 
                              : 'bg-red-500/10 text-red-600 border-red-500/20'
                          }`}>
                            {s.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <button
                            onClick={() => toggleStaffStatus(s.id, s.is_active)}
                            className={`text-xs px-3 py-1.5 rounded font-medium transition-colors ${
                              s.is_active 
                                ? 'bg-surface-container text-text-muted hover:text-error hover:bg-error/10' 
                                : 'bg-primary/10 text-primary hover:bg-primary hover:text-white'
                            }`}
                          >
                            {s.is_active ? 'Deactivate' : 'Activate'}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
