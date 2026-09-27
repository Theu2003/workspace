// ===================================================================
// index.js — Ponto de entrada do servidor Express (ReciclaJá API)
// ===================================================================
// Este arquivo configura e inicia o servidor HTTP que serve a API REST
// do aplicativo ReciclaJá. Ele:
//   1. Carrega variáveis de ambiente (.env)
//   2. Configura middlewares (CORS, parsing de JSON)
//   3. Registra todas as rotas da API
//   4. Inicia o servidor na porta configurada (padrão 3001)
//   5. Escuta em 0.0.0.0 para aceitar conexões de qualquer rede Wi-Fi
// ===================================================================

import './env.js';                  // ⚠️ PRIMEIRO import: carrega .env antes de qualquer módulo ler process.env
import express from 'express';       // Framework web para criar o servidor HTTP e rotas
import cors from 'cors';             // Middleware que habilita CORS (Cross-Origin Resource Sharing)

// Importação das rotas da API — cada arquivo define um grupo de rotas relacionadas
import authRoutes from './routes/auth.js';           // Rotas de autenticação (login, registro)
import userRoutes from './routes/users.js';          // Rotas de gerenciamento de perfil do usuário
import companyRoutes from './routes/companies.js';   // Rotas de gerenciamento de empresas
import collectionRoutes from './routes/collections.js'; // Rotas de coletas (criar, listar, status)
import notificationRoutes from './routes/notifications.js'; // Rotas de notificações
import statsRoutes from './routes/stats.js';         // Rotas de estatísticas públicas
import adminRoutes from './routes/admin.js';         // Rotas do painel administrativo
import messageRoutes from './routes/messages.js';    // Rotas de mensagens (admin ↔ empresa)

// As variáveis de ambiente (.env) são carregadas pelo módulo env.js acima,
// ANTES de qualquer import — ver comentário no topo de src/env.js

// Cria a instância do aplicativo Express
const app = express();

// Middleware CORS — permite que o frontend (em outra porta/porta) faça requisições à API
// Sem isso, o navegador bloquearia chamadas cross-origin
app.use(cors());

// Middleware de parsing de JSON — transforma o body das requisições JSON em req.body
// Limita o tamanho máximo do body a 1MB para prevenir abusos
app.use(express.json({ limit: '1mb' }));

// ── Registro das rotas da API ──────────────────────────────────────
// Cada rota é prefixada com /api/[nome], por exemplo:
//   /api/auth/login, /api/users/me, /api/collections, etc.

app.use('/api/auth', authRoutes);           // POST /register/user, /register/company, /login, GET /materials
app.use('/api/users', userRoutes);          // GET/PUT /me, CRUD de endereços
app.use('/api/companies', companyRoutes);   // GET/PUT /me, GET /list (lista empresas para o usuário)
app.use('/api/collections', collectionRoutes); // CRUD de coletas, status, mensagens por coleta
app.use('/api/notifications', notificationRoutes); // Listar, marcar como lida, contar não lidas
app.use('/api/stats', statsRoutes);         // Estatísticas públicas (empresas, coletas, peso total)
app.use('/api/admin', adminRoutes);         // Painel admin: aprovar/rejeitar empresas, listar usuários
app.use('/api/messages', messageRoutes);    // Mensagens diretas entre admin e empresas

// ── Rota de health check ──────────────────────────────────────────
// Usada para verificar se o servidor está rodando (monitoramento, load balancers)
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// ── Inicialização do servidor ──────────────────────────────────────
// PORT: número da porta (lida de .env ou padrão 3001)
// '0.0.0.0': escuta em TODOS os interfaces de rede (Wi-Fi, Ethernet, etc.)
//   Isso permite que outros dispositivos na mesma rede acessem a API
const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`ReciclaJá API rodando na porta ${PORT} (acessível em qualquer rede)`);
});
