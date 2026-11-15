import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Logo } from '../components/Icons';

function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <Link to="/" className="brand" aria-label="Hello Festive home"><Logo /></Link>
        <h1>{title}</h1>
        {subtitle && <p className="muted">{subtitle}</p>}
        {children}
        {footer && <p className="auth-footer">{footer}</p>}
      </div>
    </div>
  );
}

/* ---------------- Login ---------------- */
export function Login() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (!loading && user) return <Navigate to={from} replace />;

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (err) setError(err.message);
    else navigate(from, { replace: true });
  };

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Log in to save events and host your own."
      footer={<>New here? <Link to="/register">Create an account</Link></>}
    >
      {error && <div className="alert alert-error" role="alert">{error}</div>}
      <form className="form" onSubmit={onSubmit}>
        <label className="field">
          <span>Email</span>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        </label>
        <label className="field">
          <span>Password</span>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
        </label>
        <Link to="/forgot-password" className="text-link align-right">Forgot password?</Link>
        <button className="btn btn-primary btn-lg" disabled={busy}>{busy ? 'Logging in...' : 'Log in'}</button>
      </form>
    </AuthShell>
  );
}

/* ---------------- Register ---------------- */
export function Register() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [checkEmail, setCheckEmail] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!loading && user) return <Navigate to="/" replace />;

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) return setError('Password must be at least 8 characters.');
    if (password !== confirm) return setError('The two passwords do not match.');

    setBusy(true);
    const { data, error: err } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { full_name: name.trim() } },
    });
    setBusy(false);
    if (err) return setError(err.message);
    if (data.session) navigate('/', { replace: true });
    else setCheckEmail(true); // email confirmation is switched on in Supabase
  };

  if (checkEmail) {
    return (
      <AuthShell title="Check your email" subtitle={`We sent a confirmation link to ${email}. Open it, then log in.`}>
        <Link to="/login" className="btn btn-primary btn-lg">Go to log in</Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Create your account"
      subtitle="Free, and it takes under a minute."
      footer={<>Already registered? <Link to="/login">Log in</Link></>}
    >
      {error && <div className="alert alert-error" role="alert">{error}</div>}
      <form className="form" onSubmit={onSubmit}>
        <label className="field">
          <span>Full name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} required autoComplete="name" />
        </label>
        <label className="field">
          <span>Email</span>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        </label>
        <label className="field">
          <span>Password</span>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} autoComplete="new-password" />
          <small className="hint">At least 8 characters.</small>
        </label>
        <label className="field">
          <span>Confirm password</span>
          <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required autoComplete="new-password" />
        </label>
        <button className="btn btn-primary btn-lg" disabled={busy}>{busy ? 'Creating account...' : 'Create account'}</button>
      </form>
    </AuthShell>
  );
}

/* ---------------- Forgot password ---------------- */
export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setBusy(false);
    if (err) setError(err.message);
    else setSent(true);
  };

  if (sent) {
    return (
      <AuthShell title="Check your email" subtitle={`If an account exists for ${email}, a password reset link is on its way.`}>
        <Link to="/login" className="btn btn-primary btn-lg">Back to log in</Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Reset your password"
      subtitle="Enter your email and we will send you a link to choose a new password."
      footer={<Link to="/login">Back to log in</Link>}
    >
      {error && <div className="alert alert-error" role="alert">{error}</div>}
      <form className="form" onSubmit={onSubmit}>
        <label className="field">
          <span>Email</span>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        </label>
        <button className="btn btn-primary btn-lg" disabled={busy}>{busy ? 'Sending...' : 'Send reset link'}</button>
      </form>
    </AuthShell>
  );
}

/* ---------------- Reset password (opened from the email link) ---------------- */
export function ResetPassword() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // Supabase signs the user in from the email link and fires this event
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => data.session && setReady(true));
    return () => sub.subscription.unsubscribe();
  }, []);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) return setError('Password must be at least 8 characters.');
    if (password !== confirm) return setError('The two passwords do not match.');
    setBusy(true);
    const { error: err } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (err) return setError(err.message);
    setDone(true);
    setTimeout(() => navigate('/'), 1500);
  };

  if (done) return <AuthShell title="Password updated" subtitle="Taking you to the home page." />;

  if (!ready) {
    return (
      <AuthShell
        title="Open the link from your email"
        subtitle="This page works when you arrive from a password reset email. The link may have expired."
        footer={<Link to="/forgot-password">Send a new reset link</Link>}
      />
    );
  }

  return (
    <AuthShell title="Choose a new password">
      {error && <div className="alert alert-error" role="alert">{error}</div>}
      <form className="form" onSubmit={onSubmit}>
        <label className="field">
          <span>New password</span>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} autoComplete="new-password" />
        </label>
        <label className="field">
          <span>Confirm new password</span>
          <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required autoComplete="new-password" />
        </label>
        <button className="btn btn-primary btn-lg" disabled={busy}>{busy ? 'Saving...' : 'Save new password'}</button>
      </form>
    </AuthShell>
  );
}
