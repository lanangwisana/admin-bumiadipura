import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyComvKBpm5xRMCLHeqSoq1bmkrwrdzQ7Qk",
  authDomain: "bumi-adipura-8ed0a.firebaseapp.com",
  projectId: "bumi-adipura-8ed0a",
  storageBucket: "bumi-adipura-8ed0a.firebasestorage.app",
  messagingSenderId: "895579623434",
  appId: "1:895579623434:web:c0ef256fc55cf6e0bd0ff3",
  measurementId: "G-1QWESVPHGR"
};

// Main app for general use
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Secondary app for creating new users without affecting current session
const secondaryApp = initializeApp(firebaseConfig, 'SecondaryApp');
export const secondaryAuth = getAuth(secondaryApp);

export default app;