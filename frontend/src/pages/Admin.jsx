import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { formatDate } from '../lib/format';
import Icon from '../components/Icons';

// Admin safety net: find and remove fake or wrong events
export default function Admin() {
  const [events, setEvents] = useState([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(true);
      api(`/admin/events?q=${encodeURIComponent(q)}`)
        .then((rows) => {
          setEvents(rows);
          setError('');
        })
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(timer);
  }, [q]);

  const remove = async (event) => {
    if (!window.confirm(`Remove "${event.title}" from the site?`)) return;
    try {
      await api(`/events/${event.id}`, { method: 'DELETE' });
      setEvents((list) => list.filter((e) => e.id !== event.id));
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div className="container page">
      <div className="page-head">
        <h1>Admin panel</h1>
        <p>All events on the site. Remove anything fake or wrong.</p>
      </div>

      <label className="field admin-search">
        <span className="sr-only">Search events</span>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by event name or city" />
      </label>

      {error && <div className="alert alert-error" role="alert">{error}</div>}

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Event</th>
              <th>City</th>
              <th>Date</th>
              <th>Posted by</th>
              <th><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="5">Loading...</td></tr>
            ) : events.length ? (
              events.map((e) => (
                <tr key={e.id}>
                  <td><Link to={`/events/${e.id}`}>{e.title}</Link></td>
                  <td>{e.city}</td>
                  <td>{formatDate(e.event_date)}</td>
                  <td>{e.organizer?.full_name || 'Sample event'}</td>
                  <td>
                    <button className="btn btn-danger btn-sm" onClick={() => remove(e)}>
                      <Icon name="trash" size={15} /> Remove
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr><td colSpan="5">No events found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
