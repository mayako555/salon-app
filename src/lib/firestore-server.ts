import { adminDb } from "./firebase-admin";
import { getCurrentUserContext } from "./auth-server";
import { FieldValue, Timestamp } from "firebase-admin/firestore";

export { Timestamp };

export const serverTimestamp = () => FieldValue.serverTimestamp();
export const increment = (n: number) => FieldValue.increment(n);
export const arrayUnion = (...elements: any[]) => FieldValue.arrayUnion(...elements);
export const arrayRemove = (...elements: any[]) => FieldValue.arrayRemove(...elements);

export function collection(dbDummy: any, path: string) {
  return adminDb.collection(path);
}

export function doc(dbDummy: any, path: string, id?: string) {
  if (id) return adminDb.collection(path).doc(id);
  // If no id, path is like "col/id"
  return adminDb.doc(path);
}

export function where(fieldPath: string, opStr: string, value: any) {
  return { type: 'where', fieldPath, opStr, value };
}

export function orderBy(fieldPath: string, directionStr: 'asc' | 'desc' = 'asc') {
  return { type: 'orderBy', fieldPath, directionStr };
}

export function limit(n: number) {
  return { type: 'limit', n };
}

export function startAfter(docSnap: any) {
  return { type: 'startAfter', docSnap };
}

export function query(colRef: any, ...constraints: any[]) {
  let q = colRef;
  for (const c of constraints) {
    if (c.type === 'where') q = q.where(c.fieldPath, c.opStr, c.value);
    if (c.type === 'orderBy') q = q.orderBy(c.fieldPath, c.directionStr);
    if (c.type === 'limit') q = q.limit(c.n);
    if (c.type === 'startAfter') q = q.startAfter(c.docSnap);
  }
  return q;
}

export async function getDocs(queryObj: any) {
  const ctx = await getCurrentUserContext();
  let finalQuery = queryObj;
  
  if (ctx.role !== "systemOwner") {
    finalQuery = finalQuery.where("companyId", "==", ctx.companyId);
  }
  
  return finalQuery.get();
}

export async function getDoc(docRef: any) {
  const ctx = await getCurrentUserContext();
  const snap = await docRef.get();
  
  if (ctx.role !== "systemOwner" && snap.exists) {
    const data = snap.data();
    if (data && data.companyId !== ctx.companyId) {
      throw new Error("権限がありません (異なる企業データへのアクセス)");
    }
  }
  return snap;
}

export async function addDoc(colRef: any, data: any) {
  const ctx = await getCurrentUserContext();
  const dataWithCompany = { ...data, companyId: ctx.companyId };
  return colRef.add(dataWithCompany);
}

export async function updateDoc(docRef: any, data: any) {
  const ctx = await getCurrentUserContext();
  if (ctx.role !== "systemOwner") {
    const snap = await docRef.get();
    if (snap.exists && snap.data()?.companyId !== ctx.companyId) {
      throw new Error("権限がありません (異なる企業データの更新)");
    }
  }
  await docRef.update(data);
}

export async function deleteDoc(docRef: any) {
  const ctx = await getCurrentUserContext();
  if (ctx.role !== "systemOwner") {
    const snap = await docRef.get();
    if (snap.exists && snap.data()?.companyId !== ctx.companyId) {
      throw new Error("権限がありません (異なる企業データの削除)");
    }
  }
  await docRef.delete();
}

export function writeBatch(dbDummy: any) {
  const batch = adminDb.batch();
  return {
    set: (ref: any, data: any) => batch.set(ref, data),
    update: (ref: any, data: any) => batch.update(ref, data),
    delete: (ref: any) => batch.delete(ref),
    commit: () => batch.commit()
  };
}

// Special function to fetch without tenant isolation (only used internally where verified)
export async function getDocsSystem(queryObj: any) {
  return queryObj.get();
}
