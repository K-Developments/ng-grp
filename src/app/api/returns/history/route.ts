import { NextResponse, type NextRequest } from 'next/server';
import { getReturns } from '@/lib/firestoreService';

// GET /api/returns/history - Fetch all return transactions
export async function GET(request: NextRequest) {
  try {
    const returns = await getReturns();
    return NextResponse.json(returns);
  } catch (error) {
    console.error('Error fetching return transactions:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: 'Failed to fetch return transactions', details: errorMessage }, { status: 500 });
  }
}
