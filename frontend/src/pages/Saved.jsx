import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import EventCard, { SkeletonCards } from '../components/EventCard';

export default function Saved() {
  const { bookmarks } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/bookmarks')
      .then(setEvents)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  // Unsaving a heart removes the card from this page
  const visible = events.filter((e) => bookmarks.has(e.id));

  return (
    <div className="container page">
      <div className="page-head">
        <h1>Saved events</h1>
        <p>Events you have marked with a heart.</p>
      </div>

      {error && <div className="alert alert-error" role="alert">{error}</div>}

      <div className="grid-events">
        {loading ? (
          <SkeletonCards count={4} />
        ) : visible.length ? (
          visible.map((e) => <EventCard key={e.id} event={e} />)
        ) : (
          <div className="empty wide">
            <h3>Nothing saved yet</h3>
            <p>Tap the heart on any event to keep it here.</p>
            <Link to="/events" className="btn btn-primary">Explore events</Link>
          </div>
        )}
      </div>
    </div>
  );
}
