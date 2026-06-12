// ============================================================
//  BEM ON THE ROCK — Hall Booking | booking.js
// ============================================================

// --- Year ---
document.getElementById('year').textContent = new Date().getFullYear();

// --- Hall Data ---
const HALL_DATA = {
  awan: {
    name: 'Awan Hall',
    tag: 'Main Hall',
    capacity: 500,
    rate: 200,
    color: '#5BA4D8',
  },
  adiwira: {
    name: 'Adiwira Hall',
    tag: 'Medium Hall',
    capacity: 150,
    rate: 100,
    color: '#9B8FE0',
  },
  rock: {
    name: 'Rock Essence',
    tag: 'Dining Hall',
    capacity: 80,
    rate: 100,
    color: '#E0845A',
  },
  office: {
    name: 'Office Meeting Room',
    tag: 'Meeting Room',
    capacity: 20,
    rate: 50,
    color: '#5DC490',
    fixedSlots: true,
  },
  vip: {
    name: 'VIP Lounge',
    tag: 'Lounge',
    capacity: 12,
    rate: 50,
    color: '#ECA820',
  },
};

// --- Load Hall from sessionStorage ---
let selectedHall = null;

function loadHall() {
  const stored = sessionStorage.getItem('selectedHall');
  if (!stored) {
    // No hall selected — redirect back
    window.location.href = 'index.html';
    return;
  }

  try {
    selectedHall = JSON.parse(stored);
  } catch {
    window.location.href = 'index.html';
    return;
  }

  const hall = HALL_DATA[selectedHall.key];
  if (!hall) {
    window.location.href = 'index.html';
    return;
  }

  // Populate banner
  document.getElementById('hallBannerAccent').style.background = hall.color;
  document.getElementById('hallBannerTag').textContent = hall.tag;
  document.getElementById('hallBannerTag').style.background = hall.color;
  // Keep tag text black for lighter hall colors
  document.getElementById('hallBannerTag').style.color = '#0D0D0D';
  document.getElementById('hallBannerName').textContent = hall.name;
  document.getElementById('hallBannerMeta').textContent = `Capacity: up to ${hall.capacity} pax`;
  document.getElementById('hallBannerPrice').innerHTML =
    `RM ${hall.rate}<span>/ hour</span>`;

  // Office Meeting Room uses fixed slots instead of free time input
  if (hall.fixedSlots) {
    document.getElementById('timeRangeGroup').style.display = 'none';
    document.getElementById('slotGroup').style.display = 'block';
  }

  // Set minimum booking date to today
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('eventDate').min = today;
}

loadHall();

// --- Dynamic Form: Event Purpose ---
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

  // Show/hide "other" text input
  if (val === 'other') {
    otherGroup.style.display = 'block';
    otherInput.required = true;
  } else {
    otherGroup.style.display = 'none';
    otherInput.required = false;
    otherInput.value = '';
  }

  // Show/hide secondary contact for engagement/wedding
  if (val === 'engagement' || val === 'wedding') {
    secondarySection.style.display = 'block';
    name2Input.required = true;
    phone2Input.required = true;

    if (val === 'engagement') {
      primaryLabel.textContent = "Your Details (Bride/Groom-to-be)";
      secondaryLabel.textContent = "Partner's Details (Bride/Groom-to-be)";
    } else {
      primaryLabel.textContent = "Bride's Details";
      secondaryLabel.textContent = "Groom's Details";
    }
  } else {
    secondarySection.style.display = 'none';
    name2Input.required = false;
    phone2Input.required = false;
    name2Input.value = '';
    phone2Input.value = '';
    primaryLabel.textContent = "Your Details";
  }

  updateCostPreview();
});

// --- Cost Preview ---
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
  const hall = HALL_DATA[selectedHall.key];

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

  const hours = durationMins / 60;
  const total = hours * hall.rate;

  document.getElementById('previewDuration').textContent =
    `${hours % 1 === 0 ? hours : hours.toFixed(1)} hour${hours !== 1 ? 's' : ''}`;
  document.getElementById('previewRate').textContent =
    `RM ${hall.rate} / hour`;
  document.getElementById('previewTotal').textContent =
    `RM ${total.toFixed(2)}`;

  costPreview.style.display = 'block';
}

startTimeInput.addEventListener('change', updateCostPreview);
endTimeInput.addEventListener('change', updateCostPreview);
timeSlotSelect.addEventListener('change', updateCostPreview);

