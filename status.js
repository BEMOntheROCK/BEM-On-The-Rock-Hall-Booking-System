// ============================================================
//  BEM ON THE ROCK — Hall Booking | status.js
// ============================================================

import { db } from "./firebase.js";
import { collection, query, where, getDocs }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

document.getElementById('year').textContent = new Date().getFullYear();

// ── Hamburger ─────────────────────────────────────────────
window.toggleMenu = function() {
  document.getElementById('mobileMenu').classList.toggle('open');
};

// ── Helpers ───────────────────────────────────────────────
function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-MY', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });
}

function formatTime(t) {
  if (!t) return '—';
  const [h, m] = t.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2,'0')}${h >= 12 ? 'pm' : 'am'}`;
}

function getPaymentStatus(b) {
  if (b.balanceDate) return { label: 'Fully Paid',   cls: 'badge--paid'    };
  if (b.depositDate) return { label: 'Deposit Paid', cls: 'badge--partial' };
  return                    { label: 'Unpaid',        cls: 'badge--unpaid'  };
}

function getStatusInfo(status) {
  const map = {
    pending:  { label: 'Pending Review', cls: 'badge--pending',  icon: '⏳', desc: 'Your booking request has been received and is awaiting review by our team. We will contact you shortly.' },
    approved: { label: 'Approved',       cls: 'badge--approved', icon: '✅', desc: 'Your booking has been approved! Please ensure your deposit is paid at least 3 weeks before your event date.' },
    rejected: { label: 'Unsuccessful',   cls: 'badge--rejected', icon: '❌', desc: 'Unfortunately your booking request was unsuccessful. Our team will contact you with further details and to discuss alternative arrangements.' },
  };
  return map[status] || map.pending;
}

// ── Check Status ──────────────────────────────────────────
window.checkStatus = async function() {
  const ref    = document.getElementById('refInput').value.trim().toUpperCase();
  const result = document.getElementById('statusResult');
  const btn    = document.getElementById('checkBtn');

  if (!ref) {
    showToast('Please enter a reference number.', 'error'); return;
  }

  btn.disabled  = true;
  btn.innerHTML = '<span class="spinner"></span>';
  result.style.display = 'none';

  try {
    const q        = query(collection(db, 'hall_bookings'), where('referenceNumber', '==', ref));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      result.innerHTML = `
        <div class="card" style="text-align:center;">
          <div style="font-size:2rem; margin-bottom:var(--space-md); opacity:0.4;">🔍</div>
          <h3 style="margin-bottom:var(--space-sm);">No booking found</h3>
          <p style="font-size:0.9rem;">No booking matches the reference number <strong style="font-family:monospace; color:var(--marigold);">${ref}</strong>. Please check and try again.</p>
        </div>`;
      result.style.display = 'block';
      return;
    }

    const b          = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
    const statusInfo = getStatusInfo(b.status);
    const payInfo    = getPaymentStatus(b);

    result.innerHTML = `
      <div class="card">

        <!-- Status Header -->
        <div style="text-align:center; padding: var(--space-lg) 0; border-bottom:1px solid var(--border); margin-bottom:var(--space-lg);">
          <div style="font-size:2.5rem; margin-bottom:var(--space-sm);">${statusInfo.icon}</div>
          <span class="badge ${statusInfo.cls}" style="font-size:0.85rem; padding:0.4rem 1rem; margin-bottom:var(--space-md); display:inline-block;">${statusInfo.label}</span>
          <p style="font-size:0.9rem; max-width:380px; margin:0 auto;">${statusInfo.desc}</p>
        </div>

        <!-- Booking Details -->
        <p class="form-section-label" style="margin-bottom:var(--space-md);">Booking Details</p>

        <div class="detail-row">
          <span class="detail-row__label">Reference No.</span>
          <span class="detail-row__value" style="font-family:monospace; color:var(--marigold);">${b.referenceNumber}</span>
        </div>
        <div class="detail-row">
          <span class="detail-row__label">Hall</span>
          <span class="detail-row__value">${b.hallName}</span>
        </div>
        <div class="detail-row">
          <span class="detail-row__label">Event Type</span>
          <span class="detail-row__value">${b.purposeLabel}${b.otherPurpose ? ` — ${b.otherPurpose}` : ''}</span>
        </div>
        <div class="detail-row">
          <span class="detail-row__label">Date</span>
          <span class="detail-row__value">${formatDate(b.eventDate)}</span>
        </div>
        <div class="detail-row">
          <span class="detail-row__label">Time</span>
          <span class="detail-row__value">${formatTime(b.startTime)} – ${formatTime(b.endTime)}</span>
        </div>
        ${b.status !== 'rejected' ? `
        <div class="detail-row">
          <span class="detail-row__label">Payment</span>
          <span class="detail-row__value"><span class="badge ${payInfo.cls}">${payInfo.label}</span></span>
        </div>` : ''}

        <div style="margin-top:var(--space-lg); padding-top:var(--space-lg); border-top:1px solid var(--border); text-align:center;">
          <p style="font-size:0.82rem; color:var(--silver-dark);">For enquiries, please contact the church office directly.</p>
        </div>

      </div>`;
    result.style.display = 'block';

  } catch (err) {
    console.error(err);
    showToast('Something went wrong. Please try again.', 'error');
  } finally {
    btn.disabled  = false;
    btn.innerHTML = 'Check';
  }
};

// ── Toast ─────────────────────────────────────────────────
function showToast(message, type = 'info', duration = 3500) {
  const container = document.getElementById('toast-container');
  const icons     = { success:'✓', error:'✕', warning:'⚠', info:'ℹ' };
  const toast     = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.innerHTML = `<span>${icons[type]||'ℹ'}</span><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('fade-out');
    toast.addEventListener('animationend', () => toast.remove());
  }, duration);
}