import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';

dotenv.config();

const app = express();
const port = Number(process.env.PORT ?? 3001);
const frontendOrigin = process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173';

app.use(cors({ origin: frontendOrigin }));
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'syncbrief-api',
  });
});

app.listen(port, () => {
  console.log(`SyncBrief API listening on http://localhost:${port}`);
});
