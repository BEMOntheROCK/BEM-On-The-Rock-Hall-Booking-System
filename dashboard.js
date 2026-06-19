// ============================================================
//  BEM ON THE ROCK — Hall Booking | dashboard.js
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
    initDashboard();
  }
});

document.getElementById('logoutBtn').addEventListener('click', async () => {
  await signOut(auth);
  window.location.replace('login.html');
});

// ── State ─────────────────────────────────────────────────
let allBookings    = [];   // all docs from Firestore
let activeTab      = 'pending';
let activePanelId  = null; // currently open booking id
let searchQuery    = '';

// ── Init ──────────────────────────────────────────────────
function initDashboard() {
  // Real-time listener
  const q = query(collection(db, 'hall_bookings'), orderBy('submittedAt', 'desc'));
  onSnapshot(q, (snapshot) => {
    allBookings = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    autoDeleteExpired();
    renderAll();
    updateStats();

    // Refresh side panel if open
    if (activePanelId) {
      const booking = allBookings.find(b => b.id === activePanelId);
      if (booking) renderPanel(booking);
      else closePanel();
    }
  });
}

// ── Auto-delete archived bookings older than 90 days ──────
async function autoDeleteExpired() {
  const now      = Date.now();
  const ninetyMs = 90 * 24 * 60 * 60 * 1000;
  for (const b of allBookings) {
    if (b.status !== 'rejected') continue;
    const archivedAt = b.archivedAt ? new Date(b.archivedAt).getTime() : null;
    if (archivedAt && (now - archivedAt) > ninetyMs) {
      await deleteDoc(doc(db, 'hall_bookings', b.id));
    }
  }
}

// ── Search ────────────────────────────────────────────────
document.getElementById('searchInput').addEventListener('input', (e) => {
  searchQuery = e.target.value.toLowerCase();
  renderAll();
});

function matchesSearch(b) {
  if (!searchQuery) return true;
  return (
    (b.name1       || '').toLowerCase().includes(searchQuery) ||
    (b.name2       || '').toLowerCase().includes(searchQuery) ||
    (b.hallName    || '').toLowerCase().includes(searchQuery) ||
    (b.purposeLabel|| '').toLowerCase().includes(searchQuery) ||
    (b.church      || '').toLowerCase().includes(searchQuery)
  );
}

// ── Tab Switching ─────────────────────────────────────────
window.switchTab = function(tab) {
  activeTab = tab;
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tab);
  });
  ['pending','approved','archived'].forEach(t => {
    document.getElementById(`tab-${t}`).style.display = t === tab ? 'block' : 'none';
  });
  closePanel();
};

// ── Stats ─────────────────────────────────────────────────
function updateStats() {
  const pending  = allBookings.filter(b => b.status === 'pending').length;
  const approved = allBookings.filter(b => b.status === 'approved').length;
  const rejected = allBookings.filter(b => b.status === 'rejected').length;
  const paid     = allBookings.filter(b => getPaymentStatus(b) === 'Fully Paid').length;

  document.getElementById('statPending').textContent  = pending;
  document.getElementById('statApproved').textContent = approved;
  document.getElementById('statRejected').textContent = rejected;
  document.getElementById('statFullyPaid').textContent= paid;
}

// ── Helpers ───────────────────────────────────────────────
function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatDateTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatTime(t) {
  if (!t) return '—';
  const [h, m] = t.split(':').map(Number);
  const suffix = h >= 12 ? 'pm' : 'am';
  const hour   = h % 12 || 12;
  return `${hour}:${String(m).padStart(2,'0')}${suffix}`;
}

function deleteDate(archivedAt) {
  if (!archivedAt) return '—';
  const d = new Date(new Date(archivedAt).getTime() + 90 * 24 * 60 * 60 * 1000);
  return d.toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' });
}

function getPaymentStatus(b) {
  if (b.balanceDate)  return 'Fully Paid';
  if (b.depositDate)  return 'Deposit Paid';
  return 'Unpaid';
}

