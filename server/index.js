import express from 'express';
import multer from 'multer';
import crypto from 'node:crypto';
import fs from 'node:fs';
import { promisify } from 'node:util';
import { db } from './db.js';

const PORT = process.env.PORT || 3000;
const DOMAIN = (process.env.ALLOWED_DOMAIN || 'iiitvadodara.ac.in').toLowerCase();
const UPLOADS = new URL('./uploads/', import.meta.url).pathname;
const DIST = new URL('../client/dist/', import.meta.url).pathname;
const CATEGORIES = ['Electronics', 'ID/Cards', 'Keys', 'Bags', 'Clothing', 'Books/Stationery', 'Bottles', 'Other'];
// Extension comes from the mimetype so uploads are only ever served as these image types.
const IMAGE_EXT = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/gif': '.gif', 'image/webp': '.webp' };
const scrypt = promisify(crypto.scrypt);

const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOADS,
    filename: (req, file, cb) => cb(null, crypto.randomBytes(16).toString('hex') + IMAGE_EXT[file.mimetype]),
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) =>
    IMAGE_EXT[file.mimetype] ? cb(null, true) : cb(Object.assign(new Error('Photo must be a JPEG, PNG, GIF or WebP image'), { status: 400 })),
});

export const app = express();
app.use(express.json());
app.use('/uploads', express.static(UPLOADS));

const sessionToken = (req) => req.headers.cookie?.match(/(?:^|;\s*)sid=([^;]+)/)?.[1];

app.use((req, res, next) => {
  const token = sessionToken(req);
  req.user = token && db.prepare(
    'SELECT u.id, u.name, u.email, u.role FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ?'
  ).get(token);
  next();
});

const fail = (res, status, error) => res.status(status).json({ error });
const auth = (req, res, next) => (req.user ? next() : fail(res, 401, 'Please log in'));
const canManage = (user, item) => user.role === 'admin' || user.id === item.user_id;
const str = (v) => (typeof v === 'string' ? v.trim() : '');

async function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  return `${salt}:${(await scrypt(password, salt, 64)).toString('hex')}`;
}

function startSession(res, userId) {
  const token = crypto.randomBytes(32).toString('hex');
  // ponytail: sessions never expire server-side, only logout removes them
  db.prepare('INSERT INTO sessions (token, user_id) VALUES (?, ?)').run(token, userId);
  res.cookie('sid', token, { httpOnly: true, sameSite: 'lax', maxAge: 30 * 24 * 3600 * 1000 });
}

app.post('/api/auth/register', async (req, res) => {
  const name = str(req.body?.name);
  const email = str(req.body?.email).toLowerCase();
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  if (!name || !email || !password) return fail(res, 400, 'Name, email and password are required');
  if (!/^[^@\s]+@[^@\s]+$/.test(email) || !email.endsWith('@' + DOMAIN)) return fail(res, 400, `Use your @${DOMAIN} email`);
  if (password.length < 6) return fail(res, 400, 'Password must be at least 6 characters');
  if (db.prepare('SELECT 1 FROM users WHERE email = ?').get(email)) return fail(res, 400, 'Email already registered');

  const role = db.prepare('SELECT 1 FROM users LIMIT 1').get() ? 'user' : 'admin';
  const { lastInsertRowid: id } = db.prepare('INSERT INTO users (name, email, pass_hash, role) VALUES (?, ?, ?, ?)')
    .run(name, email, await hashPassword(password), role);
  startSession(res, id);
  res.status(201).json({ id, name, email, role });
});

app.post('/api/auth/login', async (req, res) => {
  const email = str(req.body?.email).toLowerCase();
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user) return fail(res, 400, 'Wrong email or password');
  const expected = Buffer.from(user.pass_hash);
  const actual = Buffer.from(await hashPassword(password, user.pass_hash.split(':')[0]));
  if (!crypto.timingSafeEqual(expected, actual)) return fail(res, 400, 'Wrong email or password');
  startSession(res, user.id);
  res.json({ id: user.id, name: user.name, email: user.email, role: user.role });
});

