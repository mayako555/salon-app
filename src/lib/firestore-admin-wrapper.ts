import { adminDb } from "./firebase-admin";
import { getCurrentUserContext } from "./auth-server";

export const db = adminDb;

export function collection(db: any, path: string) {
  return db.collection(path);
}

export function doc(dbOrCol: any, pathOrId?: string, id?: string) {
  if (pathOrId && id) {
    return dbOrCol.collection(pathOrId).doc(id);
  } else if (pathOrId) {
    if (typeof dbOrCol.doc === "function") {
      return dbOrCol.doc(pathOrId);
    }
    return dbOrCol.doc(pathOrId);
  }
  return dbOrCol.doc();
}

export function query(colRef: any, ...constraints: any[]) {
  let q = colRef;
  for (const c of constraints) {
    if (!c) continue;
    if (c.type === 'where') q = q.where(c.field, c.op, c.value);
    else if (c.type === 'orderBy') q = q.orderBy(c.field, c.dir);
    else if (c.type === 'limit') q = q.limit(c.value);
  }
  return q;
}

export function where(field: string, op: string, value: any) {
  return { type: 'where', field, op, value };
}

export function orderBy(field: string, dir: string = 'asc') {
  return { type: 'orderBy', field, dir };
}

export function limit(val: number) {
  return { type: 'limit', value: val };
}

export interface QueryDocumentSnapshot {
  id: string;
  data(): any;
  ref: any;
}

export interface QuerySnapshot {
  docs: QueryDocumentSnapshot[];
  empty: boolean;
  size: number;
  forEach(callback: (doc: QueryDocumentSnapshot) => void): void;
}

export async function getDocsUnfiltered(q: any): Promise<QuerySnapshot> {
  const snap = await q.get();
  const processedDocs = snap.docs.map((doc: any) => {
    return new Proxy(doc, {
      get(target, prop) {
        if (prop === 'exists') return function() { return target.exists === true; };
        const val = target[prop];
        return typeof val === 'function' ? val.bind(target) : val;
      }
    });
  });
  return {
    ...snap,
    docs: processedDocs,
    empty: snap.empty,
    size: snap.size,
    forEach: function(cb: any) {
      processedDocs.forEach(cb);
    }
  } as unknown as QuerySnapshot;
}

export async function getDocs(q: any): Promise<QuerySnapshot> {
  const ctx = await getCurrentUserContext();
  let snap;
  if (!ctx.companyId) {
    throw new Error("Unauthorized");
  } else {
    try {
      snap = await q.where("companyId", "==", ctx.companyId).get();
    } catch (e) {
      console.warn("Could not append companyId to query", e);
      const rawSnap = await q.get();
      snap = {
        docs: rawSnap.docs.filter((d: any) => d.data().companyId === ctx.companyId),
        empty: rawSnap.docs.filter((d: any) => d.data().companyId === ctx.companyId).length === 0,
        size: rawSnap.docs.filter((d: any) => d.data().companyId === ctx.companyId).length
      };
    }
  }

  // Inject exists() and forEach() method for Web SDK compatibility
  const processedDocs = snap.docs.map((doc: any) => {
    if (doc.exists && typeof doc.exists === 'function') return doc;
    return new Proxy(doc, {
      get(target, prop) {
        if (prop === 'exists') return function() { return target.exists === true; };
        const val = target[prop];
        return typeof val === 'function' ? val.bind(target) : val;
      }
    });
  });

  return {
    ...snap,
    docs: processedDocs,
    empty: snap.empty,
    size: snap.size,
    forEach: function(cb: any) {
      processedDocs.forEach(cb);
    }
  } as unknown as QuerySnapshot;
}

export async function getCountFromServer(q: any) {
  // We fetch through getDocs which is already tenant-isolated
  const snap = await getDocs(q);
  return { data: () => ({ count: snap.size }) };
}

export interface DocumentSnapshot {
  exists: any; // Allow both boolean and function
  data(): any;
  id: string;
  ref: any;
}

export async function getDocUnfiltered(ref: any): Promise<DocumentSnapshot> {
  const snap = await ref.get();
  return new Proxy(snap, {
    get(target, prop) {
      if (prop === 'exists') return function() { return target.exists === true; };
      const val = target[prop];
      return typeof val === 'function' ? val.bind(target) : val;
    }
  });
}

