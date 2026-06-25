'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase'; // Adjust import path if needed
import { Trash2, Edit, Eye, X, Check, Search, UserPlus } from 'lucide-react';

export default function StaffManagement() {
  const [staff, setStaff] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Add Staff State
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');

  // Edit Staff State
  const [editStaffId, setEditStaffId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');

  // History State
  const [historyModal, setHistoryModal] = useState<{ isOpen: boolean; staffName: string; bills: any[] }>({
    isOpen: false,
    staffName: '',
    bills: []
  });

  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('staff').select('*').order('created_at', { ascending: false });
    if (!error && data) setStaff(data);
    setLoading(false);
  };

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName) return alert('Name is required');

    const { error } = await supabase.from('staff').insert([{ name: newName, phone: newPhone, is_active: true }]);
    if (!error) {
      setNewName('');
      setNewPhone('');
      fetchStaff();
    } else {
      alert('Error adding staff');
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase.from('staff').update({ is_active: !currentStatus }).eq('id', id);
    if (!error) fetchStaff();
  };

  const handleDeleteStaff = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this staff member?')) return;
    const { error } = await supabase.from('staff').delete().eq('id', id);
    if (!error) fetchStaff();
    else alert('Error deleting staff');
  };

  const openEditModal = (s: any) => {
    setEditStaffId(s.id);
    setEditName(s.name);
    setEditPhone(s.phone || '');
  };

  const handleUpdateStaff = async () => {
    if (!editName) return alert('Name is required');
    const { error } = await supabase.from('staff').update({ name: editName, phone: editPhone }).eq('id', editStaffId);
    if (!error) {
      setEditStaffId(null);
      fetchStaff();
    } else {
      alert('Error updating staff');
    }
  };

  const viewHistory = async (staffName: string) => {
    const { data, error } = await supabase
      .from('bills')
      .select('bill_number, created_at, customer_name, total_amount')
      .eq('staff_name', staffName)
      .order('created_at', { ascending: false });

    if (!error) {
      setHistoryModal({ isOpen: true, staffName, bills: data || [] });
    }
  };

  const filteredStaff = staff.filter(s => s.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <UserPlus className="text-teal-500" /> Staff Management
          </h1>
          <p className="text-gray-500 text-sm mt-1">Manage store employees and their billing access.</p>
        </div>
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search staff..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-teal-500 bg-gray-50"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Form */}
        <div className="md:col-span-1">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 border-b bg-gray-50/50">
              <h2 className="font-semibold flex items-center gap-2 text-gray-700">
                <UserPlus size={18} className="text-teal-500" /> Add New Staff
              </h2>
            </div>
            <form onSubmit={handleAddStaff} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">Staff Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Enter name"
                  className="w-full border p-2 rounded-lg outline-none bg-gray-50 focus:bg-white focus:ring-2 focus:ring-teal-500 transition-all"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">Phone Number</label>
                <input
                  type="text"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="Enter phone"
                  className="w-full border p-2 rounded-lg outline-none bg-gray-50 focus:bg-white focus:ring-2 focus:ring-teal-500 transition-all"
                />
              </div>
              <button type="submit" className="w-full bg-teal-300 hover:bg-teal-400 text-teal-900 font-semibold py-2 rounded-lg transition-colors">
                Add Staff
              </button>
            </form>
          </div>
        </div>

        {/* Right Table */}
        <div className="md:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/50 border-b text-sm text-gray-600">
                    <th className="p-4 font-semibold">Name</th>
                    <th className="p-4 font-semibold">Phone</th>
                    <th className="p-4 font-semibold">Status</th>
                    <th className="p-4 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={4} className="p-4 text-center text-gray-500">Loading staff...</td></tr>
                  ) : filteredStaff.length === 0 ? (
                    <tr><td colSpan={4} className="p-4 text-center text-gray-500">No staff found.</td></tr>
                  ) : (
                    filteredStaff.map((s) => (
                      <tr key={s.id} className="border-b hover:bg-gray-50 transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-600 flex items-center justify-center text-xs font-bold uppercase">
                              {s.name.substring(0, 2)}
                            </div>
                            <span 
                              onClick={() => viewHistory(s.name)}
                              className="font-medium text-gray-800 cursor-pointer hover:text-teal-600 hover:underline"
                              title="Click to view billing history"
                            >
                              {s.name}
                            </span>
                          </div>
                        </td>
                        <td className="p-4 text-sm text-gray-500">{s.phone ? `📞 ${s.phone}` : '-'}</td>
                        <td className="p-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${s.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {s.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="p-4 text-right flex justify-end gap-2 items-center">
                          <button 
                            onClick={() => handleToggleStatus(s.id, s.is_active)}
                            className={`px-3 py-1 text-xs rounded-md font-medium transition-colors ${s.is_active ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' : 'bg-teal-50 text-teal-600 hover:bg-teal-100'}`}
                          >
                            {s.is_active ? 'Deactivate' : 'Activate'}
                          </button>
                          <button onClick={() => openEditModal(s)} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-md transition-colors" title="Edit">
                            <Edit size={16} />
                          </button>
                          <button onClick={() => handleDeleteStaff(s.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-md transition-colors" title="Delete">
                            <Trash2 size={16} />
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

      {/* Edit Modal */}
      {editStaffId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="font-bold text-lg">Edit Staff Details</h3>
              <button onClick={() => setEditStaffId(null)} className="text-gray-400 hover:text-gray-700"><X size={20} /></button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full border p-2 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Phone</label>
                <input type="text" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} className="w-full border p-2 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div className="p-4 border-t bg-gray-50 flex justify-end gap-2">
              <button onClick={() => setEditStaffId(null)} className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg">Cancel</button>
              <button onClick={handleUpdateStaff} className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg flex items-center gap-1">
                <Check size={16} /> Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* History Modal */}
      {historyModal.isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <Eye className="text-teal-500" size={20} /> Billing History: {historyModal.staffName}
              </h3>
              <button onClick={() => setHistoryModal({ ...historyModal, isOpen: false })} className="text-gray-400 hover:text-gray-700"><X size={20} /></button>
            </div>
            <div className="p-4 overflow-y-auto flex-1">
              {historyModal.bills.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No bills found for this staff member.</p>
              ) : (
                <div className="space-y-3">
                  {historyModal.bills.map((bill, idx) => (
                    <div key={idx} className="flex flex-wrap justify-between items-center p-3 border rounded-lg hover:shadow-sm transition-shadow bg-gray-50/50">
                      <div>
                        <p className="font-semibold text-gray-800">{bill.bill_number}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(bill.created_at).toLocaleString('en-IN')}
                        </p>
                      </div>
                      <div className="text-right mt-2 sm:mt-0">
                        <p className="text-sm text-gray-600">{bill.customer_name}</p>
                        <p className="font-bold text-teal-600">₹{bill.total_amount.toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