function paymentBadge(b) {
  const status = getPaymentStatus(b);
  const cls    = status === 'Fully Paid'   ? 'badge--paid'
               : status === 'Deposit Paid' ? 'badge--partial'
               :                             'badge--unpaid';
  return `<span class="badge ${cls}">${status}</span>`;
}

function memberBadge(val) {
  return val === 'member'
    ? `<span class="badge badge--member">Member</span>`
    : `<span class="badge badge--outsider">Outsider</span>`;
}

function statusBadge(status) {
  const map = {
    pending:  'badge--pending',
    approved: 'badge--approved',
    rejected: 'badge--rejected',
  };
  return `<span class="badge ${map[status] || ''}">${capitalize(status)}</span>`;
}

function capitalize(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
}

// ── Render Tables ─────────────────────────────────────────
function renderAll() {
  renderTable('pending');
  renderTable('approved');
  renderTable('archived');
}

function renderTable(tab) {
  const statusMap = { pending: 'pending', approved: 'approved', archived: 'rejected' };
  const status    = statusMap[tab];
  const bodyId    = `${tab}Body`;
  const tbody     = document.getElementById(bodyId);
  if (!tbody) return;

  const filtered = allBookings.filter(b => b.status === status && matchesSearch(b));

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7">
      <div class="empty-state">
        <div class="empty-state__icon">📭</div>
        <div class="empty-state__title">No ${tab} bookings</div>
        <div class="empty-state__text">${
          tab === 'pending'  ? 'New booking requests will appear here.' :
          tab === 'approved' ? 'Approved bookings will appear here.' :
          'Rejected bookings will be archived here for 90 days.'
        }</div>
      </div>
    </td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(b => {
    if (tab === 'archived') {
      return `<tr onclick="openPanel('${b.id}')">
        <td><strong style="color:var(--white);">${b.name1}</strong>${b.name2 ? `<br><span style="font-size:0.78rem;color:var(--silver-dark);">${b.name2}</span>` : ''}</td>
        <td>${b.hallName}</td>
        <td>${formatDate(b.eventDate)}</td>
        <td>${b.purposeLabel}</td>
        <td>${memberBadge(b.memberStatus)}</td>
        <td style="font-size:0.8rem;">${formatDateTime(b.archivedAt)}</td>
        <td style="font-size:0.8rem; color:var(--danger);">${deleteDate(b.archivedAt)}</td>
      </tr>`;
    }
    return `<tr onclick="openPanel('${b.id}')">
      <td><strong style="color:var(--white);">${b.name1}</strong>${b.name2 ? `<br><span style="font-size:0.78rem;color:var(--silver-dark);">${b.name2}</span>` : ''}</td>
      <td>${b.hallName}</td>
      <td>${formatDate(b.eventDate)}</td>
      <td>${b.purposeLabel}${b.otherPurpose ? `<br><span style="font-size:0.78rem;color:var(--silver-dark);">${b.otherPurpose}</span>` : ''}</td>
      <td>${memberBadge(b.memberStatus)}</td>
      <td style="font-size:0.8rem;">${formatDateTime(b.submittedAt)}</td>
      <td>${paymentBadge(b)}</td>
    </tr>`;
  }).join('');
}

