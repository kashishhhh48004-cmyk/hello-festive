import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import EventCard, { SkeletonCards } from '../components/EventCard';
import Icon from '../components/Icons';

export default function MyEvents() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/events/mine')
      .then(setEvents)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const remove = async (event) => {
    if (!window.confirm(`Delete "${event.title}"? This cannot be undone.`)) return;
    try {
      await api(`/events/${event.id}`, { method: 'DELETE' });
      setEvents((list) => list.filter((e) => e.id !== event.id));
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div className="container page">
      <div className="page-head row-head">
        <div>
          <h1>My events</h1>
          <p>Events you have created.</p>
        </div>
        <Link to="/create" className="btn btn-primary"><Icon name="plus" size={16} /> Create event</Link>
      </div>

      {error && <div className="alert alert-error" role="alert">{error}</div>}

      <div className="grid-events">
        {loading ? (
          <SkeletonCards count={4} />
        ) : events.length ? (
          events.map((e) => (
            <EventCard
              key={e.id}
              event={e}
              footer={
                <>
                  <Link to={`/events/${e.id}/edit`} className="btn btn-outline btn-sm"><Icon name="edit" size={15} /> Edit</Link>
                  <button className="btn btn-danger btn-sm" onClick={() => remove(e)}><Icon name="trash" size={15} /> Delete</button>
                </>
              }
            />
          ))
        ) : (
          <div className="empty wide">
            <h3>You have not created any events yet</h3>
            <p>Your first event takes about two minutes.</p>
            <Link to="/create" className="btn btn-primary">Create an event</Link>
          </div>
        )}
      </div>
    </div>
  );
}
