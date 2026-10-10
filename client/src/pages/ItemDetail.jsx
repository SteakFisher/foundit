import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api.js';

export default function ItemDetail({ user }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState();
  const [claims, setClaims] = useState([]);
  const [answer, setAnswer] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const canManage = user && item && (user.role === 'admin' || user.id === item.user_id);

  async function load() {
    try {
      const it = await api(`/items/${id}`);
      setItem(it);
      if (user && (user.role === 'admin' || user.id === it.user_id)) setClaims(await api(`/items/${id}/claims`));
    } catch (e) {
      setError(e.message);
    }
  }
  useEffect(() => {
    load();
  }, [id, user]);

  async function run(fn) {
    setError('');
    try {
      await fn();
      await load();
    } catch (e) {
      setError(e.message);
    }
  }

  async function submitClaim(e) {
    e.preventDefault();
    await run(async () => {
      await api(`/items/${id}/claims`, { method: 'POST', body: { answer } });
      setAnswer('');
      setMessage('Claim sent. The poster will review it.');
    });
  }

  async function remove() {
    if (!confirm('Delete this item?')) return;
    await run(async () => {
      await api(`/items/${id}`, { method: 'DELETE' });
      navigate('/');
    });
  }

  if (!item) return error ? <p className="error">{error}</p> : null;

  return (
    <article className="detail">
      {item.photo && <img src={`/uploads/${item.photo}`} alt={item.title} />}
      <div>
        <span className={`badge ${item.type}`}>{item.type}</span>
        <span className={`badge ${item.status}`}>{item.status}</span>
      </div>
      <h1>{item.title}</h1>
      <p>{item.description}</p>
      <dl>
        <dt>Category</dt><dd>{item.category}</dd>
        <dt>Location</dt><dd>{item.location}</dd>
        <dt>Date</dt><dd>{item.date}</dd>
        <dt>Posted by</dt><dd>{item.poster}</dd>
      </dl>
      {error && <p className="error">{error}</p>}
      {message && <p className="success">{message}</p>}

      {user && !canManage && item.status === 'open' && (
        <form className="panel" onSubmit={submitClaim}>
          <h2>{item.type === 'found' ? 'Is this yours?' : 'Found this?'}</h2>
          <label>
            {item.question || 'Describe where and when you found it'}
            <textarea required value={answer} onChange={(e) => setAnswer(e.target.value)} />
          </label>
          <button>Send claim</button>
        </form>
      )}
      {!user && item.status === 'open' && <p className="muted">Log in to claim this item.</p>}

      {canManage && (
        <section className="panel">
          <h2>Claims</h2>
          {item.question && <p className="muted">Question: {item.question}</p>}
          {claims.length === 0 && <p className="muted">No claims yet.</p>}
          {claims.map((c) => (
            <div key={c.id} className="claim">
              <div>
                <strong>{c.claimant}</strong> <span className="muted">{c.claimant_email}</span>
                <p>{c.answer}</p>
              </div>
              {c.status === 'pending' ? (
                <div className="actions">
                  <button onClick={() => run(() => api(`/claims/${c.id}/approve`, { method: 'POST' }))}>Approve</button>
                  <button className="secondary" onClick={() => run(() => api(`/claims/${c.id}/reject`, { method: 'POST' }))}>Reject</button>
                </div>
              ) : (
                <span className={`badge ${c.status}`}>{c.status}</span>
              )}
            </div>
          ))}
          <div className="actions">
            {item.status === 'claimed' && (
              <button onClick={() => run(() => api(`/items/${id}/returned`, { method: 'POST' }))}>Mark returned</button>
            )}
            <button className="danger" onClick={remove}>Delete item</button>
          </div>
        </section>
      )}
    </article>
  );
}
