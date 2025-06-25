"use client";

import { useState, useEffect, useCallback } from "react";
import type { ReturnTransaction } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";

const API_BASE_URL = "/api/returns/history";

export function useReturns() {
  const [returns, setReturns] = useState<ReturnTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchReturns = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(API_BASE_URL);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "Failed to fetch returns" }));
        throw new Error(errorData.message || "Failed to fetch returns");
      }
      const data = await response.json();
      const processedReturns = data.map((r: any) => ({
        ...r,
        returnDate: new Date(r.returnDate),
      }));
      setReturns(processedReturns.sort((a: ReturnTransaction, b: ReturnTransaction) => b.returnDate.getTime() - a.returnDate.getTime()));
    } catch (err: any) {
      console.error("Error fetching returns:", err);
      const errorMessage = err.message || "An unknown error occurred while fetching returns.";
      setError(errorMessage);
      toast({
        variant: "destructive",
        title: "Error Fetching Returns",
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchReturns();
  }, [fetchReturns]);

  return {
    returns,
    isLoading,
    error,
    refetchReturns: fetchReturns,
  };
}
