import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyBFheupvmKTD5vCV29p_jNDeIJpM7tccX8",
  authDomain: "horta-encomendas-us.firebaseapp.com",
  databaseURL: "https://horta-encomendas-us-default-rtdb.firebaseio.com",
  projectId: "horta-encomendas-us",
  storageBucket: "horta-encomendas-us.firebasestorage.app",
  messagingSenderId: "411853672301",
  appId: "1:411853672301:web:79123e9f6bf2aa8733d464"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getDatabase(app);