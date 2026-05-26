const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, limit } = require('firebase/firestore');

const firebaseConfig = {
  projectId: "salon-app-demo",
};

// ... we can't easily run a node script connecting to their exact Firebase without their credentials or the admin SDK.
