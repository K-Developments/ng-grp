import { useState, useEffect, useCallback } from "react";
import type { Sale } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";

export function useSalesWebSocket() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const [ws, setWs] = useState<WebSocket | null>(null);

  const processSaleData = useCallback((data: any): Sale[] => {
    return data.map((sale: any) => ({
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
  }, []);

  useEffect(() => {
    const socket = new WebSocket(`wss://${window.location.host}/api/realtime`);
    
    socket.onopen = () => {
      console.log('WebSocket connected');
      setIsLoading(true);
    };

    socket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      
      if (message.type === 'INITIAL_DATA') {
        setSales(processSaleData(message.data));
        setIsLoading(false);
      } else if (message.type === 'NEW_SALE') {
        setSales(prev => [processSaleData([message.data])[0], ...prev]);
      }
    };

    socket.onerror = (error) => {
      console.error('WebSocket error:', error);
      setError('Connection error occurred');
      setIsLoading(false);
    };

    socket.onclose = () => {
      console.log('WebSocket disconnected');
    };

    setWs(socket);

    return () => {
      socket.close();
    };
  }, [processSaleData]);

  const addNewSale = useCallback((newSale: Sale) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'NEW_SALE', data: newSale }));
    }
    setSales(prev => [newSale, ...prev]);
  }, [ws]);

  const totalRevenue = sales.reduce((sum, sale) => sum + sale.totalAmount, 0);

  return {
    sales,
    isLoading,
    error,
    totalRevenue,
    addNewSale,
  };
}