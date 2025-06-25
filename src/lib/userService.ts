
import { db, checkFirebase } from "./firebase";
import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where,
  getDoc,
  Timestamp
} from "firebase/firestore";
import { userConverter, FirestoreUser, User } from "./types";

export const UserService = {
  async getAllUsers(): Promise<(User & { id: string })[]> {
    checkFirebase();
    const q = query(collection(db, 'users')).withConverter(userConverter as any);
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data());
  },

  async getUserById(id: string): Promise<(User & { id: string }) | null> {
    checkFirebase();
    const docRef = doc(db, 'users', id).withConverter(userConverter as any);
    const snapshot = await getDoc(docRef);
    return snapshot.exists() ? snapshot.data() : null;
  },

  async getUserByUsername(username: string): Promise<(User & { id: string }) | null> {
    checkFirebase();
    const q = query(
      collection(db, 'users').withConverter(userConverter as any),
      where('username', '==', username)
    );
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      return null;
    }
    return snapshot.docs[0].data();
  },

  async createUser(userData: Omit<User, 'id'>): Promise<string> {
    checkFirebase();
    const existingUser = await this.getUserByUsername(userData.username);
    if (existingUser) {
        throw new Error("Username already exists.");
    }

    const dataWithTimestamp: FirestoreUser = {
        ...userData,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
    };

    const usersCollection = collection(db, 'users');
    const docRef = await addDoc(usersCollection, dataWithTimestamp);
    return docRef.id;
  },

  async updateUser(id: string, userData: Partial<Omit<User, 'id'>>): Promise<void> {
    checkFirebase();
    const docRef = doc(db, 'users', id);
    const dataToUpdate: any = {
      ...userData,
      updatedAt: Timestamp.now()
    };
    if (userData.password_hashed_or_plain === undefined) {
      delete dataToUpdate.password_hashed_or_plain;
    }
    await updateDoc(docRef, dataToUpdate);
  },
  
  async deleteUser(id: string): Promise<void> {
    checkFirebase();
    const docRef = doc(db, 'users', id);
    await deleteDoc(docRef);
  },
};
