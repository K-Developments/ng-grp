
"use client";

import { useState, useEffect, useCallback } from "react";
import type { Vehicle } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { VehicleService } from "@/lib/vehicleService";

const API_BASE_URL = "/api/vehicles";

export function useVehicles() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    setIsLoading(true);
    setError(null);

    const unsubscribe = VehicleService.subscribeToVehicles(
      (newVehicles) => {
        setVehicles(newVehicles.sort((a, b) => a.vehicleNumber.localeCompare(b.vehicleNumber)));
        setIsLoading(false);
      },
      (err) => {
        const errorMessage = err.message || "An unknown error occurred while fetching vehicles.";
        setError(errorMessage);
        toast({
          variant: "destructive",
          title: "Error Fetching Vehicles",
          description: errorMessage,
        });
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [toast]);

  const addVehicle = async (vehicleData: Omit<Vehicle, "id">): Promise<Vehicle | null> => {
    setIsLoading(true);
    try {
      const response = await fetch(API_BASE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(vehicleData),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "Failed to add vehicle" }));
        throw new Error(errorData.message || "Failed to add vehicle.");
      }
      const newVehicle = await response.json();
      // The listener will update the state.
      toast({
        title: "Vehicle Added",
        description: `Vehicle ${newVehicle.vehicleNumber} has been successfully added.`,
      });
      return newVehicle;
    } catch (err: any) {
      console.error("Error adding vehicle:", err);
      toast({
        variant: "destructive",
        title: "Failed to Add Vehicle",
        description: err.message,
      });
      setIsLoading(false); // Reset loading on error
      return null;
    }
  };

  const updateVehicle = async (id: string, vehicleData: Partial<Omit<Vehicle, "id">>): Promise<Vehicle | null> => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}?id=${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(vehicleData),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "Failed to update vehicle" }));
        throw new Error(errorData.message || `Failed to update vehicle.`);
      }
      toast({
        title: "Vehicle Updated",
        description: `Vehicle ${vehicleData.vehicleNumber || ''} has been successfully updated.`,
      });
      const updatedVehicle = vehicles.find(c => c.id === id);
      return updatedVehicle ? { ...updatedVehicle, ...vehicleData } : null;
    } catch (err: any) {
      console.error("Error updating vehicle:", err);
      toast({
        variant: "destructive",
        title: "Failed to Update Vehicle",
        description: err.message,
      });
      setIsLoading(false);
      return null;
    }
  };

  const deleteVehicle = async (id: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}?id=${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "Failed to delete vehicle" }));
        throw new Error(errorData.message || `Failed to delete vehicle.`);
      }
      toast({
        title: "Vehicle Deleted",
        description: "The vehicle has been successfully deleted.",
      });
      return true;
    } catch (err: any) {
      console.error("Error deleting vehicle:", err);
      toast({
        variant: "destructive",
        title: "Failed to Delete Vehicle",
        description: err.message,
      });
      setIsLoading(false);
      return false;
    }
  };

  return {
    vehicles,
    isLoading,
    error,
    addVehicle,
    updateVehicle,
    deleteVehicle,
  };
}
