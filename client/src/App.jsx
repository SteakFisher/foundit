import { useEffect, useState } from 'react';
import { Link, NavLink, Route, Routes, useNavigate } from 'react-router-dom';
import { api } from './api.js';
import Browse from './pages/Browse.jsx';
import ItemDetail from './pages/ItemDetail.jsx';
import NewItem from './pages/NewItem.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import MyPosts from './pages/MyPosts.jsx';
import Admin from './pages/Admin.jsx';

export default function App() {
  const [user, setUser] = useState();
  const navigate = useNavigate();

  useEffect(() => {
    api('/me').then(setUser, () => setUser(null));
  }, []);

  async function logout() {
    await api('/auth/logout', { method: 'POST' });
    setUser(null);
    navigate('/');
  }

  if (user === undefined) return null;

  return (
    <>
      <header className="nav">
        <Link to="/" className="brand">Found<span>It</span></Link>
        <nav>
          <NavLink to="/" end>Browse</NavLink>
          {user && <NavLink to="/my">My posts</NavLink>}
          {user?.role === 'admin' && <NavLink to="/admin">Admin</NavLink>}
          {user ? (
            <>
              <button className="link" onClick={logout}>Log out</button>
              <NavLink to="/new" className="cta">Post item</NavLink>
            </>
          ) : (
            <NavLink to="/login" className="cta">Log in</NavLink>
          )}
        </nav>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<Browse />} />
          <Route path="/items/:id" element={<ItemDetail user={user} />} />
          <Route path="/new" element={user ? <NewItem /> : <Login onLogin={setUser} />} />
          <Route path="/my" element={user ? <MyPosts /> : <Login onLogin={setUser} />} />
          <Route path="/admin" element={user?.role === 'admin' ? <Admin /> : <p>Admins only.</p>} />
          <Route path="/login" element={<Login onLogin={setUser} />} />
          <Route path="/register" element={<Register onLogin={setUser} />} />
          <Route path="*" element={<p>Page not found.</p>} />
        </Routes>
      </main>
    </>
  );
}