app.post('/api/auth/logout', (req, res) => {
  const token = sessionToken(req);
  if (token) db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
  res.clearCookie('sid').json({ ok: true });
});

app.get('/api/me', auth, (req, res) => res.json(req.user));

const ITEM_COLS = `i.id, i.user_id, i.type, i.title, i.description, i.category, i.location, i.date,
  i.photo, i.status, i.created_at, u.name AS poster`;

// ponytail: no pagination, fine for a single campus
app.get('/api/items', (req, res) => {
  let sql = `SELECT ${ITEM_COLS} FROM items i JOIN users u ON u.id = i.user_id WHERE 1 = 1`;
  const args = [];
  const q = str(req.query.q);
  if (q) {
    sql += ' AND (i.title LIKE ? OR i.description LIKE ? OR i.location LIKE ?)';
    args.push(`%${q}%`, `%${q}%`, `%${q}%`);
  }
  for (const key of ['type', 'category', 'status']) {
    if (str(req.query[key])) {
      sql += ` AND i.${key} = ?`;
      args.push(str(req.query[key]));
    }
  }
  res.json(db.prepare(sql + ' ORDER BY i.id DESC').all(...args));
});

const getItem = (id) =>
  db.prepare(`SELECT ${ITEM_COLS}, i.question FROM items i JOIN users u ON u.id = i.user_id WHERE i.id = ?`).get(id);

app.get('/api/items/:id', (req, res) => {
  const item = getItem(req.params.id);
  item ? res.json(item) : fail(res, 404, 'Item not found');
});

