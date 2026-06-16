// ============================================================
//  BEM ON THE ROCK — Hall Booking | firebase.js
//  Shared Firebase initialisation — imported by all JS files
// ============================================================

import { initializeApp }     from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth }           from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore }      from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// TODO: Replace with your actual Firebase project credentials
// Found in: Firebase Console → Project Settings → General → Your apps → SDK setup
const firebaseConfig = {
  apiKey: "AIzaSyD_zug3V2EunvkxmwRmuMUNrtxqVlPZDiE",
  authDomain: "bemotr-hall-booking-system.firebaseapp.com",
  projectId: "bemotr-hall-booking-system",
  storageBucket: "bemotr-hall-booking-system.firebasestorage.app",
  messagingSenderId: "183469732089",
  appId: "1:183469732089:web:58dcef5edd849ea5523228",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db   = getFirestore(app);