import { Router } from 'express';
import { supabase } from '../supabase.js';
import { requireAuth } from '../middleware/auth.js';
import { wrap, isUuid } from '../utils.js';
import { EVENT_SELECT } from './events.js';

const router = Router();
router.use(requireAuth);

// Full saved events
router.get(
  '/',
  wrap(async (req, res) => {
    const { data, error } = await supabase
      .from('bookmarks')
      .select(`created_at, event:events(${EVENT_SELECT})`)
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data.map((b) => b.event).filter((e) => e && e.status === 'approved'));
  })
);

// Only the ids (used to colour the heart icons)
router.get(
  '/ids',
  wrap(async (req, res) => {
    const { data, error } = await supabase.from('bookmarks').select('event_id').eq('user_id', req.user.id);
    if (error) throw error;
    res.json(data.map((b) => b.event_id));
  })
);

router.post(
  '/:eventId',
  wrap(async (req, res) => {
    if (!isUuid(req.params.eventId)) return res.status(404).json({ error: 'Event not found.' });
    const { data: ev } = await supabase.from('events').select('id').eq('id', req.params.eventId).maybeSingle();
    if (!ev) return res.status(404).json({ error: 'Event not found.' });

    const { error } = await supabase
      .from('bookmarks')
      .upsert({ user_id: req.user.id, event_id: req.params.eventId });
    if (error) throw error;
    res.status(201).json({ ok: true });
  })
);

router.delete(
  '/:eventId',
  wrap(async (req, res) => {
    if (!isUuid(req.params.eventId)) return res.status(404).json({ error: 'Event not found.' });
    const { error } = await supabase
      .from('bookmarks')
      .delete()
      .eq('user_id', req.user.id)
      .eq('event_id', req.params.eventId);
    if (error) throw error;
    res.json({ ok: true });
  })
);

export default router;
