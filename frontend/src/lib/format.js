export function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatTime(iso) {
  return new Date(iso).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
}

export function priceLabel(event) {
  return event.is_free ? 'Free' : `₹${Number(event.price).toLocaleString('en-IN')}`;
}

export function placeLabel(event) {
  return [event.venue, event.city].filter(Boolean).join(', ');
}

// For <input type="datetime-local">
export function toLocalInput(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// Soft gradients used when an event has no poster
const GRADIENTS = [
  'linear-gradient(135deg,#5b21b6,#c026d3)',
  'linear-gradient(135deg,#4338ca,#a855f7)',
  'linear-gradient(135deg,#7e22ce,#ec4899)',
  'linear-gradient(135deg,#6d28d9,#f472b6)',
  'linear-gradient(135deg,#3730a3,#d946ef)',
  'linear-gradient(135deg,#86198f,#fb7185)',
];
export const gradientFor = (n = 0) => GRADIENTS[Math.abs(Number(n) || 0) % GRADIENTS.length];
