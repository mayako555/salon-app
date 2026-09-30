import 'server-only';
import { adminDb } from '../firebase-admin';
import { createPublicBooking as book } from './booking-core';
export { BookingError } from './booking-core';
export type { BookingReceipt } from './booking-core';
export async function createPublicBooking(token: string, raw: unknown) {return book(token,raw,adminDb);}
