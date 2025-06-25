
import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, runTransaction, Timestamp, arrayUnion } from 'firebase/firestore';
import { saleConverter, type Sale, type Payment, type FirestorePayment, type ChequeInfo, type BankTransferInfo } from '@/lib/types';
import { getAuth } from "firebase-admin/auth";
import { adminApp } from '@/lib/firebase-admin'; // Ensure you have this

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const saleId = params.id;

  if (!saleId) {
    return NextResponse.json({ error: 'Sale ID is required' }, { status: 400 });
  }

  try {
    const paymentData = await request.json();
    const { paymentAmount, paymentMethod, paymentDate, notes, details, staffId } = paymentData;

    // Basic validation
    if (typeof paymentAmount !== 'number' || paymentAmount <= 0) {
      return NextResponse.json({ error: 'Invalid payment amount' }, { status: 400 });
    }
     if (!staffId) {
      return NextResponse.json({ error: 'Staff ID is required for payment record' }, { status: 400 });
    }

    const saleRef = doc(db, 'sales', saleId).withConverter(saleConverter);

    const updatedSaleData = await runTransaction(db, async (transaction) => {
        const saleDoc = await transaction.get(saleRef);
        if (!saleDoc.exists()) {
            throw new Error('Sale not found');
        }

        const currentSale = saleDoc.data();
        
        // This is the object that will be pushed to the Firestore array.
        // It must be clean of `undefined` values.
        const paymentForFirestore: Partial<FirestorePayment> = {
            amount: paymentAmount,
            method: paymentMethod,
            date: paymentDate ? Timestamp.fromDate(new Date(paymentDate)) : Timestamp.now(),
            staffId: staffId,
        };
        
        if (notes) {
            paymentForFirestore.notes = notes;
        }

        if (details) {
            // Firestore requires nested Timestamps to be explicitly created.
            // When details are stringified from client, date becomes an ISO string.
            if (paymentMethod === 'Cheque' && details.date) {
                paymentForFirestore.details = { 
                    ...details, 
                    date: Timestamp.fromDate(new Date(details.date)) 
                };
            } else {
                paymentForFirestore.details = details;
            }
        }
        
        const totalAmountPaid = (currentSale.totalAmountPaid || 0) + paymentAmount;
        const newOutstandingBalance = currentSale.totalAmount - totalAmountPaid;

        // --- Regenerate Payment Summary ---
        const allPayments: { method: string; amount: number; }[] = [];
        if (currentSale.paidAmountCash) allPayments.push({ method: 'Cash', amount: currentSale.paidAmountCash });
        if (currentSale.paidAmountCheque) allPayments.push({ method: 'Cheque', amount: currentSale.paidAmountCheque });
        if (currentSale.paidAmountBankTransfer) allPayments.push({ method: 'BankTransfer', amount: currentSale.paidAmountBankTransfer });
        currentSale.additionalPayments?.forEach(p => {
            allPayments.push({ method: p.method, amount: p.amount });
        });
        allPayments.push({ method: paymentMethod, amount: paymentAmount });

        const paymentByType = allPayments.reduce((acc, p) => {
            acc[p.method] = (acc[p.method] || 0) + p.amount;
            return acc;
        }, {} as Record<string, number>);

        const methodsUsed: string[] = [];
        if (paymentByType['Cash']) methodsUsed.push(`Cash (${paymentByType['Cash'].toFixed(2)})`);
        if (paymentByType['Cheque']) methodsUsed.push(`Cheque (${paymentByType['Cheque'].toFixed(2)})`);
        if (paymentByType['BankTransfer']) methodsUsed.push(`Bank Transfer (${paymentByType['BankTransfer'].toFixed(2)})`);
        
        let newPaymentSummary = "";
        if (methodsUsed.length > 1) {
            newPaymentSummary = `Split (${methodsUsed.join(' + ')})`;
        } else if (methodsUsed.length === 1) {
            newPaymentSummary = methodsUsed[0];
        } else {
            newPaymentSummary = "N/A";
        }

        if (newOutstandingBalance > 0) {
            newPaymentSummary = `Partial (${newPaymentSummary}) - Outstanding: ${newOutstandingBalance.toFixed(2)}`;
        }
        // --- End of Payment Summary Logic ---

        const updatedData = {
            totalAmountPaid,
            outstandingBalance: newOutstandingBalance < 0 ? 0 : newOutstandingBalance,
            additionalPayments: arrayUnion(paymentForFirestore),
            paymentSummary: newPaymentSummary, // Add the updated summary
            updatedAt: Timestamp.now()
        };
        
        transaction.update(saleRef, updatedData as any);

        // This is the object that will be returned to the client.
        // It should have JS Date objects.
        const newPaymentForClient: Partial<Payment> = {
            amount: paymentAmount,
            method: paymentMethod,
            date: paymentDate ? new Date(paymentDate) : new Date(),
            staffId: staffId,
        };
        if (notes) newPaymentForClient.notes = notes;
        if (details) newPaymentForClient.details = details;


        const finalSaleState: Sale = {
            ...currentSale,
            totalAmountPaid: updatedData.totalAmountPaid,
            outstandingBalance: updatedData.outstandingBalance,
            paymentSummary: updatedData.paymentSummary, // Return new summary to client
            additionalPayments: [...(currentSale.additionalPayments || []), newPaymentForClient as Payment]
        }
        return finalSaleState;
    });

    return NextResponse.json(updatedSaleData);

  } catch (error) {
    console.error(`Error adding payment to sale ${saleId}:`, error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: 'Failed to add payment', details: errorMessage }, { status: 500 });
  }
}
