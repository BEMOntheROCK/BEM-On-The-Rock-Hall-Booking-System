// ============================================================
//  BEM ON THE ROCK — Hall Booking | calendar.js
// ============================================================

import { auth, db } from "./firebase.js";
import { onAuthStateChanged, signOut }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  collection, onSnapshot, doc, updateDoc, deleteDoc, query, orderBy
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ── Auth Guard ────────────────────────────────────────────
onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.replace('login.html');
  } else {
    document.getElementById('adminEmail').textContent = user.email;
    initCalendar();
  }
});

document.getElementById('logoutBtn').addEventListener('click', async () => {
  await signOut(auth);
  window.location.replace('login.html');
});

// ── State ─────────────────────────────────────────────────
let allBookings   = [];
let activeFilter  = 'all';
let activePanelId = null;
let currentYear   = new Date().getFullYear();
let currentMonth  = new Date().getMonth();

// ── Hall Meta ─────────────────────────────────────────────
const HALL_META = {
  awan:    { color: '#5BA4D8' },
  adiwira: { color: '#9B8FE0' },
  rock:    { color: '#E0845A' },
  office:  { color: '#5DC490' },
  vip:     { color: '#ECA820' },
};

function hallColor(key) {
  return HALL_META[key]?.color || '#C0C0C0';
}

// ── Init ──────────────────────────────────────────────────
function initCalendar() {
  const q = query(collection(db, 'hall_bookings'), orderBy('eventDate', 'asc'));
  onSnapshot(q, (snapshot) => {
    allBookings = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    renderCalendar();
    if (activePanelId) {
      const b = allBookings.find(x => x.id === activePanelId);
      if (b) renderPanel(b);
      else closePanel();
    }
  });
}

// ── Month Navigation ──────────────────────────────────────
window.changeMonth = function(dir) {
  currentMonth += dir;
  if (currentMonth > 11) { currentMonth = 0;  currentYear++; }
  if (currentMonth < 0)  { currentMonth = 11; currentYear--; }
  renderCalendar();
};

window.goToToday = function() {
  const now    = new Date();
  currentYear  = now.getFullYear();
  currentMonth = now.getMonth();
  renderCalendar();
};

// ── Filter ────────────────────────────────────────────────
window.setFilter = function(hall) {
  activeFilter = hall;
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.hall === hall);
  });
  renderCalendar();
};

