
import { NextResponse, type NextRequest } from 'next/server';
import { addSale, getSales } from '@/lib/firestoreService';
import type { Sale, CartItem, ChequeInfo, BankTransferInfo } from '@/lib/types'; 

// GET /api/sales - Fetch all sales
export async function GET(request: NextRequest) {
  try {
    const sales = await getSales();
    return NextResponse.json(sales);
  } catch (error) {
    console.error('Error fetching sales:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: 'Failed to fetch sales', details: errorMessage }, { status: 500 });
  }
}

// POST /api/sales - Add a new sale and update stock
export async function POST(request: NextRequest) {
  try {
    const saleDataFromClient = await request.json();

    // Basic validation for core sale structure
    if (!saleDataFromClient || !Array.isArray(saleDataFromClient.items) || saleDataFromClient.items.length === 0) {
      return NextResponse.json({ error: 'Invalid sale data: Items are missing or empty.' }, { status: 400 });
    }
    if (typeof saleDataFromClient.totalAmount !== 'number' || 
        typeof saleDataFromClient.totalAmountPaid !== 'number' ||
        typeof saleDataFromClient.outstandingBalance !== 'number' ||
        typeof saleDataFromClient.paymentSummary !== 'string') {
      return NextResponse.json({ error: 'Invalid sale data: Missing core payment fields (totalAmount, totalAmountPaid, outstandingBalance, paymentSummary).' }, { status: 400 });
    }

    // Validate payment breakdown
    if (saleDataFromClient.paidAmountCash !== undefined && typeof saleDataFromClient.paidAmountCash !== 'number') {
        return NextResponse.json({ error: 'Invalid cash payment amount.' }, { status: 400 });
    }
    if (saleDataFromClient.paidAmountCheque !== undefined && typeof saleDataFromClient.paidAmountCheque !== 'number') {
        return NextResponse.json({ error: 'Invalid cheque payment amount.' }, { status: 400 });
    }
    if (saleDataFromClient.paidAmountBankTransfer !== undefined && typeof saleDataFromClient.paidAmountBankTransfer !== 'number') {
        return NextResponse.json({ error: 'Invalid bank transfer payment amount.' }, { status: 400 });
    }

    if (saleDataFromClient.paidAmountCheque > 0 && (!saleDataFromClient.chequeDetails || !saleDataFromClient.chequeDetails.number)) {
        return NextResponse.json({ error: 'Cheque number is required for cheque payments.' }, { status: 400 });
    }
    if (saleDataFromClient.chequeDetails && saleDataFromClient.chequeDetails.date && isNaN(new Date(saleDataFromClient.chequeDetails.date).getTime())) {
        return NextResponse.json({ error: 'Invalid cheque date provided.' }, { status: 400 });
    }
    if (saleDataFromClient.paidAmountBankTransfer > 0 && !saleDataFromClient.bankTransferDetails) {
        // Basic check, can be more granular (e.g. require bankName or referenceNumber)
        return NextResponse.json({ error: 'Bank transfer details are required for bank transfer payments.' }, { status: 400 });
    }


    const saleDate = saleDataFromClient.saleDate ? new Date(saleDataFromClient.saleDate) : new Date();
    
    let chequeDetailsForDb: ChequeInfo | undefined = undefined;
    if (saleDataFromClient.chequeDetails) {
        chequeDetailsForDb = {
            number: saleDataFromClient.chequeDetails.number,
            bank: saleDataFromClient.chequeDetails.bank,
            date: saleDataFromClient.chequeDetails.date ? new Date(saleDataFromClient.chequeDetails.date) : undefined,
            amount: saleDataFromClient.chequeDetails.amount,
        };
    }

    let bankTransferDetailsForDb: BankTransferInfo | undefined = undefined;
    if (saleDataFromClient.bankTransferDetails) {
        bankTransferDetailsForDb = {
            bankName: saleDataFromClient.bankTransferDetails.bankName,
            referenceNumber: saleDataFromClient.bankTransferDetails.referenceNumber,
            amount: saleDataFromClient.bankTransferDetails.amount,
        };
    }


    const salePayload = {
      customerId: saleDataFromClient.customerId,
      customerName: saleDataFromClient.customerName,
      items: saleDataFromClient.items as CartItem[],
      subTotal: saleDataFromClient.subTotal,
      discountPercentage: saleDataFromClient.discountPercentage,
      discountAmount: saleDataFromClient.discountAmount,
      totalAmount: saleDataFromClient.totalAmount, 

      paidAmountCash: saleDataFromClient.paidAmountCash,
      paidAmountCheque: saleDataFromClient.paidAmountCheque,
      chequeDetails: chequeDetailsForDb,
      paidAmountBankTransfer: saleDataFromClient.paidAmountBankTransfer,
      bankTransferDetails: bankTransferDetailsForDb,
      totalAmountPaid: saleDataFromClient.totalAmountPaid,
      outstandingBalance: saleDataFromClient.outstandingBalance,
      initialOutstandingBalance: saleDataFromClient.outstandingBalance,
      changeGiven: saleDataFromClient.changeGiven,
      paymentSummary: saleDataFromClient.paymentSummary,
      
      offerApplied: saleDataFromClient.offerApplied || false,
      saleDate: saleDate,
      staffId: saleDataFromClient.staffId || "staff001",
      staffName: saleDataFromClient.staffName,
      vehicleId: saleDataFromClient.vehicleId, 
    };

    const saleId = await addSale(salePayload);
    
    return NextResponse.json({ id: saleId, ...salePayload, saleDate: saleDate.toISOString() }, { status: 201 });

  } catch (error) {
    console.error('Error processing sale:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    if (errorMessage.includes("not found for stock update")) {
        return NextResponse.json({ error: 'Failed to process sale: Product not found for stock update.', details: errorMessage }, { status: 404 });
    }
    if (errorMessage.includes("Insufficient stock")) {
        return NextResponse.json({ error: 'Failed to process sale: Insufficient stock for one or more items.', details: errorMessage }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to process sale', details: errorMessage }, { status: 500 });
  }
}
