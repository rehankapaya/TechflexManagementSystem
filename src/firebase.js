import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyDnrD2V19sce_FXgOEZkbUgl-4lZErRzzs",
  authDomain: "techflexmanagementsystem.firebaseapp.com",
  projectId: "techflexmanagementsystem",
  storageBucket: "techflexmanagementsystem.firebasestorage.app",
  messagingSenderId: "1039417411226",
  appId: "1:1039417411226:web:f60708d495893d06238123"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);