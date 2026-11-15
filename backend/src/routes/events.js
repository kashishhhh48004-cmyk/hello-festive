import { Router } from 'express';
import { supabase } from '../supabase.js';
import { optionalAuth, requireAuth } from '../middleware/auth.js';
import { wrap, isUuid, cleanSearch, startOfToday, addDays } from '../utils.js';

const router = Router();

export const EVENT_SELECT =
  '*, category:categories(id, name, slug, icon), organizer:profiles!events_organizer_id_fkey(full_name)';

/* ---------- GET /api/events : search + filters ---------- */
router.get(
  '/',
  wrap(async (req, res) => {
    const { q, city, category, type, price, when, sort } = req.query;
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 12, 1), 50);
    const from = (page - 1) * limit;

    let query = supabase
      .from('events')
      .select(EVENT_SELECT, { count: 'exact' })
      .eq('status', 'approved');

    // text search on the event name
    const text = cleanSearch(q);
    if (text) {
      query = query.or(`title.ilike.%${text}%,college_name.ilike.%${text}%,venue.ilike.%${text}%`);
    }

    // location search: city, state or venue
    const place = cleanSearch(city);
    if (place) {
      query = query.or(`city.ilike.%${place}%,state.ilike.%${place}%,venue.ilike.%${place}%`);
    }

    // category (by slug)
    if (category) {
      const { data: cat } = await supabase
        .from('categories')
        .select('id')
        .eq('slug', String(category))
        .maybeSingle();
      if (!cat) return res.json({ events: [], total: 0, page, limit });
      query = query.eq('category_id', cat.id);
    }

    if (type === 'college' || type === 'local') query = query.eq('event_type', type);
    if (price === 'free') query = query.eq('is_free', true);
    if (price === 'paid') query = query.eq('is_free', false);

    // date range (past events are hidden)
    const today = startOfToday();
    let rangeStart = today;
    let rangeEnd = null;
    if (when === 'today') {
      rangeEnd = addDays(today, 1);
    } else if (when === 'weekend') {
      const day = today.getDay(); // 0 = Sunday, 6 = Saturday
      if (day === 6) rangeEnd = addDays(today, 2);
      else if (day === 0) rangeEnd = addDays(today, 1);
      else {
        rangeStart = addDays(today, 6 - day);
        rangeEnd = addDays(rangeStart, 2);
      }
    } else if (when === 'month') {
      rangeEnd = addDays(today, 30);
    }
    query = query.gte('event_date', rangeStart.toISOString());
    if (rangeEnd) query = query.lt('event_date', rangeEnd.toISOString());

    query = sort === 'newest'
      ? query.order('created_at', { ascending: false })
      : query.order('event_date', { ascending: true });

    const { data, error, count } = await query.range(from, from + limit - 1);
    if (error) throw error;
    res.json({ events: data, total: count ?? 0, page, limit });
  })
);

/* ---------- GET /api/events/suggest?q= : autocomplete for the event search bar ---------- */
router.get(
  '/suggest',
  wrap(async (req, res) => {
    const text = cleanSearch(req.query.q);
    if (text.length < 2) return res.json([]);

    const { data, error } = await supabase
      .from('events')
      .select('id, title, city, category:categories(name, icon)')
      .eq('status', 'approved')
      .gte('event_date', startOfToday().toISOString())
      .ilike('title', `%${text}%`)
      .order('event_date', { ascending: true })
      .limit(6);
    if (error) throw error;
    res.json(data);
  })
);

/* ---------- GET /api/events/mine : events created by me ---------- */
router.get(
  '/mine',
  requireAuth,
  wrap(async (req, res) => {
    const { data, error } = await supabase
      .from('events')
      .select(EVENT_SELECT)
      .eq('organizer_id', req.user.id)
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data);
  })
);

/* ---------- GET /api/events/:id ---------- */
router.get(
  '/:id',
  optionalAuth,
  wrap(async (req, res) => {
    if (!isUuid(req.params.id)) return res.status(404).json({ error: 'Event not found.' });

    const { data, error } = await supabase
      .from('events')
      .select(EVENT_SELECT)
      .eq('id', req.params.id)
      .maybeSingle();
    if (error) throw error;

    const canSee =
      data && (data.status === 'approved' || req.user?.id === data.organizer_id || req.user?.role === 'admin');
    if (!canSee) return res.status(404).json({ error: 'Event not found.' });
    res.json(data);
  })
);

