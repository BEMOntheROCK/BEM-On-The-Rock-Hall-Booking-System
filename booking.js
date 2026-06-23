// ============================================================
//  BEM ON THE ROCK — Hall Booking | booking.js
// ============================================================

import { db } from "./firebase.js";
import { doc, getDoc }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

document.getElementById('year').textContent = new Date().getFullYear();

// ── Hall Data (loaded from Firestore) ────────────────────
const CREW_RATE = 50;

// ── Load Hall ─────────────────────────────────────────────
let selectedHall = null;

async function loadHall() {
  const stored = sessionStorage.getItem('selectedHall');
  if (!stored) { window.location.href = 'index.html'; return; }
  try { selectedHall = JSON.parse(stored); } catch { window.location.href = 'index.html'; return; }

  // Fetch fresh hall data from Firestore
  try {
    const snap = await getDoc(doc(db, 'halls', selectedHall.id || selectedHall.key));
    if (!snap.exists()) { window.location.href = 'index.html'; return; }
    selectedHall = { id: snap.id, key: snap.id, ...snap.data() };
  } catch (err) {
    console.error('Failed to load hall:', err);
    window.location.href = 'index.html'; return;
  }

  const hall = selectedHall;
  if (!hall) { window.location.href = 'index.html'; return; }

  document.getElementById('hallBannerAccent').style.background = hall.color;
  document.getElementById('hallBannerTag').textContent          = hall.tag;
  document.getElementById('hallBannerTag').style.background     = hall.color;
  document.getElementById('hallBannerTag').style.color          = '#0D0D0D';
  document.getElementById('hallBannerName').textContent         = hall.name;
  document.getElementById('hallBannerMeta').textContent         = `Capacity: up to ${hall.capacity} pax`;
  document.getElementById('hallBannerPrice').innerHTML          = `RM ${hall.rate}<span>/ hour</span>`;

  if (hall.fixedSlots) {
    document.getElementById('timeRangeGroup').style.display = 'none';
    document.getElementById('slotGroup').style.display      = 'block';
  }

  const today = new Date().toISOString().split('T')[0];
  document.getElementById('eventDate').min = today;

  renderCrewList(hall);
}

// ── Render Crew Checkboxes ────────────────────────────────
function renderCrewList(hall) {
  const container = document.getElementById('crewList');
  if (!hall.crew || hall.crew.length === 0) {
    container.innerHTML = '<p style="font-size:0.9rem; color:var(--silver-dark);">No crew available for this hall.</p>';
    return;
  }

  container.innerHTML = hall.crew.map((role, i) => `
    <div class="crew-item" id="crewItem-${i}">
      <label class="crew-checkbox-label">
        <input type="checkbox" class="crew-check" data-index="${i}" data-role="${role}" onchange="onCrewCheck(${i})" />
        <span class="crew-check-custom"></span>
        <span class="crew-role">${role}</span>
        <span class="crew-base-rate">RM ${CREW_RATE}</span>
      </label>
      <div class="crew-attendance" id="crewAttendance-${i}" style="display:none;">
        <p style="font-size:0.82rem; color:var(--silver-dark); margin-bottom:var(--space-sm);">Select attendance day(s):</p>
        <div class="crew-attendance-options">
          ${hall.supportsRehearsal ? `
          <label class="crew-attendance-label">
            <input type="checkbox" class="crew-day" data-index="${i}" data-day="rehearsal" onchange="onAttendanceChange(${i})" />
            <span class="crew-day-custom"></span>
            Rehearsal Day <em>(RM ${CREW_RATE})</em>
          </label>` : ''}
          <label class="crew-attendance-label">
            <input type="checkbox" class="crew-day" data-index="${i}" data-day="event" onchange="onAttendanceChange(${i})" />
            <span class="crew-day-custom"></span>
            Event Day <em>(RM ${CREW_RATE})</em>
          </label>
        </div>
        <div class="crew-item-cost" id="crewCost-${i}" style="display:none;">
          Cost: <strong id="crewCostVal-${i}">RM 0</strong>
        </div>
      </div>
    </div>
  `).join('');
}

// ── Crew Checkbox Handlers ────────────────────────────────
window.onCrewCheck = function(i) {
  const checked    = document.querySelector(`.crew-check[data-index="${i}"]`).checked;
  const attendance = document.getElementById(`crewAttendance-${i}`);
  attendance.style.display = checked ? 'block' : 'none';

  // Uncheck all day options when crew is unchecked
  if (!checked) {
    document.querySelectorAll(`.crew-day[data-index="${i}"]`).forEach(cb => cb.checked = false);
    document.getElementById(`crewCost-${i}`).style.display = 'none';
  }
  updateCostPreview();
};

