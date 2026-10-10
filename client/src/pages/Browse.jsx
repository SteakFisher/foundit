import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, CATEGORIES } from '../api.js';

export default function Browse() {
  const [filters, setFilters] = useState({ q: '', type: '', category: '', status: '' });
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  const [all, setAll] = useState([]);

  useEffect(() => {
    api('/items').then(setAll, () => {});
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(Object.entries(filters).filter(([, v]) => v));
    const timer = setTimeout(() => api('/items?' + params).then(setItems, (e) => setError(e.message)), 200);
    return () => clearTimeout(timer);
  }, [filters]);

  const set = (key) => (e) => setFilters({ ...filters, [key]: e.target.value });

  return (
    <>
      <section className="hero bleed">
        <div className="hero-text">
          <h1>Every Lost Item.<br />We Reunite Them All.</h1>
          <p>FoundIt brings the whole campus together to report, search for and safely claim lost and found items, all in one place.</p>
          <div className="actions">
            <Link to="/new" className="pill">Post an item</Link>
            <a href="#items" className="pill outline">Browse items</a>
          </div>
        </div>
        <svg className="hero-art" viewBox="0 0 600 450" aria-hidden="true">
          <g fill="none" strokeLinecap="round">
            <path d="M80 -20 L260 470" stroke="#1b2b4b" strokeWidth="7" />
            <path d="M40 -20 L220 470" stroke="#a7c93b" strokeWidth="12" />
            <path d="M260 -20 L440 470" stroke="#a7c93b" strokeWidth="5" />
            <path d="M420 -20 L600 470" stroke="#1b2b4b" strokeWidth="2" />
            <path d="M390 -20 L570 470" stroke="#a7c93b" strokeWidth="14" />
            <path d="M20 60 Q300 160 560 0" stroke="#a7c93b" strokeWidth="8" />
            <path d="M140 400 Q330 180 620 300" stroke="#a7c93b" strokeWidth="8" />
          </g>
        </svg>
      </section>

      <section className="band bleed">
        <div className="band-text">
          <h2>How FoundIt Works</h2>
          <ol>
            <li><strong>Post</strong> what you lost or found, with a photo and where you saw it.</li>
            <li><strong>Claim</strong> a found item by answering a question only the owner would know.</li>
            <li><strong>Collect</strong> it once the finder or the security desk approves your claim.</li>
          </ol>
          <Link to="/register" className="pill dark">Join with your college email</Link>
        </div>
        <div className="band-stats">
          <div><strong>{all.filter((i) => i.status === 'open').length}</strong><span>open items</span></div>
          <div><strong>{all.filter((i) => i.status === 'returned').length}</strong><span>returned</span></div>
          <div><strong>{CATEGORIES.length}</strong><span>categories</span></div>
        </div>
      </section>

      <h2 id="items" className="section-title">Recent items</h2>
      <div className="filters">
        <input type="search" placeholder="Search title, description, location…" value={filters.q} onChange={set('q')} />
        <select value={filters.type} onChange={set('type')}>
          <option value="">Lost & found</option>
          <option value="lost">Lost</option>
          <option value="found">Found</option>
        </select>
        <select value={filters.category} onChange={set('category')}>
          <option value="">All categories</option>
          {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
        <select value={filters.status} onChange={set('status')}>
          <option value="">Any status</option>
          <option value="open">Open</option>
          <option value="claimed">Claimed</option>
          <option value="returned">Returned</option>
        </select>
      </div>
      {error && <p className="error">{error}</p>}
      {items.length === 0 && <p className="muted">No items match.</p>}
      <div className="grid">
        {items.map((item) => (
          <Link key={item.id} to={`/items/${item.id}`} className="card">
            {item.photo ? <img src={`/uploads/${item.photo}`} alt="" /> : <div className="placeholder">{item.category}</div>}
            <div className="card-body">
              <div>
                <span className={`badge ${item.type}`}>{item.type}</span>
                <span className={`badge ${item.status}`}>{item.status}</span>
              </div>
              <h3>{item.title}</h3>
              <p className="muted">{item.location} · {item.date}</p>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
