import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import diagramsRouter from './routes/diagrams.js';

const app = express();
// Cloud Run uses PORT env var; fallback to API_PORT for local dev
const PORT = process.env.PORT ?? process.env.API_PORT ?? 4000;

const allowedOrigin = process.env.CORS_ORIGIN ?? 'http://localhost:7000';
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (server-to-server, Firebase Hosting proxy)
    if (!origin || origin === allowedOrigin) return callback(null, true);
    callback(new Error('Not allowed by CORS'));
  },
}));
app.use(express.json());

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/api/diagrams', diagramsRouter);

app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`API server running on http://0.0.0.0:${PORT}`);
});
