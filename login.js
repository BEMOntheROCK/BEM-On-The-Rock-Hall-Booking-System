// ============================================================
//  BEM ON THE ROCK — Hall Booking | login.js
// ============================================================

import { initializeApp }           from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged }
                                   from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

// TODO: Replace with your actual Firebase project credentials
const firebaseConfig = {
  apiKey:            "YOUR_API_KEY",
  authDomain:        "YOUR_AUTH_DOMAIN",
  projectId:         "YOUR_PROJECT_ID",
  storageBucket:     "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId:             "YOUR_APP_ID",
};

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);

// --- If already logged in, skip to dashboard ---
onAuthStateChanged(auth, (user) => {
  if (user) {
    window.location.replace('dashboard.html');
  }
});

// --- Password toggle ---
const passwordInput  = document.getElementById('password');
const toggleBtn      = document.getElementById('passwordToggle');
const toggleIcon     = document.getElementById('toggleIcon');

toggleBtn.addEventListener('click', () => {
  const isHidden = passwordInput.type === 'password';
  passwordInput.type  = isHidden ? 'text' : 'password';
  toggleIcon.textContent = isHidden ? '🙈' : '👁';
});

// --- Error banner ---
function showError(msg) {
  const banner = document.getElementById('loginError');
  const text   = document.getElementById('loginErrorMsg');
  text.textContent = msg;
  banner.style.display = 'flex';
}

function hideError() {
  document.getElementById('loginError').style.display = 'none';
}

// --- Login form ---
document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  hideError();

  const email    = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const loginBtn = document.getElementById('loginBtn');

  if (!email || !password) {
    showError('Please enter your email and password.');
    return;
  }

  loginBtn.disabled     = true;
  loginBtn.innerHTML    = '<span class="spinner"></span> Signing in...';

  try {
    await signInWithEmailAndPassword(auth, email, password);
    // onAuthStateChanged will handle the redirect
  } catch (err) {
    loginBtn.disabled  = false;
    loginBtn.innerHTML = 'Sign In';

    // Map Firebase error codes to friendly messages
    const code = err.code;
    if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
      showError('Incorrect email or password. Please try again.');
    } else if (code === 'auth/too-many-requests') {
      showError('Too many failed attempts. Please try again later.');
    } else if (code === 'auth/invalid-email') {
      showError('Please enter a valid email address.');
    } else {
      showError('Sign in failed. Please check your connection and try again.');
    }
  }
});

// --- Clear error on input ---
document.getElementById('email').addEventListener('input', hideError);
document.getElementById('password').addEventListener('input', hideError);