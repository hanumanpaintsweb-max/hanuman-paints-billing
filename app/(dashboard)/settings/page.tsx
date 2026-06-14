"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Settings, Save, Loader2, CheckCircle2 } from "lucide-react"

export default function SettingsPage() {
  const [shopName, setShopName] = useState("Hanuman Paints")
  const [tagline, setTagline] = useState("Authorized Dulux Blue Store")
  const [address, setAddress] = useState("Ward No 16, Lohapatty, Madhubani")
  const [phone, setPhone] = useState("8292889540")
  const [email, setEmail] = useState("rrdmahto@gmail.com")
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState("")

  useEffect(() => {
    const fetchSettings = async () => {
      const { data, error } = await supabase
        .from('shop_settings')
        .select('*')
        .limit(1)
        .maybeSingle()
      
      if (data) {
        setShopName(data.shop_name || "Hanuman Paints")
        setTagline(data.tagline || "Authorized Dulux Blue Store")
        setAddress(data.address || "Ward No 16, Lohapatty, Madhubani")
        setPhone(data.phone || "8292889540")
        setEmail(data.email || "rrdmahto@gmail.com")
      }
      setLoading(false)
    }
    fetchSettings()
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    // First check if any row exists
    const { data: existing } = await supabase.from('shop_settings').select('id').limit(1).maybeSingle()

    const payload = {
      shop_name: shopName,
      tagline,
      address,
      phone,
      email,
      updated_at: new Date().toISOString()
    }

    let error;
    if (existing) {
      const res = await supabase.from('shop_settings').update(payload).eq('id', existing.id)
      error = res.error
    } else {
      const res = await supabase.from('shop_settings').insert([payload])
      error = res.error
    }

    if (error) {
      alert("Error saving settings: " + error.message)
    } else {
      setToast("Settings saved successfully!")
      setTimeout(() => setToast(""), 3000)
    }
    setSaving(false)
  }

  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto w-full">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-text-main flex items-center gap-2">
          <Settings className="h-6 w-6 text-primary" /> Shop Settings
        </h1>
      </div>

      <div className="bg-card-bg border border-border-default rounded shadow-sm overflow-hidden">
        <div className="p-5 border-b border-border-default bg-surface">
          <h2 className="font-semibold text-text-main">Invoice Print Details</h2>
          <p className="text-sm text-text-muted mt-1">These details will be printed on the header of all customer bills.</p>
        </div>

        {loading ? (
          <div className="p-8 flex justify-center text-text-muted">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <form onSubmit={handleSave} className="p-6 flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-bold text-text-main">Shop Name</label>
              <input 
                type="text" 
                required
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                className="h-10 px-3 rounded border border-border-default bg-surface-container-lowest focus:border-primary focus:ring-1 focus:ring-primary outline-none font-medium" 
              />
            </div>
            
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-bold text-text-main">Tagline / Subtitle</label>
              <input 
                type="text" 
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                className="h-10 px-3 rounded border border-border-default bg-surface-container-lowest focus:border-primary focus:ring-1 focus:ring-primary outline-none" 
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-bold text-text-main">Address</label>
              <input 
                type="text" 
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="h-10 px-3 rounded border border-border-default bg-surface-container-lowest focus:border-primary focus:ring-1 focus:ring-primary outline-none" 
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-bold text-text-main">Phone Number</label>
                <input 
                  type="text" 
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="h-10 px-3 rounded border border-border-default bg-surface-container-lowest focus:border-primary focus:ring-1 focus:ring-primary outline-none font-mono" 
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-bold text-text-main">Email (Optional)</label>
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-10 px-3 rounded border border-border-default bg-surface-container-lowest focus:border-primary focus:ring-1 focus:ring-primary outline-none" 
                />
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <button 
                type="submit" 
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded font-bold shadow hover:bg-active-blue transition-colors disabled:opacity-70"
              >
                {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                Save Settings
              </button>
            </div>
          </form>
        )}
      </div>

      {toast && (
        <div className="fixed bottom-4 right-4 bg-green-600 text-white px-4 py-3 rounded shadow-lg flex items-center gap-2 animate-in slide-in-from-bottom-5 z-50">
          <CheckCircle2 className="h-5 w-5" />
          <span className="font-medium">{toast}</span>
        </div>
      )}
    </div>
  )
}
