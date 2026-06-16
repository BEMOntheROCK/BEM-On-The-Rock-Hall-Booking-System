// ============================================================
//  BEM ON THE ROCK — Hall Booking | confirmation.js
// ============================================================

document.getElementById('year').textContent = new Date().getFullYear();

// --- Load submission summary from sessionStorage ---
const stored = sessionStorage.getItem('bookingSubmission');

if (stored) {
  try {
    const data = JSON.parse(stored);

    document.getElementById('summaryHall').textContent    = data.hallName  || '—';
    document.getElementById('summaryPurpose').textContent = data.purpose   || '—';
    document.getElementById('summaryName').textContent    = data.name1            || '—';
    document.getElementById('summaryRef').textContent     = data.referenceNumber || '—';

    if (data.eventDate) {
      const date = new Date(data.eventDate + 'T00:00:00');
      document.getElementById('summaryDate').textContent = date.toLocaleDateString('en-MY', {
        weekday: 'long',
        year:    'numeric',
        month:   'long',
        day:     'numeric',
      });
    }

    // Clear session so user can't land here again by refreshing with stale data
    sessionStorage.removeItem('bookingSubmission');
    sessionStorage.removeItem('selectedHall');

  } catch {
    // Fallback — summary section still renders with dashes
  }
} else {
  // If somehow landed here without submitting, hide the summary card gracefully
  const summary = document.getElementById('confirmSummary');
  if (summary) summary.style.display = 'none';
}