// ============================================================
//  BEM ON THE ROCK — Hall Booking | index.js
// ============================================================

import { db } from "./firebase.js";
import { collection, onSnapshot, query, orderBy }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

document.getElementById('year').textContent = new Date().getFullYear();

// ── State ─────────────────────────────────────────────────
let allHalls = [];

// ── Load Halls from Firestore ─────────────────────────────
const q = query(collection(db, 'halls'), orderBy('capacity', 'desc'));
onSnapshot(q, (snapshot) => {
  allHalls = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  applyFilters();
});

// ── Render Hall Grid ──────────────────────────────────────
function renderHalls(halls) {
  const grid      = document.getElementById('hallsGrid');
  const noResults = document.getElementById('noResults');

  if (halls.length === 0) {
    grid.innerHTML  = '';
    noResults.style.display = 'block';
    return;
  }

  noResults.style.display = 'none';
  grid.innerHTML = halls.map(h => `
    <div class="hall-card">
      <div class="hall-card__accent" style="background:${h.color || '#C0C0C0'};"></div>
      <div class="hall-card__body">
        <div class="hall-card__name">${h.name}</div>
        <div class="hall-card__capacity">Capacity: <strong>up to ${h.capacity} pax</strong></div>
        <ul class="hall-card__facilities">
          ${(h.facilities || []).map(f => `<li>${f}</li>`).join('')}
        </ul>
        <div class="hall-card__footer">
          <div class="hall-card__price">RM ${h.rate} <span>/ hour</span></div>
          <button class="btn btn--primary" onclick="selectHall('${h.id}')">Select Hall</button>
        </div>
      </div>
    </div>
  `).join('');
}

// ── Select Hall ───────────────────────────────────────────
window.selectHall = function(hallId) {
  const hall = allHalls.find(h => h.id === hallId);
  if (!hall) return;
  sessionStorage.setItem('selectedHall', JSON.stringify({ key: hall.id, ...hall }));
  window.location.href = 'booking.html';
};

// ── Filters ───────────────────────────────────────────────
window.applyFilters = function() {
  const search      = document.getElementById('hallSearch').value.trim().toLowerCase();
  const minCapacity = parseInt(document.getElementById('filterCapacity').value) || 0;
  const minPrice    = parseInt(document.getElementById('filterPriceMin').value) || 0;
  const maxPrice    = parseInt(document.getElementById('filterPriceMax').value) || Infinity;
  const facility    = document.getElementById('filterFacility').value.trim().toLowerCase();

  const hasFilter = search || minCapacity || minPrice || (maxPrice < Infinity) || facility;
  document.getElementById('clearBtn').style.display = hasFilter ? 'inline-flex' : 'none';

  const filtered = allHalls.filter(h => {
    if (search && !h.name.toLowerCase().includes(search)) return false;
    if (h.capacity < minCapacity) return false;
    if (h.rate < minPrice) return false;
    if (h.rate > maxPrice) return false;
    if (facility && !(h.facilities || []).some(f => f.toLowerCase().includes(facility))) return false;
    return true;
  });

  renderHalls(filtered);
};

window.clearFilters = function() {
  document.getElementById('hallSearch').value      = '';
  document.getElementById('filterCapacity').value  = '';
  document.getElementById('filterPriceMin').value  = '';
  document.getElementById('filterPriceMax').value  = '';
  document.getElementById('filterFacility').value  = '';
  document.getElementById('clearBtn').style.display = 'none';
  renderHalls(allHalls);
};

// ── Hamburger ─────────────────────────────────────────────
window.toggleMenu = function() {
  document.getElementById('mobileMenu').classList.toggle('open');
};