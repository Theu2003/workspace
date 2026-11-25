// Titulo: index
// Autor: Mateus Martins Peres
// Finalidade: Modulo do backend responsavel por index.
import './env.js';
import express from 'express';
import cors from 'cors';

import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import companyRoutes from './routes/companies.js';
import collectionRoutes from './routes/collections.js';
import notificationRoutes from './routes/notifications.js';
import statsRoutes from './routes/stats.js';
import adminRoutes from './routes/admin.js';
import messageRoutes from './routes/messages.js';

const app = express();

// Origens liberadas para chamadas de navegador de OUTROS domínios.
// Liste-as em CORS_ORIGINS (separadas por vírgula). Requisições same-origin,
// curl e apps nativos (sem header Origin) continuam permitidas.
const allowedOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

function isDevOrigin(origin) {
  try {
    const { hostname } = new URL(origin);
    return hostname === 'localhost'
      || hostname === '127.0.0.1'
      || hostname === '::1'
      || /^10\.\d+\.\d+\.\d+$/.test(hostname)
      || /^192\.168\.\d+\.\d+$/.test(hostname)
      || /^172\.(1[6-9]|2\d|3[01])\.\d+\.\d+$/.test(hostname);
  } catch {
    return false;
  }
}

app.use(cors({
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    if (isDevOrigin(origin)) return callback(null, true);
    return callback(null, false);
  }
}));

app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  next();
});

app.use(express.json({ limit: '1mb' }));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/collections', collectionRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/messages', messageRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'Rota não encontrada' });
});

app.use((err, _req, res, _next) => {
  const status = err.status || err.statusCode || 500;
  if (status >= 500) console.error('Erro não tratado na API:', err);
  res.status(status).json({
    error: status === 400 ? 'Requisição inválida' : 'Erro interno do servidor'
  });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Pardela API rodando na porta ${PORT} (acessível em qualquer rede)`);
});
