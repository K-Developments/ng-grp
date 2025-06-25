
import { db, checkFirebase } from "./firebase";
import { 
  collection, 
  addDoc, 
  getDocs, 
  doc, 
  updateDoc, 
  deleteDoc, 
  query, 
  onSnapshot,
  getDoc,
  Timestamp
} from "firebase/firestore";
import { customerConverter, FirestoreCustomer, Customer } from "./types";

export const CustomerService = {
  async getAllCustomers(): Promise<Customer[]> {
    checkFirebase();
    const q = query(collection(db, 'customers')).withConverter(customerConverter);
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  },

  async getCustomerById(id: string): Promise<Customer | null> {
    checkFirebase();
    const docRef = doc(db, 'customers', id).withConverter(customerConverter);
    const snapshot = await getDoc(docRef);
    return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
  },

  async createCustomer(customerData: Omit<Customer, 'id'>): Promise<Customer> {
    checkFirebase();
    // Ensure timestamps are correctly handled if not already by the converter
    const dataWithTimestamps: FirestoreCustomer = {
      ...customerData,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };
    const docRef = await addDoc(
      collection(db, 'customers').withConverter(customerConverter),
      dataWithTimestamps // Use the dataWithTimestamps
    );
    // The fromFirestore converter in types.ts will handle converting Timestamps back to Dates
    // So, we return the customerData as is, plus the new ID.
    return { id: docRef.id, ...customerData };
  },

  async updateCustomer(id: string, customerData: Partial<Omit<Customer, 'id'>>): Promise<void> {
    checkFirebase();
    const docRef = doc(db, 'customers', id).withConverter(customerConverter);
    // The converter's toFirestore should handle the updatedAt timestamp
    await updateDoc(docRef, customerData as Partial<FirestoreCustomer>);
  },

  async deleteCustomer(id: string): Promise<void> {
    checkFirebase();
    const docRef = doc(db, 'customers', id);
    await deleteDoc(docRef);
  },

  subscribeToCustomers(callback: (customers: Customer[]) => void): () => void {
    checkFirebase();
    const q = query(collection(db, 'customers')).withConverter(customerConverter);
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const customers = snapshot.docs.map(docSnapshot => ({ // Renamed doc to docSnapshot to avoid conflict
        id: docSnapshot.id,
        ...docSnapshot.data()
      }));
      callback(customers);
    }, (error) => {
      console.error("Error subscribing to customers:", error);
      // Optionally, notify the user or trigger an error state in the app
    });
    return unsubscribe;
  }
};