// ── Render Calendar ───────────────────────────────────────
function renderCalendar() {
  const monthNames = [
    'January','February','March','April','May','June',
    'July','August','September','October','November','December'
  ];
  document.getElementById('calMonthLabel').textContent =
    `${monthNames[currentMonth]} ${currentYear}`;

  const bookings = allBookings.filter(b => {
    if (b.status !== 'approved') return false;
    if (activeFilter !== 'all' && b.hallKey !== activeFilter) return false;
    return true;
  });

  // Build day map
  const dayMap = {};
  bookings.forEach(b => {
    if (!b.eventDate) return;
    if (!dayMap[b.eventDate]) dayMap[b.eventDate] = [];
    dayMap[b.eventDate].push(b);
  });

  const firstDay    = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const daysInPrev  = new Date(currentYear, currentMonth, 0).getDate();
  const todayStr    = new Date().toISOString().split('T')[0];

  // Rebuild grid — keep headers
  const grid    = document.getElementById('calendarGrid');
  const headers = Array.from(grid.querySelectorAll('.calendar-day-header'));
  grid.innerHTML = '';
  headers.forEach(h => grid.appendChild(h));

  let hasEvents = false;

  for (let i = 0; i < 42; i++) {
    const cell = document.createElement('div');
    cell.className = 'calendar-day';

    let dayNum, dateStr, isOtherMonth = false;

    if (i < firstDay) {
      dayNum       = daysInPrev - firstDay + 1 + i;
      const prevM  = currentMonth === 0 ? 12 : currentMonth;
      const prevY  = currentMonth === 0 ? currentYear - 1 : currentYear;
      dateStr      = `${prevY}-${String(prevM).padStart(2,'0')}-${String(dayNum).padStart(2,'0')}`;
      isOtherMonth = true;
    } else if (i >= firstDay + daysInMonth) {
      dayNum       = i - firstDay - daysInMonth + 1;
      const nextM  = currentMonth === 11 ? 1 : currentMonth + 2;
      const nextY  = currentMonth === 11 ? currentYear + 1 : currentYear;
      dateStr      = `${nextY}-${String(nextM).padStart(2,'0')}-${String(dayNum).padStart(2,'0')}`;
      isOtherMonth = true;
    } else {
      dayNum  = i - firstDay + 1;
      dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2,'0')}-${String(dayNum).padStart(2,'0')}`;
    }

    if (isOtherMonth) cell.classList.add('calendar-day--other-month');
    if (dateStr === todayStr) cell.classList.add('calendar-day--today');

    const numEl = document.createElement('div');
    numEl.className   = 'calendar-day__num';
    numEl.textContent = dayNum;
    cell.appendChild(numEl);

    const dayBookings = dayMap[dateStr] || [];
    dayBookings.forEach(b => {
      if (!isOtherMonth) hasEvents = true;
      const evt       = document.createElement('div');
      evt.className   = 'calendar-event';
      evt.style.background = hallColor(b.hallKey);
      evt.title       = `${b.hallName} — ${b.name1}`;
      evt.textContent = `${formatTime(b.startTime)} ${b.name1}`;
      evt.onclick     = (e) => { e.stopPropagation(); openPanel(b.id); };
      cell.appendChild(evt);
    });

    grid.appendChild(cell);
  }

  const currentMonthPrefix = `${currentYear}-${String(currentMonth + 1).padStart(2,'0')}`;
  const hasThisMonth = Object.keys(dayMap).some(d => d.startsWith(currentMonthPrefix));
  document.getElementById('calEmptyState').style.display =
    (!hasThisMonth) ? 'block' : 'none';
}

// ── Side Panel ────────────────────────────────────────────
window.openPanel = function(id) {
  const b = allBookings.find(x => x.id === id);
  if (!b) return;
  activePanelId = id;
  renderPanel(b);
  document.getElementById('sidePanel').classList.add('open');
  document.getElementById('panelOverlay').classList.add('open');
};

window.closePanel = function() {
  activePanelId = null;
  document.getElementById('sidePanel').classList.remove('open');
  document.getElementById('panelOverlay').classList.remove('open');
};

function renderPanel(b) {
  document.getElementById('panelTitle').textContent = b.hallName;
  const totalEst = b.estimatedTotal
    ? `RM ${parseFloat(b.estimatedTotal).toFixed(2)}` : '—';

  document.getElementById('panelBody').innerHTML = `
    <div style="display:flex; gap:var(--space-sm); flex-wrap:wrap; margin-bottom:var(--space-lg);">
      <span class="badge badge--approved">Approved</span>
      ${memberBadge(b.memberStatus)}
      ${paymentBadge(b)}
    </div>

    <div style="height:3px; border-radius:2px; background:${hallColor(b.hallKey)}; margin-bottom:var(--space-lg);"></div>

    <div class="detail-section">
      <div class="detail-section__title">Event Details</div>
      <div class="detail-row"><span class="detail-row__label">Reference No.</span><span class="detail-row__value" style="font-family:monospace; color:var(--marigold);">${b.referenceNumber || '—'}</span></div>
      <div class="detail-row"><span class="detail-row__label">Hall</span><span class="detail-row__value">${b.hallName}</span></div>
      <div class="detail-row"><span class="detail-row__label">Event Type</span><span class="detail-row__value">${b.purposeLabel}${b.otherPurpose ? ` — ${b.otherPurpose}` : ''}</span></div>
      <div class="detail-row"><span class="detail-row__label">Date</span><span class="detail-row__value">${formatDate(b.eventDate)}</span></div>
      <div class="detail-row"><span class="detail-row__label">Time</span><span class="detail-row__value">${formatTime(b.startTime)} – ${formatTime(b.endTime)}</span></div>
      <div class="detail-row"><span class="detail-row__label">Duration</span><span class="detail-row__value">${b.durationHours} hour${b.durationHours !== 1 ? 's' : ''}</span></div>
      <div class="detail-row"><span class="detail-row__label">Est. Total</span><span class="detail-row__value" style="color:var(--marigold); font-weight:600;">${totalEst}</span></div>
    </div>

    <div class="detail-section">
      <div class="detail-section__title">Contact Details</div>
      <div class="detail-row"><span class="detail-row__label">Name 1</span><span class="detail-row__value">${b.name1}</span></div>
      <div class="detail-row"><span class="detail-row__label">Phone 1</span><span class="detail-row__value"><a href="tel:${b.phone1}" style="color:var(--marigold);">${b.phone1}</a></span></div>
      ${b.name2  ? `<div class="detail-row"><span class="detail-row__label">Name 2</span><span class="detail-row__value">${b.name2}</span></div>` : ''}
      ${b.phone2 ? `<div class="detail-row"><span class="detail-row__label">Phone 2</span><span class="detail-row__value"><a href="tel:${b.phone2}" style="color:var(--marigold);">${b.phone2}</a></span></div>` : ''}
      <div class="detail-row"><span class="detail-row__label">Church / Org</span><span class="detail-row__value">${b.church}</span></div>
    </div>

    ${b.notes ? `
    <div class="detail-section">
      <div class="detail-section__title">Notes</div>
      <p style="font-size:0.86rem; color:var(--silver); margin:0;">${b.notes}</p>
    </div>` : ''}

    <div class="detail-section">
      <div class="detail-section__title">Payment Summary</div>
      <div class="detail-row"><span class="detail-row__label">Deposit</span><span class="detail-row__value">${b.depositAmount ? `RM ${parseFloat(b.depositAmount).toFixed(2)} (${b.depositMethod})` : '—'}</span></div>
      ${b.depositReceipt ? `<div class="detail-row"><span class="detail-row__label">Receipt</span><span class="detail-row__value">${b.depositReceipt}</span></div>` : ''}
      ${b.depositDate    ? `<div class="detail-row"><span class="detail-row__label">Date</span><span class="detail-row__value">${formatDate(b.depositDate)}</span></div>` : ''}
      <div class="detail-row"><span class="detail-row__label">Balance</span><span class="detail-row__value">${b.balanceAmount ? `RM ${parseFloat(b.balanceAmount).toFixed(2)} (${b.balanceMethod})` : '—'}</span></div>
      ${b.balanceReceipt ? `<div class="detail-row"><span class="detail-row__label">Receipt</span><span class="detail-row__value">${b.balanceReceipt}</span></div>` : ''}
      ${b.balanceDate    ? `<div class="detail-row"><span class="detail-row__label">Date</span><span class="detail-row__value">${formatDate(b.balanceDate)}</span></div>` : ''}
    </div>

    <div class="detail-section">
      <div class="detail-section__title">Edit Booking</div>
      <div class="form-row" style="margin-bottom:var(--space-sm);">
        <div class="form-group" style="margin-bottom:0;">
          <label class="form-label">Event Date</label>
          <input class="form-input form-input--sm" type="date" id="editDate" value="${b.eventDate || ''}" />
        </div>
        <div class="form-group" style="margin-bottom:0;">
          <label class="form-label">Start Time</label>
          <input class="form-input form-input--sm" type="time" id="editStart" value="${b.startTime || ''}" />
        </div>
      </div>
      <div class="form-row">
        <div class="form-group" style="margin-bottom:0;">
          <label class="form-label">End Time</label>
          <input class="form-input form-input--sm" type="time" id="editEnd" value="${b.endTime || ''}" />
        </div>
        <div class="form-group" style="margin-bottom:0;">
          <label class="form-label">Notes</label>
          <input class="form-input form-input--sm" type="text" id="editNotes" value="${b.notes || ''}" placeholder="Optional" />
        </div>
      </div>
      <button class="btn btn--outline btn--sm" style="margin-top:var(--space-md);" onclick="saveEdits('${b.id}')">Save Changes</button>
    </div>
  `;

  document.getElementById('panelFooter').innerHTML = `
    <button class="btn btn--outline btn--sm" onclick="generateInvoice('${b.id}')">🧾 Invoice</button>
    <button class="btn btn--ghost btn--sm"   onclick="confirmArchive('${b.id}')">Archive</button>
    <button class="btn btn--danger btn--sm"  onclick="confirmDelete('${b.id}')">Delete</button>
  `;
}

// ── Edit Booking ──────────────────────────────────────────
window.saveEdits = async function(id) {
  const date  = document.getElementById('editDate')?.value;
  const start = document.getElementById('editStart')?.value;
  const end   = document.getElementById('editEnd')?.value;
  const notes = document.getElementById('editNotes')?.value.trim();

  if (!date || !start || !end) {
    showToast('Date and times are required.', 'error'); return;
  }
  if (timeToMinutes(end) <= timeToMinutes(start)) {
    showToast('End time must be after start time.', 'error'); return;
  }

  const durationHours  = (timeToMinutes(end) - timeToMinutes(start)) / 60;
  const b              = allBookings.find(x => x.id === id);
  const estimatedTotal = durationHours * (b?.hallRate || 0);

  await updateDoc(doc(db, 'hall_bookings', id), {
    eventDate: date, startTime: start, endTime: end,
    durationHours, estimatedTotal, notes: notes || '',
  });
  showToast('Booking updated.', 'success');
};

// ── Archive / Delete ──────────────────────────────────────
window.confirmArchive = function(id) {
  openConfirmModal(
    'Archive Booking',
    'This booking will be moved to the archived tab. It will be permanently deleted after 90 days.',
    'Archive', 'btn--danger',
    () => archiveBooking(id)
  );
};

async function archiveBooking(id) {
  await updateDoc(doc(db, 'hall_bookings', id), {
    status: 'rejected', archivedAt: new Date().toISOString(),
  });
  showToast('Booking archived.', 'warning');
  closePanel();
}

window.confirmDelete = function(id) {
  openConfirmModal(
    'Delete Booking',
    'This will permanently delete this booking. This action cannot be undone.',
    'Delete', 'btn--danger',
    () => deleteBooking(id)
  );
};

async function deleteBooking(id) {
  await deleteDoc(doc(db, 'hall_bookings', id));
  showToast('Booking deleted.', 'warning');
  closePanel();
}

// ── Invoice ───────────────────────────────────────────────
window.generateInvoice = function(id) {
  const b = allBookings.find(x => x.id === id);
  if (!b) return;
  const payStatus   = getPaymentStatus(b);
  const depositPaid = b.depositAmount  ? `RM ${parseFloat(b.depositAmount).toFixed(2)}`  : '—';
  const balancePaid = b.balanceAmount  ? `RM ${parseFloat(b.balanceAmount).toFixed(2)}`  : '—';
  const totalEst    = b.estimatedTotal ? `RM ${parseFloat(b.estimatedTotal).toFixed(2)}` : '—';
  const memberLabel = b.memberStatus === 'member' ? 'Church Member' : 'Outsider / Non-member';

  const win = window.open('', '_blank');
  win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Invoice — ${b.name1}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0;}
    body{font-family:'Inter',sans-serif;background:#fff;color:#111;padding:48px;max-width:720px;margin:0 auto;}
    .inv-header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:36px;border-bottom:2px solid #ECA820;padding-bottom:24px;}
    .inv-header h1{font-family:'Playfair Display',serif;font-size:28px;color:#111;}
    .inv-header p{font-size:12px;color:#444;margin-top:4px;}
    .inv-badge{background:#ECA820;color:#111;font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;padding:4px 10px;border-radius:4px;}
    .inv-ref{font-size:11px;color:#555;margin-top:6px;font-family:'Courier New',monospace;letter-spacing:0.05em;}
    .inv-section{margin-bottom:28px;}
    .inv-section h3{font-size:10px;font-weight:700;letter-spacing:.15em;text-transform:uppercase;color:#B8860B;margin-bottom:12px;border-bottom:1px solid #ddd;padding-bottom:6px;}
    .inv-row{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #f0f0f0;font-size:13px;}
    .inv-row span:first-child{color:#444;}
    .inv-row span:last-child{font-weight:600;color:#111;}
    .inv-total{background:#f9f7f2;border:1px solid #e8e0cc;border-radius:8px;padding:16px;margin-top:8px;display:flex;justify-content:space-between;align-items:center;}
    .inv-total span:first-child{font-size:13px;color:#444;}
    .inv-total span:last-child{font-size:22px;font-family:'Playfair Display',serif;font-weight:700;color:#B8860B;}
    .inv-footer{margin-top:40px;font-size:11px;color:#666;text-align:center;border-top:1px solid #ddd;padding-top:16px;}
    @media print{body{padding:24px;}}
  </style></head><body>
  <div class="inv-header"><div><h1>BEM On The Rock</h1><p>Hall Booking Invoice</p><p style="margin-top:8px;color:#aaa;font-size:11px;">Generated: ${new Date().toLocaleDateString('en-MY',{day:'numeric',month:'long',year:'numeric'})}</p></div><div style='text-align:right'><span class="inv-badge">${payStatus}</span><div class="inv-ref">Ref: ${b.referenceNumber || '—'}</div></div></div>
  <div class="inv-section"><h3>Renter Details</h3>
    <div class="inv-row"><span>Name</span><span>${b.name1}${b.name2?` &amp; ${b.name2}`:''}</span></div>
    <div class="inv-row"><span>Phone</span><span>${b.phone1}${b.phone2?` / ${b.phone2}`:''}</span></div>
    <div class="inv-row"><span>Church / Organisation</span><span>${b.church}</span></div>
    <div class="inv-row"><span>Member Status</span><span>${memberLabel}</span></div>
  </div>
  <div class="inv-section"><h3>Booking Details</h3>
    <div class="inv-row"><span>Hall</span><span>${b.hallName}</span></div>
    <div class="inv-row"><span>Event Type</span><span>${b.purposeLabel}${b.otherPurpose?` — ${b.otherPurpose}`:''}</span></div>
    <div class="inv-row"><span>Date</span><span>${formatDate(b.eventDate)}</span></div>
    <div class="inv-row"><span>Time</span><span>${formatTime(b.startTime)} – ${formatTime(b.endTime)}</span></div>
    <div class="inv-row"><span>Duration</span><span>${b.durationHours} hour${b.durationHours!==1?'s':''}</span></div>
    <div class="inv-row"><span>Rate</span><span>RM ${b.hallRate} / hour</span></div>
  </div>
  <div class="inv-section"><h3>Charges</h3>
    <div class="inv-row"><span>Hall Rental (${b.durationHours} hr × RM ${b.hallRate})</span><span>${b.hallTotal ? `RM ${parseFloat(b.hallTotal).toFixed(2)}` : totalEst}</span></div>
    ${b.crewSelections && b.crewSelections.length > 0 ? b.crewSelections.map(c =>
      `<div class="inv-row"><span>Crew — ${c.role} (${c.days.map(d => d === 'rehearsal' ? 'Rehearsal' : 'Event Day').join(' + ')})</span><span>RM ${c.cost}.00</span></div>`
    ).join('') : ''}
    ${b.crewTotal ? `<div class="inv-row"><span>Crew Subtotal</span><span>RM ${parseFloat(b.crewTotal).toFixed(2)}</span></div>` : ''}
    <div class="inv-total"><span>Estimated Total</span><span>${totalEst}</span></div>
  </div>
  <div class="inv-section"><h3>Payment</h3>
    <div class="inv-row"><span>Deposit Paid</span><span>${depositPaid}${b.depositMethod?` (${b.depositMethod})`:''}${b.depositReceipt?` — ${b.depositReceipt}`:''}${b.depositDate?` — ${formatDate(b.depositDate)}`:''}</span></div>
    <div class="inv-row"><span>Balance Paid</span><span>${balancePaid}${b.balanceMethod?` (${b.balanceMethod})`:''}${b.balanceReceipt?` — ${b.balanceReceipt}`:''}${b.balanceDate?` — ${formatDate(b.balanceDate)}`:''}</span></div>
  </div>
  <div class="inv-footer"><p>Payment via cash at church office or bank transfer — Public Bank Account No: <strong>3187701204</strong></p><p style="margin-top:4px;">Remark: SEWA HALL &amp; YOUR NAME &nbsp;|&nbsp; BEM On The Rock Hall Booking System</p></div>
  <script>window.onload=()=>window.print();<\/script></body></html>`);
  win.document.close();
};

