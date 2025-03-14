// firebaseConfig.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// 🔹 Replace these with your actual Firebase project credentials
const firebaseConfig = {
  apiKey: "AIzaSyB3SkOH3WSJCnGRU_GWP3xiyoUEWR3Q9LM",
  authDomain: "alpha-dog-ai.firebaseapp.com",
  projectId: "alpha-dog-ai",
  storageBucket: "alpha-dog-ai.firebasestorage.app",
  messagingSenderId: "294288054623",
  appId: "1:294288054623:web:d5fc08b64f672119d2beea",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
