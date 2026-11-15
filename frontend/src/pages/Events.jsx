import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';
import SearchBars from '../components/SearchBars';
import EventCard, { SkeletonCards } from '../components/EventCard';

export default function Events() {
  const [params, setParams] = useSearchParams();
  const [categories, setCategories] = useState([]);
  const [events, setEvents] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');

  const q = params.get('q') || '';
  const city = params.get('city') || '';
  const category = params.get('category') || '';
  const type = params.get('type') || '';
  const price = params.get('price') || '';
  const when = params.get('when') || '';

  useEffect(() => {
    api('/categories').then(setCategories).catch(() => {});
  }, []);

  const queryString = useMemo(() => {
    const p = new URLSearchParams();
    if (q) p.set('q', q);
    if (city) p.set('city', city);
    if (category) p.set('category', category);
    if (type) p.set('type', type);
    if (price) p.set('price', price);
    if (when) p.set('when', when);
    return p.toString();
  }, [q, city, category, type, price, when]);

  useEffect(() => {
    setLoading(true);
    setError('');
    setPage(1);
    api(`/events?${queryString}&limit=12&page=1`)
      .then((r) => {
        setEvents(r.events);
        setTotal(r.total);
      })
      .catch((e) => {
        setEvents([]);
        setError(e.message);
      })
      .finally(() => setLoading(false));
  }, [queryString]);

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const next = page + 1;
      const r = await api(`/events?${queryString}&limit=12&page=${next}`);
      setEvents((prev) => [...prev, ...r.events]);
      setPage(next);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoadingMore(false);
    }
  };

  const setParam = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next);
  };

  const onSearch = ({ q: nq, city: nc }) => {
    const next = new URLSearchParams(params);
    nq ? next.set('q', nq) : next.delete('q');
    nc ? next.set('city', nc) : next.delete('city');
    setParams(next);
  };

  const hasFilters = Boolean(q || city || category || type || price || when);

  return (
    <div className="container page">
      <div className="page-head">
        <h1>Explore events</h1>
        <p>
          {loading ? 'Searching...' : `${total} ${total === 1 ? 'event' : 'events'} found`}
        </p>
      </div>

      <SearchBars initialQ={q} initialCity={city} onSearch={onSearch} />

      <div className="filters">
        <label>
          <span>Category</span>
          <select value={category} onChange={(e) => setParam('category', e.target.value)}>
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.slug}>{c.icon} {c.name}</option>
            ))}
          </select>
        </label>
        <label>
          <span>Event type</span>
          <select value={type} onChange={(e) => setParam('type', e.target.value)}>
            <option value="">College and local</option>
            <option value="college">College events</option>
            <option value="local">Local events</option>
          </select>
        </label>
        <label>
          <span>Price</span>
          <select value={price} onChange={(e) => setParam('price', e.target.value)}>
            <option value="">Free and paid</option>
            <option value="free">Free</option>
            <option value="paid">Paid</option>
          </select>
        </label>
        <label>
          <span>When</span>
          <select value={when} onChange={(e) => setParam('when', e.target.value)}>
            <option value="">Any upcoming date</option>
            <option value="today">Today</option>
            <option value="weekend">This weekend</option>
            <option value="month">Next 30 days</option>
          </select>
        </label>
        {hasFilters && (
          <button className="btn btn-ghost btn-sm" onClick={() => setParams({})}>Clear filters</button>
        )}
      </div>

      {error && <div className="alert alert-error" role="alert">{error}</div>}

      <div className="grid-events">
        {loading ? (
          <SkeletonCards count={8} />
        ) : events.length ? (
          events.map((e) => <EventCard key={e.id} event={e} />)
        ) : (
          !error && (
            <div className="empty wide">
              <h3>No events match your search</h3>
              <p>Try a different city or remove a filter.</p>
              {hasFilters && <button className="btn btn-outline" onClick={() => setParams({})}>Clear filters</button>}
            </div>
          )
        )}
      </div>

      {!loading && events.length < total && (
        <div className="load-more">
          <button className="btn btn-outline" onClick={loadMore} disabled={loadingMore}>
            {loadingMore ? 'Loading...' : 'Show more events'}
          </button>
        </div>
      )}
    </div>
  );
}
