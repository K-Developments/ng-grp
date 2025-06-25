
"use client";

import { useState, useEffect, useCallback } from "react";
import type { Product } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";

const API_BASE_URL = "/api/products";

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(API_BASE_URL);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "Failed to fetch products"}));
        throw new Error(errorData.message || "Failed to fetch products");
      }
      const data = await response.json();
      setProducts(data);
    } catch (err: any) {
      console.error("Error fetching products:", err);
      const errorMessage = err.message || "An unknown error occurred while fetching products.";
      setError(errorMessage);
      toast({
        variant: "destructive",
        title: "Error Fetching Products",
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const addProduct = async (productData: Omit<Product, "id">): Promise<Product | null> => {
    setIsLoading(true);
    try {
      const response = await fetch(API_BASE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(productData),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "Failed to add product"}));
        throw new Error(errorData.message || "Failed to add product. Server responded with an error.");
      }
      const newProduct = await response.json();
      // Instead of setProducts directly, call fetchProducts to get the latest list including the new one
      await fetchProducts(); 
      toast({
        title: "Product Added",
        description: `${newProduct.name} has been successfully added.`,
      });
      return newProduct;
    } catch (err: any) {
      console.error("Error adding product:", err);
      const errorMessage = err.message || "An unknown error occurred while adding the product.";
      setError(errorMessage);
      toast({
        variant: "destructive",
        title: "Failed to Add Product",
        description: errorMessage,
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const updateProduct = async (id: string, productData: Partial<Omit<Product, "id">>): Promise<Product | null> => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}?id=${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(productData),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "Failed to update product"}));
        throw new Error(errorData.message || `Failed to update product. Server responded with status ${response.status}.`);
      }
      await fetchProducts(); // Refetch to get updated list
      toast({
        title: "Product Updated",
        description: `${productData.name || 'Product'} has been successfully updated.`,
      });
      const updatedProduct = products.find(p => p.id === id); // optimistic find
      return updatedProduct ? { ...updatedProduct, ...productData } : null;
    } catch (err: any) {
      console.error("Error updating product:", err);
      const errorMessage = err.message || "An unknown error occurred while updating the product.";
      setError(errorMessage);
      toast({
        variant: "destructive",
        title: "Failed to Update Product",
        description: errorMessage,
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const deleteProduct = async (id: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}?id=${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "Failed to delete product"}));
        throw new Error(errorData.message || `Failed to delete product. Server responded with status ${response.status}.`);
      }
      await fetchProducts(); // Refetch to get updated list
      toast({
        title: "Product Deleted",
        description: "The product has been successfully deleted.",
      });
      return true;
    } catch (err: any) {
      console.error("Error deleting product:", err);
      const errorMessage = err.message || "An unknown error occurred while deleting the product.";
      setError(errorMessage);
      toast({
        variant: "destructive",
        title: "Failed to Delete Product",
        description: errorMessage,
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };


  return {
    products,
    isLoading,
    error,
    refetch: fetchProducts, // Expose fetchProducts as refetch
    addProduct,
    updateProduct,
    deleteProduct,
  };
}
