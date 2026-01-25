import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyA2V3XkcYmzTMheaLRmbrz28rJx42DGNds",
  authDomain: "bumi-adipura.firebaseapp.com",
  projectId: "bumi-adipura",
  storageBucket: "bumi-adipura.firebasestorage.app",
  messagingSenderId: "359691605712",
  appId: "1:359691605712:web:50fcba6d5e374f1fdc30d5"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
