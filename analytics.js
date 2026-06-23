// ============================================================
//  BEM ON THE ROCK — Hall Booking | analytics.js
// ============================================================

import { auth, db } from "./firebase.js";
import { onAuthStateChanged, signOut }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { collection, onSnapshot, query, orderBy }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ── Auth Guard ────────────────────────────────────────────
onAuthStateChanged(auth, (user) => {
  if (!user) { window.location.replace('login.html'); return; }
  document.getElementById('adminEmail').textContent = user.email;
  initAnalytics();
});

document.getElementById('logoutBtn').addEventListener('click', async () => {
  await signOut(auth);
  window.location.replace('login.html');
});

window.toggleMenu = function() {
  document.getElementById('mobileMenu').classList.toggle('open');
};

// ── State ─────────────────────────────────────────────────
let allBookings = [];

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// ── Init ──────────────────────────────────────────────────
function initAnalytics() {
  // Populate year filter
  const currentYear = new Date().getFullYear();
  const yearSelect  = document.getElementById('yearFilter');
  for (let y = currentYear; y >= currentYear - 4; y--) {
    const opt = document.createElement('option');
    opt.value       = y;
    opt.textContent = y;
    yearSelect.appendChild(opt);
  }

  const q = query(collection(db, 'hall_bookings'), orderBy('submittedAt', 'asc'));
  onSnapshot(q, (snapshot) => {
    allBookings = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    renderAll();
  });
}

// ── Helpers ───────────────────────────────────────────────
function selectedYear() {
  return parseInt(document.getElementById('yearFilter').value);
}

function bookingsForYear(year) {
  return allBookings.filter(b => {
    if (!b.eventDate) return false;
    return new Date(b.eventDate + 'T00:00:00').getFullYear() === year;
  });
}

// Revenue = sum of deposit + balance actually recorded
function revenueCollected(bookings) {
  return bookings.reduce((sum, b) => {
    return sum
      + (b.depositAmount  ? parseFloat(b.depositAmount)  : 0)
      + (b.balanceAmount  ? parseFloat(b.balanceAmount)  : 0);
  }, 0);
}

function pendingPayment(bookings) {
  // Approved bookings where balance is not yet fully paid
  return bookings
    .filter(b => b.status === 'approved' && !b.balanceDate)
    .reduce((sum, b) => sum + (b.estimatedTotal ? parseFloat(b.estimatedTotal) : 0), 0);
}

// ── Render All ────────────────────────────────────────────
window.renderAll = function() {
  const year     = selectedYear();
  const bookings = bookingsForYear(year);
  const approved = bookings.filter(b => b.status === 'approved');

  // Summary stats
  document.getElementById('statTotalBookings').textContent = bookings.length;
  document.getElementById('statApproved').textContent      = approved.length;
  document.getElementById('statRevenue').textContent       = `RM ${revenueCollected(bookings).toFixed(0)}`;
  document.getElementById('statPending').textContent       = `RM ${pendingPayment(bookings).toFixed(0)}`;

  renderMonthlyChart(bookings);
  renderHallPopularity(bookings);
  renderPaymentBreakdown(bookings);
  renderRevenueByHall(approved);
};

// ── Monthly Bookings Bar Chart ────────────────────────────
function renderMonthlyChart(bookings) {
  const counts = Array(12).fill(0);
  bookings.forEach(b => {
    if (!b.eventDate) return;
    const m = new Date(b.eventDate + 'T00:00:00').getMonth();
    counts[m]++;
  });

  const max = Math.max(...counts, 1);
  const chart = document.getElementById('monthlyChart');

  chart.innerHTML = counts.map((count, i) => `
    <div class="bar-col">
      <div class="bar-col__value">${count > 0 ? count : ''}</div>
      <div class="bar-col__bar">
        <div class="bar-col__fill" style="height:${(count / max) * 100}%;"></div>
      </div>
      <div class="bar-col__label">${MONTHS[i]}</div>
    </div>
  `).join('');
}

