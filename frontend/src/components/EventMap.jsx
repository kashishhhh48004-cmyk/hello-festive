import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Free OpenStreetMap map with a single pin
export default function EventMap({ lat, lng, title }) {
  const ref = useRef(null);

  useEffect(() => {
    const map = L.map(ref.current, { scrollWheelZoom: false }).setView([lat, lng], 14);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    const icon = L.divIcon({ className: 'map-pin', html: '<span></span>', iconSize: [28, 28], iconAnchor: [14, 28] });
    const popup = document.createElement('div');
    popup.textContent = title; // text only, so it is safe
    L.marker([lat, lng], { icon }).addTo(map).bindPopup(popup);

    return () => map.remove();
  }, [lat, lng, title]);

  return <div ref={ref} className="map" role="img" aria-label={`Map showing the location of ${title}`} />;
}
