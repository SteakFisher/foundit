import { test } from 'node:test';
import assert from 'node:assert/strict';

process.env.DB_PATH = ':memory:';
process.env.ALLOWED_DOMAIN = 'iiitvadodara.ac.in';
const { app } = await import('./index.js');

const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');

test('lost & found flow', async (t) => {
  const server = app.listen(0);
  t.after(() => server.close());
  const base = `http://localhost:${server.address().port}`;

  // Returns a client that keeps its own session cookie.
  const client = () => {
    let cookie = '';
    return async (method, path, body) => {
      const res = await fetch(base + path, {
        method,
        headers: { cookie, ...(body && !(body instanceof FormData) && { 'content-type': 'application/json' }) },
        body: body instanceof FormData ? body : body && JSON.stringify(body),
      });
      cookie = res.headers.get('set-cookie')?.split(';')[0] ?? cookie;
      return { status: res.status, body: await res.json() };
    };
  };
  const admin = client(), a = client(), b = client();
  const reg = (c, name) => c('POST', '/api/auth/register', { name, email: `${name}@IIITVadodara.ac.in`, password: 'secret1' });

  assert.equal((await reg(admin, 'admin')).body.role, 'admin');
  assert.equal((await reg(a, 'alice')).body.role, 'user');
  assert.equal((await reg(b, 'bob')).status, 201);
  assert.equal((await client()('POST', '/api/auth/register', { name: 'x', email: 'x@gmail.com', password: 'secret1' })).status, 400);
  assert.equal((await b('GET', '/api/me')).body.name, 'bob');

  const form = (photo) => {
    const f = new FormData();
    for (const [k, v] of Object.entries({ type: 'found', title: 'Blue bottle', category: 'Bottles', location: 'Library', date: '2026-10-01', question: 'What sticker is on it?' })) f.append(k, v);
    if (photo) f.append('photo', photo, 'photo.png');
    return f;
  };
  assert.equal((await a('POST', '/api/items', form(new Blob(['hi'], { type: 'text/plain' })))).status, 400);
  assert.equal((await a('POST', '/api/items', form(new Blob([new Uint8Array(5 * 1024 * 1024 + 1)], { type: 'image/png' })))).status, 400);

  const created = await a('POST', '/api/items', form(new Blob([PNG], { type: 'image/png' })));
  assert.equal(created.status, 201);
  const item = created.body;
  assert.ok(item.photo);
  assert.equal((await fetch(`${base}/uploads/${item.photo}`)).status, 200);
  assert.equal((await b('GET', '/api/items?q=bottle&type=found')).body.length, 1);

  const claim = await b('POST', `/api/items/${item.id}/claims`, { answer: 'A cat' });
  assert.equal(claim.status, 201);
  assert.equal(claim.body.status, 'pending');
  assert.equal((await b('POST', `/api/items/${item.id}/claims`, { answer: 'again' })).status, 400);
  assert.equal((await b('POST', `/api/claims/${claim.body.id}/approve`)).status, 403);

  const claims = await a('GET', `/api/items/${item.id}/claims`);
  assert.equal(claims.body[0].claimant, 'bob');
  assert.equal((await a('POST', `/api/claims/${claim.body.id}/approve`)).status, 200);
  assert.equal((await b('GET', `/api/items/${item.id}`)).body.status, 'claimed');
  assert.equal((await b('GET', '/api/my/claims')).body[0].status, 'approved');

  assert.equal((await a('POST', `/api/items/${item.id}/returned`)).status, 200);
  assert.equal((await b('GET', `/api/items/${item.id}`)).body.status, 'returned');

  assert.equal((await b('DELETE', `/api/items/${item.id}`)).status, 403);
  assert.equal((await admin('DELETE', `/api/items/${item.id}`)).status, 200);
  assert.equal((await b('GET', `/api/items/${item.id}`)).status, 404);
});
