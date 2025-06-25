//location src/hooks/useSalesData.ts
"use client";

import { useState, useEffect, useCallback } from "react";
import type { Sale } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";

const API_BASE_URL = "/api/sales";

export function useSalesData(realTime = true) {
  const [sales, setSales] = useState<Sale[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchSales = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(API_BASE_URL);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "Failed to fetch sales data" }));
        throw new Error(errorData.message || "Failed to fetch sales data");
      }
      const data = await response.json();
      const processedSales = data.map((sale: any) => ({
        ...sale,
        saleDate: new Date(sale.saleDate),
        totalAmount: Number(sale.totalAmount) || 0,
        subTotal: Number(sale.subTotal) || 0,
        discountAmount: Number(sale.discountAmount) || 0,
        cashGiven: sale.cashGiven !== undefined ? Number(sale.cashGiven) || 0 : undefined,
        balanceReturned: sale.balanceReturned !== undefined ? Number(sale.balanceReturned) || 0 : undefined,
        amountPaidOnCredit: sale.amountPaidOnCredit !== undefined ? Number(sale.amountPaidOnCredit) || 0 : undefined,
        remainingCreditBalance: sale.remainingCreditBalance !== undefined ? Number(sale.remainingCreditBalance) || 0 : undefined,
      }));
      setSales(processedSales);
    } catch (err: any) {
      console.error("Error fetching sales data:", err);
      const errorMessage = err.message || "An unknown error occurred while fetching sales data.";
      setError(errorMessage);
      toast({
        variant: "destructive",
        title: "Error Fetching Sales Data",
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchSales();

    if (realTime) {
      // Set up polling for real-time updates (every 30 seconds)
      const pollInterval = setInterval(fetchSales, 30000);
      
      // Alternatively, set up WebSocket connection here if your backend supports it
      // const ws = new WebSocket('wss://your-api/ws');
      // ws.onmessage = (event) => {
      //   const newSale = JSON.parse(event.data);
      //   setSales(prev => [...prev, newSale]);
      // };
      
      return () => {
        clearInterval(pollInterval);
        // ws.close();
      };
    }
  }, [fetchSales, realTime]);

  const addNewSale = useCallback((newSale: Sale) => {
    setSales(prevSales => [newSale, ...prevSales]);
  }, []);

  const totalRevenue = sales.reduce((sum, sale) => sum + sale.totalAmount, 0);

  return {
    sales,
    isLoading,
    error,
    totalRevenue,
    refetchSales: fetchSales,
    addNewSale, // Export function to manually add new sales
  };
}