app.post('/api/items', auth, upload.single('photo'), (req, res) => {
  const b = req.body ?? {};
  const item = {
    type: str(b.type), title: str(b.title), description: str(b.description), category: str(b.category),
    location: str(b.location), date: str(b.date), question: str(b.question) || null,
  };
  const error =
    !['lost', 'found'].includes(item.type) ? 'Type must be lost or found'
    : !item.title || !item.location ? 'Title and location are required'
    : !CATEGORIES.includes(item.category) ? 'Pick a valid category'
    : !/^\d{4}-\d{2}-\d{2}$/.test(item.date) ? 'Date is required (YYYY-MM-DD)'
    : item.type === 'found' && !item.question ? 'Found items need a verification question'
    : null;
  if (error) {
    if (req.file) fs.rmSync(req.file.path, { force: true });
    return fail(res, 400, error);
  }
  const { lastInsertRowid } = db.prepare(
    `INSERT INTO items (user_id, type, title, description, category, location, date, photo, question)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(req.user.id, item.type, item.title, item.description, item.category, item.location, item.date,
    req.file?.filename ?? null, item.question);
  res.status(201).json(getItem(lastInsertRowid));
});

app.delete('/api/items/:id', auth, (req, res) => {
  const item = getItem(req.params.id);
  if (!item) return fail(res, 404, 'Item not found');
  if (!canManage(req.user, item)) return fail(res, 403, 'Not allowed');
  db.prepare('DELETE FROM items WHERE id = ?').run(item.id); // claims cascade
  if (item.photo) fs.rmSync(UPLOADS + item.photo, { force: true });
  res.json({ ok: true });
});

app.post('/api/items/:id/claims', auth, (req, res) => {
  const item = getItem(req.params.id);
  if (!item) return fail(res, 404, 'Item not found');
  if (item.user_id === req.user.id) return fail(res, 400, 'You cannot claim your own item');
  if (item.status !== 'open') return fail(res, 400, 'Item is no longer open');
  const answer = str(req.body?.answer);
  if (!answer) return fail(res, 400, 'Answer is required');
  if (db.prepare("SELECT 1 FROM claims WHERE item_id = ? AND user_id = ? AND status = 'pending'").get(item.id, req.user.id)) {
    return fail(res, 400, 'You already have a pending claim on this item');
  }
  const { lastInsertRowid } = db.prepare('INSERT INTO claims (item_id, user_id, answer) VALUES (?, ?, ?)')
    .run(item.id, req.user.id, answer);
  res.status(201).json(db.prepare('SELECT * FROM claims WHERE id = ?').get(lastInsertRowid));
});

app.get('/api/items/:id/claims', auth, (req, res) => {
  const item = getItem(req.params.id);
  if (!item) return fail(res, 404, 'Item not found');
  if (!canManage(req.user, item)) return fail(res, 403, 'Not allowed');
  res.json(db.prepare(
    `SELECT c.*, u.name AS claimant, u.email AS claimant_email FROM claims c JOIN users u ON u.id = c.user_id
     WHERE c.item_id = ? ORDER BY c.id`
  ).all(item.id));
});

function pendingClaim(req, res) {
  const claim = db.prepare('SELECT c.*, i.user_id AS owner_id FROM claims c JOIN items i ON i.id = c.item_id WHERE c.id = ?')
    .get(req.params.id);
  const error = !claim ? [404, 'Claim not found']
    : !canManage(req.user, { user_id: claim.owner_id }) ? [403, 'Not allowed']
    : claim.status !== 'pending' ? [400, 'Claim is not pending']
    : null;
  if (!error) return claim;
  fail(res, ...error);
  return null;
}

app.post('/api/claims/:id/approve', auth, (req, res) => {
  const claim = pendingClaim(req, res);
  if (!claim) return;
  db.exec('BEGIN');
  try {
    db.prepare("UPDATE claims SET status = 'approved' WHERE id = ?").run(claim.id);
    db.prepare("UPDATE claims SET status = 'rejected' WHERE item_id = ? AND status = 'pending'").run(claim.item_id);
    db.prepare("UPDATE items SET status = 'claimed' WHERE id = ?").run(claim.item_id);
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
  res.json({ ok: true });
});

app.post('/api/claims/:id/reject', auth, (req, res) => {
  const claim = pendingClaim(req, res);
  if (!claim) return;
  db.prepare("UPDATE claims SET status = 'rejected' WHERE id = ?").run(claim.id);
  res.json({ ok: true });
});

app.post('/api/items/:id/returned', auth, (req, res) => {
  const item = getItem(req.params.id);
  if (!item) return fail(res, 404, 'Item not found');
  if (!canManage(req.user, item)) return fail(res, 403, 'Not allowed');
  if (item.status !== 'claimed') return fail(res, 400, 'Only claimed items can be marked returned');
  db.prepare("UPDATE items SET status = 'returned' WHERE id = ?").run(item.id);
  res.json({ ok: true });
});

app.get('/api/my/items', auth, (req, res) => {
  res.json(db.prepare(
    `SELECT ${ITEM_COLS}, (SELECT COUNT(*) FROM claims c WHERE c.item_id = i.id AND c.status = 'pending') AS pending_claims
     FROM items i JOIN users u ON u.id = i.user_id WHERE i.user_id = ? ORDER BY i.id DESC`
  ).all(req.user.id));
});

app.get('/api/my/claims', auth, (req, res) => {
  res.json(db.prepare(
    `SELECT c.id, c.item_id, c.answer, c.status, c.created_at, i.title AS item_title, i.status AS item_status
     FROM claims c JOIN items i ON i.id = c.item_id WHERE c.user_id = ? ORDER BY c.id DESC`
  ).all(req.user.id));
});

app.use('/api', (req, res) => fail(res, 404, 'Not found'));

app.use(express.static(DIST));
app.get('/{*path}', (req, res, next) => res.sendFile(DIST + 'index.html', (err) => err && next()));

app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return fail(res, 400, err.code === 'LIMIT_FILE_SIZE' ? 'Photo must be 5 MB or smaller' : err.message);
  }
  if (err.status && err.status < 500) return fail(res, err.status, err.message);
  console.error(err);
  fail(res, 500, 'Server error');
});

if (import.meta.main) app.listen(PORT, () => console.log(`FoundIt on http://localhost:${PORT}`));