// ── Side Panel ────────────────────────────────────────────
window.openPanel = function(id) {
  const booking = allBookings.find(b => b.id === id);
  if (!booking) return;
  activePanelId = id;
  renderPanel(booking);
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

  // ── Body ──
  const payStatus = getPaymentStatus(b);
  const estimatedTotal = b.estimatedTotal
    ? `RM ${parseFloat(b.estimatedTotal).toFixed(2)}`
    : '—';

  document.getElementById('panelBody').innerHTML = `

    <!-- Status Row -->
    <div style="display:flex; gap:var(--space-sm); flex-wrap:wrap; margin-bottom:var(--space-lg);">
      ${statusBadge(b.status)}
      ${memberBadge(b.memberStatus)}
      ${paymentBadge(b)}
    </div>

    <!-- Booking Details -->
    <div class="detail-section">
      <div class="detail-section__title">Event Details</div>
      <div class="detail-row"><span class="detail-row__label">Reference No.</span><span class="detail-row__value" style="font-family:monospace; color:var(--marigold);">${b.referenceNumber || '—'}</span></div>
      <div class="detail-row"><span class="detail-row__label">Hall</span><span class="detail-row__value">${b.hallName}</span></div>
      <div class="detail-row"><span class="detail-row__label">Event Type</span><span class="detail-row__value">${b.purposeLabel}${b.otherPurpose ? ` — ${b.otherPurpose}` : ''}</span></div>
      <div class="detail-row"><span class="detail-row__label">Date</span><span class="detail-row__value">${formatDate(b.eventDate)}</span></div>
      <div class="detail-row"><span class="detail-row__label">Time</span><span class="detail-row__value">${formatTime(b.startTime)} – ${formatTime(b.endTime)}</span></div>
      <div class="detail-row"><span class="detail-row__label">Duration</span><span class="detail-row__value">${b.durationHours} hour${b.durationHours !== 1 ? 's' : ''}</span></div>
      <div class="detail-row"><span class="detail-row__label">Hall Subtotal</span><span class="detail-row__value">${b.hallTotal ? `RM ${parseFloat(b.hallTotal).toFixed(2)}` : '—'}</span></div>
      <div class="detail-row"><span class="detail-row__label">Crew Subtotal</span><span class="detail-row__value">${b.crewTotal ? `RM ${parseFloat(b.crewTotal).toFixed(2)}` : 'RM 0.00'}</span></div>
      <div class="detail-row"><span class="detail-row__label">Est. Total</span><span class="detail-row__value" style="color:var(--marigold); font-weight:600;">${estimatedTotal}</span></div>
    </div>

    <!-- Crew Details -->
    ${b.crewSelections && b.crewSelections.length > 0 ? `
    <div class="detail-section">
      <div class="detail-section__title">Crew Requirements</div>
      ${b.crewSelections.map(c => `
        <div class="detail-row">
          <span class="detail-row__label">${c.role}</span>
          <span class="detail-row__value">
            ${c.days.map(d => d === 'rehearsal' ? 'Rehearsal Day' : 'Event Day').join(' + ')}
            <span style="color:var(--marigold); font-weight:600; margin-left:var(--space-sm);">RM ${c.cost}</span>
          </span>
        </div>
      `).join('')}
    </div>` : ''}

    <!-- Contact Details -->
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

    <!-- Payment -->
    <div class="detail-section">
      <div class="detail-section__title">Payment</div>

      <!-- Deposit -->
      <div style="margin-bottom:var(--space-md);">
        <p style="font-size:0.78rem; font-weight:600; color:var(--silver); margin-bottom:var(--space-sm);">Deposit</p>
        ${b.depositDate ? `
          <div class="detail-row"><span class="detail-row__label">Amount</span><span class="detail-row__value">RM ${parseFloat(b.depositAmount).toFixed(2)}</span></div>
          <div class="detail-row"><span class="detail-row__label">Method</span><span class="detail-row__value">${b.depositMethod}</span></div>
          <div class="detail-row"><span class="detail-row__label">Receipt No.</span><span class="detail-row__value">${b.depositReceipt || '—'}</span></div>
          <div class="detail-row"><span class="detail-row__label">Date</span><span class="detail-row__value">${formatDate(b.depositDate)}</span></div>
          <button class="btn btn--ghost btn--sm" style="margin-top:var(--space-sm);" onclick="editPayment('deposit', '${b.id}')">Edit Deposit</button>
        ` : `
          <div class="payment-form" id="depositForm">
            ${paymentFields('deposit')}
            <button class="btn btn--primary btn--sm" style="margin-top:var(--space-sm);" onclick="savePayment('deposit', '${b.id}')">Save Deposit</button>
          </div>
        `}
      </div>

      <!-- Balance -->
      <div>
        <p style="font-size:0.78rem; font-weight:600; color:var(--silver); margin-bottom:var(--space-sm);">Remaining Balance</p>
        ${b.balanceDate ? `
          <div class="detail-row"><span class="detail-row__label">Amount</span><span class="detail-row__value">RM ${parseFloat(b.balanceAmount).toFixed(2)}</span></div>
          <div class="detail-row"><span class="detail-row__label">Method</span><span class="detail-row__value">${b.balanceMethod}</span></div>
          <div class="detail-row"><span class="detail-row__label">Receipt No.</span><span class="detail-row__value">${b.balanceReceipt || '—'}</span></div>
          <div class="detail-row"><span class="detail-row__label">Date</span><span class="detail-row__value">${formatDate(b.balanceDate)}</span></div>
          <button class="btn btn--ghost btn--sm" style="margin-top:var(--space-sm);" onclick="editPayment('balance', '${b.id}')">Edit Balance</button>
        ` : `
          <div class="payment-form" id="balanceForm" ${!b.depositDate ? 'style="opacity:0.4;pointer-events:none;"' : ''}>
            ${!b.depositDate ? '<p style="font-size:0.78rem;color:var(--silver-dark);margin-bottom:var(--space-sm);">Record deposit first before adding balance.</p>' : ''}
            ${paymentFields('balance')}
            <button class="btn btn--primary btn--sm" style="margin-top:var(--space-sm);" onclick="savePayment('balance', '${b.id}')">Save Balance</button>
          </div>
        `}
      </div>
    </div>

    <div class="detail-row" style="margin-top:var(--space-sm);">
      <span class="detail-row__label">Submitted</span>
      <span class="detail-row__value" style="font-size:0.8rem;">${formatDateTime(b.submittedAt)}</span>
    </div>
    ${b.archivedAt ? `
    <div class="detail-row">
      <span class="detail-row__label">Archived</span>
      <span class="detail-row__value" style="font-size:0.8rem;">${formatDateTime(b.archivedAt)}</span>
    </div>` : ''}
  `;

  // ── Footer Buttons ──
  const footer = document.getElementById('panelFooter');

  if (b.status === 'pending') {
    footer.innerHTML = `
      <button class="btn btn--success btn--sm" onclick="approveBooking('${b.id}')">✓ Approve</button>
      <button class="btn btn--danger btn--sm"  onclick="confirmReject('${b.id}')">✕ Reject</button>
      <button class="btn btn--ghost btn--sm"   onclick="generateInvoice('${b.id}')">🧾 Invoice</button>
    `;
  } else if (b.status === 'approved') {
    footer.innerHTML = `
      <button class="btn btn--ghost btn--sm"  onclick="confirmReject('${b.id}')">Archive</button>
      <button class="btn btn--outline btn--sm" onclick="generateInvoice('${b.id}')">🧾 Invoice</button>
    `;
  } else if (b.status === 'rejected') {
    footer.innerHTML = `
      <button class="btn btn--outline btn--sm" onclick="restoreBooking('${b.id}')">↩ Restore</button>
      <button class="btn btn--danger btn--sm"  onclick="confirmDelete('${b.id}')">Delete</button>
    `;
  }
}

