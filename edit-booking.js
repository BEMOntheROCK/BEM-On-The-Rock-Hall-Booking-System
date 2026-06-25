// ============================================================
//  BEM ON THE ROCK — Hall Booking | edit-booking.js
// ============================================================

import { db } from "./firebase.js";
import { doc, getDoc, updateDoc }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

document.getElementById('year').textContent = new Date().getFullYear();

window.toggleMenu = function() {
  document.getElementById('mobileMenu').classList.toggle('open');
};

const CREW_RATE = 50;
let bookingData = null;
let hallData    = null;

// ── Load Booking ID from URL ──────────────────────────────
const params = new URLSearchParams(window.location.search);
const bookingId = params.get('id');

if (!bookingId) {
  showError('No booking ID provided.', 'Please go back and try again.');
} else {
  loadBooking(bookingId);
}

async function loadBooking(id) {
  try {
    const snap = await getDoc(doc(db, 'hall_bookings', id));
    if (!snap.exists()) {
      showError('Booking not found.', 'This booking does not exist or may have been removed.');
      return;
    }

    bookingData = { id: snap.id, ...snap.data() };

    // Only allow editing pending bookings
    if (bookingData.status !== 'pending') {
      showError(
        'Editing not available.',
        bookingData.status === 'approved'
          ? 'This booking has already been approved. Please contact the church office to make any changes.'
          : 'This booking cannot be edited as it is no longer pending.'
      );
      return;
    }

    // Load hall data for crew list
    const hallSnap = await getDoc(doc(db, 'halls', bookingData.hallKey));
    hallData = hallSnap.exists() ? { id: hallSnap.id, ...hallSnap.data() } : null;

    populateForm();
    document.getElementById('editLoading').style.display  = 'none';
    document.getElementById('editFormWrap').style.display = 'block';

  } catch (err) {
    console.error(err);
    showError('Something went wrong.', 'Failed to load booking. Please try again.');
  }
}

// ── Populate Form ─────────────────────────────────────────
function populateForm() {
  const b = bookingData;

  document.getElementById('editPageTitle').textContent = `Edit Booking — ${b.hallName}`;
  document.getElementById('editHallName').textContent  = b.hallName;
  document.getElementById('editRefNum').textContent    = b.referenceNumber || '—';
  document.getElementById('editBannerAccent').style.background = b.color || '#C0C0C0';

  // Purpose
  const purposeEl = document.getElementById('editPurpose');
  purposeEl.value = b.purpose || '';
  handlePurposeChange(b.purpose, b.otherPurpose);
  purposeEl.addEventListener('change', () => handlePurposeChange(purposeEl.value));

  // Date
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('editDate').min   = today;
  document.getElementById('editDate').value = b.eventDate || '';

  // Fixed slots or time range
  if (hallData?.fixedSlots) {
    document.getElementById('editSlotGroup').style.display = 'block';
    document.getElementById('editTimeRange').style.display = 'none';
    const slotVal = b.startTime && b.endTime ? `${b.startTime}-${b.endTime}` : '';
    document.getElementById('editSlot').value = slotVal;
  } else {
    document.getElementById('editStart').value = b.startTime || '';
    document.getElementById('editEnd').value   = b.endTime   || '';
  }

  // Notes
  document.getElementById('editNotes').value = b.notes || '';

  // Crew
  if (hallData?.crew && hallData.crew.length > 0) {
    renderCrewList();
  } else {
    document.getElementById('editCrewSection').style.display = 'none';
  }
}

// ── Purpose Change Handler ────────────────────────────────
function handlePurposeChange(val, otherVal = '') {
  const otherGroup = document.getElementById('editOtherGroup');
  const otherInput = document.getElementById('editOtherPurpose');
  if (val === 'other') {
    otherGroup.style.display = 'block';
    otherInput.required      = true;
    otherInput.value         = otherVal;
  } else {
    otherGroup.style.display = 'none';
    otherInput.required      = false;
    otherInput.value         = '';
  }
}

// ── Render Crew Checkboxes ────────────────────────────────
function renderCrewList() {
  const container         = document.getElementById('editCrewList');
  const existingSelections = bookingData.crewSelections || [];

  container.innerHTML = hallData.crew.map((role, i) => {
    const existing = existingSelections.find(c => c.role === role);
    const checked  = !!existing;
    const days     = existing?.days || [];

    return `
    <div class="crew-item" id="crewItem-${i}">
      <label class="crew-checkbox-label">
        <input type="checkbox" class="crew-check" data-index="${i}" data-role="${role}"
          ${checked ? 'checked' : ''} onchange="onCrewCheck(${i})" />
        <span class="crew-check-custom"></span>
        <span class="crew-role">${role}</span>
        <span class="crew-base-rate">RM ${CREW_RATE}</span>
      </label>
      <div class="crew-attendance" id="crewAttendance-${i}" style="display:${checked ? 'block' : 'none'};">
        <p style="font-size:0.82rem; color:var(--silver-dark); margin-bottom:var(--space-sm);">Select attendance day(s):</p>
        <div class="crew-attendance-options">
          ${hallData.supportsRehearsal ? `
          <label class="crew-attendance-label">
            <input type="checkbox" class="crew-day" data-index="${i}" data-day="rehearsal"
              ${days.includes('rehearsal') ? 'checked' : ''} onchange="onAttendanceChange(${i})" />
            <span class="crew-day-custom"></span>
            Rehearsal Day <em>(RM ${CREW_RATE})</em>
          </label>` : ''}
          <label class="crew-attendance-label">
            <input type="checkbox" class="crew-day" data-index="${i}" data-day="event"
              ${days.includes('event') ? 'checked' : ''} onchange="onAttendanceChange(${i})" />
            <span class="crew-day-custom"></span>
            Event Day <em>(RM ${CREW_RATE})</em>
          </label>
        </div>
        <div class="crew-item-cost" id="crewCost-${i}" style="display:${days.length > 0 ? 'block' : 'none'};">
          Cost: <strong id="crewCostVal-${i}">RM ${days.length * CREW_RATE}</strong>
        </div>
      </div>
    </div>`;
  }).join('');
}

