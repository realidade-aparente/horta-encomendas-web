import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyBOknpWov10K1B2VqSJ4BJZ3Fp2u96D-uQ",
  authDomain: "horta-encomendas.firebaseapp.com",
  databaseURL: "https://horta-encomendas-default-rtdb.europe-west1.firebasedatabase.app/",
  projectId: "horta-encomendas",
  storageBucket: "horta-encomendas.firebasestorage.app",
  messagingSenderId: "1024254346717",
  appId: "1:1024254346717:web:c09b4f848fbaaa5a6e2234"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getDatabase(app);