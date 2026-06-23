// ============================================================
//  BEM ON THE ROCK — Hall Booking | halls.js
// ============================================================

import { auth, db } from "./firebase.js";
import { onAuthStateChanged, signOut }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  collection, doc, getDocs, addDoc, setDoc, updateDoc, deleteDoc, onSnapshot, query, orderBy
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ── Auth Guard ────────────────────────────────────────────
onAuthStateChanged(auth, (user) => {
  if (!user) { window.location.replace('login.html'); return; }
  document.getElementById('adminEmail').textContent = user.email;
  initHalls();
});

document.getElementById('logoutBtn').addEventListener('click', async () => {
  await signOut(auth);
  window.location.replace('login.html');
});

// ── Default Halls (migration data) ───────────────────────
const DEFAULT_HALLS = [
  {
    id: 'awan',
    name: 'Awan Hall',
    capacity: 500,
    rate: 200,
    color: '#5BA4D8',
    supportsRehearsal: true,
    fixedSlots: false,
    facilities: [
      '3 LED Screens',
      'Moving & LED Colourful Lighting',
      'Full PA System (max 4 wireless mics)',
      'Musical Instruments',
      'Rostrum / Podium',
      'Kids Room',
    ],
    crew: ['PA System', 'Media — Internal Screen', 'Media — Live Streaming', 'Light & Stage Crew', 'Security & Maintenance'],
    order: 1,
  },
  {
    id: 'adiwira',
    name: 'Adiwira Hall',
    capacity: 150,
    rate: 100,
    color: '#9B8FE0',
    supportsRehearsal: true,
    fixedSlots: false,
    facilities: [
      'Full PA System (max 3 wireless mics)',
      'LCD Projector & Screen',
      'Musical Instruments',
      'Rostrum / Podium',
    ],
    crew: ['PA System', 'Media — Internal Screen', 'Security & Maintenance'],
    order: 2,
  },
  {
    id: 'rock',
    name: 'Rock Essence',
    capacity: 80,
    rate: 100,
    color: '#E0845A',
    supportsRehearsal: true,
    fixedSlots: false,
    facilities: [
      'Chairs & Dining Tables',
      'PA System (max 2 mics)',
    ],
    crew: ['Sound Man', 'Multimedia', 'Security & Maintenance'],
    order: 3,
  },
  {
    id: 'office',
    name: 'Office Meeting Room',
    capacity: 20,
    rate: 50,
    color: '#5DC490',
    supportsRehearsal: false,
    fixedSlots: true,
    facilities: [
      'Chairs & Tables',
      'LCD Projector',
      'Max 4 hours per booking',
      'Slots: 8:30am–12:30pm · 1:00–5:00pm · 6:00–10:00pm',
    ],
    crew: ['Security & Maintenance'],
    order: 4,
  },
  {
    id: 'vip',
    name: 'VIP Lounge',
    capacity: 12,
    rate: 50,
    color: '#ECA820',
    supportsRehearsal: false,
    fixedSlots: false,
    facilities: [
      'Sofa & Chairs',
      'Microwave',
      'Food Serving Table',
    ],
    crew: ['Security & Maintenance'],
    order: 5,
  },
];

// ── State ─────────────────────────────────────────────────
let allHalls    = [];
let editingId   = null;

// ── Init & Migration ──────────────────────────────────────
async function initHalls() {
  await migrateIfNeeded();

  const q = query(collection(db, 'halls'), orderBy('capacity', 'desc'));
  onSnapshot(q, (snapshot) => {
    allHalls = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    renderHalls();
  });
}

async function migrateIfNeeded() {
  const snapshot = await getDocs(collection(db, 'halls'));
  if (!snapshot.empty) return; // Already migrated

  console.log('Migrating default halls to Firestore...');
  for (const hall of DEFAULT_HALLS) {
    const { id, ...data } = hall;
    await setDoc(doc(db, 'halls', id), data);
  }
  console.log('Migration complete.');
}

