# FoundIt – Campus Lost & Found Portal

Students post lost or found items, browse and search them, and claim found items by answering
the poster's verification question. The poster approves or rejects claims and marks items returned.

Built with Express, built-in `node:sqlite`, React and Vite. Requires Node 24+.

## Setup

```sh
npm install
```

## Run

```sh
npm run dev        # API on :3000, Vite dev server on :5173 (proxies /api and /uploads)
npm test           # end-to-end API test (in-memory DB)
npm run build      # build the client into client/dist
npm start          # production: serves the API and client/dist on :3000
```

Environment variables:

| Variable         | Default                 | Purpose                               |
| ---------------- | ----------------------- | ------------------------------------- |
| `PORT`           | `3000`                  | Server port                           |
| `DB_PATH`        | `server/foundit.db`     | SQLite file (`:memory:` for tests)    |
| `ALLOWED_DOMAIN` | `iiitvadodara.ac.in`    | Only emails on this domain can register |

## Admin

The **first account registered** becomes the admin. Admins see the Admin page (all items, delete any)
and can manage claims on any item. To reset, stop the server and delete `server/foundit.db`.

Uploaded photos are stored in `server/uploads/` (JPEG/PNG/GIF/WebP, max 5 MB).
