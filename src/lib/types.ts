
// location src/lib/types.ts
import { Timestamp, DocumentReference } from 'firebase/firestore';

// Base Interfaces
export interface Product {
  id: string;
  name: string;
  category: "Yogurt" | "Drink" | "Ice Cream" | "Dessert" | "Curd" | "Other";
  price: number;
  wholesalePrice?: number;
  stock: number;
  imageUrl?: string;
  description?: string;
  sku?: string;
  reorderLevel?: number;
  aiHint?: string;
}

export interface Customer {
  id: string;
  avatar?: string;
  name: string;
  phone: string;
  address?: string;
  shopName?: string;
}

export interface CartItem {
  id: string; // Product ID
  quantity: number;
  appliedPrice: number; // Price after any sale-specific adjustments (usually same as original or wholesale)
  saleType: 'retail' | 'wholesale';
  
  // Denormalized product details at the time of sale
  name: string; 
  category: Product["category"];
  price: number; // Original retail price of the product at time of sale
  sku?: string; // Original SKU
  imageUrl?: string; // Original Image URL
  
  isOfferItem?: boolean; // Added for "Buy 12 Get 1 Free"
  returnedQuantity?: number;
}

export interface ChequeInfo {
  number?: string;
  bank?: string;
  date?: Date; 
  amount?: number; 
}

export interface FirestoreChequeInfo extends Omit<ChequeInfo, 'date' | 'amount'> {
  date?: Timestamp; 
  amount?: number;
}

export interface BankTransferInfo {
  bankName?: string;
  referenceNumber?: string;
  amount?: number;
}

export interface FirestoreBankTransferInfo extends Omit<BankTransferInfo, 'amount'> {
   amount?: number;
}

export interface Payment {
  amount: number;
  method: 'Cash' | 'Cheque' | 'BankTransfer' | 'ReturnCredit';
  date: Date;
  notes?: string;
  details?: ChequeInfo | BankTransferInfo;
  staffId: string;
}

export interface FirestorePayment extends Omit<Payment, 'date'> {
  date: Timestamp;
}

export interface Sale {
  id: string;
  customerId?: string;
  customerName?: string;
  items: CartItem[];
  subTotal: number;
  discountPercentage: number;
  discountAmount: number;
  totalAmount: number; // Total amount due for the sale
  
  paidAmountCash?: number;
  paidAmountCheque?: number;
  chequeDetails?: ChequeInfo; 
  paidAmountBankTransfer?: number;
  bankTransferDetails?: BankTransferInfo;

  additionalPayments?: Payment[];

  totalAmountPaid: number; // Sum of all payments made
  outstandingBalance: number; // totalAmount - totalAmountPaid (if positive, amount due)
  initialOutstandingBalance?: number;
  changeGiven?: number; // If cash_tendered > totalAmount and paid fully by cash (considering cash was the only or last part of payment)

  paymentSummary: string; // e.g., "Cash", "Cheque (123)", "Partial (Cash + Cheque)", "Full Credit"
  
  saleDate: Date;
  staffId: string;
  staffName?: string;
  offerApplied?: boolean;
  vehicleId?: string;
  updatedAt?: Date;
}

// Stock Transaction Types
export type StockTransactionType =
  | "ADD_STOCK_INVENTORY"
  | "LOAD_TO_VEHICLE"
  | "UNLOAD_FROM_VEHICLE"
  | "REMOVE_STOCK_WASTAGE"
  | "STOCK_ADJUSTMENT_MANUAL";

export interface StockTransaction {
  id: string;
  productId: string;
  productName: string;
  productSku?: string;
  type: StockTransactionType;
  quantity: number;
  previousStock: number;
  newStock: number;
  transactionDate: Date;
  notes?: string;
  vehicleId?: string;
  userId?: string;
}

export interface Vehicle {
  id: string;
  vehicleNumber: string;
  driverName?: string;
  notes?: string;
}

