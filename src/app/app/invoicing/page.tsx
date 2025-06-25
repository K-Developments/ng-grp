
"use client";

import { ReceiptText, AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { InvoiceDataTable } from "@/components/invoicing/InvoiceDataTable";
import { useAuth } from "@/contexts/AuthContext";
import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { GlobalPreloaderScreen } from "@/components/GlobalPreloaderScreen";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { useSalesData } from "@/hooks/useSalesData";

export default function InvoicingPage() {
  const { currentUser } = useAuth();
  const router = useRouter();
  
  // Use the centralized hook for fetching sales data with real-time polling
  const { sales, isLoading, error, totalRevenue, refetchSales } = useSalesData(true);

  useEffect(() => {
    if (currentUser === null) { // Explicitly check for not logged in
      router.replace("/");
    }
  }, [currentUser, router]);

  if (currentUser === undefined) {
    return <GlobalPreloaderScreen message="Authenticating..." />;
  }
  
  if (currentUser === null) {
      return <GlobalPreloaderScreen message="Redirecting..." />;
  }

  const revenueDisplay = new Intl.NumberFormat('en-LK', {
    style: 'currency',
    currency: 'LKR',
    minimumFractionDigits: 2
  }).format(totalRevenue).replace('LKR', 'Rs.');

  return (
    <div className="container mx-auto px-4 py-6">
      <PageHeader
        title="Invoice Management"
        description={
          <div>
            <p>View, search, and manage past sales invoices.</p>
            {!isLoading && !error && (
              <p className="mt-1 text-sm font-medium text-primary">
                Total Revenue: {revenueDisplay}
              </p>
            )}
          </div>
        }
        icon={ReceiptText}
      />

      {error && !isLoading && ( // Show error only if not in the middle of a loading cycle
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Connection Error</AlertTitle>
          <AlertDescription>
            {error}. The system will automatically keep trying to fetch data.
          </AlertDescription>
        </Alert>
      )}

      <Card className="shadow-lg">
        <CardContent className="p-0">
          <InvoiceDataTable 
            sales={sales} 
            isLoading={isLoading && sales.length === 0} // Show full loading screen only on initial load
            error={error}
            refetchSales={refetchSales}
          />
        </CardContent>
      </Card>
    </div>
  );
}
