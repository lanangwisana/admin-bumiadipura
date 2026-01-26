import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyB3hcMlk7sx9g0E43ecmmuUiTj1enF4eyw",
  authDomain: "bumi-adipura-5abd8.firebaseapp.com",
  projectId: "bumi-adipura-5abd8",
  storageBucket: "bumi-adipura-5abd8.firebasestorage.app",
  messagingSenderId: "1015566219694",
  appId: "1:1015566219694:web:ed24031bfa5e0bafd1703f",
  measurementId: "G-1RSTV4NSHB"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;