function paymentFields(type) {
  return `
    <div class="form-row" style="margin-bottom:var(--space-sm);">
      <div class="form-group" style="margin-bottom:0;">
        <label class="form-label">Amount (RM)</label>
        <input class="form-input form-input--sm" type="number" id="${type}Amount" placeholder="0.00" min="0" step="0.01" />
      </div>
      <div class="form-group" style="margin-bottom:0;">
        <label class="form-label">Method</label>
        <select class="form-select form-select--sm" id="${type}Method">
          <option value="" disabled selected>Select</option>
          <option value="Cash">Cash</option>
          <option value="Bank Transfer">Bank Transfer</option>
        </select>
      </div>
    </div>
    <div class="form-row">
      <div class="form-group" style="margin-bottom:0;">
        <label class="form-label">Receipt No. <span style="font-weight:400;color:var(--silver-dark);">(optional)</span></label>
        <input class="form-input form-input--sm" type="text" id="${type}Receipt" placeholder="e.g. REC-0001" />
      </div>
      <div class="form-group" style="margin-bottom:0;">
        <label class="form-label">Date</label>
        <input class="form-input form-input--sm" type="date" id="${type}Date" />
      </div>
    </div>
  `;
}

// ── Payment Actions ───────────────────────────────────────
window.savePayment = async function(type, id) {
  const amount  = document.getElementById(`${type}Amount`)?.value;
  const method  = document.getElementById(`${type}Method`)?.value;
  const receipt = document.getElementById(`${type}Receipt`)?.value.trim();
  const date    = document.getElementById(`${type}Date`)?.value;

  if (!amount || !method || !date) {
    showToast('Please fill in amount, method and date.', 'error'); return;
  }

  const prefix = type === 'deposit' ? 'deposit' : 'balance';
  await updateDoc(doc(db, 'hall_bookings', id), {
    [`${prefix}Amount`]:  parseFloat(amount),
    [`${prefix}Method`]:  method,
    [`${prefix}Receipt`]: receipt || null,
    [`${prefix}Date`]:    date,
  });
  showToast(`${capitalize(type)} payment saved.`, 'success');
};

