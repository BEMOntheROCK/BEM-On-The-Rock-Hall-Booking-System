// ============================================================
//  BEM ON THE ROCK — Hall Booking | index.js
// ============================================================

// --- Year ---
document.getElementById('year').textContent = new Date().getFullYear();

// --- Carousel ---
const SLIDES_PER_VIEW_BREAKPOINTS = [
  { maxWidth: 768,  slides: 1 },
  { maxWidth: 1024, slides: 2 },
  { maxWidth: Infinity, slides: 3 },
];

let currentIndex = 0;

function getSlidesPerView() {
  const w = window.innerWidth;
  for (const bp of SLIDES_PER_VIEW_BREAKPOINTS) {
    if (w <= bp.maxWidth) return bp.slides;
  }
  return 3;
}

const track      = document.getElementById('carouselTrack');
const slides     = track ? Array.from(track.querySelectorAll('.carousel__slide')) : [];
const prevBtn    = document.getElementById('prevBtn');
const nextBtn    = document.getElementById('nextBtn');
const dotsContainer = document.getElementById('carouselDots');

function getTotalPages() {
  return Math.ceil(slides.length / getSlidesPerView());
}

function buildDots() {
  if (!dotsContainer) return;
  dotsContainer.innerHTML = '';
  const total = getTotalPages();
  for (let i = 0; i < total; i++) {
    const dot = document.createElement('button');
    dot.className = 'carousel__dot' + (i === currentIndex ? ' active' : '');
    dot.setAttribute('aria-label', `Go to page ${i + 1}`);
    dot.addEventListener('click', () => goToPage(i));
    dotsContainer.appendChild(dot);
  }
}

function updateCarousel() {
  if (!track) return;
  const perView   = getSlidesPerView();
  const slideWidth = track.parentElement.offsetWidth;
  const gap        = 24; // matches --space-lg in px

  // Set each slide width
  slides.forEach(slide => {
    slide.style.flex = `0 0 calc(${100 / perView}% - ${gap * (perView - 1) / perView}px)`;
  });

  // Clamp index
  const totalPages = getTotalPages();
  if (currentIndex >= totalPages) currentIndex = totalPages - 1;
  if (currentIndex < 0) currentIndex = 0;

  // Calculate offset
  const fullSlideWidth = slideWidth / perView;
  const offset = currentIndex * perView * (fullSlideWidth + gap / perView);
  track.style.transform = `translateX(-${currentIndex * (slideWidth + gap)}px)`;

  // Simpler: move by container width
  track.style.transform = `translateX(calc(-${currentIndex * 100}% - ${currentIndex * gap}px))`;

  // Update buttons
  if (prevBtn) prevBtn.disabled = currentIndex === 0;
  if (nextBtn) nextBtn.disabled = currentIndex >= totalPages - 1;

  // Update dots
  const dots = dotsContainer ? dotsContainer.querySelectorAll('.carousel__dot') : [];
  dots.forEach((dot, i) => dot.classList.toggle('active', i === currentIndex));
}

function goToPage(index) {
  currentIndex = index;
  updateCarousel();
}

function slideCarousel(direction) {
  const totalPages = getTotalPages();
  currentIndex = Math.max(0, Math.min(currentIndex + direction, totalPages - 1));
  updateCarousel();
}

// Recalculate on resize
let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    buildDots();
    updateCarousel();
  }, 150);
});

// Init
buildDots();
updateCarousel();

// --- Hall Selection ---
const HALL_DATA = {
  awan: {
    name: 'Awan Hall',
    capacity: 500,
    rate: 200,
    color: '#4A90C4',
  },
  adiwira: {
    name: 'Adiwira Hall',
    capacity: 150,
    rate: 100,
    color: '#7B68C8',
  },
  rock: {
    name: 'Rock Essence',
    capacity: 80,
    rate: 100,
    color: '#C4704A',
  },
  office: {
    name: 'Office Meeting Room',
    capacity: 20,
    rate: 50,
    color: '#4AAB7A',
  },
  vip: {
    name: 'VIP Lounge',
    capacity: 12,
    rate: 50,
    color: '#C4A44A',
  },
};

function selectHall(hallKey) {
  const hall = HALL_DATA[hallKey];
  if (!hall) return;

  // Store selected hall in sessionStorage and navigate to booking form
  sessionStorage.setItem('selectedHall', JSON.stringify({ key: hallKey, ...hall }));
  window.location.href = 'booking.html';
}

// --- Toast Utility (shared, also used in other pages) ---
function showToast(message, type = 'info', duration = 3500) {
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