import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { toLocalInput } from '../lib/format';
import Icon from '../components/Icons';
import { Spinner } from '../components/ProtectedRoute';

const MAX_POSTER_BYTES = 3 * 1024 * 1024;
const EMPTY = {
  title: '',
  category_id: '',
  event_type: 'college',
  college_name: '',
  event_date: '',
  end_date: '',
  venue: '',
  city: '',
  state: '',
  latitude: '',
  longitude: '',
  is_free: true,
  price: '',
  description: '',
  register_link: '',
  poster_url: '',
};

// Used for both "Create event" and "Edit event"
export default function CreateEvent() {
  const { id } = useParams();
  const editing = Boolean(id);
  const navigate = useNavigate();
  const { user } = useAuth();
  const fileRef = useRef(null);

  const [form, setForm] = useState(EMPTY);
  const [categories, setCategories] = useState([]);
  const [posterFile, setPosterFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [loading, setLoading] = useState(editing);
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState('');
  const [mapNote, setMapNote] = useState('');

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  useEffect(() => {
    api('/categories').then(setCategories).catch(() => {});
  }, []);

  useEffect(() => {
    if (!editing) return;
    api(`/events/${id}`)
      .then((e) => {
        if (e.organizer_id !== user?.id) {
          setError('You can only edit your own events.');
          return;
        }
        setForm({
          title: e.title,
          category_id: String(e.category_id),
          event_type: e.event_type,
          college_name: e.college_name || '',
          event_date: toLocalInput(e.event_date),
          end_date: toLocalInput(e.end_date),
          venue: e.venue,
          city: e.city,
          state: e.state || '',
          latitude: e.latitude ?? '',
          longitude: e.longitude ?? '',
          is_free: e.is_free,
          price: e.price ?? '',
          description: e.description,
          register_link: e.register_link || '',
          poster_url: e.poster_url || '',
        });
        setPreview(e.poster_url || '');
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id, editing, user?.id]);

  const onPickPoster = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Poster must be a JPG, PNG or WebP image.');
      return;
    }
    if (file.size > MAX_POSTER_BYTES) {
      setError('Poster must be smaller than 3 MB.');
      return;
    }
    setError('');
    setPosterFile(file);
    setPreview(URL.createObjectURL(file));
  };

  const removePoster = () => {
    setPosterFile(null);
    setPreview('');
    set('poster_url', '');
    if (fileRef.current) fileRef.current.value = '';
  };

  // Looks up the venue on OpenStreetMap so the event page can show a pin
  const findOnMap = async () => {
    setMapNote('');
    if (!form.city.trim()) {
      setMapNote('Enter the city first.');
      return;
    }
    setLocating(true);
    const tries = [
      [form.venue, form.city, form.state, 'India'],
      [form.city, form.state, 'India'],
    ];
    try {
      for (const parts of tries) {
        const q = parts.filter((p) => p && String(p).trim()).join(', ');
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`
        );
        const data = await res.json();
        if (data[0]) {
          set('latitude', Number(data[0].lat).toFixed(6));
          set('longitude', Number(data[0].lon).toFixed(6));
          setMapNote(parts.length === 4 ? 'Pin found for the venue.' : 'Exact venue not found, so the pin is at the city centre.');
          return;
        }
      }
      setMapNote('Could not find that place. The event will be saved without a map pin.');
    } catch {
      setMapNote('Map lookup failed. You can still save the event without a pin.');
    } finally {
      setLocating(false);
    }
  };

  const uploadPoster = async () => {
    const ext = posterFile.type === 'image/png' ? 'png' : posterFile.type === 'image/webp' ? 'webp' : 'jpg';
    const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from('event-posters')
      .upload(path, posterFile, { contentType: posterFile.type });
    if (upErr) throw new Error(`Poster upload failed: ${upErr.message}`);
    return supabase.storage.from('event-posters').getPublicUrl(path).data.publicUrl;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.category_id) return setError('Please choose a category.');
    if (!form.event_date) return setError('Please choose a start date and time.');

    setSaving(true);
    try {
      let poster_url = form.poster_url;
      if (posterFile) poster_url = await uploadPoster();

      const body = {
        ...form,
        poster_url,
        event_date: new Date(form.event_date).toISOString(),
        end_date: form.end_date ? new Date(form.end_date).toISOString() : null,
        price: form.is_free ? null : form.price,
      };
      const saved = editing
        ? await api(`/events/${id}`, { method: 'PUT', body })
        : await api('/events', { method: 'POST', body });
      navigate(`/events/${saved.id}`);
    } catch (err) {
      setError(err.message);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Spinner />;

  return (
    <div className="container page narrow">
      <div className="page-head">
        <h1>{editing ? 'Edit event' : 'Create an event'}</h1>
        <p>
          {editing
            ? 'Update the details below and save.'
            : 'Fill in the details. Your event goes live as soon as you publish it.'}
        </p>
      </div>

      {error && <div className="alert alert-error" role="alert">{error}</div>}

      <form className="form" onSubmit={onSubmit}>
        <fieldset>
          <legend>Basics</legend>
          <label className="field">
            <span>Event name</span>
            <input value={form.title} onChange={(e) => set('title', e.target.value)} maxLength={150} required placeholder="Example: CodeStorm 24-hour hackathon" />
          </label>

          <label className="field">
            <span>Category</span>
            <select value={form.category_id} onChange={(e) => set('category_id', e.target.value)} required>
              <option value="">Choose a category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
              ))}
            </select>
          </label>

          <div className="field">
            <span>Event type</span>
            <div className="segmented" role="radiogroup" aria-label="Event type">
              <button type="button" role="radio" aria-checked={form.event_type === 'college'} className={form.event_type === 'college' ? 'on' : ''} onClick={() => set('event_type', 'college')}>College event</button>
              <button type="button" role="radio" aria-checked={form.event_type === 'local'} className={form.event_type === 'local' ? 'on' : ''} onClick={() => set('event_type', 'local')}>Local event</button>
            </div>
          </div>

          {form.event_type === 'college' && (
            <label className="field">
              <span>College name</span>
              <input value={form.college_name} onChange={(e) => set('college_name', e.target.value)} placeholder="Example: ABC Institute of Technology" />
            </label>
          )}

          <label className="field">
            <span>Description</span>
            <textarea rows={5} value={form.description} onChange={(e) => set('description', e.target.value)} maxLength={2000} required placeholder="What is the event about? Who can join?" />
            <small className="hint">{form.description.length} / 2000</small>
          </label>
        </fieldset>

        <fieldset>
          <legend>Date and place</legend>
          <div className="two-col">
            <label className="field">
              <span>Starts</span>
              <input type="datetime-local" value={form.event_date} onChange={(e) => set('event_date', e.target.value)} required />
            </label>
            <label className="field">
              <span>Ends (optional)</span>
              <input type="datetime-local" value={form.end_date} min={form.event_date} onChange={(e) => set('end_date', e.target.value)} />
            </label>
          </div>
          <label className="field">
            <span>Venue</span>
            <input value={form.venue} onChange={(e) => set('venue', e.target.value)} required placeholder="Example: Main Auditorium" />
          </label>
          <div className="two-col">
            <label className="field">
              <span>City</span>
              <input value={form.city} onChange={(e) => set('city', e.target.value)} required placeholder="Example: Ghaziabad" />
            </label>
            <label className="field">
              <span>State</span>
              <input value={form.state} onChange={(e) => set('state', e.target.value)} placeholder="Example: Uttar Pradesh" />
            </label>
          </div>
          <div className="map-row">
            <button type="button" className="btn btn-outline btn-sm" onClick={findOnMap} disabled={locating}>
              <Icon name="pin" size={16} /> {locating ? 'Searching...' : 'Find on map'}
            </button>
            <span className="hint" aria-live="polite">
              {mapNote || (form.latitude !== '' ? `Pin set at ${form.latitude}, ${form.longitude}` : 'Optional. Adds a map to your event page.')}
            </span>
          </div>
        </fieldset>

        <fieldset>
          <legend>Tickets</legend>
          <div className="field">
            <span>Entry</span>
            <div className="segmented" role="radiogroup" aria-label="Entry">
              <button type="button" role="radio" aria-checked={form.is_free} className={form.is_free ? 'on' : ''} onClick={() => set('is_free', true)}>Free</button>
              <button type="button" role="radio" aria-checked={!form.is_free} className={!form.is_free ? 'on' : ''} onClick={() => set('is_free', false)}>Paid</button>
            </div>
          </div>
          {!form.is_free && (
            <label className="field">
              <span>Ticket price in rupees</span>
              <input type="number" min="1" step="1" value={form.price} onChange={(e) => set('price', e.target.value)} required placeholder="Example: 299" />
            </label>
          )}
          <label className="field">
            <span>Registration link (optional)</span>
            <input type="url" value={form.register_link} onChange={(e) => set('register_link', e.target.value)} placeholder="https://" />
          </label>
        </fieldset>

        <fieldset>
          <legend>Poster</legend>
          <div className="poster-upload">
            <div className="poster-preview">
              {preview ? <img src={preview} alt="Poster preview" /> : <span>No poster yet</span>}
            </div>
            <div className="poster-actions">
              <input ref={fileRef} id="poster" type="file" accept="image/jpeg,image/png,image/webp" onChange={onPickPoster} hidden />
              <label htmlFor="poster" className="btn btn-outline btn-sm">
                <Icon name="upload" size={16} /> {preview ? 'Change poster' : 'Upload poster'}
              </label>
              {preview && (
                <button type="button" className="btn btn-ghost btn-sm" onClick={removePoster}>Remove</button>
              )}
              <small className="hint">JPG, PNG or WebP, up to 3 MB.</small>
            </div>
          </div>
        </fieldset>

        <button className="btn btn-primary btn-lg" type="submit" disabled={saving}>
          {saving ? 'Saving...' : editing ? 'Save changes' : 'Publish event'}
        </button>
      </form>
    </div>
  );
}