// --- Toast ---
function showToast(message, type = 'info', duration = 4000) {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const icons = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' };
  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.innerHTML = `<span>${icons[type] || icons.info}</span><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('fade-out');
    toast.addEventListener('animationend', () => toast.remove());
  }, duration);
}

// --- Form Validation ---
function validateForm() {
  const hall        = HALL_DATA[selectedHall?.key];
  const purpose     = purposeSelect.value;
  const memberRadio = document.querySelector('input[name="memberStatus"]:checked');
  const name1       = document.getElementById('name1').value.trim();
  const phone1      = document.getElementById('phone1').value.trim();
  const church      = document.getElementById('church').value.trim();
  const eventDate   = document.getElementById('eventDate').value;

  if (!purpose)      { showToast('Please select an event type.', 'error'); return false; }
  if (purpose === 'other' && !otherInput.value.trim()) {
    showToast('Please describe your event.', 'error'); return false;
  }
  if (!memberRadio)  { showToast('Please indicate your membership status.', 'error'); return false; }
  if (!name1)        { showToast('Please enter your full name.', 'error'); return false; }
  if (!phone1)       { showToast('Please enter your phone number.', 'error'); return false; }
  if (!church)       { showToast('Please enter your church or organisation name.', 'error'); return false; }
  if (!eventDate)    { showToast('Please select a date for your event.', 'error'); return false; }

  if ((purpose === 'engagement' || purpose === 'wedding')) {
    const name2  = document.getElementById('name2').value.trim();
    const phone2 = document.getElementById('phone2').value.trim();
    if (!name2)  { showToast("Please enter your partner's full name.", 'error'); return false; }
    if (!phone2) { showToast("Please enter your partner's phone number.", 'error'); return false; }
  }

  if (hall.fixedSlots) {
    if (!timeSlotSelect.value) { showToast('Please select a time slot.', 'error'); return false; }
  } else {
    const start = startTimeInput.value;
    const end   = endTimeInput.value;
    if (!start) { showToast('Please enter a start time.', 'error'); return false; }
    if (!end)   { showToast('Please enter an end time.', 'error'); return false; }
    if (timeToMinutes(end) <= timeToMinutes(start)) {
      showToast('End time must be after start time.', 'error'); return false;
    }
  }

  return true;
}

// --- Build Submission Payload ---
function buildPayload() {
  const hall    = HALL_DATA[selectedHall.key];
  const purpose = purposeSelect.value;
  const member  = document.querySelector('input[name="memberStatus"]:checked').value;

  let startTime, endTime, durationHours;

  if (hall.fixedSlots) {
    const [s, e] = timeSlotSelect.value.split('-');
    startTime     = s;
    endTime       = e;
    durationHours = (timeToMinutes(e) - timeToMinutes(s)) / 60;
  } else {
    startTime     = startTimeInput.value;
    endTime       = endTimeInput.value;
    durationHours = (timeToMinutes(endTime) - timeToMinutes(startTime)) / 60;
  }

  const estimatedTotal = durationHours * hall.rate;

  const payload = {
    // Hall
    hallKey:        selectedHall.key,
    hallName:       hall.name,
    hallRate:       hall.rate,

    // Event
    purpose:        purpose,
    purposeLabel:   purposeSelect.options[purposeSelect.selectedIndex].text,
    otherPurpose:   purpose === 'other' ? otherInput.value.trim() : '',
    memberStatus:   member,

    // Primary contact
    name1:          document.getElementById('name1').value.trim(),
    phone1:         document.getElementById('phone1').value.trim(),

    // Secondary (only for engagement/wedding)
    name2:          document.getElementById('name2').value.trim(),
    phone2:         document.getElementById('phone2').value.trim(),

    // Organisation
    church:         document.getElementById('church').value.trim(),

    // Schedule
    eventDate:      document.getElementById('eventDate').value,
    startTime,
    endTime,
    durationHours,
    estimatedTotal,

    // Notes
    notes: document.getElementById('notes').value.trim(),

    // Meta
    status:         'pending',
    submittedAt:    new Date().toISOString(),

    // Payment tracking (to be filled by admin)
    depositAmount:  null,
    depositMethod:  null,
    depositReceipt: null,
    depositDate:    null,
    balanceAmount:  null,
    balanceMethod:  null,
    balanceReceipt: null,
    balanceDate:    null,
  };

  return payload;
}

// --- Firebase Submission ---
// TODO: Replace the config values below with your actual Firebase project credentials
// after creating the new Firebase project for the Hall Booking System.
import { initializeApp }       from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, collection, addDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey:            "YOUR_API_KEY",
  authDomain:        "YOUR_AUTH_DOMAIN",
  projectId:         "YOUR_PROJECT_ID",
  storageBucket:     "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId:             "YOUR_APP_ID",
};

const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);

// --- Form Submit ---
document.getElementById('bookingForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!validateForm()) return;

  const submitBtn = document.getElementById('submitBtn');
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<span class="spinner"></span> Submitting...';

  try {
    const payload = buildPayload();
    await addDoc(collection(db, 'hall_bookings'), payload);

    // Store submission summary for confirmation page
    sessionStorage.setItem('bookingSubmission', JSON.stringify({
      hallName:  payload.hallName,
      eventDate: payload.eventDate,
      name1:     payload.name1,
      purpose:   payload.purposeLabel,
    }));

    window.location.href = 'confirmation.html';

  } catch (err) {
    console.error('Submission error:', err);
    showToast('Something went wrong. Please try again.', 'error');
    submitBtn.disabled = false;
    submitBtn.innerHTML = 'Submit Booking Request';
  }
});