// ── Hall Popularity ───────────────────────────────────────
function renderHallPopularity(bookings) {
  const hallCounts = {};
  bookings.forEach(b => {
    if (!b.hallName) return;
    hallCounts[b.hallName] = (hallCounts[b.hallName] || 0) + 1;
  });

  const sorted = Object.entries(hallCounts).sort((a, b) => b[1] - a[1]);
  const max    = sorted[0]?.[1] || 1;
  const total  = bookings.length || 1;

  document.getElementById('hallPopularity').innerHTML = sorted.length === 0
    ? '<p style="color:var(--silver-dark); font-size:0.88rem;">No data yet.</p>'
    : sorted.map(([name, count]) => `
      <div class="popularity-row">
        <div class="popularity-row__name">${name}</div>
        <div class="popularity-row__bar-wrap">
          <div class="popularity-row__bar" style="width:${(count / max) * 100}%;"></div>
        </div>
        <div class="popularity-row__count">${count} <span>(${Math.round(count / total * 100)}%)</span></div>
      </div>
    `).join('');
}

// ── Payment Status Breakdown ──────────────────────────────
function renderPaymentBreakdown(bookings) {
  const approved = bookings.filter(b => b.status === 'approved');
  const fullyPaid    = approved.filter(b => b.balanceDate).length;
  const depositOnly  = approved.filter(b => b.depositDate && !b.balanceDate).length;
  const unpaid       = approved.filter(b => !b.depositDate).length;
  const pending      = bookings.filter(b => b.status === 'pending').length;
  const archived     = bookings.filter(b => b.status === 'rejected').length;
  const total        = bookings.length || 1;

  const items = [
    { label: 'Fully Paid',    count: fullyPaid,   cls: 'badge--paid',     color: 'var(--success)' },
    { label: 'Deposit Only',  count: depositOnly, cls: 'badge--partial',  color: 'var(--marigold)' },
    { label: 'Unpaid',        count: unpaid,      cls: 'badge--unpaid',   color: 'var(--danger)' },
    { label: 'Pending Review',count: pending,     cls: 'badge--pending',  color: 'var(--marigold)' },
    { label: 'Archived',      count: archived,    cls: 'badge--rejected', color: 'var(--silver-dark)' },
  ];

  document.getElementById('paymentBreakdown').innerHTML = `
    <div class="breakdown-bars">
      ${items.map(item => `
        <div class="breakdown-item">
          <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
            <span style="font-size:0.85rem; color:var(--silver);">${item.label}</span>
            <span style="font-size:0.85rem; font-weight:600; color:var(--white);">${item.count} <span style="color:var(--silver-dark); font-weight:400;">(${Math.round(item.count / total * 100)}%)</span></span>
          </div>
          <div class="breakdown-bar-track">
            <div class="breakdown-bar-fill" style="width:${(item.count / total) * 100}%; background:${item.color};"></div>
          </div>
        </div>
      `).join('')}
    </div>`;
}

// ── Revenue by Hall ───────────────────────────────────────
function renderRevenueByHall(approvedBookings) {
  const hallRevenue = {};
  approvedBookings.forEach(b => {
    if (!b.hallName) return;
    const revenue = (b.depositAmount  ? parseFloat(b.depositAmount)  : 0)
                  + (b.balanceAmount  ? parseFloat(b.balanceAmount)  : 0);
    hallRevenue[b.hallName] = (hallRevenue[b.hallName] || 0) + revenue;
  });

  const sorted = Object.entries(hallRevenue).sort((a, b) => b[1] - a[1]);
  const max    = sorted[0]?.[1] || 1;

  document.getElementById('revenueByHall').innerHTML = sorted.length === 0
    ? '<p style="color:var(--silver-dark); font-size:0.88rem;">No revenue recorded yet.</p>'
    : `
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Hall</th>
              <th>Revenue Collected</th>
              <th style="width:40%;">Bar</th>
            </tr>
          </thead>
          <tbody>
            ${sorted.map(([name, rev]) => `
              <tr>
                <td>${name}</td>
                <td style="color:var(--marigold); font-weight:600;">RM ${rev.toFixed(2)}</td>
                <td>
                  <div class="breakdown-bar-track">
                    <div class="breakdown-bar-fill" style="width:${(rev / max) * 100}%; background:var(--marigold);"></div>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>`;
}