// src/components/firebase.jsx
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDymOkgdwN1uiNe9H7gWk6sBVHKAbwhF6I",
  authDomain: "movie-d0404.firebaseapp.com",
  databaseURL: "https://movie-d0404-default-rtdb.firebaseio.com",
  projectId: "movie-d0404",
  storageBucket: "movie-d0404.firebasestorage.app",
  messagingSenderId: "447750741420",
  appId: "1:447750741420:web:8038dc058a65ea7d73ae09",
  measurementId: "G-K4D6C039DG"
};

const app = initializeApp(firebaseConfig);

// These MUST be exported for App.jsx to find them
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

export default app;