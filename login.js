// ============================================================
//  BEM ON THE ROCK — Hall Booking | login.js
// ============================================================

import { auth } from "./firebase.js";
import { signInWithEmailAndPassword, onAuthStateChanged }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

// If already logged in, skip to dashboard
onAuthStateChanged(auth, (user) => {
  if (user) window.location.replace('dashboard.html');
});

// Password toggle
const passwordInput = document.getElementById('password');
const toggleIcon    = document.getElementById('toggleIcon');

document.getElementById('passwordToggle').addEventListener('click', () => {
  const isHidden         = passwordInput.type === 'password';
  passwordInput.type     = isHidden ? 'text' : 'password';
  toggleIcon.textContent = isHidden ? '🙈' : '👁';
});

// Error banner
function showError(msg) {
  const banner = document.getElementById('loginError');
  document.getElementById('loginErrorMsg').textContent = msg;
  banner.style.display = 'flex';
}

function hideError() {
  document.getElementById('loginError').style.display = 'none';
}

// Login form
document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  hideError();

  const email    = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const loginBtn = document.getElementById('loginBtn');

  if (!email || !password) { showError('Please enter your email and password.'); return; }

  loginBtn.disabled  = true;
  loginBtn.innerHTML = '<span class="spinner"></span> Signing in...';

  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (err) {
    loginBtn.disabled  = false;
    loginBtn.innerHTML = 'Sign In';
    const code = err.code;
    if (['auth/invalid-credential','auth/wrong-password','auth/user-not-found'].includes(code)) {
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

document.getElementById('email').addEventListener('input', hideError);
document.getElementById('password').addEventListener('input', hideError);