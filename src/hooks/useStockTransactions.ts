
"use client";

import { useState, useEffect } from "react";
import type { StockTransaction } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { StockService } from "@/lib/stockService";

export function useStockTransactions() {
  const [transactions, setTransactions] = useState<StockTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    setIsLoading(true);
    setError(null);

    const unsubscribe = StockService.subscribeToAllTransactions(
      (newTransactions) => {
        setTransactions(newTransactions);
        setIsLoading(false);
      },
      (err) => {
        const errorMessage = err.message || "An unknown error occurred.";
        setError(errorMessage);
        toast({
          variant: "destructive",
          title: "Error Fetching Stock Report",
          description: errorMessage,
        });
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [toast]);

  return {
    transactions,
    isLoading,
    error,
  };
}