export interface ReturnTransaction {
  id: string; // The generated ID like "return-06.25-1"
  originalSaleId: string;
  returnDate: Date;
  staffId: string;
  customerId?: string;
  customerName?: string;
  returnedItems: CartItem[];
  exchangedItems: CartItem[];
  notes?: string;
  // Fields for payment made during exchange
  amountPaid?: number;
  paymentSummary?: string;
  chequeDetails?: ChequeInfo;
  bankTransferDetails?: BankTransferInfo;
  changeGiven?: number;
  // New fields for credit settlement
  settleOutstandingAmount?: number;
  refundAmount?: number;
}

// Firestore-specific types
export interface FirestoreProduct extends Omit<Product, 'id'> {
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface FirestoreCustomer extends Omit<Customer, 'id'> {
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface FirestoreVehicle extends Omit<Vehicle, 'id'> {
    createdAt?: Timestamp;
    updatedAt?: Timestamp;
}

// Stored in Firestore for each item in a sale
export interface FirestoreCartItem {
  productRef: string | DocumentReference; // Can accept a string path or a DocumentReference
  quantity: number;
  appliedPrice: number;
  saleType: 'retail' | 'wholesale';
  
  // Denormalized fields stored at the time of sale for historical accuracy
  productName: string; 
  productCategory: Product["category"];
  productPrice: number; // Original retail price of the product at time of sale
  productSku?: string; // Original SKU at time of sale
  
  isOfferItem?: boolean;
  returnedQuantity?: number;
}

export interface FirestoreSale extends Omit<Sale, 'id' | 'saleDate' | 'items' | 'chequeDetails' | 'bankTransferDetails' | 'additionalPayments' | 'updatedAt' | 'initialOutstandingBalance'> {
  items: FirestoreCartItem[];
  saleDate: Timestamp;
  initialOutstandingBalance?: number;
  chequeDetails?: FirestoreChequeInfo;
  bankTransferDetails?: FirestoreBankTransferInfo;
  additionalPayments?: FirestorePayment[];
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  offerApplied?: boolean;
  vehicleId?: string;
}

export interface FirestoreStockTransaction {
  productId: string;
  productName: string;
  productSku?: string;
  type: StockTransactionType;
  quantity: number;
  previousStock: number;
  newStock: number;
  transactionDate: Timestamp;
  notes?: string;
  vehicleId?: string;
  userId?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface FirestoreUser extends Omit<User, 'id'> {
    createdAt?: Timestamp;
    updatedAt?: Timestamp;
}

export interface FirestoreReturnTransaction extends Omit<ReturnTransaction, 'id' | 'returnDate' | 'returnedItems' | 'exchangedItems' | 'chequeDetails' | 'bankTransferDetails'> {
  returnDate: Timestamp;
  createdAt: Timestamp;
  returnedItems: FirestoreCartItem[];
  exchangedItems: FirestoreCartItem[];
  // Fields for payment made during exchange
  amountPaid?: number;
  paymentSummary?: string;
  chequeDetails?: FirestoreChequeInfo;
  bankTransferDetails?: FirestoreBankTransferInfo;
  changeGiven?: number;
  settleOutstandingAmount?: number;
  refundAmount?: number;
}


// Data Converters
export const productConverter = {
  toFirestore: (product: FirestoreProduct): Partial<FirestoreProduct> => {
    const firestoreProduct: Partial<FirestoreProduct> = {
      name: product.name,
      category: product.category,
      price: product.price,
      stock: product.stock,
      updatedAt: Timestamp.now(),
    };

    if (product.wholesalePrice !== undefined) firestoreProduct.wholesalePrice = product.wholesalePrice;
    if (product.imageUrl) firestoreProduct.imageUrl = product.imageUrl;
    if (product.description) firestoreProduct.description = product.description;
    if (product.sku) firestoreProduct.sku = product.sku;
    if (product.reorderLevel !== undefined) firestoreProduct.reorderLevel = product.reorderLevel;
    if (product.aiHint) firestoreProduct.aiHint = product.aiHint;
    if (!product.createdAt) firestoreProduct.createdAt = Timestamp.now();

    return firestoreProduct;
  },
  fromFirestore: (snapshot: any, options: any): Product => {
    const data = snapshot.data(options);
    return {
      id: snapshot.id,
      name: data.name,
      category: data.category,
      price: data.price,
      wholesalePrice: data.wholesalePrice,
      stock: data.stock,
      imageUrl: data.imageUrl,
      description: data.description,
      sku: data.sku,
      reorderLevel: data.reorderLevel,
      aiHint: data.aiHint
    };
  }
};

export const customerConverter = {
  toFirestore: (customer: FirestoreCustomer): Partial<FirestoreCustomer> => {
    const firestoreCustomer: Partial<FirestoreCustomer> = {
      name: customer.name,
      phone: customer.phone,
      updatedAt: Timestamp.now(),
    };

    if (customer.avatar) firestoreCustomer.avatar = customer.avatar;
    if (customer.address) firestoreCustomer.address = customer.address;
    if (customer.shopName) firestoreCustomer.shopName = customer.shopName;
    if (!customer.createdAt) firestoreCustomer.createdAt = Timestamp.now();

    return firestoreCustomer;
  },
  fromFirestore: (snapshot: any, options: any): Customer => {
    const data = snapshot.data(options);
    return {
      id: snapshot.id,
      name: data.name,
      phone: data.phone,
      avatar: data.avatar,
      address: data.address,
      shopName: data.shopName
    };
  }
};

export const vehicleConverter = {
    toFirestore: (vehicle: FirestoreVehicle): Partial<FirestoreVehicle> => {
        const firestoreVehicle: Partial<FirestoreVehicle> = {
            vehicleNumber: vehicle.vehicleNumber,
            updatedAt: Timestamp.now(),
        };
        if (vehicle.driverName) firestoreVehicle.driverName = vehicle.driverName;
        if (vehicle.notes) firestoreVehicle.notes = vehicle.notes;
        if (!vehicle.createdAt) firestoreVehicle.createdAt = Timestamp.now();
        return firestoreVehicle;
    },
    fromFirestore: (snapshot: any, options: any): Vehicle => {
        const data = snapshot.data(options);
        return {
            id: snapshot.id,
            vehicleNumber: data.vehicleNumber,
            driverName: data.driverName,
            notes: data.notes
        };
    }
};

export const saleConverter = {
  toFirestore: (sale: FirestoreSale): Partial<FirestoreSale> => {
    const firestoreSale: Partial<FirestoreSale> = {
      items: sale.items,
      subTotal: sale.subTotal,
      discountPercentage: sale.discountPercentage,
      discountAmount: sale.discountAmount,
      totalAmount: sale.totalAmount, // Amount due
      
      paidAmountCash: sale.paidAmountCash,
      paidAmountCheque: sale.paidAmountCheque,
      paidAmountBankTransfer: sale.paidAmountBankTransfer,
      
      totalAmountPaid: sale.totalAmountPaid,
      outstandingBalance: sale.outstandingBalance,
      initialOutstandingBalance: sale.initialOutstandingBalance,
      changeGiven: sale.changeGiven,
      paymentSummary: sale.paymentSummary,

      saleDate: sale.saleDate, // Firestore Timestamp
      staffId: sale.staffId,
      updatedAt: Timestamp.now(),
    };
    
    if (sale.additionalPayments) {
        firestoreSale.additionalPayments = sale.additionalPayments.map(p => {
            const fp: FirestorePayment = { ...p, date: Timestamp.fromDate(p.date) };
            return fp;
        });
    }

    if (sale.chequeDetails) {
      const chequeDetailsToSave: Partial<FirestoreChequeInfo> = {...sale.chequeDetails};
       if (sale.chequeDetails.date && !(sale.chequeDetails.date instanceof Timestamp)) {
        chequeDetailsToSave.date = Timestamp.fromDate(sale.chequeDetails.date);
      }
      firestoreSale.chequeDetails = chequeDetailsToSave as FirestoreChequeInfo;
    }
    if (sale.bankTransferDetails) {
      firestoreSale.bankTransferDetails = sale.bankTransferDetails;
    }

    if (sale.customerId) firestoreSale.customerId = sale.customerId;
    if (sale.customerName) firestoreSale.customerName = sale.customerName;
    if (sale.staffName) firestoreSale.staffName = sale.staffName;
    if (sale.offerApplied !== undefined) firestoreSale.offerApplied = sale.offerApplied;
    if (sale.vehicleId) firestoreSale.vehicleId = sale.vehicleId;
    if (!sale.createdAt) firestoreSale.createdAt = Timestamp.now();
    if (sale.initialOutstandingBalance !== undefined) firestoreSale.initialOutstandingBalance = sale.initialOutstandingBalance;


    // Remove undefined fields to prevent Firestore errors
    Object.keys(firestoreSale).forEach(key => {
      if ((firestoreSale as any)[key] === undefined) {
        delete (firestoreSale as any)[key];
      }
    });
    if (firestoreSale.chequeDetails) {
      Object.keys(firestoreSale.chequeDetails).forEach(key => {
        if ((firestoreSale.chequeDetails as any)[key] === undefined) {
          delete (firestoreSale.chequeDetails as any)[key];
        }
      });
      if (Object.keys(firestoreSale.chequeDetails).length === 0) {
        delete firestoreSale.chequeDetails;
      }
    }
    if (firestoreSale.bankTransferDetails) {
      Object.keys(firestoreSale.bankTransferDetails).forEach(key => {
        if ((firestoreSale.bankTransferDetails as any)[key] === undefined) {
          delete (firestoreSale.bankTransferDetails as any)[key];
        }
      });
      if (Object.keys(firestoreSale.bankTransferDetails).length === 0) {
        delete firestoreSale.bankTransferDetails;
      }
    }

    return firestoreSale;
  },
  fromFirestore: (snapshot: any, options: any): Sale => { 
    const data = snapshot.data(options);
    let chequeDetails;
    if (data.chequeDetails) {
        chequeDetails = {
            ...data.chequeDetails,
            date: data.chequeDetails.date instanceof Timestamp ? data.chequeDetails.date.toDate() : undefined,
        }
    }
    let bankTransferDetails;
    if (data.bankTransferDetails) {
        bankTransferDetails = { ...data.bankTransferDetails };
    }

    return {
      id: snapshot.id,
      items: Array.isArray(data.items) ? data.items.map((item: FirestoreCartItem): CartItem => {
        let id = 'unknown_id';
        if (typeof item.productRef === 'string') {
          id = item.productRef.split('/')[1];
        } else if (item.productRef instanceof DocumentReference) {
          id = item.productRef.id;
        }

        return {
          id,
          quantity: item.quantity,
          appliedPrice: item.appliedPrice,
          saleType: item.saleType,
          name: item.productName || "N/A", 
          category: item.productCategory || "Other",
          price: typeof item.productPrice === 'number' ? item.productPrice : 0, 
          sku: item.productSku, 
          isOfferItem: item.isOfferItem || false,
          returnedQuantity: item.returnedQuantity,
          imageUrl: undefined,
        };
      }) : [],
      subTotal: data.subTotal,
      discountPercentage: data.discountPercentage,
      discountAmount: data.discountAmount,
      totalAmount: data.totalAmount, // Amount due

      paidAmountCash: data.paidAmountCash,
      paidAmountCheque: data.paidAmountCheque,
      chequeDetails: chequeDetails,
      paidAmountBankTransfer: data.paidAmountBankTransfer,
      bankTransferDetails: bankTransferDetails,
      additionalPayments: Array.isArray(data.additionalPayments) ? data.additionalPayments.map((p: FirestorePayment) => ({
        ...p,
        date: p.date && p.date.toDate ? p.date.toDate() : new Date(0)
      })) : undefined,
      totalAmountPaid: data.totalAmountPaid,
      outstandingBalance: data.outstandingBalance,
      initialOutstandingBalance: data.initialOutstandingBalance,
      changeGiven: data.changeGiven,
      paymentSummary: data.paymentSummary || "N/A",

      saleDate: data.saleDate && data.saleDate.toDate ? data.saleDate.toDate() : new Date(0),
      staffId: data.staffId,
      staffName: data.staffName,
      customerId: data.customerId,
      customerName: data.customerName,
      offerApplied: data.offerApplied || false,
      vehicleId: data.vehicleId,
      updatedAt: data.updatedAt?.toDate(),
    };
  }
};

export const stockTransactionConverter = {
  toFirestore: (transaction: Omit<StockTransaction, 'id'>): Partial<FirestoreStockTransaction> => {
    const firestoreTransaction: Partial<FirestoreStockTransaction> = {
      productId: transaction.productId,
      productName: transaction.productName,
      type: transaction.type,
      quantity: transaction.quantity,
      previousStock: transaction.previousStock,
      newStock: transaction.newStock,
      transactionDate: transaction.transactionDate as any, // Will be converted to Timestamp by Firestore
      userId: transaction.userId,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };
    
    if (transaction.productSku) firestoreTransaction.productSku = transaction.productSku;
    if (transaction.notes) firestoreTransaction.notes = transaction.notes;
    if (transaction.vehicleId) firestoreTransaction.vehicleId = transaction.vehicleId;

    return firestoreTransaction;
  },
  fromFirestore: (snapshot: { id: string; data(): any }): StockTransaction => {
    const data = snapshot.data();
    return {
      id: snapshot.id,
      productId: data.productId,
      productName: data.productName,
      productSku: data.productSku,
      type: data.type,
      quantity: data.quantity,
      previousStock: data.previousStock,
      newStock: data.newStock,
      transactionDate: data.transactionDate.toDate(),
      notes: data.notes,
      vehicleId: data.vehicleId,
      userId: data.userId
    };
  }
};

export const returnTransactionConverter = {
  toFirestore: (returnData: FirestoreReturnTransaction): Partial<FirestoreReturnTransaction> => {
    const dataToSave: Partial<FirestoreReturnTransaction> = {
      ...returnData,
      createdAt: Timestamp.now(),
    };
    Object.keys(dataToSave).forEach(key => ((dataToSave as any)[key] === undefined) && delete (dataToSave as any)[key]);
    return dataToSave;
  },
  fromFirestore: (snapshot: any): ReturnTransaction => {
    const data = snapshot.data();
    let chequeDetails;
    if (data.chequeDetails) {
        chequeDetails = {
            ...data.chequeDetails,
            date: data.chequeDetails.date instanceof Timestamp ? data.chequeDetails.date.toDate() : undefined,
        }
    }
    
    const processItems = (items: FirestoreCartItem[] = []): CartItem[] => {
        return items.map((item: FirestoreCartItem): CartItem => {
            let id = 'unknown_id';
            if (typeof item.productRef === 'string') {
              id = item.productRef.split('/')[1];
            } else if (item.productRef instanceof DocumentReference) {
              id = item.productRef.id;
            }

            return {
              id,
              quantity: item.quantity,
              appliedPrice: item.appliedPrice,
              saleType: item.saleType,
              name: item.productName || "N/A", 
              category: item.productCategory || "Other",
              price: typeof item.productPrice === 'number' ? item.productPrice : 0, 
              sku: item.productSku, 
              isOfferItem: false, // Not relevant for this context
            };
        });
    };

    return {
      id: snapshot.id,
      originalSaleId: data.originalSaleId,
      returnDate: data.returnDate.toDate(),
      staffId: data.staffId,
      customerId: data.customerId,
      customerName: data.customerName,
      returnedItems: processItems(data.returnedItems),
      exchangedItems: processItems(data.exchangedItems),
      notes: data.notes,
      amountPaid: data.amountPaid,
      paymentSummary: data.paymentSummary,
      chequeDetails: chequeDetails,
      bankTransferDetails: data.bankTransferDetails,
      changeGiven: data.changeGiven,
      settleOutstandingAmount: data.settleOutstandingAmount,
      refundAmount: data.refundAmount
    };
  }
};

export const userConverter = {
    toFirestore: (user: FirestoreUser): Partial<FirestoreUser> => {
      const firestoreUser: Partial<FirestoreUser> = {
        username: user.username,
        name: user.name,
        role: user.role,
        password_hashed_or_plain: user.password_hashed_or_plain,
        updatedAt: Timestamp.now(),
      };
      if (!user.createdAt) {
          firestoreUser.createdAt = Timestamp.now();
      }
      return firestoreUser;
    },
    fromFirestore: (snapshot: any, options: any): User & { id: string } => {
      const data = snapshot.data(options);
      return {
        id: snapshot.id,
        username: data.username,
        name: data.name,
        role: data.role,
        password_hashed_or_plain: data.password_hashed_or_plain,
      };
    }
};

// Rest of interfaces remain unchanged
export interface StatsData {
  totalSales: number;
  totalCustomers: number;
  lowStockItems: number;
  revenueToday: number;
}

export interface SalesChartData {
  name: string;
  sales: number;
}

export type UserRole = "admin" | "cashier";

export interface User {
  id: string;
  username: string;
  role: UserRole;
  name: string;
  password_hashed_or_plain?: string;
}

export interface NavItemConfig {
  href?: string;
  label: string;
  icon: React.ElementType;
  allowedRoles: UserRole[];
  children?: NavItemConfig[];
  id: string;
}

export interface FullReportEntry {
  transactionId: string; // From Sale.id or ReturnTransaction.id
  transactionType: 'Sale' | 'Return';
  transactionDate: string; // Formatted yyyy-MM-dd
  transactionTime: string; // Formatted HH:mm:ss
  relatedId?: string; // For Returns, this is the originalSaleId
  invoiceCloseDate?: string; // Only applicable to Sales
  customerName: string;
  productName: string;
  productCategory: Product["category"];
  quantity: number; // Can be negative for returned items
  appliedPrice: number;
  lineTotal: number; // Can be negative for returned items
  saleType?: 'retail' | 'wholesale'; // For sales or exchanged items
  paymentSummary?: Sale["paymentSummary"];
  paymentDetails?: {
    date: Date;
    summary: string;
  }[];
  staffId: string;
}


export interface ActivityItem {
  id: string;
  type: "sale" | "new_product" | "new_customer";
  title: string;
  description: string;
  timestamp: Date;
  icon: React.ElementType;
  avatarUrl?: string;
  avatarFallback?: string;
  aiHint?: string;
}

export interface DayEndReportSummary {
  reportDate: Date;
  totalTransactions: number;
  
  // Sales figures
  grossSalesValue: number;
  refundsForTodaySales: number;
  refundsForPastSales: number;
  netSalesValue: number;

  // Collection figures
  totalCashIn: number;
  totalChequeIn: number;
  totalBankTransferIn: number;
  totalChangeGiven: number;
  totalRefundsPaidToday: number;
  netCashInHand: number;

  // Credit figures for today's sales
  newCreditIssued: number;
  paidAgainstNewCredit: number;
  netOutstandingFromToday: number;
  
  // Details for display
  chequeNumbers: string[];
  bankTransferRefs: string[];
  creditSalesCount: number;
}


export interface ManagedUser extends Omit<User, 'id'> {
  id: string;
  password?: string;
}

export interface VehicleReportItem {
  productId: string;
  productName: string;
  productSku?: string;
  totalLoaded: number;
  totalUnloaded: number;
  netChange: number;
}
