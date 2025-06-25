
import { NextResponse, type NextRequest } from 'next/server';
import { processReturnTransaction } from '@/lib/firestoreService';
import type { ChequeInfo, BankTransferInfo } from '@/lib/types';

interface ReturnRequestBody {
  saleId: string;
  returnedItems: {
    id: string; // This is productId
    saleType: 'retail' | 'wholesale';
    quantity: number; // Quantity being returned in this transaction
    isResellable: boolean;
    // Include all necessary fields for CartItem reconstruction for saving
    name: string;
    category: 'Yogurt' | 'Drink' | 'Ice Cream' | 'Dessert' | 'Curd' | 'Other';
    price: number;
    appliedPrice: number;
    sku?: string;
  }[];
  exchangedItems: {
    id: string;
    quantity: number;
     // Include all necessary fields for CartItem reconstruction for saving
    name: string;
    category: 'Yogurt' | 'Drink' | 'Ice Cream' | 'Dessert' | 'Curd' | 'Other';
    price: number;
    appliedPrice: number;
    sku?: string;
    saleType: 'retail' | 'wholesale';
  }[];
  staffId: string;
  customerId?: string;
  customerName?: string;
  settleOutstandingAmount?: number;
  refundAmount?: number;
  payment?: {
    amountPaid: number;
    paymentSummary: string;
    changeGiven?: number;
    chequeDetails?: ChequeInfo;
    bankTransferDetails?: BankTransferInfo;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { 
        saleId, 
        returnedItems, 
        exchangedItems,
        staffId,
        customerId,
        customerName,
        settleOutstandingAmount,
        refundAmount,
        payment
    }: ReturnRequestBody = await request.json();

    if (!saleId || !staffId) {
      return NextResponse.json({ error: 'Invalid request body. Missing required fields.' }, { status: 400 });
    }
     if (returnedItems.length === 0 && exchangedItems.length === 0) {
      return NextResponse.json({ error: 'Cannot process an empty transaction.' }, { status: 400 });
    }

    const { returnId, returnData } = await processReturnTransaction({
        saleId,
        returnedItems,
        exchangedItems,
        staffId,
        customerId,
        customerName,
        settleOutstandingAmount,
        refundAmount,
        payment,
    });


    return NextResponse.json({ 
        message: 'Return/Exchange processed successfully and stock updated.', 
        returnId,
        returnData 
    });

  } catch (error) {
    console.error('Error processing return/exchange:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: 'Failed to process return/exchange', details: errorMessage }, { status: 500 });
  }
}
