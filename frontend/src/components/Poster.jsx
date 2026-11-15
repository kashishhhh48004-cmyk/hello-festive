import { useEffect, useState } from 'react';
import { gradientFor } from '../lib/format';

// Shows the event poster, or a soft gradient with the category emoji when there is none
export default function Poster({ event }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [event.poster_url]);

  if (event.poster_url && !failed) {
    return (
      <img
        className="poster-img"
        src={event.poster_url}
        alt={`Poster for ${event.title}`}
        loading="lazy"
        onError={() => setFailed(true)}
      />
    );
  }
  return (
    <div className="poster-fallback" style={{ background: gradientFor(event.category_id) }}>
      <span aria-hidden="true">{event.category?.icon || '✨'}</span>
    </div>
  );
}
