import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { formatDate, formatTime, priceLabel } from '../lib/format';
import Icon from '../components/Icons';
import Poster from '../components/Poster';
import EventMap from '../components/EventMap';
import { Spinner } from '../components/ProtectedRoute';

export default function EventDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAdmin, bookmarks, toggleBookmark } = useAuth();
  const [event, setEvent] = useState(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setEvent(null);
    setError('');
    api(`/events/${id}`).then(setEvent).catch((e) => setError(e.message));
  }, [id]);

  if (error) {
    return (
      <div className="container page narrow">
        <div className="empty">
          <h3>{error}</h3>
          <Link to="/events" className="btn btn-primary">Back to events</Link>
        </div>
      </div>
    );
  }
  if (!event) return <Spinner />;

  const isOwner = user?.id === event.organizer_id;
  const saved = bookmarks.has(event.id);
  const hasMap = event.latitude != null && event.longitude != null;

  const onSave = () => {
    if (!user) return navigate('/login', { state: { from: { pathname: `/events/${event.id}` } } });
    toggleBookmark(event.id);
  };

  const onShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt('Copy this link', window.location.href);
    }
  };

  const onDelete = async () => {
    if (!window.confirm('Delete this event? This cannot be undone.')) return;
    try {
      await api(`/events/${event.id}`, { method: 'DELETE' });
      navigate('/my-events');
    } catch (e) {
      setError(e.message);
    }
  };

  const mapLink = hasMap
    ? `https://www.openstreetmap.org/?mlat=${event.latitude}&mlon=${event.longitude}#map=16/${event.latitude}/${event.longitude}`
    : `https://www.openstreetmap.org/search?query=${encodeURIComponent(`${event.venue}, ${event.city}`)}`;

  return (
    <div className="container page">
      <Link to="/events" className="back-link">Back to events</Link>

      <div className="detail-grid">
        <div className="detail-poster">
          <Poster event={event} />
        </div>

        <div className="detail-main">
          {event.category && (
            <Link to={`/events?category=${event.category.slug}`} className="card-cat">
              {event.category.icon} {event.category.name}
            </Link>
          )}
          <h1>{event.title}</h1>
          <p className="detail-sub">
            {event.event_type === 'college' ? `College event${event.college_name ? ` at ${event.college_name}` : ''}` : 'Local event'}
            {event.organizer?.full_name ? `, hosted by ${event.organizer.full_name}` : ''}
          </p>

          <ul className="facts">
            <li>
              <Icon name="calendar" />
              <div>
                <strong>{formatDate(event.event_date)}</strong>
                <span>
                  Starts {formatTime(event.event_date)}
                  {event.end_date ? `, ends ${formatDate(event.end_date)} ${formatTime(event.end_date)}` : ''}
                </span>
              </div>
            </li>
            <li>
              <Icon name="pin" />
              <div>
                <strong>{event.venue}</strong>
                <span>{[event.city, event.state].filter(Boolean).join(', ')}</span>
              </div>
            </li>
            <li>
              <span className={`price inline ${event.is_free ? 'free' : 'paid'}`}>{priceLabel(event)}</span>
              <div>
                <strong>{event.is_free ? 'Free entry' : 'Ticket price'}</strong>
                <span>{event.is_free ? 'No payment needed' : 'Per person'}</span>
              </div>
            </li>
          </ul>

          <div className="detail-actions">
            {event.register_link && (
              <a className="btn btn-primary btn-lg" href={event.register_link} target="_blank" rel="noreferrer noopener">
                <Icon name="link" size={18} /> Register
              </a>
            )}
            <button className={`btn btn-outline ${saved ? 'is-saved' : ''}`} onClick={onSave} aria-pressed={saved}>
              <Icon name="heart" size={18} filled={saved} /> {saved ? 'Saved' : 'Save'}
            </button>
            <button className="btn btn-ghost" onClick={onShare}>
              <Icon name="share" size={18} /> {copied ? 'Link copied' : 'Share'}
            </button>
          </div>

          {(isOwner || isAdmin) && (
            <div className="owner-bar">
              {isOwner && (
                <Link to={`/events/${event.id}/edit`} className="btn btn-outline btn-sm">
                  <Icon name="edit" size={16} /> Edit event
                </Link>
              )}
              <button className="btn btn-danger btn-sm" onClick={onDelete}>
                <Icon name="trash" size={16} /> Delete event
              </button>
            </div>
          )}
        </div>
      </div>

      <section className="detail-section">
        <h2>About this event</h2>
        <p className="prose">{event.description}</p>
      </section>

      <section className="detail-section">
        <h2>Location</h2>
        {hasMap ? (
          <EventMap lat={event.latitude} lng={event.longitude} title={event.venue} />
        ) : (
          <p className="muted">The organizer has not added a map pin for this venue.</p>
        )}
        <a className="text-link" href={mapLink} target="_blank" rel="noreferrer noopener">Open in OpenStreetMap</a>
      </section>
    </div>
  );
}
