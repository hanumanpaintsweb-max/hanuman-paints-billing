"use client"

import { useState } from "react"
import { Store, Mail, Lock, Loader2, AlertCircle } from "lucide-react"
import { authenticateAdmin } from "@/app/actions/auth"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const res = await authenticateAdmin(email, password)

      if (res.success) {
        window.location.href = "/billing"
      } else {
        setError(res.message || "Failed to login.")
      }
    } catch (err: any) {
      setError(err.message || "Failed to login.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-surface-bg p-4 font-inter">
      <div className="w-full max-w-md space-y-8 rounded border border-border-default bg-surface-container-lowest p-8 shadow-sm">
        <div className="flex flex-col items-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 border border-primary/20">
            <Store className="h-8 w-8 text-primary" />
          </div>
          <h2 className="mt-6 text-center text-2xl font-bold text-text-main">
            Hanuman Paints
          </h2>
          <p className="mt-2 text-center text-sm text-text-muted">
            Admin Login
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          {error && (
            <div className="rounded bg-error/10 p-4 text-sm font-medium text-error flex items-center gap-2 border border-error/20">
              <AlertCircle className="h-4 w-4" /> {error}
            </div>
          )}
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="text-sm font-medium text-text-main">Email address</label>
              <div className="relative mt-1">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Mail className="h-5 w-5 text-text-muted" />
                </div>
                <input
                  id="email"
                  type="email"
                  required
                  className="block w-full rounded border border-border-default bg-surface-container-lowest py-3 pl-10 pr-3 text-text-main placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="admin@hanumanpaints.in"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label htmlFor="password" className="text-sm font-medium text-text-main">Password</label>
              <div className="relative mt-1">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Lock className="h-5 w-5 text-text-muted" />
                </div>
                <input
                  id="password"
                  type="password"
                  required
                  className="block w-full rounded border border-border-default bg-surface-container-lowest py-3 pl-10 pr-3 text-text-main placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center rounded bg-primary py-3 text-sm font-bold text-white shadow hover:bg-active-blue active:scale-[0.98] transition-all disabled:opacity-70 disabled:active:scale-100"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Authenticating...
              </>
            ) : (
              "Sign In"
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
