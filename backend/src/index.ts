import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { initFirebase } from './services/firebase';
import jobsRouter from './routes/jobs';
import profilesRouter from './routes/profiles';
import submissionsRouter from './routes/submissions';
import paymentsRouter from './routes/payments';
import webhooksRouter from './routes/webhooks';

const app = express();
const PORT = process.env.PORT || 8080;

initFirebase();

// In dev, accept both localhost and 127.0.0.1 for whatever port the frontend
// ends up on — browsers treat these as distinct origins even though a human
// doesn't, and a strict single-string match silently breaks every request.
const allowedOrigins = (process.env.ALLOWED_ORIGIN || '*')
  .split(',')
  .map((o) => o.trim());

function isAllowedOrigin(origin: string): boolean {
  if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) return true;
  if (process.env.NODE_ENV !== 'production') {
    const devOrigin = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;
    return devOrigin.test(origin);
  }
  return false;
}

app.use(helmet());
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || isAllowedOrigin(origin)) return callback(null, true);
    callback(new Error(`Origin ${origin} not allowed`));
  },
}));

// Stripe webhooks need the raw body for signature verification
app.use('/api/webhooks/stripe', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '2mb' }));

app.get('/api/health', (_, res) => res.json({
  status: 'ok',
  service: 'gighuz-api',
  timestamp: new Date().toISOString(),
}));

app.use('/api/jobs', jobsRouter);
app.use('/api/profiles', profilesRouter);
app.use('/api/submissions', submissionsRouter);
app.use('/api/payments', paymentsRouter);
app.use('/api/webhooks', webhooksRouter);

app.listen(PORT, () => console.log(`GigHuz API running on port ${PORT}`));
export default app;
