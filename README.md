# Hello Festive

Discover college fests, hackathons, workshops and local festivals in one place.

## Live Preview

| | Link |
|---|---|
| **Website** | https://frontend-tawny-eight-63.vercel.app |
| **API health check** | https://hello-festive-api.onrender.com/api/health |

> The backend runs on a free Render instance, which sleeps after a period of inactivity. The first load can take 30 to 60 seconds. After that it is fast.

## Tech Stack

- **Frontend:** React (Vite), dark purple gradient theme, Leaflet + OpenStreetMap maps
- **Backend:** Node.js + Express
- **Database, login and poster storage:** Supabase
- **Hosting:** Vercel (frontend), Render (backend)

```
hello-festive/
├── frontend/   the website (runs on http://localhost:5173)
├── backend/    the API (runs on http://localhost:5000)
└── database/   schema.sql (run it in your Supabase project)
```

## Features

- Search events by name, city, category, type, price and date
- Create, edit and delete your own events, with poster upload
- Save events with the heart
- Login, register and forgot password
- Admin panel to remove wrong or fake events

## Run it locally

### What you need

- Node.js 20 or newer (check with `node -v`)
- A Supabase project, with `database/schema.sql` already run in the SQL Editor
- In Supabase, **Data API enabled**

### Step 1: Get your three Supabase values

Supabase dashboard, then **Project Settings, API Keys**:

| Value | Goes in | Secret? |
|---|---|---|
| Project URL (`https://xxxx.supabase.co`) | backend and frontend | no |
| Publishable key (older name: anon key) | frontend | no |
| Secret key (older name: service_role key) | backend only | **yes, never share it** |

### Step 2: Create the two .env files

In **backend/**: copy `.env.example` to `.env` and fill in:

```
PORT=5000
CLIENT_URL=http://localhost:5173
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your secret key
```

In **frontend/**: copy `.env.example` to `.env` and fill in:

```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=your publishable key
VITE_API_URL=http://localhost:5000/api
```

Never upload `.env` files to GitHub (the `.gitignore` already blocks them). Never put real keys in `.env.example`.

### Step 3: Supabase login settings

1. **Authentication, Sign In / Providers, Email:** turn **Confirm email** off while developing.
2. **Authentication, URL Configuration:**
   - Site URL: `http://localhost:5173`
   - Redirect URLs: `http://localhost:5173/**`

### Step 4: Run it (two terminals)

Terminal 1, backend:

```
cd backend
npm install
npm run dev
```

You should see: `Hello Festive API running on http://localhost:5000`. Test it at http://localhost:5000/api/health.

Terminal 2, frontend:

```
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173**.

### Step 5: Make yourself admin

1. Register on the site with your email.
2. In Supabase, open **SQL Editor** and run (use your email):

```sql
update public.profiles set role = 'admin'
where id = (select id from auth.users where email = 'your-email@example.com');
```

3. Log out and in again. An **Admin panel** link appears in your profile menu.

## Deployment

### Backend on Render (Web Service)

| Setting | Value |
|---|---|
| Root Directory | `backend` |
| Build Command | `npm install` |
| Start Command | `node src/server.js` |
| Instance Type | Free |

Environment variables:

```
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your secret key
CLIENT_URL=https://your-frontend.vercel.app
```

Do not set `PORT`, Render sets it. `CLIENT_URL` must match your frontend link exactly, with no `/` at the end, otherwise the browser blocks requests (CORS error).

### Frontend on Vercel

| Setting | Value |
|---|---|
| Root Directory | `frontend` |
| Framework Preset | Vite |

Environment variables:

```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=your publishable key
VITE_API_URL=https://your-backend.onrender.com/api
```

`frontend/vercel.json` makes page refresh and direct links work (no 404). After changing an environment variable on Vercel, redeploy.

### Supabase URLs for the live site

**Authentication, URL Configuration:**

- Site URL: your Vercel link
- Redirect URLs: `https://your-frontend.vercel.app/**` (keep `http://localhost:5173/**` for local work)

Turn **Confirm email** back on for production.

Every `git push` to `main` redeploys both Vercel and Render automatically.

## How it works

- Anyone can browse, search and open events.
- A logged-in user can create an event. It goes live immediately.
- Users can edit or delete their own events, save events with the heart, and upload a poster (JPG, PNG or WebP, up to 3 MB).
- Admins can remove any event.
- Login, register and forgot password are handled by Supabase Auth.

## API (backend)

| Method and path | Who | What |
|---|---|---|
| GET `/api/health` | everyone | health check |
| GET `/api/events` | everyone | search and filters: `q`, `city`, `category`, `type`, `price`, `when`, `page`, `limit` |
| GET `/api/events/suggest?q=` | everyone | event name autocomplete |
| GET `/api/events/:id` | everyone | one event |
| GET `/api/categories` | everyone | categories with event counts |
| GET `/api/locations/suggest?q=` | everyone | city autocomplete |
| GET `/api/stats` | everyone | numbers for the home page |
| POST `/api/events` | logged in | create event |
| GET `/api/events/mine` | logged in | my events |
| PUT, DELETE `/api/events/:id` | owner (delete: owner or admin) | edit or delete |
| GET, POST, DELETE `/api/bookmarks` | logged in | saved events |
| GET `/api/admin/events` | admin | all events |

## If something goes wrong

| Problem | Fix |
|---|---|
| "Supabase keys are missing" banner | Check `frontend/.env`, then restart `npm run dev` |
| Backend stops with "Missing SUPABASE_URL" | Check `backend/.env` (or the Render environment variables) |
| "Cannot reach the server" | Backend is not running or still waking up, or `VITE_API_URL` is wrong |
| CORS error in the browser console | `CLIENT_URL` on the backend does not match the frontend link |
| "Something went wrong on the server" | Check the backend logs. Make sure `schema.sql` ran and the Data API is enabled |
| Confirmation link opens localhost | Set the Site URL in Supabase to your live link |
| Reset password link does nothing | Add the Redirect URL in Supabase |
| Poster upload fails | Confirm you are logged in and the file is under 3 MB |
| Port already in use | Close the other terminal, or change `PORT` in `backend/.env` |
