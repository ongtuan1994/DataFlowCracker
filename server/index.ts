import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import diagramsRouter from './routes/diagrams.js';

const app = express();
const PORT = process.env.API_PORT ?? 4000;

app.use(cors({ origin: process.env.CORS_ORIGIN ?? 'http://localhost:7000' }));
app.use(express.json());

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/api/diagrams', diagramsRouter);

app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
});