// ── Confirm Modal ─────────────────────────────────────────
function openConfirmModal(title, message, actionLabel, btnClass, onConfirm) {
  document.getElementById('confirmTitle').textContent   = title;
  document.getElementById('confirmMessage').textContent = message;
  const btn   = document.getElementById('confirmActionBtn');
  btn.textContent = actionLabel;
  btn.className   = `btn btn--sm ${btnClass}`;
  btn.onclick     = () => { closeConfirmModal(); onConfirm(); };
  document.getElementById('confirmModal').classList.add('open');
}

window.closeConfirmModal = function() {
  document.getElementById('confirmModal').classList.remove('open');
};

// ── Helpers ───────────────────────────────────────────────
function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-MY', { day:'numeric', month:'short', year:'numeric' });
}

function formatTime(t) {
  if (!t) return '—';
  const [h, m] = t.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2,'0')}${h >= 12 ? 'pm' : 'am'}`;
}

function timeToMinutes(t) {
  if (!t) return 0;
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function getPaymentStatus(b) {
  if (b.balanceDate) return 'Fully Paid';
  if (b.depositDate) return 'Deposit Paid';
  return 'Unpaid';
}

function paymentBadge(b) {
  const s   = getPaymentStatus(b);
  const cls = s === 'Fully Paid' ? 'badge--paid' : s === 'Deposit Paid' ? 'badge--partial' : 'badge--unpaid';
  return `<span class="badge ${cls}">${s}</span>`;
}

function memberBadge(val) {
  return val === 'member'
    ? `<span class="badge badge--member">Member</span>`
    : `<span class="badge badge--outsider">Outsider</span>`;
}

function showToast(message, type = 'info', duration = 3500) {
  const container = document.getElementById('toast-container');
  const icons = { success:'✓', error:'✕', warning:'⚠', info:'ℹ' };
  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.innerHTML = `<span>${icons[type]||'ℹ'}</span><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('fade-out');
    toast.addEventListener('animationend', () => toast.remove());
  }, duration);
}