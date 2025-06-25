
"use client";

import { useState, useEffect, useCallback } from "react";
import type { Customer } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";

const API_BASE_URL = "/api/customers";

export function useCustomers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchCustomers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(API_BASE_URL);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "Failed to fetch customers" }));
        throw new Error(errorData.message || "Failed to fetch customers");
      }
      const data = await response.json();
      setCustomers(data);
    } catch (err: any) {
      console.error("Error fetching customers:", err);
      const errorMessage = err.message || "An unknown error occurred while fetching customers.";
      setError(errorMessage);
      toast({
        variant: "destructive",
        title: "Error Fetching Customers",
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const addCustomer = async (customerData: Omit<Customer, "id" | "avatar">): Promise<Customer | null> => {
    setIsLoading(true);
    try {
      const response = await fetch(API_BASE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(customerData),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "Failed to add customer" }));
        throw new Error(errorData.message || "Failed to add customer. Server responded with an error.");
      }
      const newCustomer = await response.json();
      setCustomers((prev) => [...prev, newCustomer].sort((a, b) => a.name.localeCompare(b.name)));
      toast({
        title: "Customer Added",
        description: `${customerData.name} has been successfully added.`,
      });
      return newCustomer;
    } catch (err: any) {
      console.error("Error adding customer:", err);
      const errorMessage = err.message || "An unknown error occurred while adding the customer.";
      setError(errorMessage); // Keep this for potential global error display
      toast({
        variant: "destructive",
        title: "Failed to Add Customer",
        description: errorMessage,
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const updateCustomer = async (id: string, customerData: Partial<Omit<Customer, "id" | "avatar">>): Promise<Customer | null> => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}?id=${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(customerData),
      });
      if (!response.ok) {
         const errorData = await response.json().catch(() => ({ message: "Failed to update customer" }));
        throw new Error(errorData.message || `Failed to update customer. Server responded with status ${response.status}.`);
      }
      // Assuming PUT returns the updated customer or just a success message.
      // If it returns the updated customer:
      // const updatedCustomer = await response.json();
      // setCustomers((prev) => prev.map((c) => (c.id === id ? { ...c, ...updatedCustomer } : c)));
      // For now, we'll refetch to get the latest state.
      await fetchCustomers(); 
      toast({
        title: "Customer Updated",
        description: `${customerData.name || 'Customer'} has been successfully updated.`,
      });
      const updatedCustomer = customers.find(c => c.id === id); // optimistic find
      return updatedCustomer ? { ...updatedCustomer, ...customerData } : null;
    } catch (err: any) {
      console.error("Error updating customer:", err);
      const errorMessage = err.message || "An unknown error occurred while updating the customer.";
      setError(errorMessage);
      toast({
        variant: "destructive",
        title: "Failed to Update Customer",
        description: errorMessage,
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const deleteCustomer = async (id: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}?id=${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "Failed to delete customer" }));
        throw new Error(errorData.message || `Failed to delete customer. Server responded with status ${response.status}.`);
      }
      setCustomers((prev) => prev.filter((c) => c.id !== id));
      toast({
        title: "Customer Deleted",
        description: "The customer has been successfully deleted.",
      });
      return true;
    } catch (err: any) {
      console.error("Error deleting customer:", err);
      const errorMessage = err.message || "An unknown error occurred while deleting the customer.";
      setError(errorMessage);
      toast({
        variant: "destructive",
        title: "Failed to Delete Customer",
        description: errorMessage,
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    customers,
    isLoading,
    error,
    fetchCustomers, // Exposed for manual refetch if needed
    addCustomer,
    updateCustomer,
    deleteCustomer,
  };
}
