import { Link } from 'react-router-dom';
import { Logo } from './Icons';

// Add your own social links here, for example:
// { label: 'Instagram', href: 'https://instagram.com/yourpage' }
const SOCIALS = [];

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-grid">
        <div className="footer-brand">
          <Logo />
          <p>
            Hello Festive puts college fests, hackathons, workshops and local festivals in one place, so you never
            hear about a great event after it ends.
          </p>
          {SOCIALS.length > 0 && (
            <div className="socials">
              {SOCIALS.map((s) => (
                <a key={s.label} href={s.href} target="_blank" rel="noreferrer">{s.label}</a>
              ))}
            </div>
          )}
        </div>

        <div>
          <h4>Explore</h4>
          <Link to="/events">All events</Link>
          <Link to="/#categories">Categories</Link>
          <Link to="/events?when=weekend">This weekend</Link>
          <Link to="/events?price=free">Free events</Link>
        </div>

        <div>
          <h4>Organizers</h4>
          <Link to="/create">Create an event</Link>
          <Link to="/my-events">My events</Link>
          <Link to="/saved">Saved events</Link>
        </div>

        <div>
          <h4>Account</h4>
          <Link to="/login">Log in</Link>
          <Link to="/register">Register</Link>
          <Link to="/forgot-password">Forgot password</Link>
        </div>
      </div>
      <div className="container footer-bottom">
        <span>© {new Date().getFullYear()} Hello Festive. Made for students and neighbourhoods.</span>
      </div>
    </footer>
  );
}
