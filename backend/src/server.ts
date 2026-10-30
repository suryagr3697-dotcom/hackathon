import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { apiRouter } from './routes/api';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express();
const PORT = Number(process.env.PORT) || 5000;

app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-org-id'],
  })
);

app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'operational',
    service: 'Enterprise Intelligent Document Processing (IDP) API',
    timestamp: new Date().toISOString(),
    models: {
      fast: 'gemini-2.5-flash',
      reasoning: 'gemini-2.5-pro',
      embedding: 'text-embedding-004',
    },
  });
});

// Mount API router
app.use('/api', apiRouter);

// Serve static frontend build in production if frontend/dist exists
const frontendDistPath = path.resolve(__dirname, '../../frontend/dist');
if (fs.existsSync(frontendDistPath)) {
  app.use(express.static(frontendDistPath));
  app.get('*', (req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith('/api')) {
      next();
      return;
    }
    res.sendFile(path.join(frontendDistPath, 'index.html'));
  });
}

// Global Error Handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[Server Error]:', err.message);
  res.status(400).json({
    error: err.message || 'Internal Server Error',
  });
});

app.listen(PORT, () => {
  console.log(`====================================================================`);
  console.log(`🚀 Enterprise IDP Backend Server listening on http://localhost:${PORT}`);
  console.log(`====================================================================`);
});

export default app;