// ── Render Hall Cards ─────────────────────────────────────
function renderHalls() {
  const grid = document.getElementById('hallsManageGrid');

  if (allHalls.length === 0) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1;">
        <div class="empty-state__icon">🏛️</div>
        <div class="empty-state__title">No halls yet</div>
        <div class="empty-state__text">Click "Add New Hall" to get started.</div>
      </div>`;
    return;
  }

  grid.innerHTML = allHalls.map(h => `
    <div class="hall-manage-card">
      <div class="hall-manage-card__accent" style="background:${h.color};"></div>
      <div class="hall-manage-card__body">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:var(--space-sm);">
          <div>
            <div class="hall-manage-card__name">${h.name}</div>
            <div class="hall-manage-card__meta">Up to ${h.capacity} pax · RM ${h.rate}/hr</div>
          </div>
          <div style="display:flex; gap:var(--space-xs);">
            ${h.supportsRehearsal ? '<span class="badge badge--approved">Rehearsal</span>' : ''}
            ${h.fixedSlots        ? '<span class="badge badge--pending">Fixed Slots</span>' : ''}
          </div>
        </div>

        <div class="hall-manage-card__section">
          <div class="hall-manage-card__label">Facilities</div>
          <ul class="hall-manage-card__list">
            ${(h.facilities || []).map(f => `<li>${f}</li>`).join('')}
          </ul>
        </div>

        <div class="hall-manage-card__section">
          <div class="hall-manage-card__label">Crew</div>
          <div style="display:flex; flex-wrap:wrap; gap:var(--space-xs);">
            ${(h.crew || []).map(c => `<span class="badge badge--outsider">${c}</span>`).join('')}
          </div>
        </div>

        <div class="hall-manage-card__footer">
          <div style="display:flex; align-items:center; gap:var(--space-sm);">
            <span style="width:14px; height:14px; border-radius:50%; background:${h.color}; display:inline-block; border:1px solid var(--border-strong);"></span>
            <span style="font-size:0.78rem; color:var(--silver-dark);">${h.color}</span>
          </div>
          <div style="display:flex; gap:var(--space-sm);">
            <button class="btn btn--outline btn--sm" onclick="openHallModal('${h.id}')">Edit</button>
            <button class="btn btn--danger btn--sm"  onclick="confirmDeleteHall('${h.id}', '${h.name}')">Delete</button>
          </div>
        </div>
      </div>
    </div>
  `).join('');
}

// ── Hall Modal ────────────────────────────────────────────
window.openHallModal = function(id = null) {
  editingId = id;
  document.getElementById('hallModalTitle').textContent = id ? 'Edit Hall' : 'Add New Hall';
  document.getElementById('hallSaveBtn').textContent    = id ? 'Save Changes' : 'Save Hall';

  if (id) {
    const h = allHalls.find(x => x.id === id);
    if (!h) return;
    document.getElementById('hallName').value              = h.name         || '';
    document.getElementById('hallCapacity').value          = h.capacity     || '';
    document.getElementById('hallRate').value              = h.rate         || '';
    document.getElementById('hallColor').value             = h.color        || '#5BA4D8';
    document.getElementById('hallSupportsRehearsal').checked = !!h.supportsRehearsal;
    document.getElementById('hallFixedSlots').checked       = !!h.fixedSlots;
    document.getElementById('hallFacilities').value        = (h.facilities  || []).join('\n');
    document.getElementById('hallCrew').value              = (h.crew        || []).join('\n');
  } else {
    document.getElementById('hallForm').reset();
    document.getElementById('hallColor').value = '#5BA4D8';
  }

  document.getElementById('hallModal').classList.add('open');
};

window.closeHallModal = function() {
  editingId = null;
  document.getElementById('hallModal').classList.remove('open');
};

// ── Save Hall ─────────────────────────────────────────────
window.saveHall = async function() {
  const name       = document.getElementById('hallName').value.trim();
  const capacity   = parseInt(document.getElementById('hallCapacity').value);
  const rate       = parseInt(document.getElementById('hallRate').value);
  const color      = document.getElementById('hallColor').value;
  const supportsRehearsal = document.getElementById('hallSupportsRehearsal').checked;
  const fixedSlots        = document.getElementById('hallFixedSlots').checked;
  const facilities = document.getElementById('hallFacilities').value
    .split('\n').map(s => s.trim()).filter(Boolean);
  const crew       = document.getElementById('hallCrew').value
    .split('\n').map(s => s.trim()).filter(Boolean);

  if (!name)             { showToast('Please enter a hall name.', 'error');     return; }
  if (!capacity || capacity < 1) { showToast('Please enter a valid capacity.', 'error'); return; }
  if (!rate     || rate < 1)     { showToast('Please enter a valid rate.', 'error');     return; }

  const saveBtn       = document.getElementById('hallSaveBtn');
  saveBtn.disabled    = true;
  saveBtn.innerHTML   = '<span class="spinner"></span>';

  const data = { name, capacity, rate, color, supportsRehearsal, fixedSlots, facilities, crew };

  try {
    if (editingId) {
      await updateDoc(doc(db, 'halls', editingId), data);
      showToast('Hall updated successfully.', 'success');
    } else {
      await addDoc(collection(db, 'halls'), data);
      showToast('Hall added successfully.', 'success');
    }
    closeHallModal();
  } catch (err) {
    console.error(err);
    showToast('Something went wrong. Please try again.', 'error');
  } finally {
    saveBtn.disabled  = false;
    saveBtn.innerHTML = editingId ? 'Save Changes' : 'Save Hall';
  }
};

// ── Delete Hall ───────────────────────────────────────────
window.confirmDeleteHall = function(id, name) {
  openConfirmModal(
    'Delete Hall',
    `Are you sure you want to delete "${name}"? This cannot be undone.`,
    'Delete', 'btn--danger',
    () => deleteHall(id)
  );
};

async function deleteHall(id) {
  await deleteDoc(doc(db, 'halls', id));
  showToast('Hall deleted.', 'warning');
}

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

// ── Toast ─────────────────────────────────────────────────
function showToast(message, type = 'info', duration = 3500) {
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

// ── Hamburger ─────────────────────────────────────────────
window.toggleMenu = function() {
  document.getElementById('mobileMenu').classList.toggle('open');
};