/* ---------- validation shared by create + edit ---------- */
async function validateEvent(b) {
  const errors = [];
  const title = String(b.title ?? '').trim();
  const description = String(b.description ?? '').trim();
  const venue = String(b.venue ?? '').trim();
  const city = String(b.city ?? '').trim();
  const state = String(b.state ?? '').trim() || null;
  const category_id = parseInt(b.category_id, 10);
  const event_type = b.event_type === 'college' ? 'college' : 'local';
  const college_name = event_type === 'college' ? String(b.college_name ?? '').trim() || null : null;
  const is_free = b.is_free === true || b.is_free === 'true';

  if (title.length < 3 || title.length > 150) errors.push('Title must be 3 to 150 characters.');
  if (description.length < 10 || description.length > 2000)
    errors.push('Description must be 10 to 2000 characters.');
  if (!venue) errors.push('Venue is required.');
  if (!city) errors.push('City is required.');

  const eventDate = new Date(b.event_date);
  if (Number.isNaN(eventDate.getTime())) errors.push('Please choose a valid start date and time.');

  let end_date = null;
  if (b.end_date) {
    const end = new Date(b.end_date);
    if (Number.isNaN(end.getTime())) errors.push('End date is not valid.');
    else if (end < eventDate) errors.push('End date must be after the start date.');
    else end_date = end.toISOString();
  }

  let price = null;
  if (!is_free) {
    price = Number(b.price);
    if (!Number.isFinite(price) || price <= 0 || price > 1000000)
      errors.push('Enter a ticket price greater than 0, or mark the event as free.');
  }

  let latitude = null;
  let longitude = null;
  if (b.latitude !== '' && b.latitude != null && b.longitude !== '' && b.longitude != null) {
    latitude = Number(b.latitude);
    longitude = Number(b.longitude);
    if (!(latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180)) {
      errors.push('Map location is not valid.');
      latitude = longitude = null;
    }
  }

  const poster_url = String(b.poster_url ?? '').trim() || null;
  if (poster_url && !/^https?:\/\//i.test(poster_url)) errors.push('Poster link is not valid.');

  const register_link = String(b.register_link ?? '').trim() || null;
  if (register_link && !/^https?:\/\//i.test(register_link))
    errors.push('Registration link must start with http:// or https://');

  if (!Number.isInteger(category_id)) errors.push('Please choose a category.');
  else {
    const { data: cat } = await supabase.from('categories').select('id').eq('id', category_id).maybeSingle();
    if (!cat) errors.push('That category does not exist.');
  }

  if (errors.length) return { errors };

  return {
    value: {
      title,
      description,
      category_id,
      event_date: eventDate.toISOString(),
      end_date,
      venue,
      city,
      state,
      latitude,
      longitude,
      event_type,
      college_name,
      is_free,
      price,
      poster_url,
      register_link,
    },
  };
}

/* ---------- POST /api/events : create (goes live instantly) ---------- */
router.post(
  '/',
  requireAuth,
  wrap(async (req, res) => {
    const { errors, value } = await validateEvent(req.body || {});
    if (errors) return res.status(400).json({ error: errors.join(' ') });

    const { data, error } = await supabase
      .from('events')
      .insert({ ...value, organizer_id: req.user.id, status: 'approved' })
      .select(EVENT_SELECT)
      .single();
    if (error) throw error;
    res.status(201).json(data);
  })
);

/* ---------- PUT /api/events/:id : edit my own event ---------- */
router.put(
  '/:id',
  requireAuth,
  wrap(async (req, res) => {
    if (!isUuid(req.params.id)) return res.status(404).json({ error: 'Event not found.' });

    const { data: existing } = await supabase
      .from('events')
      .select('id, organizer_id')
      .eq('id', req.params.id)
      .maybeSingle();
    if (!existing) return res.status(404).json({ error: 'Event not found.' });
    if (existing.organizer_id !== req.user.id)
      return res.status(403).json({ error: 'You can only edit your own events.' });

    const { errors, value } = await validateEvent(req.body || {});
    if (errors) return res.status(400).json({ error: errors.join(' ') });

    const { data, error } = await supabase
      .from('events')
      .update(value)
      .eq('id', req.params.id)
      .select(EVENT_SELECT)
      .single();
    if (error) throw error;
    res.json(data);
  })
);

/* ---------- DELETE /api/events/:id : owner or admin ---------- */
router.delete(
  '/:id',
  requireAuth,
  wrap(async (req, res) => {
    if (!isUuid(req.params.id)) return res.status(404).json({ error: 'Event not found.' });

    const { data: existing } = await supabase
      .from('events')
      .select('id, organizer_id')
      .eq('id', req.params.id)
      .maybeSingle();
    if (!existing) return res.status(404).json({ error: 'Event not found.' });

    const allowed = existing.organizer_id === req.user.id || req.user.role === 'admin';
    if (!allowed) return res.status(403).json({ error: 'You can only delete your own events.' });

    const { error } = await supabase.from('events').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ ok: true });
  })
);

export default router;
