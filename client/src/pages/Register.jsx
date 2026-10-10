import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api.js';

export default function Register({ onLogin }) {
  const navigate = useNavigate();
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    try {
      onLogin(await api('/auth/register', { method: 'POST', body: Object.fromEntries(new FormData(e.target)) }));
      navigate('/');
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <form className="panel narrow" onSubmit={submit}>
      <h1>Create account</h1>
      <label>Name<input name="name" required autoComplete="name" /></label>
      <label>College email<input name="email" type="email" required autoComplete="email" placeholder="you@iiitvadodara.ac.in" /></label>
      <label>Password<input name="password" type="password" required minLength={6} autoComplete="new-password" /></label>
      {error && <p className="error">{error}</p>}
      <button>Register</button>
      <p className="muted">Have an account? <Link to="/login">Log in</Link></p>
    </form>
  );
}
