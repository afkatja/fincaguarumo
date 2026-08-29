"use client"

import { useState, useEffect } from "react"
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth"
import AdminHeader from "@/components/AdminHeader"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface PricingRule {
  _id: string
  title: string
  description: string
  ruleType: "base_rate" | "seasonal" | "discount" | "fee" | "tax"
  season?: "high" | "low" | "shoulder" | "all"
  startDate?: string
  endDate?: string
  basePrice?: number
  percentage?: number
  fixedAmount?: number
  minimumNights?: number
  isActive: boolean
  displayOrder?: number
  language: string
  _createdAt: string
  _updatedAt: string
}

const RULE_TYPE_LABELS: Record<string, string> = {
  base_rate: "Base Rate",
  seasonal: "Seasonal",
  discount: "Discount",
  fee: "Fee",
  tax: "Tax",
}

const SEASON_LABELS: Record<string, string> = {
  high: "High Season",
  low: "Low Season",
  shoulder: "Shoulder Season",
  all: "All Year",
}

const formatCurrency = (amount?: number) => {
  if (amount === undefined || amount === null) return "—"
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount)
}

const formatDate = (dateString?: string) => {
  if (!dateString) return "—"
  return new Date(dateString).toLocaleDateString()
}

export default function PricingRulesPage() {
  const { session, loading: authLoading, getAccessToken } = useSupabaseAuth()
  const [pricingRules, setPricingRules] = useState<PricingRule[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPricingRules = async () => {
    setLoading(true)
    setError(null)
    try {
      if (authLoading) return

      const accessToken = await getAccessToken()
      if (!accessToken) {
        setError("Authentication required")
        return
      }

      const response = await fetch("/api/admin/pricing-rules", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })

      if (!response.ok) {
        if (response.status === 401) {
          setError("Authentication required")
          return
        }
        if (response.status === 403) {
          setError("Admin access required")
          return
        }
        throw new Error(`Failed to fetch pricing rules: ${response.status}`)
      }

      const data = await response.json()
      setPricingRules(data.data || [])
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load pricing rules",
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPricingRules()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, session])

  const getRuleTypeBadge = (type: string) => {
    const variants: Record<
      string,
      "default" | "secondary" | "destructive" | "outline"
    > = {
      base_rate: "default",
      seasonal: "secondary",
      discount: "outline",
      fee: "destructive",
      tax: "default",
    }
    return (
      <Badge variant={variants[type] || "default"}>
        {RULE_TYPE_LABELS[type] || type}
      </Badge>
    )
  }

  const getSeasonBadge = (season?: string) => {
    if (!season) return <Badge variant="outline">—</Badge>
    return <Badge variant="outline">{SEASON_LABELS[season] || season}</Badge>
  }

  const getStatusBadge = (isActive: boolean) => {
    return isActive ? (
      <Badge variant="default">Active</Badge>
    ) : (
      <Badge variant="secondary">Inactive</Badge>
    )
  }

  return (
    <div>
      <AdminHeader />
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Pricing Rules</h1>
          <Button onClick={fetchPricingRules} disabled={loading}>
            {loading ? "Refreshing..." : "Refresh"}
          </Button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-lg">
            {error}
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>All Pricing Rules</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-gray-500">
                Loading pricing rules...
              </div>
            ) : pricingRules.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No pricing rules found
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8">#</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Season</TableHead>
                      <TableHead>Base Price</TableHead>
                      <TableHead>Percentage</TableHead>
                      <TableHead>Fixed Amount</TableHead>
                      <TableHead>Min Nights</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Order</TableHead>
                      <TableHead>Language</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pricingRules.map((rule, index) => (
                      <TableRow key={rule._id} className="hover:bg-gray-50">
                        <TableCell className="font-mono text-sm">
                          {index + 1}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{rule.title}</div>
                          <div className="text-sm text-gray-500 max-w-xs truncate">
                            {rule.description}
                          </div>
                        </TableCell>
                        <TableCell>{getRuleTypeBadge(rule.ruleType)}</TableCell>
                        <TableCell>{getSeasonBadge(rule.season)}</TableCell>
                        <TableCell className="font-mono">
                          {formatCurrency(rule.basePrice)}
                        </TableCell>
                        <TableCell className="font-mono">
                          {!!rule.percentage ? `${rule.percentage}%` : "—"}
                        </TableCell>
                        <TableCell className="font-mono">
                          {formatCurrency(rule.fixedAmount)}
                        </TableCell>
                        <TableCell className="font-mono text-center">
                          {rule.minimumNights !== undefined
                            ? rule.minimumNights
                            : "—"}
                        </TableCell>
                        <TableCell>{getStatusBadge(rule.isActive)}</TableCell>
                        <TableCell className="font-mono text-center">
                          {rule.displayOrder !== undefined
                            ? rule.displayOrder
                            : "—"}
                        </TableCell>
                        <TableCell className="text-uppercase font-mono text-sm">
                          {rule.language}
                        </TableCell>
                        <TableCell className="text-sm text-gray-500 font-mono">
                          {formatDate(rule._createdAt)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
