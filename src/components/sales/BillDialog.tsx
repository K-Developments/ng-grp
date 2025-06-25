
"use client";

import type { CartItem, Customer, Sale, ChequeInfo, BankTransferInfo } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { AppLogo } from "@/components/AppLogo";
import { Calendar as CalendarIcon, Landmark, Printer, Wallet, AlertTriangle, Gift, Newspaper, Banknote, FileText, CreditCard, Building } from "lucide-react";
import { Label } from "@/components/ui/label";
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, isValid, parseISO } from "date-fns";
import { useToast } from "@/hooks/use-toast";

const formatCurrency = (amount: number | undefined): string => {
  if (typeof amount !== 'number' || isNaN(amount)) return 'Rs. 0.00';
  return new Intl.NumberFormat('en-LK', {
    style: 'currency',
    currency: 'LKR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount).replace('LKR', 'Rs.');
};

interface BillDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  cartItems?: CartItem[];
  customer?: Customer | null;
  currentSubtotal?: number;
  currentDiscountAmount?: number;
  currentTotalAmount?: number; 
  onConfirmSale?: (saleData: Omit<Sale, 'id' | 'saleDate' | 'staffId' | 'items'>) => Promise<Sale | null>;
  offerApplied?: boolean; 
  existingSaleData?: Sale;
}

export function BillDialog({ 
  isOpen, 
  onOpenChange, 
  cartItems: newCartItems,
  customer: newCustomer,
  currentSubtotal: newSubtotal,
  currentDiscountAmount: newDiscountAmount,
  currentTotalAmount: newTotalAmountDue, 
  onConfirmSale,
  offerApplied: newOfferApplied, 
  existingSaleData
}: BillDialogProps) {
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [finalSaleData, setFinalSaleData] = useState<Sale | null>(null);

  const [cashTendered, setCashTendered] = useState<string>("");
  const [chequeAmountPaid, setChequeAmountPaid] = useState<string>("");
  const [chequeNumber, setChequeNumber] = useState<string>("");
  const [chequeBank, setChequeBank] = useState<string>("");
  const [chequeDate, setChequeDate] = useState<Date | undefined>(new Date());
  
  const [bankTransferAmountPaid, setBankTransferAmountPaid] = useState<string>("");
  const [bankTransferBankName, setBankTransferBankName] = useState<string>("");
  const [bankTransferReference, setBankTransferReference] = useState<string>("");
  const { toast } = useToast();

  useEffect(() => {
    // This effect runs when finalSaleData is updated, ensuring the DOM is updated before printing.
    if (finalSaleData) {
      window.print();
      // Reset state and close the dialog after printing
      setIsProcessing(false);
      onOpenChange(false);
      setFinalSaleData(null);
    }
  }, [finalSaleData, onOpenChange]);

  const saleForPrinting = finalSaleData || existingSaleData;
  const isReprintMode = !!saleForPrinting;

  const transactionDate = saleForPrinting ? new Date(saleForPrinting.saleDate) : new Date();
  const displaySaleId = saleForPrinting ? saleForPrinting.id : null;
  const offerWasApplied = isReprintMode ? (saleForPrinting.offerApplied || false) : (newOfferApplied || false);

  const itemsToDisplay: CartItem[] = useMemo(() => {
    const saleData = finalSaleData || existingSaleData;
    if (saleData) {
      return saleData.items.map(item => ({
        ...item,
        name: item.name && item.name !== "N/A" ? item.name : `Product ID: ${item.id}`,
        category: item.category || "Other",
        price: typeof item.price === 'number' ? item.price : 0,
        appliedPrice: typeof item.appliedPrice === 'number' ? item.appliedPrice : 0,
      }));
    }
    return newCartItems || [];
  }, [finalSaleData, existingSaleData, newCartItems]);
  
  const customerForDisplay = useMemo(() => {
    const saleData = finalSaleData || existingSaleData;
    if (saleData) {
        return saleData.customerName ? { id: saleData.customerId || '', name: saleData.customerName, phone: '', shopName: '' } as Customer : null;
    }
    return newCustomer;
  }, [finalSaleData, existingSaleData, newCustomer]);

  const subtotalToDisplay = (saleForPrinting ? saleForPrinting.subTotal : newSubtotal) || 0;
  const discountAmountToDisplay = (saleForPrinting ? saleForPrinting.discountAmount : newDiscountAmount) || 0;
  const totalAmountDueForDisplay = (saleForPrinting ? saleForPrinting.totalAmount : newTotalAmountDue) || 0;
  
  const invoiceCloseDate = useMemo(() => {
    if (saleForPrinting && (saleForPrinting.outstandingBalance ?? 0) <= 0 && saleForPrinting.updatedAt) {
      return format(new Date(saleForPrinting.updatedAt), 'PP, p');
    }
    return null;
  }, [saleForPrinting]);

  useEffect(() => {
    if (isOpen) {
      setIsProcessing(false);
      setFinalSaleData(null); 
      if (existingSaleData) {
        // In reprint mode, we don't need to populate payment fields, only display existing data
        setCashTendered("");
        setChequeAmountPaid("");
        setChequeNumber("");
        setChequeBank("");
        setChequeDate(new Date());
        setBankTransferAmountPaid("");
        setBankTransferBankName("");
        setBankTransferReference("");
      } else {
        // Reset for new sale
        setCashTendered("");
        setChequeAmountPaid("");
        setChequeNumber("");
        setChequeBank("");
        setChequeDate(new Date());
        setBankTransferAmountPaid("");
        setBankTransferBankName("");
        setBankTransferReference("");
      }
    }
  }, [isOpen, existingSaleData]);

  const parsedCashTendered = parseFloat(cashTendered) || 0;
  const parsedChequeAmountPaid = parseFloat(chequeAmountPaid) || 0;
  const parsedBankTransferAmountPaid = parseFloat(bankTransferAmountPaid) || 0;

  const totalTenderedByMethods = parsedCashTendered + parsedChequeAmountPaid + parsedBankTransferAmountPaid;
  
  const changeGiven = useMemo(() => {
    if (parsedCashTendered > 0 && totalTenderedByMethods > totalAmountDueForDisplay) {
      const cashExcess = parsedCashTendered - (totalAmountDueForDisplay - (parsedChequeAmountPaid + parsedBankTransferAmountPaid));
      return Math.max(0, cashExcess);
    }
    return 0;
  }, [parsedCashTendered, parsedChequeAmountPaid, parsedBankTransferAmountPaid, totalTenderedByMethods, totalAmountDueForDisplay]);

  const totalPaymentApplied = totalTenderedByMethods - changeGiven;

  const outstandingBalance = useMemo(() => {
    return Math.max(0, totalAmountDueForDisplay - totalPaymentApplied);
  }, [totalAmountDueForDisplay, totalPaymentApplied]);

  const getPaymentSummary = useCallback(() => {
    const methodsUsed: string[] = [];
    let summary = "";
    if (parsedCashTendered > 0) methodsUsed.push(`Cash (${(parsedCashTendered - changeGiven).toFixed(2)})`);
    if (parsedChequeAmountPaid > 0) methodsUsed.push(`Cheque (${parsedChequeAmountPaid.toFixed(2)})${chequeNumber.trim() ? ` - #${chequeNumber.trim()}` : ''}`);
    if (parsedBankTransferAmountPaid > 0) methodsUsed.push(`Bank Transfer (${parsedBankTransferAmountPaid.toFixed(2)})${bankTransferReference.trim() ? ` - Ref: ${bankTransferReference.trim()}` : ''}`);

    if (methodsUsed.length > 1) {
      summary = `Split (${methodsUsed.join(' + ')})`;
    } else if (methodsUsed.length === 1) {
      summary = methodsUsed[0];
    } else if (totalAmountDueForDisplay > 0 && totalPaymentApplied === 0) {
      summary = "Full Credit";
    } else if (totalAmountDueForDisplay === 0 && totalPaymentApplied === 0) {
      summary = "Paid (Zero Value)";
    } else {
      summary = "N/A";
    }
    
    if (outstandingBalance > 0 && totalPaymentApplied > 0) {
      summary = `Partial (${summary}) - Outstanding: ${outstandingBalance.toFixed(2)}`;
    } else if (outstandingBalance > 0 && totalPaymentApplied === 0) {
      summary = `Full Credit - Outstanding: ${outstandingBalance.toFixed(2)}`;
    }

    return summary;
  }, [parsedCashTendered, parsedChequeAmountPaid, parsedBankTransferAmountPaid, chequeNumber, bankTransferReference, changeGiven, outstandingBalance, totalAmountDueForDisplay, totalPaymentApplied]);

  const handlePrimaryAction = async () => {
    if (isReprintMode) {
      window.print();
      onOpenChange(false); 
      return;
    }

    if (onConfirmSale) {
      setIsProcessing(true);
      if (parsedChequeAmountPaid > 0 && !chequeNumber.trim()) {
        toast({
          variant: "destructive",
          title: "Cheque Number Required",
          description: "Please enter a cheque number if paying by cheque.",
        });
        setIsProcessing(false);
        return;
      }
      if (parsedBankTransferAmountPaid > 0 && !bankTransferBankName.trim() && !bankTransferReference.trim()) {
         toast({
          variant: "destructive",
          title: "Bank Details Required",
          description: "Bank Name or Reference Number is required for bank transfers.",
        });
        setIsProcessing(false);
        return;
      }
      if (outstandingBalance > 0 && !customerForDisplay) {
        toast({
          variant: "destructive",
          title: "Customer Required",
          description: "A customer must be selected for credit or partially paid sales."
        });
        setIsProcessing(false);
        return;
      }

      const saleData: Omit<Sale, 'id' | 'saleDate' | 'staffId' | 'items'> = {
        customerId: customerForDisplay?.id,
        customerName: customerForDisplay?.name,
        subTotal: subtotalToDisplay,
        discountPercentage: 0,
        discountAmount: discountAmountToDisplay,
        totalAmount: totalAmountDueForDisplay, 
        offerApplied: offerWasApplied, 
        
        paidAmountCash: parsedCashTendered > 0 ? parsedCashTendered : undefined,
        paidAmountCheque: parsedChequeAmountPaid > 0 ? parsedChequeAmountPaid : undefined,
        chequeDetails: parsedChequeAmountPaid > 0 ? {
          number: chequeNumber.trim(),
          bank: chequeBank.trim() || undefined,
          date: chequeDate,
          amount: parsedChequeAmountPaid
        } : undefined,
        paidAmountBankTransfer: parsedBankTransferAmountPaid > 0 ? parsedBankTransferAmountPaid : undefined,
        bankTransferDetails: parsedBankTransferAmountPaid > 0 ? {
            bankName: bankTransferBankName.trim() || undefined,
            referenceNumber: bankTransferReference.trim() || undefined,
            amount: parsedBankTransferAmountPaid
        } : undefined,
        
        totalAmountPaid: totalPaymentApplied,
        outstandingBalance: outstandingBalance,
        initialOutstandingBalance: outstandingBalance,
        changeGiven: changeGiven > 0 ? changeGiven : undefined,
        paymentSummary: getPaymentSummary(),
      };
      
      try {
        const newSale = await onConfirmSale(saleData);
        if (newSale) {
          setFinalSaleData(newSale);
        } else {
          setIsProcessing(false);
        }
      } catch (error) {
        console.error("Sale confirmation failed:", error);
        setIsProcessing(false);
      }
    }
  };
  
  const isPrimaryButtonDisabled = !isReprintMode && (
    itemsToDisplay.filter(item => !item.isOfferItem || (item.isOfferItem && item.quantity > 0)).length === 0 ||
    (outstandingBalance > 0 && !customerForDisplay) ||
    (parsedChequeAmountPaid > 0 && !chequeNumber.trim()) || 
    isProcessing
  );

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent 
        className={cn(
          "sm:max-w-lg flex flex-col",
          "print:shadow-none print:border-none print:max-w-full print:max-h-none print:m-0 print:p-0 print:h-auto print:overflow-visible",
          isOpen ? "max-h-[90vh]" : "" 
        )}
      >
        <DialogHeader className="print:hidden px-6 pt-6">
          <DialogTitle className="font-headline text-xl">
            {isReprintMode ? "View Invoice" : "Transaction Receipt & Payment"}
          </DialogTitle>
          <DialogDescription>
            {isReprintMode ? `Details for invoice ${displaySaleId}.` : "Finalize payment and print the receipt."}
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="flex-grow print:overflow-visible print:max-h-none print:h-auto">
          <div 
            id="bill-content" 
            className={cn(
                "p-6 bg-card text-card-foreground rounded-md",
                "print:p-4 print:bg-transparent print:text-black print:max-h-none print:overflow-visible"
            )}
          >
            <div className="text-center mb-6">
              <div className="flex justify-center mb-2">
                 <AppLogo size="md"/>
              </div>
              <p className="text-sm">4/1 Bujjampala, Dankotuwa</p>
              <p className="text-sm">Hotline: 077-3383721, 077-1066595</p>
            </div>

            <Separator className="my-4"/>

            <div className="text-xs mb-4">
              <p>Date: {transactionDate.toLocaleDateString()} {transactionDate.toLocaleTimeString()}</p>
              {displaySaleId && <p>Transaction ID: {displaySaleId}</p>}
              {customerForDisplay && <p>Customer: {customerForDisplay.name} {customerForDisplay.shopName ? `(${customerForDisplay.shopName})` : ''}</p>}
              <p>Served by: {saleForPrinting?.staffName || saleForPrinting?.staffId || 'Staff Member'}</p>
              {invoiceCloseDate && <p className="font-semibold">Invoice Closed: {invoiceCloseDate}</p>}
              {offerWasApplied && <p className="font-semibold text-green-600">Offer: Buy 12 Get 1 Free Applied!</p>}
            </div>

            <Separator className="my-4"/>
            
            <h3 className="font-semibold mb-2 text-sm">Order Summary:</h3>
            <div className="max-h-[150px] overflow-y-auto print:max-h-none print:overflow-visible mb-4">
              <table className="w-full text-xs print:w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-1 font-normal w-[35%]">Item</th>
                    <th className="text-center py-1 font-normal w-[10%]">Qty</th>
                    <th className="text-right py-1 font-normal w-[18%]">Price</th>
                    <th className="text-right py-1 font-normal w-[18%]">Disc. Price</th>
                    <th className="text-right py-1 font-normal w-[19%]">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {itemsToDisplay.map((item, index) => {
                    const originalPrice = item.price;
                    const hasDiscount = !item.isOfferItem && originalPrice > item.appliedPrice;

                    return (
                      <tr 
                        key={`${item.id}-${item.saleType}-${item.isOfferItem ? 'offer' : 'paid'}-${index}`} 
                        className="border-b border-dashed"
                      >
                        <td className="py-1.5 break-words print:break-all">
                          {item.name}
                          {item.isOfferItem && <Gift className="inline-block h-3 w-3 ml-1 text-green-600" />}
                        </td>
                        <td className="text-center py-1.5">{item.quantity}</td>
                        <td className={cn("text-right py-1.5", hasDiscount && "line-through text-muted-foreground")}>
                          {item.isOfferItem ? "FREE" : `Rs. ${originalPrice.toFixed(2)}`}
                        </td>
                        <td className="text-right py-1.5 font-medium">
                          {item.isOfferItem ? "-" : (hasDiscount ? `Rs. ${item.appliedPrice.toFixed(2)}` : "-")}
                        </td>
                        <td className="text-right py-1.5 font-semibold">
                          {item.isOfferItem ? "Rs. 0.00" : `Rs. ${(item.appliedPrice * item.quantity).toFixed(2)}`}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="space-y-1 text-xs mb-4">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>Rs. {subtotalToDisplay.toFixed(2)}</span>
              </div>
              {discountAmountToDisplay > 0 && (
                <div className="flex justify-between text-destructive">
                  <span>Total Discount:</span>
                  <span>- Rs. {discountAmountToDisplay.toFixed(2)}</span>
                </div>
              )}
              <Separator className="my-1"/>
              <div className="flex justify-between font-bold text-lg text-primary">
                <span>TOTAL AMOUNT DUE:</span>
                <span>Rs. {totalAmountDueForDisplay.toFixed(2)}</span>
              </div>
            </div>
            
            <Separator className="my-4"/>

            {!isReprintMode && (
                <div className="mb-4 space-y-4 print:hidden">
                    <h3 className="font-semibold text-sm">Payment Details:</h3>
                     {outstandingBalance > 0 && !customerForDisplay && !isReprintMode && (
                        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-destructive text-sm flex items-start gap-2">
                            <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                            <div>
                            <p className="font-semibold">Customer Required</p>
                            <p className="text-xs">A customer must be selected from the POS screen for credit or partially paid sales.</p>
                            </div>
                        </div>
                    )}
                    <div>
                        <Label htmlFor="cashTendered" className="text-xs">Cash Paid (Rs.)</Label>
                        <Input id="cashTendered" type="number" value={cashTendered} onChange={(e) => setCashTendered(e.target.value)} placeholder="0.00" className="h-10 mt-1" min="0" step="0.01" disabled={isProcessing}/>
                    </div>
                    <div className="border p-3 rounded-md space-y-3 bg-muted/50">
                        <p className="text-xs font-medium">Cheque Payment (Optional)</p>
                        <div>
                            <Label htmlFor="chequeAmountPaid" className="text-xs">Cheque Amount (Rs.)</Label>
                            <Input id="chequeAmountPaid" type="number" value={chequeAmountPaid} onChange={(e) => setChequeAmountPaid(e.target.value)} placeholder="0.00" className="h-10 mt-1 bg-background" min="0" step="0.01" disabled={isProcessing}/>
                        </div>
                        <div>
                            <Label htmlFor="chequeNumber" className="text-xs">Cheque Number</Label>
                            <Input id="chequeNumber" type="text" value={chequeNumber} onChange={(e) => setChequeNumber(e.target.value)} placeholder="Enter cheque number" className="h-10 mt-1 bg-background" disabled={isProcessing || parsedChequeAmountPaid <= 0} required={parsedChequeAmountPaid > 0}/>
                        </div>
                        <div>
                            <Label htmlFor="chequeBank" className="text-xs">Cheque Bank</Label>
                            <Input id="chequeBank" type="text" value={chequeBank} onChange={(e) => setChequeBank(e.target.value)} placeholder="Enter bank name" className="h-10 mt-1 bg-background" disabled={isProcessing || parsedChequeAmountPaid <= 0}/>
                        </div>
                        <div>
                            <Label htmlFor="chequeDate" className="text-xs">Cheque Date</Label>
                             <Popover>
                                <PopoverTrigger asChild>
                                <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal h-10 mt-1 bg-background", !chequeDate && "text-muted-foreground")} disabled={isProcessing || parsedChequeAmountPaid <= 0}>
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {chequeDate ? format(chequeDate, "PPP") : <span>Pick a date</span>}
                                </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={chequeDate} onSelect={setChequeDate} initialFocus disabled={isProcessing || parsedChequeAmountPaid <= 0}/></PopoverContent>
                            </Popover>
                        </div>
                    </div>
                     <div className="border p-3 rounded-md space-y-3 bg-muted/50">
                        <p className="text-xs font-medium">Bank Transfer (Optional)</p>
                        <div>
                            <Label htmlFor="bankTransferAmountPaid" className="text-xs">Transfer Amount (Rs.)</Label>
                            <Input id="bankTransferAmountPaid" type="number" value={bankTransferAmountPaid} onChange={(e) => setBankTransferAmountPaid(e.target.value)} placeholder="0.00" className="h-10 mt-1 bg-background" min="0" step="0.01" disabled={isProcessing}/>
                        </div>
                        <div>
                            <Label htmlFor="bankTransferBankName" className="text-xs">Bank Name</Label>
                            <Input id="bankTransferBankName" type="text" value={bankTransferBankName} onChange={(e) => setBankTransferBankName(e.target.value)} placeholder="Enter bank name" className="h-10 mt-1 bg-background" disabled={isProcessing || parsedBankTransferAmountPaid <= 0}/>
                        </div>
                        <div>
                            <Label htmlFor="bankTransferReference" className="text-xs">Reference Number</Label>
                            <Input id="bankTransferReference" type="text" value={bankTransferReference} onChange={(e) => setBankTransferReference(e.target.value)} placeholder="Enter reference number" className="h-10 mt-1 bg-background" disabled={isProcessing || parsedBankTransferAmountPaid <= 0}/>
                        </div>
                    </div>
                </div>
            )}

            <div className="space-y-1 text-xs mb-4">
              <h4 className="font-semibold text-sm mb-2 mt-2">Payment Summary:</h4>
              {isReprintMode && (
                <div className="space-y-2">
                  <div className="border-l-2 pl-2">
                      {(saleForPrinting?.paidAmountCash ?? 0) > 0 && <p>Initial Cash: {formatCurrency(saleForPrinting!.paidAmountCash!)}</p>}
                      {(saleForPrinting?.paidAmountCheque ?? 0) > 0 && <p>Initial Cheque: {formatCurrency(saleForPrinting!.paidAmountCheque!)} (#{saleForPrinting!.chequeDetails?.number})</p>}
                      {(saleForPrinting?.paidAmountBankTransfer ?? 0) > 0 && <p>Initial Bank Transfer: {formatCurrency(saleForPrinting!.paidAmountBankTransfer!)}</p>}
                      {(saleForPrinting?.changeGiven ?? 0) > 0 && <p className="text-green-600">Initial Change: {formatCurrency(saleForPrinting!.changeGiven!)}</p>}
                  </div>
                  {saleForPrinting?.additionalPayments?.map((p, i) => (
                    <div key={i} className="border-l-2 pl-2">
                      <p className="font-medium text-muted-foreground">{format(p.date, "PP, p")}</p>
                      <p>{p.method} Payment: {formatCurrency(p.amount)}</p>
                      {p.method === 'Cheque' && p.details && 'number' in p.details && <p className="text-muted-foreground text-[11px]">#{p.details.number}</p>}
                    </div>
                  ))}
                </div>
              )}

              <Separator className="my-2"/>
              <div className="flex justify-between font-semibold">
                <span>Total Paid:</span>
                <span>{formatCurrency(isReprintMode ? (saleForPrinting?.totalAmountPaid || 0) : totalPaymentApplied)}</span>
              </div>
              <div className={cn("flex justify-between font-bold", (isReprintMode ? (saleForPrinting?.outstandingBalance || 0) : outstandingBalance) > 0 ? "text-destructive" : "text-muted-foreground")}>
                <span>Balance Due:</span>
                <span>{formatCurrency(isReprintMode ? (saleForPrinting?.outstandingBalance || 0) : outstandingBalance)}</span>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground pt-1">
                  <span>Payment Summary:</span>
                  <span className="text-right">{isReprintMode ? saleForPrinting?.paymentSummary : getPaymentSummary()}</span>
              </div>
            </div>

            <p className="text-center text-xs mt-6">Thank you for your purchase!</p>
            <p className="text-center text-xs">Please come again.</p>
          </div>
        </ScrollArea>

        <DialogFooter className="mt-auto p-6 border-t print:hidden flex justify-end gap-2">
           <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isProcessing}>Cancel</Button>
           <Button onClick={handlePrimaryAction} disabled={isPrimaryButtonDisabled || isProcessing}>
             {isProcessing ? <><Banknote className="mr-2 h-4 w-4 animate-spin" /> Processing...</> : <><Printer className="mr-2 h-4 w-4" /> {isReprintMode ? "Print Receipt" : "Confirm & Print"}</>}
           </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
