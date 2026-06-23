// ============================================================
//  BEM ON THE ROCK — Hall Booking | review.js
// ============================================================

import { db } from "./firebase.js";
import { collection, addDoc }
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

function generateRefNumber() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const year  = new Date().getFullYear();
  let suffix  = '';
  for (let i = 0; i < 6; i++) suffix += chars.charAt(Math.floor(Math.random() * chars.length));
  return `BK-${year}-${suffix}`;
}

// ── Load Pending Payload from sessionStorage ───────────────
const stored = sessionStorage.getItem('pendingBooking');
if (!stored) {
  window.location.href = 'booking.html';
}

let payload = null;
try {
  payload = JSON.parse(stored);
} catch {
  window.location.href = 'booking.html';
}

// ── Populate Review Page ───────────────────────────────────
function populateReview() {
  if (!payload) return;

  // Hall banner
  document.getElementById('reviewBannerAccent').style.background = payload.color || '#C0C0C0';
  document.getElementById('reviewHallName').textContent  = payload.hallName;
  document.getElementById('reviewHallMeta').textContent  = `Up to ${payload.capacity} pax`;
  document.getElementById('reviewHallPrice').innerHTML   = `RM ${payload.hallRate}<span>/ hour</span>`;

  // Event details
  document.getElementById('reviewPurpose').textContent =
    payload.purposeLabel + (payload.otherPurpose ? ` — ${payload.otherPurpose}` : '');
  document.getElementById('reviewDate').textContent     = formatDate(payload.eventDate);
  document.getElementById('reviewTime').textContent     = `${formatTime(payload.startTime)} – ${formatTime(payload.endTime)}`;
  document.getElementById('reviewDuration').textContent =
    `${payload.durationHours} hour${payload.durationHours !== 1 ? 's' : ''}`;

  // Contact
  document.getElementById('reviewName1').textContent  = payload.name1;
  document.getElementById('reviewPhone1').textContent = payload.phone1;
  document.getElementById('reviewChurch').textContent = payload.church;

  if (payload.name2 || payload.phone2) {
    document.getElementById('reviewPartnerRow').style.display = 'block';
    document.getElementById('reviewName2').textContent  = payload.name2  || '—';
    document.getElementById('reviewPhone2').textContent = payload.phone2 || '—';
  }

  // Crew
  if (payload.crewSelections && payload.crewSelections.length > 0) {
    document.getElementById('reviewCrewSection').style.display = 'block';
    document.getElementById('reviewCrewList').innerHTML = payload.crewSelections.map(c => `
      <div class="detail-row">
        <span class="detail-row__label">${c.role}</span>
        <span class="detail-row__value">
          ${c.days.map(d => d === 'rehearsal' ? 'Rehearsal Day' : 'Event Day').join(' + ')}
          <span style="color:var(--marigold); font-weight:600; margin-left:var(--space-sm);">RM ${c.cost}</span>
        </span>
      </div>
    `).join('');
  }

  // Notes
  if (payload.notes) {
    document.getElementById('reviewNotesSection').style.display = 'block';
    document.getElementById('reviewNotes').textContent = payload.notes;
  }

  // Cost
  document.getElementById('reviewHallCost').textContent = `RM ${parseFloat(payload.hallTotal).toFixed(2)}`;
  if (payload.crewTotal > 0) {
    document.getElementById('reviewCrewCostRow').style.display = 'flex';
    document.getElementById('reviewCrewCost').textContent = `RM ${parseFloat(payload.crewTotal).toFixed(2)}`;
  }
  document.getElementById('reviewTotal').textContent = `RM ${parseFloat(payload.estimatedTotal).toFixed(2)}`;
}

populateReview();

// ── Submit to Firestore ───────────────────────────────────
window.submitBooking = async function() {
  const btn     = document.getElementById('confirmBtn');
  btn.disabled  = true;
  btn.innerHTML = '<span class="spinner"></span> Submitting...';

  try {
    const finalPayload = {
      ...payload,
      referenceNumber: generateRefNumber(),
      status:          'pending',
      submittedAt:     new Date().toISOString(),
      depositAmount: null, depositMethod: null, depositReceipt: null, depositDate: null,
      balanceAmount: null, balanceMethod: null, balanceReceipt: null, balanceDate: null,
    };

    await addDoc(collection(db, 'hall_bookings'), finalPayload);

    // Pass to confirmation page
    sessionStorage.setItem('bookingSubmission', JSON.stringify({
      hallName:        finalPayload.hallName,
      eventDate:       finalPayload.eventDate,
      name1:           finalPayload.name1,
      purpose:         finalPayload.purposeLabel,
      referenceNumber: finalPayload.referenceNumber,
    }));

    // Clear pending payload
    sessionStorage.removeItem('pendingBooking');

    window.location.href = 'confirmation.html';

  } catch (err) {
    console.error('Submission error:', err);
    showToast('Something went wrong. Please try again.', 'error');
    btn.disabled  = false;
    btn.innerHTML = 'Confirm & Submit';
  }
};

// ── Toast ─────────────────────────────────────────────────
function showToast(message, type = 'info', duration = 4000) {
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