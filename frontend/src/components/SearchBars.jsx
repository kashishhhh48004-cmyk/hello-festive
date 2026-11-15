import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import Autocomplete from './Autocomplete';
import Icon from './Icons';

// The two search boxes: one for the event name, one for the location
export default function SearchBars({ initialQ = '', initialCity = '', onSearch }) {
  const [q, setQ] = useState(initialQ);
  const [city, setCity] = useState(initialCity);

  useEffect(() => setQ(initialQ), [initialQ]);
  useEffect(() => setCity(initialCity), [initialCity]);

  const suggestEvents = async (text) => {
    if (text.trim().length < 2) return [];
    const rows = await api(`/events/suggest?q=${encodeURIComponent(text.trim())}`);
    return rows.map((r) => ({
      key: r.id,
      label: r.title,
      sub: r.city,
      badge: r.category?.icon,
      value: r.title,
    }));
  };

  const suggestCities = async (text) => {
    const rows = await api(`/locations/suggest?q=${encodeURIComponent(text.trim())}`);
    return rows.map((r) => ({ key: `${r.city}-${r.state}`, label: r.city, sub: r.state || '', value: r.city }));
  };

  const submit = (override = {}) => onSearch({ q: q.trim(), city: city.trim(), ...override });

  return (
    <form
      className="searchbars"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      role="search"
    >
      <Autocomplete
        value={q}
        onChange={setQ}
        onPick={(item) => {
          setQ(item.value);
          submit({ q: item.value });
        }}
        onSubmit={() => submit()}
        placeholder="Search events by name"
        label="Event name"
        icon="search"
        fetchSuggestions={suggestEvents}
      />
      <Autocomplete
        value={city}
        onChange={setCity}
        onPick={(item) => {
          setCity(item.value);
          submit({ city: item.value });
        }}
        onSubmit={() => submit()}
        placeholder="City or location"
        label="Location"
        icon="pin"
        fetchSuggestions={suggestCities}
        openOnFocus
      />
      <button type="submit" className="btn btn-primary search-btn">Search events</button>
    </form>
  );
}
