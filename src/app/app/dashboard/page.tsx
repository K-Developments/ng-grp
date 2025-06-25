
"use client";

import { Banknote, Users, TrendingUp, Activity, AlertTriangle, Loader2, ShoppingBag, BarChart2, Package, type LucideIcon } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { SalesChart } from "@/components/dashboard/SalesChart";
import { AlertQuantityTable } from "@/components/dashboard/AlertQuantityTable";
import type { Sale } from "@/lib/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { AccessDenied } from "@/components/AccessDenied";
import React, { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { GlobalPreloaderScreen } from "@/components/GlobalPreloaderScreen";
import { useCustomers } from "@/hooks/useCustomers";
import { useSalesData } from "@/hooks/useSalesData";
import { useProducts } from "@/hooks/useProducts";
import { useReturns } from "@/hooks/useReturns";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

export default function DashboardPage() {
  const { currentUser } = useAuth();
  const router = useRouter();
  
  const { customers, isLoading: isLoadingCustomers, error: customersError } = useCustomers();
  const { 
    sales, 
    isLoading: isLoadingSales, 
    error: salesError, 
    totalRevenue: grossTotalRevenue
  } = useSalesData(true);
  const { 
    products: allProducts, 
    isLoading: isLoadingProducts, 
    error: productsError 
  } = useProducts();
  const { returns, isLoading: isLoadingReturns, error: returnsError } = useReturns();

  // Calculate revenue for today with proper memoization
  const { revenueToday, salesCountToday } = useMemo(() => {
    if (isLoadingSales || isLoadingReturns || !sales || !returns) return { revenueToday: 0, salesCountToday: 0 };
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const todaySales = sales.filter(sale => {
      const saleDate = sale.saleDate instanceof Date ? sale.saleDate : new Date(sale.saleDate);
      return saleDate >= today && saleDate <= endOfToday;
    });

    const salesRevenueToday = todaySales.reduce((sum, sale) => sum + (Number(sale.totalAmount) || 0), 0);

    const refundsForTodaySales = returns
      .filter(ret => {
        // Must be a refund made today
        if (!ret.refundAmount || ret.refundAmount <= 0) return false;
        const returnDate = ret.returnDate instanceof Date ? ret.returnDate : new Date(ret.returnDate);
        if (returnDate < today || returnDate > endOfToday) return false;
        
        // Find the original sale
        const originalSale = sales.find(s => s.id === ret.originalSaleId);
        if (!originalSale) return false; // Can't determine original date

        // Check if original sale was also today
        const originalSaleDate = originalSale.saleDate instanceof Date ? originalSale.saleDate : new Date(originalSale.saleDate);
        return originalSaleDate >= today && originalSaleDate <= endOfToday;
      })
      .reduce((sum, ret) => sum + (ret.refundAmount || 0), 0);
      
    return {
      revenueToday: salesRevenueToday - refundsForTodaySales,
      salesCountToday: todaySales.length
    };
  }, [sales, returns, isLoadingSales, isLoadingReturns]);

  // Calculate net revenue with proper memoization
  const { netTotalRevenue, totalRefundsAllTime } = useMemo(() => {
    if (isLoadingSales || isLoadingReturns || !returns || grossTotalRevenue === undefined) {
      return { netTotalRevenue: 0, totalRefundsAllTime: 0 };
    }
    const totalRefunds = returns.reduce((sum, ret) => sum + (ret.refundAmount || 0), 0);
    return {
      netTotalRevenue: grossTotalRevenue - totalRefunds,
      totalRefundsAllTime: totalRefunds
    };
  }, [grossTotalRevenue, returns, isLoadingSales, isLoadingReturns]);

  // Calculate low stock items with threshold
  const { liveLowStockItemsCount, criticalStockItemsCount } = useMemo(() => {
    if (isLoadingProducts || !allProducts || allProducts.length === 0) {
      return { liveLowStockItemsCount: 0, criticalStockItemsCount: 0 };
    }
    
    const lowStockItems = allProducts.filter(p => p.stock <= (p.reorderLevel || 10));
    const criticalStockItems = allProducts.filter(p => p.stock <= (p.reorderLevel ? p.reorderLevel / 2 : 5));
    
    return {
      liveLowStockItemsCount: lowStockItems.length,
      criticalStockItemsCount: criticalStockItems.length
    };
  }, [allProducts, isLoadingProducts]);

  // Enhanced top selling products with revenue calculation
  const topSellingProducts = useMemo(() => {
    if (isLoadingSales || isLoadingProducts || !sales || !allProducts) {
      return [];
    }

    const productSales: Record<string, {
      name: string;
      price: number;
      quantity: number;
      revenue: number;
      category?: string;
    }> = {};

    sales.forEach(sale => {
      sale.items.forEach(item => {
        if (!item.isOfferItem) {
          if (!productSales[item.id]) {
            const productDetails = allProducts.find(p => p.id === item.id);
            if (productDetails) {
              productSales[item.id] = {
                name: productDetails.name,
                price: productDetails.price,
                quantity: 0,
                revenue: 0,
                category: productDetails.category
              };
            }
          }
          if (productSales[item.id]) {
            productSales[item.id].quantity += item.quantity;
            productSales[item.id].revenue += (item.appliedPrice * item.quantity);
          }
        }
      });
    });

    return Object.entries(productSales)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

  }, [sales, allProducts, isLoadingSales, isLoadingProducts]);

  // Enhanced monthly sales data with comparison to previous year
  const { monthlySalesData, monthlyComparison } = useMemo(() => {
    if (!sales || sales.length === 0) {
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      return {
        monthlySalesData: monthNames.map(name => ({ name, sales: 0 })),
        monthlyComparison: Array(12).fill(0)
      };
    }

    const monthlyTotals: Record<number, number> = {};
    const monthlyTotalsPrevYear: Record<number, number> = {};
    const currentYear = new Date().getFullYear();

    sales.forEach(sale => {
      const saleDate = sale.saleDate instanceof Date ? sale.saleDate : new Date(sale.saleDate);
      const month = saleDate.getMonth();
      const year = saleDate.getFullYear();
      
      if (year === currentYear) {
        monthlyTotals[month] = (monthlyTotals[month] || 0) + (sale.totalAmount || 0);
      } else if (year === currentYear - 1) {
        monthlyTotalsPrevYear[month] = (monthlyTotalsPrevYear[month] || 0) + (sale.totalAmount || 0);
      }
    });

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    
    const comparison = monthNames.map((_, index) => {
      const current = monthlyTotals[index] || 0;
      const previous = monthlyTotalsPrevYear[index] || 0;
      return previous > 0 ? ((current - previous) / previous) * 100 : (current > 0 ? 100 : 0);
    });

    return {
      monthlySalesData: monthNames.map((name, index) => ({
        name,
        sales: monthlyTotals[index] || 0
      })),
      monthlyComparison: comparison
    };
  }, [sales]);

  // Calculate customer growth
  const customerGrowth = useMemo(() => {
    if (isLoadingCustomers || !customers) return 0;
    
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    const currentMonthCustomers = customers.filter(c => {
      const joinDate = c.createdAt instanceof Date ? c.createdAt : new Date(c.createdAt || 0);
      return joinDate.getMonth() === currentMonth && joinDate.getFullYear() === currentYear;
    }).length;
    
    const prevMonthCustomers = customers.filter(c => {
      const joinDate = c.createdAt instanceof Date ? c.createdAt : new Date(c.createdAt || 0);
      const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
      return joinDate.getMonth() === prevMonth && joinDate.getFullYear() === prevYear;
    }).length;
    
    return prevMonthCustomers > 0 
      ? ((currentMonthCustomers - prevMonthCustomers) / prevMonthCustomers) * 100
      : currentMonthCustomers > 0 ? 100 : 0;
  }, [customers, isLoadingCustomers]);

  useEffect(() => {
    if (!currentUser) {
      router.replace("/");
      return;
    }
    if (currentUser.role === "cashier") {
      router.replace("/app/sales");
    }
  }, [currentUser, router]);

  if (!currentUser) {
    return <GlobalPreloaderScreen message="Loading dashboard..." />;
  }

  if (currentUser.role === "cashier") {
    return <AccessDenied message="Dashboard is not available for your role. Redirecting..." />;
  }

  const formatCurrency = (value: number): string => {
    if (typeof value !== 'number' || isNaN(value)) {
      return 'Rs. 0.00'; 
    }
    return new Intl.NumberFormat('en-LK', { 
      style: 'currency',
      currency: 'LKR', 
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value).replace('LKR', 'Rs.'); 
  };

  const renderStatsCard = (
    title: string,
    value: string | number,
    icon: React.ComponentType<{ className?: string }>,
    iconColor: string,
    description?: string,
    trend?: number,
    additionalInfo?: string
  ) => {
    return (
      <StatsCard
        title={title}
        value={value}
        icon={icon}
        iconColor={iconColor}
        description={description}
        trend={trend}
        additionalInfo={additionalInfo}
      />
    );
  };

  const renderLoadingCard = (title: string, icon: LucideIcon, iconColor: string) => (
    <Card className="shadow-lg h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Loader2 className={`${iconColor} h-5 w-5 animate-spin`} />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-full mb-2" />
        <Skeleton className="h-4 w-3/4" />
      </CardContent>
    </Card>
  );

  const renderErrorCard = (title: string, icon: LucideIcon, iconColor: string) => (
    <Card className="shadow-lg h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <AlertTriangle className={`${iconColor} h-5 w-5`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold font-headline text-destructive">Error</div>
        <p className="text-xs text-muted-foreground pt-1">Could not load data</p>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard Overview"
        description="Welcome back! Here's what's happening with your business."
        icon={Activity}
      />
      
      {/* Error alerts */}
      {customersError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Customer Data Error</AlertTitle>
          <AlertDescription>{customersError}</AlertDescription>
        </Alert>
      )}
      {salesError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Sales Data Error</AlertTitle>
          <AlertDescription>{salesError}</AlertDescription>
        </Alert>
      )}
      {productsError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Product Data Error</AlertTitle>
          <AlertDescription>{productsError}</AlertDescription>
        </Alert>
      )}
      {returnsError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Returns Data Error</AlertTitle>
          <AlertDescription>{returnsError}</AlertDescription>
        </Alert>
      )}

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Revenue */}
        {isLoadingSales || isLoadingReturns ? (
          renderLoadingCard("Total Revenue", Banknote, "text-green-600")
        ) : salesError || returnsError ? (
          renderErrorCard("Total Revenue", Banknote, "text-green-600")
        ) : (
          renderStatsCard(
            "Total Revenue",
            formatCurrency(netTotalRevenue),
            Banknote,
            "text-green-600",
            `Net revenue after all refunds`,
            monthlyComparison[new Date().getMonth()]
          )
        )}

        {/* Total Customers */}
        {isLoadingCustomers ? (
          renderLoadingCard("Total Customers", Users, "text-blue-600")
        ) : customersError ? (
          renderErrorCard("Total Customers", Users, "text-blue-600")
        ) : (
          renderStatsCard(
            "Total Customers",
            customers?.length.toLocaleString() || "0",
            Users,
            "text-blue-600",
            "Registered customers",
            customerGrowth
          )
        )}

        {/* Inventory Status */}
        {isLoadingProducts ? (
          renderLoadingCard("Inventory Status", Package, "text-orange-600")
        ) : productsError ? (
          renderErrorCard("Inventory Status", Package, "text-orange-600")
        ) : (
          renderStatsCard(
            "Inventory Status",
            `${liveLowStockItemsCount} Low Stock`,
            Package,
            "text-orange-600",
            `${criticalStockItemsCount} critical items`,
            undefined,
            allProducts ? `${allProducts.length} total products` : undefined
          )
        )}

        {/* Today's Performance */}
        {isLoadingSales || isLoadingReturns ? (
          renderLoadingCard("Today's Performance", TrendingUp, "text-purple-600")
        ) : salesError || returnsError ? (
          renderErrorCard("Today's Performance", TrendingUp, "text-purple-600")
        ) : (
          renderStatsCard(
            "Today's Performance",
            formatCurrency(revenueToday),
            TrendingUp,
            "text-purple-600",
            `${salesCountToday} transactions today`
          )
        )}
      </div>

      {/* Charts and Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Chart */}
        <div className="lg:col-span-2 space-y-6">
          <SalesChart
            data={monthlySalesData} 
            title="Monthly Sales Performance"
            description={isLoadingSales ? "Loading sales data..." : "Current year vs previous year"}
            comparisonData={monthlyComparison}
          />
          
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="font-headline flex items-center gap-2">
                <ShoppingBag className="h-5 w-5" />
                Recent Transactions
              </CardTitle>
              <CardDescription>
                {isLoadingSales ? 'Loading...' : 'Latest sales activities'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingSales ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center space-x-4">
                      <Skeleton className="h-12 w-12 rounded-full" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-[200px]" />
                        <Skeleton className="h-4 w-[150px]" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : salesError ? (
                <div className="text-center text-destructive py-10">
                  <p>Could not load transactions.</p>
                </div>
              ) : (!sales || sales.length === 0) ? (
                <div className="text-center text-muted-foreground py-10">
                  No transactions yet.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sales.slice(0, 5).map((sale) => (
                      <TableRow key={sale.id}>
                        <TableCell className="font-medium">#{sale.id}</TableCell>
                        <TableCell>
                          {sale.customerName || "Walk-in Customer"}
                          {sale.customerPhone && (
                            <div className="text-xs text-muted-foreground">{sale.customerPhone}</div>
                          )}
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(sale.totalAmount)}</TableCell>
                        <TableCell className="text-right">
                          <Badge 
                            variant={sale.outstandingBalance > 0 ? 'destructive' : 'default'}
                            className={cn(sale.outstandingBalance === 0 && "bg-green-600 hover:bg-green-700")}
                          >
                            {sale.outstandingBalance > 0 ? 'Pending' : 'Completed'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          {/* Top Selling Products */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="font-headline flex items-center gap-2">
                <BarChart2 className="h-5 w-5" />
                Top Selling Products
              </CardTitle>
              <CardDescription>
                {isLoadingSales || isLoadingProducts ? 'Calculating...' : 'By revenue'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {(isLoadingSales || isLoadingProducts) ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center space-x-4">
                      <Skeleton className="h-12 w-12 rounded-lg" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-[150px]" />
                        <Skeleton className="h-4 w-[100px]" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : salesError || productsError ? (
                <div className="text-center text-destructive py-10">
                  <p>Could not load products.</p>
                </div>
              ) : topSellingProducts.length === 0 ? (
                <div className="text-center text-muted-foreground py-10">
                  No sales data available yet.
                </div>
              ) : (
                <div className="space-y-4">
                  {topSellingProducts.map((product) => (
                    <div key={product.id} className="flex items-center">
                      <div className="ml-4 space-y-1 flex-1">
                        <p className="text-sm font-medium leading-none">{product.name}</p>
                        <p className="text-sm text-muted-foreground">{product.category || 'Uncategorized'}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{product.quantity} sold</p>
                        <p className="text-sm text-green-600">{formatCurrency(product.revenue)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Inventory Alerts */}
          <AlertQuantityTable />

        </div>
      </div>
    </div>
  );
}
