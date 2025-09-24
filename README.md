# Fishing Forum

Full‑stack forum application demonstrating a clean **REST API** (**Node.js/Express** + **MySQL**) and a lightweight **frontend** (**HTML**/**CSS**/vanilla **JS**). Covers end‑to‑end **CRUD** for categories, posts, and comments, plus session‑based auth with hashed passwords and basic admin permissions — a compact example of backend data flow and frontend integration.

---

## Tech Stack

- **Runtime:** Node.js
- **Server:** Express (v5), express-session, cookie-parser
- **DB:** MySQL (mysql2 driver)
- **Auth:** Session cookies, passwords hashed with **bcrypt**
- **Frontend:** Static HTML + CSS + vanilla JavaScript

---

## Features

- **Register / Login / Logout**
  - 3 failed login attempts trigger **5‑minute** lock for that username.
  - Session persisted via `express-session`.
- **User roles:** `is_admin` flag in `users` table.
- **Categories**
  - List all categories.
  - **Create category** (admin only).
- **Posts**
  - List posts (optional `category` filter, sort by `created_at` ascending/descending).
  - View single post.
  - Create post (logged‑in).
  - Edit / Delete post (author or admin).
- **Comments**
  - List comments under a post.
  - Create comment (logged‑in).
  - Edit / Delete comment (author or admin).
- **Account**
  - Change current user password (logged‑in).

> Data model and seed data in `forum.sql`.

---

## API

Base URL: `http://localhost:3000`

### Auth & session
- `POST /api/register` — body `{ "username": string, "password": string }`
- `POST /api/login` — body `{ "username": string, "password": string }`
- `GET  /api/logout`
- `GET  /api/session` → `{ "user": null | { "id": number, "username": string, "isAdmin": boolean } }`

### Categories
- `GET  /api/categories` → list
- `POST /api/categories` — admin only, body `{ "name": string }`

### Posts
- `GET  /api/posts?category=<id>&sort=<asc|desc>` → list
- `GET  /api/posts/:id` → single post
- `POST /api/posts` — body `{ "title": string, "content": string, "categoryId": number }` (logged‑in)
- `PUT  /api/posts/:id` — body `{ "title"?: string, "content"?: string }` (author or admin)
- `DELETE /api/posts/:id` (author or admin)

### Comments
- `GET  /api/posts/:id/comments`
- `POST /api/posts/:id/comments` — body `{ "content": string }` (logged‑in)
- `PUT  /api/comments/:id` — body `{ "content": string }` (author or admin)
- `DELETE /api/comments/:id` (author or admin)

### Account
- `PUT /api/account` — body `{ "password": string }` (logged‑in)

---

## Database schema (MySQL)

Defined in **`forum.sql`**:
- `users` (`id`, `username` **UNIQUE**, `password` (bcrypt), `is_admin` TINYINT)
- `categories` (`id`, `name` **UNIQUE**)
- `posts` (`id`, `user_id`, `category_id`, `title`, `content`, `created_at` default now)
- `comments` (`id`, `post_id`, `user_id`, `content`, `created_at` default now)

The script drops existing tables, creates schema, and inserts seed rows (users, categories, posts, comments).

---

## Local Setup

1) **Install dependencies**
```bash
npm install
```

2) **Create database and import schema**
- Create a MySQL database named `fishing_forum`.
- Import `forum.sql` into that DB.

3) **Configure DB connection**
- Edit `server/db.js` if needed (host/user/password/db). Defaults:
  ```js
  host: 'localhost', user: 'root', password: '', database: 'fishing_forum'
  ```

4) **Run the server**
```bash
node server/app.js
```
- Server listens on **`http://localhost:3000`**.
- Static frontend served from `frontend/html` and assets under `/assets`.

---

## Project Structure

```
.
├─ server/
│  ├─ app.js          # Express app, static, JSON, session, routes (port 3000)
│  ├─ db.js           # MySQL connection (mysql2)
│  └─ routes.js       # All API endpoints and session logic
├─ frontend/
│  ├─ html/           # index.html, login.html, register.html, post.html
│  └─ assets/         # style.css, script.js, logo.png
├─ forum.sql          # schema + seed data
├─ package.json       # deps
├─ package-lock.json
├─ dep                # one‑liner with npm install command
└─ LICENSE            # MIT
```

---

## Notes

- Frontend JS (`assets/script.js`) handles session UI, filtering by category, sorting posts by date, and CRUD actions via the API.
- Session secret is hardcoded in `server/app.js` (`forum-secret`). Adjust for production use.
- Default credentials are not provided in the repo; use `/api/register` to create users and set `is_admin` manually in DB if needed.
- Character set/engine defined in SQL (UTF‑8).

---

## License

This project is licensed under the **MIT License** (see `LICENSE`).
