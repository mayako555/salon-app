import { addTenantOwnedDoc } from "@/lib/tenant-ownership";
import { db } from "@/lib/firestore-admin-wrapper";
import { 
  collection, 
  getDocs, 
  addDoc, 
  query, 
  orderBy, 
  serverTimestamp 
} from "@/lib/firestore-admin-wrapper";

export type AuditLog = {
  id: string;
  table_name: string;
  record_id: string;
  action: "INSERT" | "UPDATE" | "DELETE" | "SYSTEM" | "CALCULATE" | "CLOSE_ACCOUNTING";
  old_data: any;
  new_data: any;
  changed_at: string;
  actor: string;
};

const AUDIT_COLLECTION = "audit_logs";

export async function getAuditLogs(): Promise<AuditLog[]> {
  try {
    const colRef = collection(db, AUDIT_COLLECTION);
    const q = query(colRef, orderBy("changed_at", "desc"));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        changed_at: data.changed_at?.toDate ? data.changed_at.toDate().toISOString() : data.changed_at
      } as AuditLog;
    });
  } catch (error) {
    console.error("Error fetching audit logs:", error);
    return [];
  }
}

export async function addAuditLog(log: Omit<AuditLog, "id" | "changed_at">) {
  try {
    const colRef = collection(db, AUDIT_COLLECTION);
    await addTenantOwnedDoc(colRef, {
      ...log,
      changed_at: serverTimestamp()
    });
    return { success: true };
  } catch (error: any) {
    console.error("Error adding audit log:", error);
    return { success: false, error: error.message };
  }
}
