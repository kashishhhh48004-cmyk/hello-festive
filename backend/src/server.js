import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

import eventsRouter from './routes/events.js';
import categoriesRouter from './routes/categories.js';
import locationsRouter from './routes/locations.js';
import bookmarksRouter from './routes/bookmarks.js';
import adminRouter from './routes/admin.js';
import miscRouter from './routes/misc.js';

const app = express();
const PORT = process.env.PORT || 5000;
const origins = (process.env.CLIENT_URL || 'http://localhost:5173').split(',').map((s) => s.trim());

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: origins }));
app.use(express.json({ limit: '100kb' }));
app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, limit: 600, standardHeaders: true, legacyHeaders: false }));

app.get('/api/health', (_req, res) => res.json({ ok: true, app: 'Hello Festive API' }));

app.use('/api/events', eventsRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/locations', locationsRouter);
app.use('/api/bookmarks', bookmarksRouter);
app.use('/api/admin', adminRouter);
app.use('/api', miscRouter);

app.use((_req, res) => res.status(404).json({ error: 'Not found.' }));

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Something went wrong on the server. Please try again.' });
});

app.listen(PORT, () => console.log(`Hello Festive API running on http://localhost:${PORT}`));
