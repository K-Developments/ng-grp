
import { db, checkFirebase } from "./firebase";
import { Timestamp, collection, addDoc, getDocs, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { 
  stockTransactionConverter, 
  StockTransaction,
  FirestoreStockTransaction
} from "./types";

export const StockService = {
  async createTransaction(transaction: Omit<StockTransaction, 'id'>): Promise<string> {
    checkFirebase();
    const docRef = await addDoc(
      collection(db, 'stockTransactions').withConverter(stockTransactionConverter as any),
      transaction
    );
    return docRef.id;
  },

  async getAllTransactions(): Promise<StockTransaction[]> {
    checkFirebase();
    const q = query(
      collection(db, 'stockTransactions').withConverter(stockTransactionConverter as any),
      orderBy('transactionDate', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as StockTransaction);
  },

  async getTransactionsByProduct(productId: string): Promise<StockTransaction[]> {
    checkFirebase();
    const q = query(
      collection(db, 'stockTransactions').withConverter(stockTransactionConverter as any),
      where('productId', '==', productId),
      orderBy('transactionDate', 'desc')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as StockTransaction);
  },

  async getTransactionsByVehicleId(vehicleId: string): Promise<StockTransaction[]> {
    checkFirebase();
    const q = query(
      collection(db, 'stockTransactions').withConverter(stockTransactionConverter as any),
      where('vehicleId', '==', vehicleId)
    );
    
    const snapshot = await getDocs(q);
    const transactions = snapshot.docs.map(doc => doc.data() as StockTransaction);
    // Sorting on the client side to avoid needing a composite index
    return transactions.sort((a, b) => b.transactionDate.getTime() - a.transactionDate.getTime());
  },

  // Note: Real-time subscription might be intensive for all transactions.
  // Use with caution or with more specific queries if performance becomes an issue.
  subscribeToAllTransactions(
    callback: (transactions: StockTransaction[]) => void,
    onError?: (error: Error) => void
    ): () => void {
    checkFirebase();
    const q = query(
      collection(db, 'stockTransactions').withConverter(stockTransactionConverter as any),
      orderBy('transactionDate', 'desc')
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const transactions = snapshot.docs.map(doc => doc.data() as StockTransaction);
      callback(transactions);
    }, (error) => {
      console.error("Error subscribing to stock transactions:", error);
      if (onError) {
        onError(error);
      }
    });
    
    return unsubscribe;
  }
};
