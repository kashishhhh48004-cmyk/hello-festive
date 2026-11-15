import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { formatDate, formatTime, placeLabel, priceLabel } from '../lib/format';
import Icon from './Icons';
import Poster from './Poster';

export default function EventCard({ event, footer }) {
  const { user, bookmarks, toggleBookmark } = useAuth();
  const navigate = useNavigate();
  const saved = bookmarks.has(event.id);

  const onHeart = () => {
    if (!user) {
      navigate('/login', { state: { from: { pathname: `/events/${event.id}` } } });
      return;
    }
    toggleBookmark(event.id);
  };

  return (
    <article className="card">
      <Link to={`/events/${event.id}`} className="card-link">
        <div className="poster">
          <Poster event={event} />
          <span className={`price ${event.is_free ? 'free' : 'paid'}`}>{priceLabel(event)}</span>
        </div>
        <div className="card-body">
          {event.category && (
            <span className="card-cat">
              {event.category.icon} {event.category.name}
            </span>
          )}
          <h3>{event.title}</h3>
          <p className="meta">
            <Icon name="calendar" size={15} />
            {formatDate(event.event_date)}, {formatTime(event.event_date)}
          </p>
          <p className="meta">
            <Icon name="pin" size={15} />
            {placeLabel(event)}
          </p>
          <p className="desc">{event.description}</p>
        </div>
      </Link>
      <button
        className={`heart ${saved ? 'on' : ''}`}
        onClick={onHeart}
        aria-label={saved ? 'Remove from saved events' : 'Save this event'}
        aria-pressed={saved}
      >
        <Icon name="heart" size={18} filled={saved} />
      </button>
      {footer && <div className="card-footer">{footer}</div>}
    </article>
  );
}

export function SkeletonCards({ count = 4 }) {
  return Array.from({ length: count }).map((_, i) => (
    <div className="card skeleton" key={i} aria-hidden="true">
      <div className="poster" />
      <div className="card-body">
        <span className="sk-line short" />
        <span className="sk-line" />
        <span className="sk-line" />
      </div>
    </div>
  ));
}