export async function getDoc(ref: any): Promise<DocumentSnapshot> {
  const snap = await ref.get();
  const wrappedSnap = new Proxy(snap, {
    get(target, prop) {
      if (prop === 'exists') return function() { return target.exists === true; };
      const val = target[prop];
      return typeof val === 'function' ? val.bind(target) : val;
    }
  });

  if (!snap.exists) {
    return wrappedSnap;
  }
  
  const ctx = await getCurrentUserContext();
  
  const data = snap.data();
  if (data?.companyId !== ctx.companyId && data?.tenant_id !== ctx.companyId) {
    throw new Error(`Unauthorized tenant access: Document belongs to ${data?.companyId || data?.tenant_id}`);
  }
  
  return wrappedSnap;
}

export async function addDocUnfiltered(col: any, data: any) {
  return col.add(data);
}

export async function addDoc(col: any, data: any) {
  const ctx = await getCurrentUserContext();
  const dataWithCompany = { ...data };
  
  if (!ctx.companyId) throw new Error("Unauthorized");
  dataWithCompany.companyId = ctx.companyId;
  return col.add(dataWithCompany);
}

export async function updateDocUnfiltered(ref: any, data: any) {
  return ref.update(data);
}

export async function updateDoc(ref: any, data: any) {
  const snap = await ref.get();
  if (snap.exists) {
    const ctx = await getCurrentUserContext();
    if (!ctx.companyId) throw new Error("Unauthorized");
    const existingData = snap.data();
    if (existingData?.companyId !== ctx.companyId && existingData?.tenant_id !== ctx.companyId) {
      throw new Error("Unauthorized tenant access during update");
    }
  }
  return ref.update(data);
}

export async function setDocUnfiltered(ref: any, data: any, options?: any) {
  return ref.set(data, options);
}

export async function setDoc(ref: any, data: any, options?: any) {
  const ctx = await getCurrentUserContext();
  const dataWithCompany = { ...data };
  
  if (!ctx.companyId) throw new Error("Unauthorized");
  dataWithCompany.companyId = ctx.companyId;
  
  const snap = await ref.get();
  if (snap.exists) {
    const existingData = snap.data();
    if (existingData?.companyId !== ctx.companyId && existingData?.tenant_id !== ctx.companyId) {
      throw new Error("Unauthorized tenant access during set");
    }
  }
  return ref.set(dataWithCompany, options);
}

export async function deleteDocUnfiltered(ref: any) {
  return ref.delete();
}

export async function deleteDoc(ref: any) {
  const snap = await ref.get();
  if (snap.exists) {
    const ctx = await getCurrentUserContext();
    if (!ctx.companyId) throw new Error("Unauthorized");
    const existingData = snap.data();
    if (existingData?.companyId !== ctx.companyId && existingData?.tenant_id !== ctx.companyId) {
      throw new Error("Unauthorized tenant access during delete");
    }
  }
  return ref.delete();
}

export function writeBatch(db: any) {
  const batch = db.batch();
  return {
    async set(ref: any, data: any, options?: any) {
      return batch.set(ref, data, options);
    },
    update(ref: any, data: any) {
      return batch.update(ref, data);
    },
    delete(ref: any) {
      return batch.delete(ref);
    },
    commit() {
      return batch.commit();
    }
  };
}

export function serverTimestamp() {
  const admin = require("firebase-admin");
  return admin.firestore.FieldValue.serverTimestamp();
}

export function increment(n: number) {
  const admin = require("firebase-admin");
  return admin.firestore.FieldValue.increment(n);
}

export function arrayUnion(...elements: any[]) {
  const admin = require("firebase-admin");
  return admin.firestore.FieldValue.arrayUnion(...elements);
}

export function arrayRemove(...elements: any[]) {
  const admin = require("firebase-admin");
  return admin.firestore.FieldValue.arrayRemove(...elements);
}

// Add Timestamp wrapper
import * as admin from "firebase-admin";
export type Timestamp = admin.firestore.Timestamp;
export const Timestamp = admin.firestore.Timestamp;
