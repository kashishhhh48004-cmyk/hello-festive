import { Router } from 'express';
import { supabase } from '../supabase.js';
import { requireAuth } from '../middleware/auth.js';
import { wrap, startOfToday } from '../utils.js';

const router = Router();

// Numbers shown on the home page
router.get(
  '/stats',
  wrap(async (_req, res) => {
    const { data, error } = await supabase
      .from('events')
      .select('city')
      .eq('status', 'approved')
      .gte('event_date', startOfToday().toISOString());
    if (error) throw error;
    const cities = new Set(data.map((e) => e.city.trim().toLowerCase()));
    res.json({ events: data.length, cities: cities.size });
  })
);

// Who am I? (name and role of the logged-in user)
router.get('/me', requireAuth, (req, res) => {
  const { id, email, full_name, role } = req.user;
  res.json({ id, email, full_name, role });
});

export default router;
