import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, CATEGORIES } from '../api.js';

export default function NewItem() {
  const navigate = useNavigate();
  const [type, setType] = useState('lost');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    const form = new FormData(e.target);
    if (!form.get('photo')?.size) form.delete('photo');
    try {
      const item = await api('/items', { method: 'POST', body: form });
      navigate(`/items/${item.id}`);
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  }

  return (
    <form className="panel narrow" onSubmit={submit}>
      <h1>Post an item</h1>
      <div className="toggle">
        {['lost', 'found'].map((t) => (
          <label key={t} className={type === t ? 'active' : ''}>
            <input type="radio" name="type" value={t} checked={type === t} onChange={() => setType(t)} />
            I {t} something
          </label>
        ))}
      </div>
      <label>Title<input name="title" required maxLength={100} placeholder="e.g. Black HP laptop charger" /></label>
      <label>Description<textarea name="description" maxLength={1000} /></label>
      <label>
        Category
        <select name="category" required defaultValue="">
          <option value="" disabled>Choose…</option>
          {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
      </label>
      <label>Location<input name="location" required maxLength={100} placeholder="e.g. Library, 2nd floor" /></label>
      <label>Date {type}<input name="date" type="date" required max={new Date().toLocaleDateString('en-CA')} /></label>
      {type === 'found' && (
        <label>
          Verification question
          <input name="question" required maxLength={200} placeholder="e.g. What is the wallpaper on the lock screen?" />
          <small className="muted">Claimants must answer this. Don't put the answer in the description.</small>
        </label>
      )}
      <label>Photo (optional, max 5 MB)<input name="photo" type="file" accept="image/*" /></label>
      {error && <p className="error">{error}</p>}
      <button disabled={busy}>{busy ? 'Posting…' : 'Post item'}</button>
    </form>
  );
}
