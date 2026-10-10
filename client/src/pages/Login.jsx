import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api.js';

export default function Login({ onLogin }) {
  const navigate = useNavigate();
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    try {
      onLogin(await api('/auth/login', { method: 'POST', body: Object.fromEntries(new FormData(e.target)) }));
      // Login also renders in place of protected pages; only leave the dedicated /login route.
      if (location.pathname === '/login') navigate('/');
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <form className="panel narrow" onSubmit={submit}>
      <h1>Log in</h1>
      <label>Email<input name="email" type="email" required autoComplete="email" /></label>
      <label>Password<input name="password" type="password" required autoComplete="current-password" /></label>
      {error && <p className="error">{error}</p>}
      <button>Log in</button>
      <p className="muted">No account? <Link to="/register">Register</Link></p>
    </form>
  );
}
