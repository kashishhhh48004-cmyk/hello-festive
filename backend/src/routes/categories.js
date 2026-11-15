import { Router } from 'express';
import { supabase } from '../supabase.js';
import { wrap, startOfToday } from '../utils.js';

const router = Router();

// All categories, each with the number of upcoming events inside it
router.get(
  '/',
  wrap(async (_req, res) => {
    const { data: cats, error } = await supabase.from('categories').select('*').order('sort_order');
    if (error) throw error;

    const { data: events, error: err2 } = await supabase
      .from('events')
      .select('category_id')
      .eq('status', 'approved')
      .gte('event_date', startOfToday().toISOString());
    if (err2) throw err2;

    const counts = {};
    for (const e of events) counts[e.category_id] = (counts[e.category_id] || 0) + 1;

    res.json(cats.map((c) => ({ ...c, event_count: counts[c.id] || 0 })));
  })
);

export default router;
