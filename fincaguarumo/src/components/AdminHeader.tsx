"use client"

import { useRouter } from "next/navigation"
import { Button } from "./ui/button"
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth"

export default function AdminHeader() {
  const router = useRouter()
  const { user, signOut } = useSupabaseAuth()

  const handleLogout = async () => {
    try {
      await signOut()
      router.push("/admin/login")
    } catch (error) {
      console.error("Logout failed:", error)
    }
  }

  return (
    <header className="bg-zinc-50 border-b border-border px-6 py-4">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <h1 className="text-xl font-semibold text-primary">Admin Dashboard</h1>
        <div className="flex items-center gap-4">
          {user && <span className="text-sm text-zinc-600">{user.email}</span>}
          <Button onClick={handleLogout} variant="outline" size="sm">
            Log Out
          </Button>
        </div>
      </div>
    </header>
  )
}
