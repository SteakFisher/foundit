import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';

export default function Admin() {
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');

  const load = () => api('/items').then(setItems, (e) => setError(e.message));
  useEffect(() => {
    load();
  }, []);

  async function remove(item) {
    if (!confirm(`Delete "${item.title}"?`)) return;
    try {
      await api(`/items/${item.id}`, { method: 'DELETE' });
      load();
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <>
      <h1>All items</h1>
      {error && <p className="error">{error}</p>}
      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>Title</th><th>Type</th><th>Status</th><th>Posted by</th><th>Date</th><th></th></tr>
          </thead>
          <tbody>
            {items.map((i) => (
              <tr key={i.id}>
                <td><Link to={`/items/${i.id}`}>{i.title}</Link></td>
                <td>{i.type}</td>
                <td>{i.status}</td>
                <td>{i.poster}</td>
                <td>{i.date}</td>
                <td><button className="danger small" onClick={() => remove(i)}>Delete</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
