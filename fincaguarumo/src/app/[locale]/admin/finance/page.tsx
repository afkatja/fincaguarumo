"use client"

import MotoChargePanel from "@/components/MotoChargePanel"
import PageLayout from "../../(pages)/pagesLayout"
import { Button } from "../../../../components/ui/button"
import AdminHeader from "@/components/AdminHeader"
import ErrorBoundary from "@/components/ErrorBoundary"

const FinanceChargePage = () => {
  return (
    <>
      <AdminHeader />
      <PageLayout
        pageName="Finance Charge"
        title="Finance Charge"
        description="Charge a Booking.com VCC"
      >
        <div className="w-11/12 mx-auto py-5 space-y-6 prose lg:prose-lg">
          <MotoChargePanel />

          <Button
            type="button"
            variant="default"
            onClick={() => {
              window.location.reload()
            }}
          >
            Process Another Payment
          </Button>
        </div>
      </PageLayout>
    </>
  )
}

const FinanceChargePageWithErrorBoundary = () => (
  <ErrorBoundary>
    <FinanceChargePage />
  </ErrorBoundary>
)

export default FinanceChargePageWithErrorBoundary
