"use client"

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"

export default function UnauthorizedPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get("redirectTo") || "/"

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md w-full text-center space-y-8">
        <div>
          <h1 className="text-6xl font-bold text-red-600">403</h1>
          <h2 className="mt-4 text-3xl font-bold text-slate-950">Access Denied</h2>
          <p className="mt-2 text-slate-600">
            You don&apos;t have permission to access this page. Admin privileges are required.
          </p>
        </div>
        <div className="space-y-4">
          <Link
            href="/admin/login"
            className="inline-flex items-center justify-center rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 transition-colors"
          >
            Sign In as Admin
          </Link>
          <Link
            href={redirectTo}
            className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Go Back
          </Link>
        </div>
      </div>
    </div>
  )
}