window.onAttendanceChange = function(i) {
  const days    = document.querySelectorAll(`.crew-day[data-index="${i}"]:checked`).length;
  const costEl  = document.getElementById(`crewCost-${i}`);
  const costVal = document.getElementById(`crewCostVal-${i}`);

  if (days > 0) {
    costVal.textContent    = `RM ${days * CREW_RATE}`;
    costEl.style.display   = 'block';
  } else {
    costEl.style.display   = 'none';
  }
  updateCostPreview();
};

// ── Collect Crew Selections ───────────────────────────────
function getCrewSelections() {
  const selections = [];
  document.querySelectorAll('.crew-check:checked').forEach(cb => {
    const i    = cb.dataset.index;
    const role = cb.dataset.role;
    const days = Array.from(document.querySelectorAll(`.crew-day[data-index="${i}"]:checked`))
                      .map(d => d.dataset.day);
    const cost = days.length * CREW_RATE;
    selections.push({ role, days, cost });
  });
  return selections;
}

function getCrewTotal() {
  return getCrewSelections().reduce((sum, c) => sum + c.cost, 0);
}

// ── Cost Preview ──────────────────────────────────────────
const startTimeInput = document.getElementById('startTime');
const endTimeInput   = document.getElementById('endTime');
const timeSlotSelect = document.getElementById('timeSlot');
const costPreview    = document.getElementById('costPreview');

function timeToMinutes(t) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function updateCostPreview() {
  if (!selectedHall) return;
  const hall = selectedHall;
  let durationMins = 0;

  if (hall.fixedSlots) {
    const slot = timeSlotSelect.value;
    if (!slot) { costPreview.style.display = 'none'; return; }
    const [s, e] = slot.split('-');
    durationMins = timeToMinutes(e) - timeToMinutes(s);
  } else {
    const start = startTimeInput.value;
    const end   = endTimeInput.value;
    if (!start || !end) { costPreview.style.display = 'none'; return; }
    durationMins = timeToMinutes(end) - timeToMinutes(start);
  }

  if (durationMins <= 0) { costPreview.style.display = 'none'; return; }

  const hours      = durationMins / 60;
  const hallTotal  = hours * hall.rate;
  const crewTotal  = getCrewTotal();
  const grandTotal = hallTotal + crewTotal;

  document.getElementById('previewDuration').textContent  = `${hours % 1 === 0 ? hours : hours.toFixed(1)} hour${hours !== 1 ? 's' : ''}`;
  document.getElementById('previewRate').textContent      = `RM ${hall.rate} / hour`;
  document.getElementById('previewHallTotal').textContent = `RM ${hallTotal.toFixed(2)}`;
  document.getElementById('previewTotal').textContent     = `RM ${grandTotal.toFixed(2)}`;

  const crewRow = document.getElementById('previewCrewRow');
  if (crewTotal > 0) {
    document.getElementById('previewCrewTotal').textContent = `RM ${crewTotal.toFixed(2)}`;
    crewRow.style.display = 'flex';
  } else {
    crewRow.style.display = 'none';
  }

  costPreview.style.display = 'block';
}

startTimeInput.addEventListener('change', updateCostPreview);
endTimeInput.addEventListener('change', updateCostPreview);
timeSlotSelect.addEventListener('change', updateCostPreview);

// ── Dynamic Form: Event Purpose ───────────────────────────
const purposeSelect    = document.getElementById('eventPurpose');
const secondarySection = document.getElementById('secondarySection');
const primaryLabel     = document.getElementById('primaryLabel');
const secondaryLabel   = document.getElementById('secondaryLabel');
const otherGroup       = document.getElementById('otherPurposeGroup');
const otherInput       = document.getElementById('otherPurpose');
const name2Input       = document.getElementById('name2');
const phone2Input      = document.getElementById('phone2');

purposeSelect.addEventListener('change', () => {
  const val = purposeSelect.value;

  otherGroup.style.display = val === 'other' ? 'block' : 'none';
  otherInput.required      = val === 'other';
  if (val !== 'other') otherInput.value = '';

  if (val === 'engagement' || val === 'wedding') {
    secondarySection.style.display = 'block';
    name2Input.required            = true;
    phone2Input.required           = true;
    primaryLabel.textContent       = val === 'engagement' ? 'Your Details (Bride/Groom-to-be)' : "Bride's Details";
    secondaryLabel.textContent     = val === 'engagement' ? "Partner's Details (Bride/Groom-to-be)" : "Groom's Details";
  } else {
    secondarySection.style.display = 'none';
    name2Input.required            = false;
    phone2Input.required           = false;
    name2Input.value = phone2Input.value = '';
    primaryLabel.textContent       = 'Your Details';
  }
});

