import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';

const firebaseConfig = require('./src/lib/firebase').firebaseConfig;
// We need to use firebase-admin to access it easily, or just a simple curl script to the API.
