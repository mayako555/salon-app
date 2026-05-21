"use server";

import { db } from "./firebase";
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  getDocs, 
  updateDoc, 
  doc, 
  serverTimestamp 
} from "firebase/firestore";

export type Notification = {
  id: string;
  title: string;
  message: string;
  type: 'inventory_alert' | 'order_request' | 'order_update' | 'task_assigned' | 'system';
  priority: 'low' | 'medium' | 'high';
  read: boolean;
  targetRole?: 'admin' | 'staff' | 'all';
  targetStore?: string;
  targetUserId?: string;
  link?: string;
  createdAt: any;
};

const NOTIFICATIONS_COLLECTION = "notifications";

export async function addNotification(data: Omit<Notification, 'id' | 'read' | 'createdAt'>) {
  try {
    const colRef = collection(db, NOTIFICATIONS_COLLECTION);
    await addDoc(colRef, {
      ...data,
      read: false,
      createdAt: serverTimestamp(),
    });
    return { success: true };
  } catch (error: any) {
    console.error("Error adding notification:", error);
    return { success: false, error: error.message };
  }
}

export async function getNotifications(filters: { role?: string, store?: string, userId?: string }) {
  try {
    const colRef = collection(db, NOTIFICATIONS_COLLECTION);
    let q = query(colRef, orderBy("createdAt", "desc"), limit(20));
    
    // Simple filtering logic (Firestore might need composite indexes for complex ones, so we'll filter more carefully)
    const snapshot = await getDocs(q);
    let results = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as Notification[];
    
    // Filter in-memory for simplicity unless performance becomes an issue
    if (filters.role) {
      results = results.filter(n => n.targetRole === 'all' || n.targetRole === filters.role);
    }
    if (filters.store) {
      results = results.filter(n => !n.targetStore || n.targetStore === filters.store);
    }
    if (filters.userId) {
      results = results.filter(n => !n.targetUserId || n.targetUserId === filters.userId);
    }
    
    return results;
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return [];
  }
}

export async function markAsRead(notificationId: string) {
  try {
    const docRef = doc(db, NOTIFICATIONS_COLLECTION, notificationId);
    await updateDoc(docRef, { read: true });
    return { success: true };
  } catch (error: any) {
    console.error("Error marking notification as read:", error);
    return { success: false, error: error.message };
  }
}
