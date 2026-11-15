import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import SearchBars from '../components/SearchBars';
import CategoryCard from '../components/CategoryCard';
import EventCard, { SkeletonCards } from '../components/EventCard';
import Poster from '../components/Poster';
import { formatDate } from '../lib/format';

export default function Home() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [categories, setCategories] = useState([]);
  const [hero, setHero] = useState([]);
  const [active, setActive] = useState('all');
  const [events, setEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [weekend, setWeekend] = useState([]);

  useEffect(() => {
    api('/stats').then(setStats).catch(() => {});
    api('/categories').then(setCategories).catch(() => {});
    api('/events?limit=3&sort=newest').then((r) => setHero(r.events)).catch(() => {});
    api('/events?when=weekend&limit=8').then((r) => setWeekend(r.events)).catch(() => {});
  }, []);

  useEffect(() => {
    setLoadingEvents(true);
    const cat = active === 'all' ? '' : `&category=${active}`;
    api(`/events?limit=8${cat}`)
      .then((r) => setEvents(r.events))
      .catch(() => setEvents([]))
      .finally(() => setLoadingEvents(false));
  }, [active]);

  const onSearch = ({ q, city }) => {
    const p = new URLSearchParams();
    if (q) p.set('q', q);
    if (city) p.set('city', city);
    navigate(`/events?${p.toString()}`);
  };

  return (
    <>
      {/* ===== Slide 1: hero ===== */}
      <section className="hero">
        <div className="container hero-grid">
          <div className="hero-copy">
            <h1>Every fest, hackathon and festival near you, in one place.</h1>
            <p className="lead">
              Hello Festive helps students and neighbours find what is happening around them. Search by event name or
              city, save the ones you love, and host your own event so the right people find it.
            </p>
            <div className="hero-actions">
              <Link to="/events" className="btn btn-primary btn-lg">Explore events</Link>
              <Link to="/create" className="btn btn-outline btn-lg">Host an event</Link>
            </div>
            {stats && stats.events > 0 && (
              <p className="hero-stats">
                {stats.events} upcoming {stats.events === 1 ? 'event' : 'events'} across {stats.cities}{' '}
                {stats.cities === 1 ? 'city' : 'cities'} right now.
              </p>
            )}
          </div>

          <div className="hero-fan" aria-hidden={hero.length === 0}>
            {hero.slice(0, 3).map((e, i) => (
              <Link to={`/events/${e.id}`} key={e.id} className={`fan-card fan-${i}`}>
                <div className="fan-poster"><Poster event={e} /></div>
                <div className="fan-info">
                  <strong>{e.title}</strong>
                  <span>{formatDate(e.event_date)}, {e.city}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Slide 2: search, categories, events ===== */}
      <section className="section" id="search">
        <div className="container">
          <div className="section-head center">
            <h2>What are you looking for?</h2>
            <p>Type an event name, a city, or both.</p>
          </div>
          <SearchBars onSearch={onSearch} />
        </div>
      </section>

      <section className="section tight" id="categories">
        <div className="container">
          <div className="section-head">
            <h2>Browse by category</h2>
            <p>Pick a kind of event and see everything that is coming up.</p>
          </div>
          <div className="cat-grid">
            {categories.map((c) => (
              <CategoryCard key={c.id} category={c} />
            ))}
          </div>
        </div>
      </section>

      <section className="section tight" id="latest">
        <div className="container">
          <div className="section-head row-head">
            <div>
              <h2>Coming up</h2>
              <p>The next events, filtered by the category you choose.</p>
            </div>
            <Link to={active === 'all' ? '/events' : `/events?category=${active}`} className="btn btn-ghost">
              See all events
            </Link>
          </div>

          <div className="chips" role="tablist" aria-label="Filter by category">
            <button className={`chip ${active === 'all' ? 'on' : ''}`} onClick={() => setActive('all')}>All</button>
            {categories.map((c) => (
              <button
                key={c.id}
                className={`chip ${active === c.slug ? 'on' : ''}`}
                onClick={() => setActive(c.slug)}
              >
                {c.icon} {c.name}
              </button>
            ))}
          </div>

          <div className="grid-events">
            {loadingEvents ? (
              <SkeletonCards count={4} />
            ) : events.length ? (
              events.map((e) => <EventCard key={e.id} event={e} />)
            ) : (
              <div className="empty wide">
                <h3>No events in this category yet</h3>
                <p>Be the first to host one.</p>
                <Link to="/create" className="btn btn-primary">Create an event</Link>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ===== Slide 3: this weekend, how it works, host banner ===== */}
      {weekend.length > 0 && (
        <section className="section tight" id="weekend">
          <div className="container">
            <div className="section-head row-head">
              <div>
                <h2>Happening this weekend</h2>
                <p>Plans for Saturday and Sunday, sorted by date.</p>
              </div>
              <Link to="/events?when=weekend" className="btn btn-ghost">See all</Link>
            </div>
            <div className="scroller">
              {weekend.map((e) => (
                <div className="scroller-item" key={e.id}>
                  <EventCard event={e} />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="section tight" id="how">
        <div className="container">
          <div className="section-head center">
            <h2>How Hello Festive works</h2>
          </div>
          <ol className="steps">
            <li>
              <span className="step-n">1</span>
              <h3>Search</h3>
              <p>Look up an event by name or browse a city. Suggestions appear as you type.</p>
            </li>
            <li>
              <span className="step-n">2</span>
              <h3>Explore</h3>
              <p>Open an event to see the poster, schedule, price and a map of the venue.</p>
            </li>
            <li>
              <span className="step-n">3</span>
              <h3>Save or host</h3>
              <p>Tap the heart to keep an event, or create your own and it goes live right away.</p>
            </li>
          </ol>
        </div>
      </section>

      <section className="section tight">
        <div className="container">
          <div className="banner">
            <div>
              <h2>Running a fest, workshop or mela?</h2>
              <p>Add your event in two minutes. It appears in its category the moment you publish it.</p>
            </div>
            <Link to="/create" className="btn btn-light btn-lg">Create an event</Link>
          </div>
        </div>
      </section>
    </>
  );
}
