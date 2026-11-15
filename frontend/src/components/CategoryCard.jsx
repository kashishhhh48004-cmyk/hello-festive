import { Link } from 'react-router-dom';

export default function CategoryCard({ category }) {
  const n = category.event_count;
  return (
    <Link to={`/events?category=${category.slug}`} className="cat-card">
      <span className="cat-icon" aria-hidden="true">{category.icon}</span>
      <span className="cat-text">
        <strong>{category.name}</strong>
        <small>{n === 0 ? 'No events yet' : `${n} upcoming`}</small>
      </span>
    </Link>
  );
}
