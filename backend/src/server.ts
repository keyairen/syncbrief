import cors from 'cors';
import express from 'express';
import { env } from './config/env.js';
import meetingsRouter from './routes/meetings.js';

const app = express();

app.use(cors({ origin: env.frontendOrigin }));
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'syncbrief-api',
  });
});

app.use('/meetings', meetingsRouter);

app.listen(env.port, () => {
  console.log(`SyncBrief API listening on http://localhost:${env.port}`);
});
