import { useEffect, useRef, useState } from 'react';
import Icon from './Icons';

// A text box that suggests results while you type.
// fetchSuggestions(text) must return [{ key, label, sub, badge, value }]
export default function Autocomplete({
  value,
  onChange,
  onPick,
  onSubmit,
  placeholder,
  icon,
  label,
  fetchSuggestions,
  openOnFocus = false,
}) {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const boxRef = useRef(null);
  const requestId = useRef(0);

  useEffect(() => {
    const id = ++requestId.current;
    const timer = setTimeout(async () => {
      try {
        const rows = await fetchSuggestions(value);
        if (id === requestId.current) {
          setItems(rows);
          setActive(-1);
        }
      } catch {
        if (id === requestId.current) setItems([]);
      }
    }, 220);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  useEffect(() => {
    const close = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const pick = (item) => {
    setOpen(false);
    onPick(item);
  };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown' && items.length) {
      e.preventDefault();
      setOpen(true);
      setActive((a) => (a + 1) % items.length);
    } else if (e.key === 'ArrowUp' && items.length) {
      e.preventDefault();
      setActive((a) => (a <= 0 ? items.length - 1 : a - 1));
    } else if (e.key === 'Enter') {
      if (open && active >= 0 && items[active]) {
        e.preventDefault();
        pick(items[active]);
      } else {
        setOpen(false);
        onSubmit?.();
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  const showList = open && items.length > 0;

  return (
    <div className="ac" ref={boxRef}>
      <label className="ac-field">
        <Icon name={icon} size={20} />
        <span className="sr-only">{label}</span>
        <input
          type="text"
          value={value}
          placeholder={placeholder}
          autoComplete="off"
          role="combobox"
          aria-expanded={showList}
          aria-autocomplete="list"
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
          }}
          onFocus={() => (openOnFocus || value) && setOpen(true)}
          onKeyDown={onKeyDown}
        />
      </label>
      {showList && (
        <ul className="ac-list" role="listbox">
          {items.map((item, i) => (
            <li key={item.key} role="option" aria-selected={i === active}>
              <button
                type="button"
                className={i === active ? 'active' : ''}
                onMouseEnter={() => setActive(i)}
                onClick={() => pick(item)}
              >
                {item.badge && <span className="ac-badge">{item.badge}</span>}
                <span className="ac-label">{item.label}</span>
                {item.sub && <span className="ac-sub">{item.sub}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
