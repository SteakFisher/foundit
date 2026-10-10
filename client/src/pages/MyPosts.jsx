import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';

export default function MyPosts() {
  const [items, setItems] = useState([]);
  const [claims, setClaims] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([api('/my/items'), api('/my/claims')])
      .then(([i, c]) => { setItems(i); setClaims(c); }, (e) => setError(e.message));
  }, []);

  return (
    <>
      {error && <p className="error">{error}</p>}
      <h1>My posts</h1>
      {items.length === 0 && <p className="muted">You haven't posted anything yet.</p>}
      <ul className="list">
        {items.map((i) => (
          <li key={i.id}>
            <Link to={`/items/${i.id}`}>{i.title}</Link>
            <span>
              <span className={`badge ${i.type}`}>{i.type}</span>
              <span className={`badge ${i.status}`}>{i.status}</span>
              {i.pending_claims > 0 && <span className="badge pending">{i.pending_claims} pending</span>}
            </span>
          </li>
        ))}
      </ul>
      <h1>My claims</h1>
      {claims.length === 0 && <p className="muted">You haven't claimed anything.</p>}
      <ul className="list">
        {claims.map((c) => (
          <li key={c.id}>
            <Link to={`/items/${c.item_id}`}>{c.item_title}</Link>
            <span className={`badge ${c.status}`}>{c.status}</span>
          </li>
        ))}
      </ul>
    </>
  );
}