// ── Toast ─────────────────────────────────────────────────
function showToast(message, type = 'info', duration = 4000) {
  const container = document.getElementById('toast-container');
  const icons     = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' };
  const toast     = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.innerHTML = `<span>${icons[type] || 'ℹ'}</span><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('fade-out');
    toast.addEventListener('animationend', () => toast.remove());
  }, duration);
}

// ── Validation ────────────────────────────────────────────
function validateForm() {
  const hall    = selectedHall;
  const purpose = purposeSelect.value;

  if (!purpose)                                  { showToast('Please select an event type.', 'error');              return false; }
  if (purpose === 'other' && !otherInput.value.trim()) { showToast('Please describe your event.', 'error');         return false; }
  if (!document.getElementById('name1').value.trim())  { showToast('Please enter your full name.', 'error');        return false; }
  if (!document.getElementById('phone1').value.trim()) { showToast('Please enter your phone number.', 'error');     return false; }
  if (!document.getElementById('church').value.trim()) { showToast('Please enter your church or organisation.', 'error'); return false; }
  if (!document.getElementById('eventDate').value)     { showToast('Please select an event date.', 'error');        return false; }

  if (purpose === 'engagement' || purpose === 'wedding') {
    if (!document.getElementById('name2').value.trim())  { showToast("Please enter your partner's full name.", 'error');    return false; }
    if (!document.getElementById('phone2').value.trim()) { showToast("Please enter your partner's phone number.", 'error'); return false; }
  }

  if (hall.fixedSlots) {
    if (!timeSlotSelect.value) { showToast('Please select a time slot.', 'error'); return false; }
  } else {
    const start = startTimeInput.value;
    const end   = endTimeInput.value;
    if (!start) { showToast('Please enter a start time.', 'error'); return false; }
    if (!end)   { showToast('Please enter an end time.', 'error');  return false; }
    if (timeToMinutes(end) <= timeToMinutes(start)) { showToast('End time must be after start time.', 'error'); return false; }
  }

  // Validate crew — if a crew is checked, at least one day must be selected
  const checkedCrew = document.querySelectorAll('.crew-check:checked');
  for (const cb of checkedCrew) {
    const i    = cb.dataset.index;
    const days = document.querySelectorAll(`.crew-day[data-index="${i}"]:checked`).length;
    if (days === 0) {
      showToast(`Please select attendance day(s) for: ${cb.dataset.role}`, 'error');
      return false;
    }
  }

  return true;
}

// ── Build Payload ─────────────────────────────────────────
function buildPayload() {
  const hall    = selectedHall;
  const purpose = purposeSelect.value;

  let startTime, endTime, durationHours;
  if (hall.fixedSlots) {
    const [s, e] = timeSlotSelect.value.split('-');
    startTime = s; endTime = e;
    durationHours = (timeToMinutes(e) - timeToMinutes(s)) / 60;
  } else {
    startTime     = startTimeInput.value;
    endTime       = endTimeInput.value;
    durationHours = (timeToMinutes(endTime) - timeToMinutes(startTime)) / 60;
  }

  const crewSelections = getCrewSelections();
  const crewTotal      = getCrewTotal();
  const hallTotal      = durationHours * hall.rate;

  return {
    hallKey: selectedHall.id || selectedHall.key, hallName: hall.name, hallRate: hall.rate,
    capacity: hall.capacity, color: hall.color,
    purpose, purposeLabel: purposeSelect.options[purposeSelect.selectedIndex].text,
    otherPurpose: purpose === 'other' ? otherInput.value.trim() : '',
    name1:  document.getElementById('name1').value.trim(),
    phone1: document.getElementById('phone1').value.trim(),
    name2:  document.getElementById('name2').value.trim(),
    phone2: document.getElementById('phone2').value.trim(),
    church: document.getElementById('church').value.trim(),
    eventDate: document.getElementById('eventDate').value,
    startTime, endTime, durationHours,
    hallTotal,
    crewSelections,
    crewTotal,
    estimatedTotal: hallTotal + crewTotal,
    notes: document.getElementById('notes').value.trim(),
    status: 'pending',
    submittedAt: new Date().toISOString(),
    depositAmount: null, depositMethod: null, depositReceipt: null, depositDate: null,
    balanceAmount: null, balanceMethod: null, balanceReceipt: null, balanceDate: null,
  };
}

// ── Submit — go to review page ───────────────────────────
document.getElementById('bookingForm').addEventListener('submit', (e) => {
  e.preventDefault();
  if (!validateForm()) return;

  const payload = buildPayload();
  // Store payload for review page; reference number generated on final confirm
  sessionStorage.setItem('pendingBooking', JSON.stringify(payload));
  window.location.href = 'review.html';
});

// ── Init ──────────────────────────────────────────────────
loadHall();