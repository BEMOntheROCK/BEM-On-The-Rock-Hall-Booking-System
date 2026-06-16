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
  apiKey:            "YOUR_API_KEY",
  authDomain:        "YOUR_AUTH_DOMAIN",
  projectId:         "YOUR_PROJECT_ID",
  storageBucket:     "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId:             "YOUR_APP_ID",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db   = getFirestore(app);