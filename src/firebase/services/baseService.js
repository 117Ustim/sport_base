import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  deleteDoc,
  query
} from 'firebase/firestore';
import { db } from '../config';

/**
 * Base service class for Firebase Firestore operations
 * Eliminates code duplication across service files
 */
export class BaseService {
  constructor(collectionName) {
    this.collectionName = collectionName;
    this.collectionRef = collection(db, collectionName);
  }

  /**
   * Get all documents from collection
   */
  async getAll(queryConstraints = []) {
    try {
      const q = queryConstraints.length > 0 
        ? query(this.collectionRef, ...queryConstraints)
        : this.collectionRef;
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error(`Error getting all from ${this.collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Get document by ID
   */
  async getById(id) {
    try {
      const docRef = doc(db, this.collectionName, id);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        return null;
      }
      
      return {
        id: docSnap.id,
        ...docSnap.data()
      };
    } catch (error) {
      console.error(`Error getting ${this.collectionName} by ID:`, error);
      throw error;
    }
  }

  /**
   * Create new document
   */
  async create(data, customId = null) {
    try {
      const docRef = customId 
        ? doc(db, this.collectionName, customId)
        : doc(collection(db, this.collectionName));
      
      await setDoc(docRef, {
        ...data,
        createdAt: new Date().toISOString()
      });
      
      return docRef.id;
    } catch (error) {
      console.error(`Error creating ${this.collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Update existing document
   */
  async update(id, data) {
    try {
      const docRef = doc(db, this.collectionName, id);
      await setDoc(docRef, {
        ...data,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } catch (error) {
      console.error(`Error updating ${this.collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Delete document
   */
  async delete(id) {
    try {
      const docRef = doc(db, this.collectionName, id);
      await deleteDoc(docRef);
    } catch (error) {
      console.error(`Error deleting ${this.collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Query documents with filters
   */
  async query(filters = []) {
    try {
      const q = query(this.collectionRef, ...filters);
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error(`Error querying ${this.collectionName}:`, error);
      throw error;
    }
  }
}
