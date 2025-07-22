
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  "projectId": "freakmeet",
  "appId": "1:717331404842:web:fdc611dd0b1fdabfa6cb53",
  "storageBucket": "freakmeet.firebasestorage.app",
  "apiKey": "AIzaSyDhjMYjUfvm3p6PwirtsF8Vr5cYT72mdbQ",
  "authDomain": "freakmeet.firebaseapp.com",
  "messagingSenderId": "717331404842"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

export { app, db };
