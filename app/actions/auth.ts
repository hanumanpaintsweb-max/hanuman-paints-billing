"use server"

import { cookies } from "next/headers"
import { supabase } from "@/lib/supabase"
import bcrypt from "bcryptjs"

type AdminAuthResult = 
  | { success: true; user: { email: string; id: string } }
  | { success: false; message: string; locked?: boolean; lockedUntil?: string }

export async function authenticateAdmin(email: string, password: string): Promise<AdminAuthResult> {
  try {
    const cleanEmail = email.trim().toLowerCase();
    const { data: user, error } = await supabase
      .from("admin_users")
      .select("*")
      .eq("email", cleanEmail)
      .single()

    if (error || !user) {
      return { success: false, message: "Invalid email or password" }
    }

    const now = new Date()

    if (user.locked_until && new Date(user.locked_until) > now) {
      const remainingMinutes = Math.ceil((new Date(user.locked_until).getTime() - now.getTime()) / 60000)
      return { success: false, message: `Account locked. Try again in ${remainingMinutes} minutes`, locked: true, lockedUntil: user.locked_until }
    }

    if (!user.password_hash) {
      return { success: false, message: "Server misconfiguration: No password set." }
    }

    const isMatch = bcrypt.compareSync(password, user.password_hash)

    if (!isMatch) {
      const newAttempts = (user.failed_attempts || 0) + 1
      const updates: { failed_attempts: number; locked_until?: string } = { failed_attempts: newAttempts }

      if (newAttempts >= 5) {
        const lockTime = new Date(now.getTime() + 15 * 60000)
        updates.locked_until = lockTime.toISOString()
        updates.failed_attempts = 0
      }

      await supabase.from("admin_users").update(updates).eq("id", user.id)

      if (newAttempts >= 5) {
        return { success: false, message: "Too many failed attempts. Account locked for 15 minutes.", locked: true, lockedUntil: updates.locked_until }
      }

      return { success: false, message: `Invalid password. ${5 - newAttempts} attempts remaining.` }
    }

    await supabase.from("admin_users").update({
      failed_attempts: 0,
      locked_until: null,
      last_login: now.toISOString()
    }).eq("id", user.id)

    const cookieStore = await cookies()
    cookieStore.set("hp-admin", JSON.stringify({ id: user.id, email: user.email }), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    })

    return { success: true, user: { email: user.email, id: user.id } }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An error occurred during login"
    return { success: false, message: errorMessage }
  }
}

export async function logoutAdmin() {
  const cookieStore = await cookies()
  cookieStore.delete("hp-admin")
  return { success: true }
}
