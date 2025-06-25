
"use client";

import { MoreHorizontal, Edit, Trash2, PlusCircle, Users2, Search, PhoneCall, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { Customer } from "@/lib/types";
import { CustomerDialog } from "./CustomerDialog";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useCustomers } from "@/hooks/useCustomers"; // Import the hook

const getInitials = (name: string) => name.split(" ").map(n => n[0]).join("").toUpperCase();

export function CustomerDataTable() {
  const { 
    customers, 
    isLoading: isLoadingCustomers, 
    error: customersError, 
    addCustomer, 
    updateCustomer, 
    deleteCustomer 
  } = useCustomers();
  
  const [isMounted, setIsMounted] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [isCustomerDialogOpen, setIsCustomerDialogOpen] = useState(false);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const userRole = currentUser?.role;

  const canManageCustomers = userRole === 'admin';
  const canAddCustomers = userRole === 'admin' || userRole === 'cashier';

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleOpenAddDialog = () => {
    if (!canAddCustomers) return;
    setEditingCustomer(null);
    setIsCustomerDialogOpen(true);
  };

  const handleOpenEditDialog = (customer: Customer) => {
    if (!canManageCustomers) return;
    setEditingCustomer(customer);
    setIsCustomerDialogOpen(true);
  };

  const handleSaveCustomer = async (customerToSave: Customer) => {
    let success = false;
    if (editingCustomer) { // Edit mode
      if (!canManageCustomers) return;
      const result = await updateCustomer(customerToSave.id, customerToSave);
      success = !!result;
    } else { // Add mode
      if (!canAddCustomers) return;
      // The avatar URL logic is now handled within addCustomer or the API for consistency
      const result = await addCustomer({
        name: customerToSave.name,
        phone: customerToSave.phone,
        address: customerToSave.address,
        shopName: customerToSave.shopName,
      });
      success = !!result;
    }

    if (success) {
      setIsCustomerDialogOpen(false);
      setEditingCustomer(null);
    }
    // Toasts are handled by the useCustomers hook
  };

  const openDeleteConfirmation = (customer: Customer) => {
    if (!canManageCustomers) return;
    setCustomerToDelete(customer);
    setIsDeleteAlertOpen(true);
  };

  const handleDeleteConfirmed = async () => {
    if (!canManageCustomers || !customerToDelete) return;
    await deleteCustomer(customerToDelete.id);
    // Toast is handled by the hook
    setIsDeleteAlertOpen(false);
    setCustomerToDelete(null);
  };

  const handleCallCustomer = (customerName: string) => {
    toast({
      title: "Premium Feature Locked",
      description: `Direct calling ${customerName} is a Limidora premium feature. Please contact Limidora to enable this.`,
    });
  };

  const filteredCustomers = customers.filter(customer => {
    const term = searchTerm.toLowerCase();
    return (
      customer.name.toLowerCase().includes(term) ||
      (customer.shopName && customer.shopName.toLowerCase().includes(term)) ||
      customer.phone.toLowerCase().includes(term)
    );
  });

  const isLoading = !isMounted || isLoadingCustomers;

  if (customersError && isMounted) {
    return (
      <Card className="shadow-none border-0">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-2xl font-bold text-destructive">Error Loading Customers</CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <p className="text-muted-foreground">
            Could not load customer data. Please try again later.
          </p>
          <p className="text-xs text-destructive mt-1">Details: {customersError}</p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <TooltipProvider>
      <Card className="shadow-none border-0">
        <CardHeader className="p-4 sm:p-6 pb-0">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle className="text-2xl font-bold">Customers</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin inline-block" /> : `${filteredCustomers.length} ${filteredCustomers.length === 1 ? 'customer' : 'customers'}`}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row w-full sm:w-auto gap-3">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search customers..."
                  className="pl-9 h-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              {canAddCustomers && (
                <Button onClick={handleOpenAddDialog} className="h-10 gap-1">
                  <PlusCircle className="h-4 w-4" />
                  <span className="hidden sm:inline">Add Customer</span>
                  <span className="inline sm:hidden">Add</span>
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-6 pt-0">
          {/* Mobile View */}
          <div className="md:hidden">
            <ScrollArea className="h-[calc(100vh-220px)] w-full rounded-lg">
              {isLoading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-24 w-full rounded-lg" /> 
                  ))}
                </div>
              ) : filteredCustomers.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                  <Users2 className="w-12 h-12 mb-4 opacity-50" />
                  <p className="text-lg font-medium">No customers found</p>
                  {searchTerm && <p className="text-sm">Try a different search term</p>}
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredCustomers.map((customer) => (
                    <Card key={customer.id} className="hover:shadow-sm transition-shadow">
                      <div className="flex items-start p-4">
                        <Avatar className="h-10 w-10 mr-3">
                          {customer.avatar ? (
                            <AvatarImage src={customer.avatar} alt={customer.name} />
                          ) : (
                            <AvatarFallback>{getInitials(customer.name)}</AvatarFallback>
                          )}
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium">{customer.name}</p>
                              <p className="text-sm text-muted-foreground">{customer.phone}</p>
                            </div>
                            <div className="flex items-center gap-1">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleCallCustomer(customer.name)}>
                                    <PhoneCall className="h-4 w-4 text-green-600" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Call {customer.name}</p>
                                </TooltipContent>
                              </Tooltip>
                              {canManageCustomers && (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-40">
                                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                    <DropdownMenuItem onClick={() => handleOpenEditDialog(customer)}>
                                      <Edit className="mr-2 h-4 w-4" /> Edit
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      className="text-destructive focus:text-destructive"
                                      onClick={() => openDeleteConfirmation(customer)}
                                    >
                                      <Trash2 className="mr-2 h-4 w-4" /> Delete
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              )}
                            </div>
                          </div>
                          {customer.shopName && (
                            <Badge variant="outline" className="mt-2 text-xs">
                              {customer.shopName}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Desktop View */}
          <div className="hidden md:block">
            <div className="rounded-lg border">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="w-[200px]">Customer</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Shop</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead className="w-[50px] text-center">Call</TableHead>
                    {canManageCustomers && <TableHead className="w-[50px] text-center">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    [...Array(5)].map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-6 w-full" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-full" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-full" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-full" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-8 mx-auto" /></TableCell>
                        {canManageCustomers && <TableCell><Skeleton className="h-6 w-8 mx-auto" /></TableCell>}
                      </TableRow>
                    ))
                  ) : filteredCustomers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={canManageCustomers ? 6 : 5} className="h-24 text-center">
                        <div className="flex flex-col items-center justify-center text-muted-foreground py-8">
                          <Users2 className="w-12 h-12 mb-4 opacity-50" />
                          <p className="text-lg font-medium">No customers found</p>
                          {searchTerm && <p className="text-sm">Try a different search term</p>}
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredCustomers.map((customer) => (
                      <TableRow key={customer.id} className="hover:bg-muted/50">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              {customer.avatar ? (
                                <AvatarImage src={customer.avatar} alt={customer.name} />
                              ) : (
                                <AvatarFallback>{getInitials(customer.name)}</AvatarFallback>
                              )}
                            </Avatar>
                            <span className="font-medium">{customer.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>{customer.phone}</TableCell>
                        <TableCell>
                          {customer.shopName ? (
                            <Badge variant="outline">{customer.shopName}</Badge>
                          ) : (
                            <span className="text-muted-foreground">N/A</span>
                          )}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {customer.address || <span className="text-muted-foreground">N/A</span>}
                        </TableCell>
                        <TableCell className="text-center">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleCallCustomer(customer.name)}>
                                <PhoneCall className="h-4 w-4 text-green-600" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Call {customer.name}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TableCell>
                        {canManageCustomers && (
                          <TableCell className="text-center">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-40">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => handleOpenEditDialog(customer)}>
                                  <Edit className="mr-2 h-4 w-4" /> Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={() => openDeleteConfirmation(customer)}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        )}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>

      {isCustomerDialogOpen && (
        <CustomerDialog
          customer={editingCustomer}
          onSave={handleSaveCustomer}
          open={isCustomerDialogOpen}
          onOpenChange={setIsCustomerDialogOpen}
          isEditMode={!!editingCustomer}
        />
      )}

      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Customer</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {customerToDelete?.name}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsDeleteAlertOpen(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirmed}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete Customer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  );
}
