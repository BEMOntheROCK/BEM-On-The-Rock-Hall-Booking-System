// ============================================================
//  BEM ON THE ROCK — Hall Booking | status.js
// ============================================================

import { db } from "./firebase.js";
import { collection, query, where, getDocs }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

document.getElementById('year').textContent = new Date().getFullYear();

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

// ── Invoice Generator (public — no payment details) ───────
function generatePublicInvoice(b) {
  const statusInfo = getStatusInfo(b.status);
  const totalEst   = b.estimatedTotal ? `RM ${parseFloat(b.estimatedTotal).toFixed(2)}` : '—';

  const win = window.open('', '_blank');
  win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"/>
  <title>Booking Summary — ${b.name1}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Inter:wght@400;500;600&display=swap');
    *{box-sizing:border-box;margin:0;padding:0;}
    body{font-family:'Inter',sans-serif;background:#fff;color:#111;padding:48px;max-width:720px;margin:0 auto;}
    .inv-header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:36px;border-bottom:2px solid #ECA820;padding-bottom:24px;}
    .inv-header h1{font-family:'Playfair Display',serif;font-size:28px;color:#111;}
    .inv-header p{font-size:12px;color:#444;margin-top:4px;}
    .inv-badge{font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;padding:4px 10px;border-radius:4px;}
    .inv-badge.pending{background:#FFF3CD;color:#856404;}
    .inv-badge.approved{background:#D1FAE5;color:#065F46;}
    .inv-badge.rejected{background:#FEE2E2;color:#991B1B;}
    .inv-ref{font-size:11px;color:#555;margin-top:6px;font-family:'Courier New',monospace;}
    .inv-section{margin-bottom:28px;}
    .inv-section h3{font-size:10px;font-weight:700;letter-spacing:.15em;text-transform:uppercase;color:#B8860B;margin-bottom:12px;border-bottom:1px solid #ddd;padding-bottom:6px;}
    .inv-row{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #f0f0f0;font-size:13px;}
    .inv-row span:first-child{color:#444;}
    .inv-row span:last-child{font-weight:600;color:#111;}
    .inv-total{background:#f9f7f2;border:1px solid #e8e0cc;border-radius:8px;padding:16px;margin-top:8px;display:flex;justify-content:space-between;align-items:center;}
    .inv-total span:first-child{font-size:13px;color:#444;}
    .inv-total span:last-child{font-size:22px;font-family:'Playfair Display',serif;font-weight:700;color:#B8860B;}
    .inv-footer{margin-top:40px;font-size:11px;color:#999;text-align:center;border-top:1px solid #eee;padding-top:16px;}
    .inv-notice{background:#FFF8E7;border:1px solid #F0D080;border-radius:8px;padding:12px 16px;margin-bottom:24px;font-size:12px;color:#6B4F00;}
    @media print{body{padding:24px;}.inv-notice{display:none;}}
  </style></head><body>
  <div class="inv-notice">This is a booking summary for your reference. Final pricing is subject to admin confirmation.</div>
  <div class="inv-header">
    <div>
      <h1>BEM On The Rock</h1>
      <p>Hall Booking Summary</p>
      <p style="margin-top:8px;color:#aaa;font-size:11px;">Generated: ${new Date().toLocaleDateString('en-MY',{day:'numeric',month:'long',year:'numeric'})}</p>
      <div class="inv-ref">Ref: ${b.referenceNumber || '—'}</div>
    </div>
    <span class="inv-badge ${b.status}">${statusInfo.label}</span>
  </div>
  <div class="inv-section"><h3>Booking Details</h3>
    <div class="inv-row"><span>Name</span><span>${b.name1}${b.name2 ? ` &amp; ${b.name2}` : ''}</span></div>
    <div class="inv-row"><span>Phone</span><span>${b.phone1}${b.phone2 ? ` / ${b.phone2}` : ''}</span></div>
    <div class="inv-row"><span>Church / Organisation</span><span>${b.church}</span></div>
    <div class="inv-row"><span>Hall</span><span>${b.hallName}</span></div>
    <div class="inv-row"><span>Event Type</span><span>${b.purposeLabel}${b.otherPurpose ? ` — ${b.otherPurpose}` : ''}</span></div>
    <div class="inv-row"><span>Date</span><span>${formatDate(b.eventDate)}</span></div>
    <div class="inv-row"><span>Time</span><span>${formatTime(b.startTime)} – ${formatTime(b.endTime)}</span></div>
    <div class="inv-row"><span>Duration</span><span>${b.durationHours} hour${b.durationHours !== 1 ? 's' : ''}</span></div>
  </div>
  <div class="inv-section"><h3>Charges</h3>
    <div class="inv-row"><span>Hall Rental (${b.durationHours} hr × RM ${b.hallRate}/hr)</span><span>${b.hallTotal ? `RM ${parseFloat(b.hallTotal).toFixed(2)}` : `RM ${(b.durationHours * b.hallRate).toFixed(2)}`}</span></div>
    ${(b.crewSelections && b.crewSelections.length > 0) ? b.crewSelections.map(c =>
      `<div class="inv-row"><span>Crew — ${c.role} (${c.days.map(d => d === 'rehearsal' ? 'Rehearsal Day' : 'Event Day').join(' + ')})</span><span>RM ${c.cost}.00</span></div>`
    ).join('') : ''}
    ${(b.crewSelections && b.crewSelections.length > 0) ? `<div class="inv-row" style="font-weight:600;"><span>Crew Subtotal</span><span>RM ${(b.crewTotal || 0).toFixed(2)}</span></div>` : ''}
    <div class="inv-total"><span>Estimated Total</span><span>${totalEst}</span></div>
  </div>
  <div class="inv-footer">
    <p>Payment via cash at church office or bank transfer — Public Bank Account No: <strong>3187701204</strong></p>
    <p style="margin-top:4px;">Remark: SEWA HALL &amp; YOUR NAME &nbsp;|&nbsp; BEM On The Rock Hall Booking System</p>
  </div>
  <script>window.onload=()=>window.print();<\/script>
  </body></html>`);
  win.document.close();
}

window.printInvoice = generatePublicInvoice;

// ── Check Status ──────────────────────────────────────────
window.checkStatus = async function() {
  const name   = document.getElementById('nameInput').value.trim();
  const result = document.getElementById('statusResult');
  const btn    = document.getElementById('checkBtn');

  if (!name) { showToast('Please enter your name.', 'error'); return; }

  btn.disabled  = true;
  btn.innerHTML = '<span class="spinner"></span>';
  result.style.display = 'none';

  try {
    // Search by name1 first
    const q1       = query(collection(db, 'hall_bookings'), where('name1', '==', name));
    const snap1    = await getDocs(q1);
    const q2       = query(collection(db, 'hall_bookings'), where('name2', '==', name));
    const snap2    = await getDocs(q2);

    // Merge and deduplicate
    const seen = new Set();
    const bookings = [];
    [...snap1.docs, ...snap2.docs].forEach(d => {
      if (!seen.has(d.id)) { seen.add(d.id); bookings.push({ id: d.id, ...d.data() }); }
    });

    // Sort by event date descending
    bookings.sort((a, b) => (b.eventDate || '').localeCompare(a.eventDate || ''));

    if (bookings.length === 0) {
      result.innerHTML = `
        <div class="card" style="text-align:center;">
          <div style="font-size:2rem; margin-bottom:var(--space-md); opacity:0.4;">🔍</div>
          <h3 style="margin-bottom:var(--space-sm);">No bookings found</h3>
          <p style="font-size:0.9rem;">No bookings found under the name <strong style="color:var(--marigold);">${name}</strong>. Please check your spelling and try again.</p>
        </div>`;
      result.style.display = 'block';
      return;
    }

    // Render all matching bookings
    result.innerHTML = `
      <p style="font-size:0.88rem; color:var(--silver-dark); margin-bottom:var(--space-md);">
        Found <strong style="color:var(--white);">${bookings.length}</strong> booking${bookings.length > 1 ? 's' : ''} under the name <strong style="color:var(--marigold);">${name}</strong>.
      </p>
      ${bookings.map(b => {
        const statusInfo = getStatusInfo(b.status);
        const payInfo    = getPaymentStatus(b);
        return `
        <div class="card" style="margin-bottom:var(--space-md);">
          <!-- Status Header -->
          <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:var(--space-sm); padding-bottom:var(--space-md); border-bottom:1px solid var(--border); margin-bottom:var(--space-md);">
            <div style="display:flex; align-items:center; gap:var(--space-sm);">
              <span style="font-size:1.4rem;">${statusInfo.icon}</span>
              <span class="badge ${statusInfo.cls}">${statusInfo.label}</span>
              ${b.status !== 'rejected' ? `<span class="badge ${payInfo.cls}">${payInfo.label}</span>` : ''}
            </div>
            ${b.referenceNumber ? `<span style="font-family:monospace; font-size:0.82rem; color:var(--marigold);">${b.referenceNumber}</span>` : ''}
          </div>

          <p style="font-size:0.85rem; color:var(--silver); margin-bottom:var(--space-md);">${statusInfo.desc}</p>

          <!-- Details -->
          <div class="detail-row"><span class="detail-row__label">Hall</span><span class="detail-row__value">${b.hallName}</span></div>
          <div class="detail-row"><span class="detail-row__label">Event Type</span><span class="detail-row__value">${b.purposeLabel}${b.otherPurpose ? ` — ${b.otherPurpose}` : ''}</span></div>
          <div class="detail-row"><span class="detail-row__label">Date</span><span class="detail-row__value">${formatDate(b.eventDate)}</span></div>
          <div class="detail-row"><span class="detail-row__label">Time</span><span class="detail-row__value">${formatTime(b.startTime)} – ${formatTime(b.endTime)}</span></div>
          ${b.status !== 'rejected' ? `
          <div class="detail-row"><span class="detail-row__label">Est. Total</span><span class="detail-row__value" style="color:var(--marigold); font-weight:600;">RM ${parseFloat(b.estimatedTotal || 0).toFixed(2)}</span></div>` : ''}

          <!-- Actions -->
          <div style="margin-top:var(--space-md); padding-top:var(--space-md); border-top:1px solid var(--border); display:flex; gap:var(--space-sm); flex-wrap:wrap;">
            <button class="btn btn--outline btn--sm" onclick='window.printInvoice(${JSON.stringify(b).replace(/'/g, "&#39;")})'>🖨️ Print Booking Summary</button>
            ${b.status === 'pending' ? `<a href="edit-booking.html?id=${b.id}" class="btn btn--ghost btn--sm">✏️ Edit Booking</a>` : ''}
          </div>
        </div>`;
      }).join('')}`;

    result.style.display = 'block';

  } catch (err) {
    console.error(err);
    showToast('Something went wrong. Please try again.', 'error');
  } finally {
    btn.disabled  = false;
    btn.innerHTML = 'Check';
  }
};

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