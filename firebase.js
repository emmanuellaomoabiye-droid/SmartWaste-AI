import { initializeApp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyA6IC0jPBAcWds6MOz7bqvVYEjXDsuHp44",
  authDomain: "ecosort-ai-b7f91.firebaseapp.com",
  projectId: "ecosort-ai-b7f91",
  storageBucket: "ecosort-ai-b7f91.firebasestorage.app",
  messagingSenderId: "1048473084747",
  appId: "1:1048473084747:web:72669c8959441df0fd7ece"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