window.onCrewCheck = function(i) {
  const checked    = document.querySelector(`.crew-check[data-index="${i}"]`).checked;
  const attendance = document.getElementById(`crewAttendance-${i}`);
  attendance.style.display = checked ? 'block' : 'none';
  if (!checked) {
    document.querySelectorAll(`.crew-day[data-index="${i}"]`).forEach(cb => cb.checked = false);
    document.getElementById(`crewCost-${i}`).style.display = 'none';
  }
};

window.onAttendanceChange = function(i) {
  const days    = document.querySelectorAll(`.crew-day[data-index="${i}"]:checked`).length;
  const costEl  = document.getElementById(`crewCost-${i}`);
  const costVal = document.getElementById(`crewCostVal-${i}`);
  if (days > 0) {
    costVal.textContent  = `RM ${days * CREW_RATE}`;
    costEl.style.display = 'block';
  } else {
    costEl.style.display = 'none';
  }
};

function getCrewSelections() {
  if (!hallData?.crew) return [];
  const selections = [];
  document.querySelectorAll('.crew-check:checked').forEach(cb => {
    const i    = cb.dataset.index;
    const role = cb.dataset.role;
    const days = Array.from(document.querySelectorAll(`.crew-day[data-index="${i}"]:checked`))
                      .map(d => d.dataset.day);
    selections.push({ role, days, cost: days.length * CREW_RATE });
  });
  return selections;
}

// ── Time Helpers ──────────────────────────────────────────
function timeToMinutes(t) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

// ── Form Submit ───────────────────────────────────────────
document.getElementById('editForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const purpose = document.getElementById('editPurpose').value;
  const other   = document.getElementById('editOtherPurpose').value.trim();
  const date    = document.getElementById('editDate').value;
  const notes   = document.getElementById('editNotes').value.trim();

  if (!purpose)                          { showToast('Please select an event type.', 'error');  return; }
  if (purpose === 'other' && !other)     { showToast('Please describe your event.', 'error');   return; }
  if (!date)                             { showToast('Please select an event date.', 'error');  return; }

  let startTime, endTime, durationHours;
  if (hallData?.fixedSlots) {
    const slot = document.getElementById('editSlot').value;
    if (!slot) { showToast('Please select a time slot.', 'error'); return; }
    [startTime, endTime] = slot.split('-');
    durationHours = (timeToMinutes(endTime) - timeToMinutes(startTime)) / 60;
  } else {
    startTime = document.getElementById('editStart').value;
    endTime   = document.getElementById('editEnd').value;
    if (!startTime) { showToast('Please enter a start time.', 'error'); return; }
    if (!endTime)   { showToast('Please enter an end time.', 'error');  return; }
    if (timeToMinutes(endTime) <= timeToMinutes(startTime)) {
      showToast('End time must be after start time.', 'error'); return;
    }
    durationHours = (timeToMinutes(endTime) - timeToMinutes(startTime)) / 60;
  }

  // Crew validation
  const checkedCrew = document.querySelectorAll('.crew-check:checked');
  for (const cb of checkedCrew) {
    const i    = cb.dataset.index;
    const days = document.querySelectorAll(`.crew-day[data-index="${i}"]:checked`).length;
    if (days === 0) {
      showToast(`Please select attendance day(s) for: ${cb.dataset.role}`, 'error');
      return;
    }
  }

  const crewSelections = getCrewSelections();
  const crewTotal      = crewSelections.reduce((s, c) => s + c.cost, 0);
  const hallTotal      = durationHours * (bookingData.hallRate || 0);
  const estimatedTotal = hallTotal + crewTotal;

  const purposeLabels = {
    engagement: 'Engagement Ceremony',
    wedding:    'Wedding',
    other:      'Other (Gathering, Dinner, Activity, etc.)',
  };

  const btn     = document.getElementById('editSaveBtn');
  btn.disabled  = true;
  btn.innerHTML = '<span class="spinner"></span> Saving...';

  try {
    await updateDoc(doc(db, 'hall_bookings', bookingId), {
      purpose,
      purposeLabel:  purposeLabels[purpose] || purpose,
      otherPurpose:  purpose === 'other' ? other : '',
      eventDate:     date,
      startTime,
      endTime,
      durationHours,
      hallTotal,
      crewSelections,
      crewTotal,
      estimatedTotal,
      notes,
      lastEditedAt:  new Date().toISOString(),
      lastEditedBy:  'customer',
    });

    showToast('Booking updated successfully!', 'success');
    setTimeout(() => window.location.href = 'status.html', 1500);

  } catch (err) {
    console.error(err);
    showToast('Something went wrong. Please try again.', 'error');
    btn.disabled  = false;
    btn.innerHTML = 'Save Changes';
  }
});

// ── Error State ───────────────────────────────────────────
function showError(title, msg) {
  document.getElementById('editLoading').style.display = 'none';
  document.getElementById('editError').style.display   = 'block';
  document.getElementById('editErrorTitle').textContent = title;
  document.getElementById('editErrorMsg').textContent   = msg;
}

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