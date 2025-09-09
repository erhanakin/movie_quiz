// src/utils/firebase.js
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// YOUR ACTUAL Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDF-GlL38CEwWy7Kt3dhzPL4eD8qs1z6Bs",
  authDomain: "movie-quiz-app-9c20f.firebaseapp.com",
  projectId: "movie-quiz-app-9c20f",
  storageBucket: "movie-quiz-app-9c20f.firebasestorage.app",
  messagingSenderId: "162694595771",
  appId: "1:162694595771:web:e9cb1542a6b659eef9559e",
  measurementId: "G-ZTC0SVN3X1"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore (this is what we need for leaderboards)
export const db = getFirestore(app);

export default app;