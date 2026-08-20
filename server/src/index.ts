import express from 'express';
import cors from 'cors';
import path from 'path';
import { PORT } from './config';
import analyzeRouter from './routes/analyze';

const app = express();

// Mount sandbox static path
app.use('/sandbox', express.static(path.join(__dirname, '../../extension/public')));

// Middleware
app.use(cors());
app.use(express.json());

// Request logger middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Routes
app.use('/api', analyzeRouter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Start listening
app.listen(PORT, () => {
  console.log(`Programming Hero AI Reply Assistant Backend running on http://localhost:${PORT}`);
});

export default app;
