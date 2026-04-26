import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyA5IPA61Ujx477bI6zXa0ejick_QsgPZAw",
  authDomain: "chronos-ab1fa.firebaseapp.com",
  projectId: "chronos-ab1fa",
  storageBucket: "chronos-ab1fa.firebasestorage.app",
  messagingSenderId: "720927770091",
  appId: "1:720927770091:web:ef75c4c603141a181485ae",
  measurementId: "G-XM5DPSGLQK"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);