
"use client";

import React, { useState, useEffect, useMemo } from "react";
import { CalendarClock, FileText, DownloadCloud, ReceiptText, Banknote, Building, Newspaper, CreditCard, AlertTriangle, ArrowDown, ArrowUp } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useAuth } from "@/contexts/AuthContext";
import { AccessDenied } from "@/components/AccessDenied";
import { useRouter } from "next/navigation";
import { GlobalPreloaderScreen } from "@/components/GlobalPreloaderScreen";
import type { Sale, DayEndReportSummary, ReturnTransaction } from "@/lib/types";
import { format, startOfDay, endOfDay, isSameDay } from "date-fns";
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { cn } from "@/lib/utils";
import { useSalesData } from "@/hooks/useSalesData"; 
import { useReturns } from "@/hooks/useReturns";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";

const formatCurrency = (amount: number | undefined): string => {
  if (amount === undefined || isNaN(amount)) return "Rs. 0.00";
  const rounded = Math.round((amount + Number.EPSILON) * 100) / 100; // Proper rounding
  return new Intl.NumberFormat('en-LK', { 
    style: 'currency', 
    currency: 'LKR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2 
  }).format(rounded).replace("LKR", "Rs.");
};

interface jsPDFWithAutoTable extends jsPDF {
  autoTable: (options: any) => jsPDF;
}

