import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { initDatabase } from './src/server/db.js';
import { authRouter } from './src/server/routes/auth.js';
import { leadsRouter } from './src/server/routes/leads.js';
import { pipelineRouter } from './src/server/routes/pipeline.js';
import { tasksRouter } from './src/server/routes/tasks.js';
import { handoffsRouter } from './src/server/routes/handoffs.js';
import { formsRouter } from './src/server/routes/forms.js';
import { publicRouter } from './src/server/routes/public.js';
import { dashboardRouter } from './src/server/routes/dashboard.js';
import { organizationRouter } from './src/server/routes/organization.js';
import { systemTestRouter } from './src/server/routes/systemTest.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const isProduction = process.env.NODE_ENV === 'production';

// Initialize SQLite database and seed defaults
initDatabase();

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Security & API headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/leads', leadsRouter);
app.use('/api/pipeline', pipelineRouter);
app.use('/api/tasks', tasksRouter);
app.use('/api/handoffs', handoffsRouter);
app.use('/api/forms', formsRouter);
app.use('/api/public', publicRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/organization', organizationRouter);
app.use('/api/system-test', systemTestRouter);

app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Emperor CRM Multi-Tenant Platform'
  });
});

async function startServer() {
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Emperor CRM] Server running on http://0.0.0.0:${PORT} (Mode: ${isProduction ? 'Production' : 'Development'})`);
  });
}

startServer().catch(err => {
  console.error('[Emperor CRM] Failed to start server:', err);
  process.exit(1);
});
