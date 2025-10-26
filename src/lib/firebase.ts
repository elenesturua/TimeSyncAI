// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getFunctions } from "firebase/functions";
import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAsBiQg6P6kqC1kJfWonhqYwbWL_i8jQKQ",
  authDomain: "timesync-697a9.firebaseapp.com",
  projectId: "timesync-697a9",
  storageBucket: "timesync-697a9.firebasestorage.app",
  messagingSenderId: "928941292519",
  appId: "1:928941292519:web:6ad0af32e9173cca8e5b42",
  measurementId: "G-VXEMVYDN4N"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const db = getFirestore(app);
export const auth = getAuth(app);
export const functions = getFunctions(app);
export const analytics = getAnalytics(app);

export default app;