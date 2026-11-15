import { Router } from 'express';
import { supabase } from '../supabase.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { wrap, cleanSearch } from '../utils.js';
import { EVENT_SELECT } from './events.js';

const router = Router();
router.use(requireAuth, requireAdmin);

// Every event on the site, newest first. Removing one uses DELETE /api/events/:id
router.get(
  '/events',
  wrap(async (req, res) => {
    const text = cleanSearch(req.query.q);
    let query = supabase.from('events').select(EVENT_SELECT).order('created_at', { ascending: false }).limit(200);
    if (text) query = query.or(`title.ilike.%${text}%,city.ilike.%${text}%`);
    const { data, error } = await query;
    if (error) throw error;
    res.json(data);
  })
);

export default router;