export default function DayEndReportPage() {
  const { currentUser } = useAuth();
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [reportSummary, setReportSummary] = useState<DayEndReportSummary | null>(null);

  const { sales: allSales, isLoading: isLoadingSales, error: salesError } = useSalesData(true); 
  const { returns, isLoading: isLoadingReturns, error: returnsError } = useReturns();

  useEffect(() => {
    if (!currentUser) {
      router.replace("/");
      return;
    }
    if (currentUser.role !== "admin") {
      router.replace(currentUser.role === "cashier" ? "/app/sales" : "/app/dashboard");
    }
  }, [currentUser, router]);

  useEffect(() => {
    if (selectedDate && !isLoadingSales && allSales && !isLoadingReturns && returns) {
      const salesToday = allSales.filter(s => isSameDay(s.saleDate, selectedDate));
      const returnsToday = returns.filter(r => isSameDay(r.returnDate, selectedDate));
      const salesBeforeToday = allSales.filter(s => !isSameDay(s.saleDate, selectedDate));

      // --- Revenue Calculations ---
      const grossSalesToday = salesToday.reduce((sum, s) => sum + s.totalAmount, 0);
      
      let refundsForTodaySales = 0;
      let refundsForPastSales = 0;
      returnsToday.forEach(r => {
        const originalSale = allSales.find(s => s.id === r.originalSaleId);
        if (originalSale && isSameDay(originalSale.saleDate, selectedDate)) {
            refundsForTodaySales += r.refundAmount || 0;
        } else {
            refundsForPastSales += r.refundAmount || 0;
        }
      });
      const totalRefundsToday = refundsForTodaySales + refundsForPastSales;
      const netSalesToday = grossSalesToday - refundsForTodaySales;

      // --- Collections (Cash/Cheque/Transfer IN) ---
      let totalCashIn = 0;
      let totalChequeIn = 0;
      let totalBankTransferIn = 0;
      let totalChangeGiven = 0;
      const collectedCheques: string[] = [];
      const collectedTransfers: string[] = [];

      salesToday.forEach(sale => {
          if(sale.paidAmountCash) totalCashIn += sale.paidAmountCash;
          if(sale.paidAmountCheque) {
              totalChequeIn += sale.paidAmountCheque;
              if(sale.chequeDetails?.number) collectedCheques.push(sale.chequeDetails.number);
          }
          if(sale.paidAmountBankTransfer) {
              totalBankTransferIn += sale.paidAmountBankTransfer;
              if(sale.bankTransferDetails?.referenceNumber) collectedTransfers.push(sale.bankTransferDetails.referenceNumber);
          }
          if(sale.changeGiven) totalChangeGiven += sale.changeGiven;
      });

      salesBeforeToday.forEach(sale => {
          sale.additionalPayments?.forEach(p => {
              if(isSameDay(p.date, selectedDate)) {
                  if(p.method === 'Cash') totalCashIn += p.amount;
                  if(p.method === 'Cheque') {
                      totalChequeIn += p.amount;
                      if(p.details && 'number' in p.details && p.details.number) collectedCheques.push(p.details.number);
                  }
                  if(p.method === 'BankTransfer') {
                      totalBankTransferIn += p.amount;
                      if(p.details && 'referenceNumber' in p.details && p.details.referenceNumber) collectedTransfers.push(p.details.referenceNumber);
                  }
              }
          });
      });

      // --- New, more robust credit calculation ---
      const totalOutstandingFromToday = salesToday.reduce((sum, s) => sum + (s.outstandingBalance || 0), 0);
      const totalInitialCreditIssuedToday = salesToday.reduce((sum, s) => sum + (s.initialOutstandingBalance || 0), 0);
      const totalPaidAgainstCreditToday = totalInitialCreditIssuedToday - totalOutstandingFromToday;
      const creditSalesCount = salesToday.filter(s => s.initialOutstandingBalance && s.initialOutstandingBalance > 0).length;

      // --- Final Summary Object ---
      setReportSummary({
        reportDate: selectedDate,
        totalTransactions: salesToday.length,
        grossSalesValue: grossSalesToday,
        refundsForTodaySales,
        refundsForPastSales,
        netSalesValue: netSalesToday,
        totalCashIn,
        totalChequeIn,
        totalBankTransferIn,
        totalChangeGiven,
        totalRefundsPaidToday: totalRefundsToday,
        netCashInHand: totalCashIn - totalChangeGiven - totalRefundsToday, // Assumes refunds paid in cash
        newCreditIssued: totalInitialCreditIssuedToday,
        paidAgainstNewCredit: totalPaidAgainstCreditToday,
        netOutstandingFromToday: totalOutstandingFromToday,
        chequeNumbers: [...new Set(collectedCheques)],
        bankTransferRefs: [...new Set(collectedTransfers)],
        creditSalesCount: creditSalesCount,
      });

    } else {
      setReportSummary(null);
    }
  }, [selectedDate, allSales, isLoadingSales, returns, isLoadingReturns]);

  const handleExportPDF = () => {
    if (!reportSummary || !selectedDate) return;
    const doc = new jsPDF() as jsPDFWithAutoTable;
    const reportDateFormatted = format(selectedDate, "PPP");

    doc.setFontSize(18);
    doc.text("Day End Report", 105, 20, { align: "center" });
    doc.setFontSize(12);
    doc.text(`Date: ${reportDateFormatted}`, 105, 30, { align: "center" });

    let yPos = 45;
    const lineSpacing = 7;
    const sectionSpacing = 10;
    
    const tableBody = [
        ['Gross Sales Today', formatCurrency(reportSummary.grossSalesValue)],
        ["Refunds for Today's Sales", formatCurrency(reportSummary.refundsForTodaySales)],
        [{ content: 'Net Sales Value', styles: { fontStyle: 'bold' } }, { content: formatCurrency(reportSummary.netSalesValue), styles: { fontStyle: 'bold' } }],
        [' ', ' '],
        ['Total Cash In', formatCurrency(reportSummary.totalCashIn)],
        ['Total Cheque In', formatCurrency(reportSummary.totalChequeIn)],
        ['Total Bank Transfer In', formatCurrency(reportSummary.totalBankTransferIn)],
        ['Less: Change Given', formatCurrency(reportSummary.totalChangeGiven)],
        ['Less: Total Refunds Paid', formatCurrency(reportSummary.totalRefundsPaidToday)],
        [{ content: 'Net Cash In Hand', styles: { fontStyle: 'bold' } }, { content: formatCurrency(reportSummary.netCashInHand), styles: { fontStyle: 'bold' } }],
        [' ', ' '],
        ['New Credit Issued Today', formatCurrency(reportSummary.newCreditIssued)],
        ["Paid Against Today's Credit", formatCurrency(reportSummary.paidAgainstNewCredit)],
        [{ content: 'Net Outstanding From Today', styles: { fontStyle: 'bold' } }, { content: formatCurrency(reportSummary.netOutstandingFromToday), styles: { fontStyle: 'bold' } }],
    ];

    doc.autoTable({
        startY: yPos,
        head: [['Financial Summary', 'Amount']],
        body: tableBody,
        theme: 'striped',
        headStyles: { fillColor: [30, 18, 57] },
        columnStyles: { 1: { halign: 'right' } }
    });

    yPos = doc.autoTable.previous.finalY + sectionSpacing;

    if (reportSummary.chequeNumbers.length > 0 || reportSummary.bankTransferRefs.length > 0) {
        doc.setFontSize(14);
        doc.text("Collection Details", 14, yPos);
        yPos += lineSpacing;
        doc.setFontSize(10);
        if (reportSummary.chequeNumbers.length > 0) {
            doc.text(`Collected Cheque Numbers: ${reportSummary.chequeNumbers.join(', ')}`, 14, yPos);
            yPos += lineSpacing;
        }
        if (reportSummary.bankTransferRefs.length > 0) {
            doc.text(`Collected Bank Transfer Refs: ${reportSummary.bankTransferRefs.join(', ')}`, 14, yPos);
        }
    }
    
    doc.save(`Day_End_Report_${format(selectedDate, "yyyy-MM-dd")}.pdf`);
  };

  const reportActions = (
    <div className="flex flex-col sm:flex-row gap-2 items-center">
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant={"outline"}
            className={cn(
              "w-[220px] justify-start text-left font-normal h-10",
              !selectedDate && "text-muted-foreground"
            )}
          >
            <CalendarClock className="mr-2 h-4 w-4" />
            {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            initialFocus
            disabled={(date) => date > new Date() || date < new Date("2000-01-01")}
          />
        </PopoverContent>
      </Popover>
      <Button onClick={handleExportPDF} variant="outline" size="sm" disabled={!reportSummary || isLoadingSales || isLoadingReturns}>
        <DownloadCloud className="mr-2 h-4 w-4" /> Export PDF
      </Button>
    </div>
  );

  if (!currentUser) {
    return <GlobalPreloaderScreen message="Loading report..." />;
  }
  if (currentUser.role !== "admin") {
    return <AccessDenied message="Day End reports are not available for your role. Redirecting..." />;
  }

  if ((isLoadingSales || isLoadingReturns) && !reportSummary) {
    return <GlobalPreloaderScreen message="Fetching report data..." />
  }

  return (
    <>
      <PageHeader 
        title="Day End Report" 
        description="Summary of daily sales transactions and financial totals."
        icon={FileText}
        action={reportActions}
      />

      {(salesError || returnsError) && (
        <Alert variant="destructive" className="mb-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error Loading Data</AlertTitle>
          <AlertDescription>{salesError || returnsError}</AlertDescription>
        </Alert>
      )}

      {reportSummary ? (
        <div className="space-y-6">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="font-headline">Report for: {selectedDate ? format(selectedDate, "PPP") : "N/A"}</CardTitle>
              <CardDescription>
                <span className="font-medium">Total Transactions: {reportSummary.totalTransactions}</span>
              </CardDescription>
            </CardHeader>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Cash Flow Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2"><Banknote className="h-5 w-5"/>Cash Flow</CardTitle>
                <CardDescription>Summary of cash movements</CardDescription>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <p className="flex justify-between"><span>Total Cash In:</span> <span className="font-semibold text-green-600 flex items-center gap-1"><ArrowUp className="h-3 w-3"/>{formatCurrency(reportSummary.totalCashIn)}</span></p>
                <p className="flex justify-between"><span>Change Given:</span> <span className="font-semibold text-destructive flex items-center gap-1"><ArrowDown className="h-3 w-3"/>{formatCurrency(reportSummary.totalChangeGiven)}</span></p>
                <p className="flex justify-between"><span>Refunds Paid:</span> <span className="font-semibold text-destructive flex items-center gap-1"><ArrowDown className="h-3 w-3"/>{formatCurrency(reportSummary.totalRefundsPaidToday)}</span></p>
                <Separator className="my-2"/>
                <p className="flex justify-between font-bold text-base"><span>Net Cash:</span> <span>{formatCurrency(reportSummary.netCashInHand)}</span></p>
              </CardContent>
            </Card>

            {/* Other Collections Card */}
             <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2"><Building className="h-5 w-5"/>Other Collections</CardTitle>
                <CardDescription>Cheques & Bank Transfers</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p className="flex justify-between"><span>Total Cheque In:</span> <span className="font-semibold">{formatCurrency(reportSummary.totalChequeIn)}</span></p>
                {reportSummary.chequeNumbers.length > 0 && <p className="text-xs text-muted-foreground">Cheque Nos: {reportSummary.chequeNumbers.join(', ')}</p>}
                <Separator className="my-2"/>
                <p className="flex justify-between"><span>Total Bank Transfer In:</span> <span className="font-semibold">{formatCurrency(reportSummary.totalBankTransferIn)}</span></p>
                {reportSummary.bankTransferRefs.length > 0 && <p className="text-xs text-muted-foreground">Ref Nos: {reportSummary.bankTransferRefs.join(', ')}</p>}
              </CardContent>
            </Card>
            
            {/* Credit Summary Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2"><CreditCard className="h-5 w-5"/>Credit Summary</CardTitle>
                <CardDescription>New credit issued today</CardDescription>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <p>Credit Sales: <span className="font-semibold">{reportSummary.creditSalesCount} transactions</span></p>
                <p className="flex justify-between"><span>New Credit Issued:</span> <span className="font-semibold">{formatCurrency(reportSummary.newCreditIssued)}</span></p>
                <p className="flex justify-between"><span>Paid Against Credit:</span> <span className="font-semibold text-green-600">{formatCurrency(reportSummary.paidAgainstNewCredit)}</span></p>
                <Separator className="my-2"/>
                <p className="flex justify-between font-bold text-base"><span>Net Outstanding:</span> <span className="text-destructive">{formatCurrency(reportSummary.netOutstandingFromToday)}</span></p>
              </CardContent>
            </Card>
          </div>

          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="font-headline">Financial Overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-md">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
                    <p className="flex justify-between"><span>Gross Sales Value:</span> <strong className="text-right">{formatCurrency(reportSummary.grossSalesValue)}</strong></p>
                    <p className="flex justify-between text-blue-600"><span>Total Collections:</span> <strong className="text-right">{formatCurrency(reportSummary.totalCashIn + reportSummary.totalChequeIn + reportSummary.totalBankTransferIn)}</strong></p>
                    <p className="flex justify-between"><span>Refunds on Today's Sales:</span> <strong className="text-right text-orange-600">{formatCurrency(reportSummary.refundsForTodaySales)}</strong></p>
                    <p className="flex justify-between text-destructive"><span>Total Refunds Paid Out:</span> <strong className="text-right">{formatCurrency(reportSummary.totalRefundsPaidToday)}</strong></p>
                    <p className="flex justify-between font-bold text-primary text-lg border-t pt-2 mt-2"><span>Net Sales Value:</span> <strong className="text-right">{formatCurrency(reportSummary.netSalesValue)}</strong></p>
                    <p className="flex justify-between font-bold text-primary text-lg border-t pt-2 mt-2"><span>Net Cash In Hand:</span> <strong className="text-right">{formatCurrency(reportSummary.netCashInHand)}</strong></p>
                </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="font-headline">No Data</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground flex items-center">
              <ReceiptText className="mr-2 h-5 w-5" />
              {selectedDate ? `No sales transactions found for ${format(selectedDate, "PPP")}.` : "Please select a date to view the report."}
            </p>
          </CardContent>
        </Card>
      )}
    </>
  );
}
