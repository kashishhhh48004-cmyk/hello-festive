import { supabase } from '../supabase.js';

// Reads the login token sent by the website and finds out who the user is
async function resolveUser(req) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return null;

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('id', data.user.id)
    .maybeSingle();

  return {
    id: data.user.id,
    email: data.user.email,
    full_name: profile?.full_name ?? null,
    role: profile?.role ?? 'user',
  };
}

// Works for logged-in and logged-out visitors
export async function optionalAuth(req, _res, next) {
  try {
    req.user = await resolveUser(req);
  } catch {
    req.user = null;
  }
  next();
}

// Only logged-in users get through
export async function requireAuth(req, res, next) {
  try {
    const user = await resolveUser(req);
    if (!user) return res.status(401).json({ error: 'Please log in to continue.' });
    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

// Only admins get through (use after requireAuth)
export function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Admins only.' });
  next();
}
