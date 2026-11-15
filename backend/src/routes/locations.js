import { Router } from 'express';
import { supabase } from '../supabase.js';
import { wrap, cleanSearch, startOfToday } from '../utils.js';

const router = Router();

// Autocomplete for the location search bar. With no text, returns the busiest cities.
router.get(
  '/suggest',
  wrap(async (req, res) => {
    const text = cleanSearch(req.query.q);

    let query = supabase
      .from('events')
      .select('city, state')
      .eq('status', 'approved')
      .gte('event_date', startOfToday().toISOString())
      .limit(500);
    if (text) query = query.or(`city.ilike.%${text}%,state.ilike.%${text}%`);

    const { data, error } = await query;
    if (error) throw error;

    const seen = new Map();
    for (const row of data) {
      const key = `${row.city}|${row.state ?? ''}`.toLowerCase();
      const entry = seen.get(key) || { city: row.city, state: row.state, count: 0 };
      entry.count += 1;
      seen.set(key, entry);
    }
    const list = [...seen.values()].sort((a, b) => b.count - a.count).slice(0, text ? 8 : 6);
    res.json(list);
  })
);

export default router;