window.editPayment = async function(type, id) {
  // Clear saved payment to re-show the form
  const prefix = type === 'deposit' ? 'deposit' : 'balance';
  await updateDoc(doc(db, 'hall_bookings', id), {
    [`${prefix}Amount`]:  null,
    [`${prefix}Method`]:  null,
    [`${prefix}Receipt`]: null,
    [`${prefix}Date`]:    null,
  });
  showToast(`${capitalize(type)} payment cleared for editing.`, 'info');
};

// ── Approve / Reject / Restore / Delete ──────────────────
window.approveBooking = async function(id) {
  await updateDoc(doc(db, 'hall_bookings', id), { status: 'approved' });
  showToast('Booking approved and added to calendar.', 'success');
  closePanel();
};

window.confirmReject = function(id) {
  openConfirmModal(
    'Archive Booking',
    'This booking will be moved to the archived tab. It will be permanently deleted after 90 days.',
    'Archive',
    'btn--danger',
    () => rejectBooking(id)
  );
};

async function rejectBooking(id) {
  await updateDoc(doc(db, 'hall_bookings', id), {
    status:     'rejected',
    archivedAt: new Date().toISOString(),
  });
  showToast('Booking archived.', 'warning');
  closePanel();
}

window.restoreBooking = async function(id) {
  await updateDoc(doc(db, 'hall_bookings', id), {
    status:     'pending',
    archivedAt: null,
  });
  showToast('Booking restored to pending.', 'success');
  closePanel();
};

window.confirmDelete = function(id) {
  openConfirmModal(
    'Delete Booking',
    'This will permanently delete this booking record. This action cannot be undone.',
    'Delete',
    'btn--danger',
    () => deleteBooking(id)
  );
};

async function deleteBooking(id) {
  await deleteDoc(doc(db, 'hall_bookings', id));
  showToast('Booking permanently deleted.', 'warning');
  closePanel();
}

