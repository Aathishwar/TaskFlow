// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCOEVWJutaE2yDsWbf6KQoRKGdRtkLXj30",
  authDomain: "todo-5adbc.firebaseapp.com",
  projectId: "todo-5adbc",
  storageBucket: "todo-5adbc.firebasestorage.app",
  messagingSenderId: "724921679337",
  appId: "1:724921679337:web:a1b7bb6ecd63d345631f78"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const firebaseAuth = getAuth(app);
export default app;
