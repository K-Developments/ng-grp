"use client";

import type { VehicleReportItem } from "@/lib/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DownloadCloud, FileText } from "lucide-react";
import { format } from 'date-fns';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

interface VehicleReportDisplayProps {
  data: VehicleReportItem[];
  vehicleNumber: string;
  reportDate?: Date;
}

interface jsPDFWithAutoTable extends jsPDF {
  autoTable: (options: any) => jsPDF;
}

export function VehicleReportDisplay({ data, vehicleNumber, reportDate }: VehicleReportDisplayProps) {
    
  const totals = {
    loaded: data.reduce((sum, item) => sum + item.totalLoaded, 0),
    unloaded: data.reduce((sum, item) => sum + item.totalUnloaded, 0),
    netChange: data.reduce((sum, item) => sum + item.netChange, 0)
  };

  const handleExportExcel = () => {
    const dataToExport = data.map(item => ({
        'Product Name': item.productName,
        'SKU': item.productSku || 'N/A',
        'Total Loaded': item.totalLoaded,
        'Total Unloaded': item.totalUnloaded,
        'Net Change': item.netChange
    }));
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    XLSX.utils.sheet_add_aoa(worksheet, [
        ["", "", "Total Loaded", "Total Unloaded", "Net Change"],
        ["", "", totals.loaded, totals.unloaded, totals.netChange]
    ], { origin: -1 });

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `Vehicle Report ${vehicleNumber}`);
    XLSX.writeFile(workbook, `Vehicle_Report_${vehicleNumber}_${format(new Date(), 'yyyyMMdd')}.xlsx`);
  };

  const handleExportPDF = () => {
    const doc = new jsPDF() as jsPDFWithAutoTable;
    doc.text(`Vehicle Report for: ${vehicleNumber}`, 14, 16);
    doc.setFontSize(10);
    doc.text(`Date: ${reportDate ? format(reportDate, 'PPP') : 'N/A'}`, 14, 22);

    doc.autoTable({
        startY: 30,
        head: [['Product Name', 'SKU', 'Total Loaded', 'Total Unloaded', 'Net Change']],
        body: data.map(item => [
            item.productName,
            item.productSku || 'N/A',
            item.totalLoaded,
            item.totalUnloaded,
            item.netChange
        ]),
        foot: [[
            'Totals', '', totals.loaded, totals.unloaded, totals.netChange
        ]],
        styles: { fontSize: 8 },
        headStyles: { fillColor: [30, 18, 57] },
        footStyles: { fillColor: [240, 240, 240], textColor: [0,0,0], fontStyle: 'bold' }
    });

    doc.save(`Vehicle_Report_${vehicleNumber}_${format(new Date(), 'yyyyMMdd')}.pdf`);
  };
    
  if (data.length === 0) {
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Report for {vehicleNumber}</CardTitle>
           <CardDescription>
            Date: {reportDate ? format(reportDate, 'PPP') : 'N/A'}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center py-12 text-muted-foreground">
          <p>No vehicle transactions found for the selected period.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
                <CardTitle className="font-headline">Report for: {vehicleNumber}</CardTitle>
                <CardDescription>
                    Date: {reportDate ? format(reportDate, 'PPP') : 'N/A'}
                </CardDescription>
            </div>
            <div className="flex gap-2">
                <Button onClick={handleExportExcel} variant="outline" size="sm"><DownloadCloud className="mr-2 h-4 w-4" /> Export Excel</Button>
                <Button onClick={handleExportPDF} variant="outline" size="sm"><FileText className="mr-2 h-4 w-4" /> Export PDF</Button>
            </div>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[calc(100vh-32rem)]">
          <Table>
            <TableHeader className="sticky top-0 bg-card z-10">
              <TableRow>
                <TableHead>Product Name</TableHead>
                <TableHead className="w-[120px]">SKU</TableHead>
                <TableHead className="w-[150px] text-right">Total Loaded</TableHead>
                <TableHead className="w-[150px] text-right">Total Unloaded</TableHead>
                <TableHead className="w-[150px] text-right">Net Change</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((item) => (
                <TableRow key={item.productId}>
                  <TableCell className="font-medium">{item.productName}</TableCell>
                  <TableCell className="font-mono text-xs">{item.productSku || 'N/A'}</TableCell>
                  <TableCell className="text-right text-green-600 font-semibold">+{item.totalLoaded}</TableCell>
                  <TableCell className="text-right text-destructive font-semibold">-{item.totalUnloaded}</TableCell>
                  <TableCell className="text-right font-bold">{item.netChange > 0 ? `+${item.netChange}` : item.netChange}</TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
                <TableRow>
                    <TableCell colSpan={2} className="font-bold">Totals</TableCell>
                    <TableCell className="text-right font-bold text-green-600">+{totals.loaded}</TableCell>
                    <TableCell className="text-right font-bold text-destructive">-{totals.unloaded}</TableCell>
                    <TableCell className="text-right font-bold">{totals.netChange > 0 ? `+${totals.netChange}` : totals.netChange}</TableCell>
                </TableRow>
            </TableFooter>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