// ── Invoice Generation ────────────────────────────────────
window.generateInvoice = function(id) {
  const b = allBookings.find(x => x.id === id);
  if (!b) return;

  const payStatus     = getPaymentStatus(b);
  const depositPaid   = b.depositAmount  ? `RM ${parseFloat(b.depositAmount).toFixed(2)}`  : '—';
  const balancePaid   = b.balanceAmount  ? `RM ${parseFloat(b.balanceAmount).toFixed(2)}`  : '—';
  const totalEst      = b.estimatedTotal ? `RM ${parseFloat(b.estimatedTotal).toFixed(2)}` : '—';

  const invoiceWin = window.open('', '_blank');
  invoiceWin.document.write(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>Invoice — ${b.name1}</title>
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
  </style>
</head>
<body>
  <div class="inv-header">
    <div>
      <h1>BEM On The Rock</h1>
      <p>Hall Booking Invoice</p>
      <p style="margin-top:8px; color:#999; font-size:11px;">Generated: ${new Date().toLocaleDateString('en-MY', { day:'numeric', month:'long', year:'numeric' })}</p>
    </div>
    <span class="inv-badge">${payStatus}</span>
  </div>

  <div class="inv-section">
    <h3>Renter Details</h3>
    <div class="inv-row"><span>Name</span><span>${b.name1}${b.name2 ? ` &amp; ${b.name2}` : ''}</span></div>
    <div class="inv-row"><span>Phone</span><span>${b.phone1}${b.phone2 ? ` / ${b.phone2}` : ''}</span></div>
    <div class="inv-row"><span>Church / Organisation</span><span>${b.church}</span></div>
  </div>

  <div class="inv-section">
    <h3>Booking Details</h3>
    <div class="inv-row"><span>Hall</span><span>${b.hallName}</span></div>
    <div class="inv-row"><span>Event Type</span><span>${b.purposeLabel}${b.otherPurpose ? ` — ${b.otherPurpose}` : ''}</span></div>
    <div class="inv-row"><span>Date</span><span>${formatDate(b.eventDate)}</span></div>
    <div class="inv-row"><span>Time</span><span>${formatTime(b.startTime)} – ${formatTime(b.endTime)}</span></div>
    <div class="inv-row"><span>Duration</span><span>${b.durationHours} hour${b.durationHours !== 1 ? 's' : ''}</span></div>
    <div class="inv-row"><span>Rate</span><span>RM ${b.hallRate} / hour</span></div>
  </div>

  <div class="inv-section">
    <h3>Payment</h3>
    <div class="inv-row"><span>Deposit Paid</span><span>${depositPaid}${b.depositMethod ? ` (${b.depositMethod})` : ''}${b.depositReceipt ? ` — ${b.depositReceipt}` : ''}${b.depositDate ? ` — ${formatDate(b.depositDate)}` : ''}</span></div>
    <div class="inv-row"><span>Balance Paid</span><span>${balancePaid}${b.balanceMethod ? ` (${b.balanceMethod})` : ''}${b.balanceReceipt ? ` — ${b.balanceReceipt}` : ''}${b.balanceDate ? ` — ${formatDate(b.balanceDate)}` : ''}</span></div>
    <div class="inv-total">
      <span>Estimated Total</span>
      <span>${totalEst}</span>
    </div>
  </div>

  <div class="inv-footer">
    <p>Payment via cash at church office or bank transfer — Public Bank Account No: <strong>3187701204</strong></p>
    <p style="margin-top:4px;">Remark: SEWA HALL &amp; YOUR NAME &nbsp;|&nbsp; BEM On The Rock Hall Booking System</p>
  </div>

  <script>window.onload = () => window.print();<\/script>
</body>
</html>
  `);
  invoiceWin.document.close();
};

// ── Confirm Modal ─────────────────────────────────────────
function openConfirmModal(title, message, actionLabel, btnClass, onConfirm) {
  document.getElementById('confirmTitle').textContent   = title;
  document.getElementById('confirmMessage').textContent = message;
  const btn = document.getElementById('confirmActionBtn');
  btn.textContent  = actionLabel;
  btn.className    = `btn btn--sm ${btnClass}`;
  btn.onclick      = () => { closeConfirmModal(); onConfirm(); };
  document.getElementById('confirmModal').classList.add('open');
}

window.closeConfirmModal = function() {
  document.getElementById('confirmModal').classList.remove('open');
};

// ── Toast ─────────────────────────────────────────────────
function showToast(message, type = 'info', duration = 3500) {
  const container = document.getElementById('toast-container');
  const icons = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' };
  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.innerHTML = `<span>${icons[type] || 'ℹ'}</span><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('fade-out');
    toast.addEventListener('animationend', () => toast.remove());
  }, duration);
}