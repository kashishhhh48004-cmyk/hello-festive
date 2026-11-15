import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Icon, { Logo } from './Icons';

export default function Navbar() {
  const { user, profile, isAdmin, signOut } = useAuth();
  const [drawer, setDrawer] = useState(false);
  const [menu, setMenu] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const menuRef = useRef(null);

  useEffect(() => {
    setDrawer(false);
    setMenu(false);
  }, [location.pathname, location.hash]);

  useEffect(() => {
    const close = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenu(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const name = profile?.full_name || user?.email?.split('@')[0] || 'Account';
  const initial = name.charAt(0).toUpperCase();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <header className="navbar">
      <div className="container nav-inner">
        <Link to="/" className="brand" aria-label="Hello Festive home">
          <Logo />
        </Link>

        <nav className="nav-links" aria-label="Main">
          <NavLink to="/" end>Home</NavLink>
          <NavLink to="/events">Explore</NavLink>
          <Link to="/#categories">Categories</Link>
        </nav>

        <div className="nav-right">
          <Link to="/create" className="btn btn-primary btn-sm nav-create">
            <Icon name="plus" size={16} /> Create event
          </Link>

          {!user ? (
            <div className="nav-auth">
              <Link to="/login" className="btn btn-ghost btn-sm">Log in</Link>
              <Link to="/register" className="btn btn-outline btn-sm">Register</Link>
            </div>
          ) : (
            <div className="profile" ref={menuRef}>
              <button
                className="avatar"
                onClick={() => setMenu((m) => !m)}
                aria-haspopup="menu"
                aria-expanded={menu}
                aria-label="Open account menu"
              >
                {initial}
              </button>
              {menu && (
                <div className="dropdown" role="menu">
                  <div className="dropdown-head">
                    <strong>{name}</strong>
                    <span>{user.email}</span>
                  </div>
                  <Link to="/my-events" role="menuitem">My events</Link>
                  <Link to="/saved" role="menuitem">Saved events</Link>
                  {isAdmin && <Link to="/admin" role="menuitem">Admin panel</Link>}
                  <button onClick={handleSignOut} role="menuitem">Log out</button>
                </div>
              )}
            </div>
          )}

          <button className="hamburger" onClick={() => setDrawer((d) => !d)} aria-label="Toggle menu" aria-expanded={drawer}>
            <Icon name={drawer ? 'close' : 'menu'} size={22} />
          </button>
        </div>
      </div>

      {drawer && (
        <div className="drawer">
          <NavLink to="/" end>Home</NavLink>
          <NavLink to="/events">Explore events</NavLink>
          <Link to="/#categories">Categories</Link>
          <Link to="/create">Create event</Link>
          {user ? (
            <>
              <Link to="/my-events">My events</Link>
              <Link to="/saved">Saved events</Link>
              {isAdmin && <Link to="/admin">Admin panel</Link>}
              <button onClick={handleSignOut}>Log out</button>
            </>
          ) : (
            <>
              <Link to="/login">Log in</Link>
              <Link to="/register">Register</Link>
            </>
          )}
        </div>
      )}
    </header>
  );
}
