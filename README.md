# ReciclaJá — Plataforma de Agendamento de Coletoras Recicláveis

> Sistema completo para conectar usuários (geradores de resíduos) a empresas de coleta/reciclagem, com fluxo completo: solicitação → aceitação → agendamento → coleta → conclusão.

---

## 📋 Sumário

- [Visão Geral](#-visão-geral)
- [Arquitetura](#-arquitetura)
- [Tecnologias](#-tecnologias)
- [Pré-requisitos](#-pré-requisitos)
- [Como Executar](#-como-executar)
- [Estrutura do Projeto](#-estrutura-do-projeto)
- [Documentação da API](#-documentação-da-api)
- [Banco de Dados](#-banco-de-dados)
- [Autenticação e Autorização](#-autenticação-e-autorização)
- [Fluxos Principais](#-fluxos-principais)
- [Desenvolvimento](#-desenvolvimento)
- [Deploy](#-deploy)
- [Testes](#-testes)
- [Troubleshooting](#-troubleshooting)

---

## 🎯 Visão Geral

O **ReciclaJá** é uma aplicação full-stack (React + Express + SQLite) que permite:

| Ator | Funcionalidades |
|------|-----------------|
| **Usuário** | Cadastrar endereços, agendar coletas, acompanhar status, conversar com a empresa, receber notificações |
| **Empresa** | Ver coletas pendentes da sua cidade, aceitar/recusar, avançar status (agendada → em coleta → concluída), dashboard de métricas, chat com admin |
| **Admin** | Aprovar/rejeitar empresas, ver estatísticas globais, gerenciar usuários/empresas, conversar com empresas |

### Funcionalidades-chave
- 🔐 **Autenticação JWT** com roles (`user`, `company`, `admin`)
- 🗺️ **Geocodificação automática** via Nominatim (OpenStreetMap)
- 📍 **Mapas interativos** com Leaflet
- 🔔 **Notificações em tempo real** (polling 15s)
- 💬 **Chat por coleta** (usuário ↔ empresa) e **chat admin ↔ empresa**
- 📊 **Dashboards** com estatísticas por role
- 🔒 **Fluxo atômico de aceite** de coleta (previne race conditions)

---

## 🏗️ Arquitetura

```
┌─────────────────────────────────────────────────────────────────┐
│                        USUÁRIO (Browser)                         │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  React 18 + Vite + Tailwind 4 + React Router + Leaflet  │   │
│  │  - Páginas (Home, Login, Dashboard, Mapas, Perfil...)   │   │
│  │  - Componentes (Navbar, MapView, AddressFields...)      │   │
│  │  - Auth Context + API Client (fetch wrapper)            │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                  │
│                    HTTPS / HTTP (Vite Proxy)                    │
│                              ▼                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      BACKEND (Node.js / Express)                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Express 4 + sql.js (SQLite em arquivo) + JWT + bcrypt  │   │
│  │  - Rotas: /api/auth, /api/users, /api/companies,        │   │
│  │           /api/collections, /api/notifications,         │   │
│  │           /api/stats, /api/admin, /api/messages         │   │
│  │  - Middlewares: authMiddleware, requireRole             │   │
│  │  - Helpers: geocode (Nominatim), notify, parseMaterials │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                  │
│                    Arquivo SQLite (server/data/ecopickup.sqlite)│
└─────────────────────────────────────────────────────────────────┘
```

### Comunicação Cliente-Servidor
- **Base URL dev:** `http://localhost:5173` (frontend) → proxy `/api` → `http://localhost:3001` (backend)
- **Autenticação:** Header `Authorization: Bearer <JWT>`
- **Formato:** JSON (`Content-Type: application/json`)

---

## 🛠️ Tecnologias

| Camada | Tecnologia | Versão | Uso |
|--------|------------|--------|-----|
| **Frontend** | React | 18.3.1 | UI componente-based |
| | Vite | 6.0.0 | Bundler / Dev server |
| | Tailwind CSS | 4.0.0 | Estilização utility-first |
| | React Router DOM | 6.28.0 | Roteamento SPA |
| | Leaflet + React Leaflet | 1.9.4 / 4.2.1 | Mapas interativos |
| **Backend** | Express | 4.21.2 | API REST |
| | sql.js | 1.11.0 | SQLite via WASM (sem binário nativo) |
| | jsonwebtoken | 9.0.2 | Tokens JWT |
| | bcryptjs | 2.4.3 | Hash de senhas |
| | dotenv | 16.4.7 | Variáveis de ambiente |
| **Externas** | Nominatim (OSM) | — | Geocodificação grátis |
| | OSRM | — | Rotas de carro |
| | OpenStreetMap Tiles | — | Mapa base |
| | Google Fonts | — | Fonte DM Sans |

---

## 📦 Pré-requisitos

- **Node.js** ≥ 18 (recomendado 20+)
- **npm** ≥ 9
- (Opcional) **OpenSSL** ou `node:crypto` para gerar `JWT_SECRET`

---

## 🚀 Como Executar

### 1. Clone e prepare o backend

```bash
cd workspace/server

# Copie o arquivo de exemplo e edite com valores reais
cp .env.example .env
# Edite .env: PORT, JWT_SECRET (gere com: node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"),
# ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME

npm install
npm run dev        # Inicia com --watch (reinicia ao salvar)
# ou: npm start    # Produção
```

> O servidor roda em **`http://localhost:3001`** (acessível na rede: `0.0.0.0`)

### 2. Em outro terminal, prepare o frontend

```bash
cd workspace/client
npm install
npm run dev        # Vite dev server com proxy /api → localhost:3001
```

> O frontend roda em **`http://localhost:5173`** (acessível na rede via `host: true`)

### 3. Acesse

- **Frontend:** http://localhost:5173
- **API Health:** http://localhost:3001/api/health
- **API Docs:** Veja [texto-API.md](texto-API.md) para documentação completa

---

### Credenciais de Teste (após primeiro `npm run dev` no server)

| Role | E-mail | Senha |
|------|--------|-------|
| Admin | (definido no `.env` como `ADMIN_EMAIL`) | (definido no `.env` como `ADMIN_PASSWORD`) |
| Usuário | Cadastre em `/cadastro/usuario` | — |
| Empresa | Cadastre em `/cadastro/empresa` (precisa aprovação do admin) | — |

---

## 📁 Estrutura do Projeto

```
workspace/
├── README.md                 # Este arquivo
├── senhaa.md                 # Credenciais locais (não versionar em produção!)
├── texto-API.md              # Documentação completa da API (REST)
├── package-lock.json         # Lockfile raiz (pode ignorar)
└── workspace/
    ├── client/               # Frontend React + Vite
    │   ├── index.html        # Entry HTML
    │   ├── vite.config.js    # Config Vite (proxy, HTTPS, JSX em .js)
    │   ├── package.json
    │   ├── public/           # Assets estáticos (mp3 de notificação)
    │   ├── certs/            # Certificados auto-assinados (para HTTPS + GPS)
    │   └── src/
    │       ├── main.jsx      # Bootstrap React
    │       ├── App.js        # Rotas + guards (RequireAuth)
    │       ├── api.js        # Cliente API (fetch + JWT + helpers)
    │       ├── auth.js       # AuthContext (token, role, user, company, notificações)
    │       ├── sounds.js     # Sons de notificação
    │       ├── index.css     # Tailwind + estilos globais
    │       ├── components/   # Componentes reutilizáveis
    │       │   ├── AddressFields.js   # CEP + Nominatim + mapa
    │       │   ├── ErrorBoundary.js
    │       │   ├── Footer.js
    │       │   ├── Icons.js
    │       │   ├── MapView.js         # Leaflet wrapper
    │       │   ├── Navbar.js
    │       │   └── StatusBadge.js
    │       └── pages/        # Páginas (rotas)
    │           ├── AdminDashboard.js
    │           ├── CollectionMap.js   # Mapa empresa (fullscreen)
    │           ├── CompanyAgenda.js
    │           ├── CompanyDashboard.js
    │           ├── CompanyPending.js  # Tela "aguardando aprovação"
    │           ├── CompanyProfile.js
    │           ├── ForgotPassword.js
    │           ├── Home.js
    │           ├── Login.js
    │           ├── MyCollections.js
    │           ├── Notifications.js
    │           ├── Register.js
    │           ├── RegisterCompany.js
    │           ├── RegisterUser.js
    │           ├── ScheduleCollection.js
    │           ├── UserDashboard.js
    │           └── UserProfile.js
    │
    └── server/               # Backend Express + SQLite
        ├── .env              # Segredos (não versionado)
        ├── .env.example      # Template
        ├── package.json
        ├── data/
        │   └── ecopickup.sqlite   # Banco SQLite (criado automaticamente)
        ├── varredura.mjs     # Script de limpeza de dados de teste
        ├── test-funcional.mjs # Teste E2E automatizado da API
        └── src/
            ├── index.js      # Entry point: Express + rotas + health
            ├── env.js        # Carrega .env + helpers requireEnv/optionalEnv
            ├── auth.js       # JWT sign/verify + middlewares auth/role
            ├── db.js         # sql.js wrapper + schema + seed admin
            ├── geocode.js    # Nominatim geocode (endereço → lat/lng)
            ├── helpers.js    # Constantes + parseMaterials + notify*
            └── routes/       # Rotas da API (todas com authMiddleware)
                ├── auth.js       # POST /register/user, /register/company, /login, GET /materials
                ├── users.js      # GET/PUT /me, CRUD /addresses
                ├── companies.js  # GET/PUT /me, GET /list, DELETE /me
                ├── collections.js# CRUD coletas + status flow + chat + dashboard + filtros
                ├── notifications.js # GET, unread-count, mark read
                ├── stats.js      # GET /stats (público)
                ├── admin.js      # Gestão empresas/usuários + stats (role=admin)
                └── messages.js   # Chat admin ↔ empresa
```

---

## 📡 Documentação da API

A documentação completa e atualizada de **todos os endpoints** (internos + externos) está em:

👉 **[texto-API.md](texto-API.md)**

### Resumo rápido dos grupos de rotas

| Prefixo | Descrição | Autenticação |
|---------|-----------|--------------|
| `/api/auth` | Registro, login, materiais | Pública |
| `/api/users` | Perfil + endereços do usuário | `user` |
| `/api/companies` | Perfil empresa + listagem p/ usuário | `company` / `user` |
| `/api/collections` | **Core**: criar, listar, status, chat, dashboards | `user` / `company` |
| `/api/notifications` | Notificações do sistema | `user` / `company` / `admin` |
| `/api/stats` | Estatísticas públicas (home) | Pública |
| `/api/admin` | Gestão completa (empresas, usuários, stats) | `admin` |
| `/api/messages` | Chat direto admin ↔ empresa | `admin` / `company` |
| `/api/health` | Health check | Pública |

### Códigos de status HTTP

| Código | Significado |
|--------|-------------|
| 200 | Sucesso |
| 201 | Criado |
| 400 | Dados inválidos |
| 401 | Não autenticado (token ausente/inválido/expirado) |
| 403 | Sem permissão (role errado, empresa não aprovada, recurso de outro) |
| 404 | Não encontrado |
| 409 | Conflito (duplicidade, aceite simultâneo) |
| 500 | Erro interno |

---

## 🗄️ Banco de Dados

**Tecnologia:** SQLite via `sql.js` (WASM) — arquivo único em `server/data/ecopickup.sqlite`

### Tabelas

| Tabela | Descrição |
|--------|-----------|
| `users` | Usuários comuns + admins (`role`: `user` \| `admin`) |
| `addresses` | Endereços dos usuários (múltiplos, 1 default) |
| `companies` | Empresas de coleta (`is_approved`: 0/1) |
| `collections` | Solicitações de coleta (status flow) |
| `notifications` | Notificações (user_id OU company_id) |
| `messages` | Chat direto admin ↔ empresa |
| `collection_messages` | Chat por coleta (user ↔ company) |

### Schema completo

Veja `server/src/db.js` (linhas 106–250) para o `CREATE TABLE` comentado.

### Migrações (ad-hoc)

O `db.js` executa `ALTER TABLE` idempotentes na inicialização para colunas adicionadas depois:
- `users.role`
- `companies.is_approved`
- `collections.rejected_by` (JSON array de company_ids que recusaram)

---

## 🔐 Autenticação e Autorização

### JWT
- **Algoritmo:** HS256
- **Expiração:** 7 dias
- **Secret:** `JWT_SECRET` no `.env` (obrigatório em produção)
- **Payload:** `{ id, role }`

### Middlewares (`server/src/auth.js`)
```js
authMiddleware      // Verifica Bearer token → req.auth = { id, role }
requireRole('user') // Bloqueia se role !== 'user'
requireRole('company', 'admin') // Permite múltiplos roles
```

### Roles e Permissões

| Recurso | `user` | `company` | `admin` |
|---------|--------|-----------|---------|
| `/api/auth/*` | ✅ | ✅ | ✅ |
| `/api/users/*` | ✅ (próprio) | ❌ | ❌ |
| `/api/companies/me` | ❌ | ✅ (própria) | ❌ |
| `/api/companies/list` | ✅ | ❌ | ❌ |
| `/api/collections` (listar) | ✅ (próprias) | ✅ (próprias + pendentes da cidade) | ❌ |
| `/api/collections/:id/status` | ❌ | ✅ (própria/pendente) | ❌ |
| `/api/notifications` | ✅ (próprias) | ✅ (próprias) | ✅ (todas) |
| `/api/admin/*` | ❌ | ❌ | ✅ |
| `/api/messages` | ❌ | ✅ (com admin) | ✅ (com empresas) |
| `/api/stats` | ✅ | ✅ | ✅ |

---

## 🔄 Fluxos Principais

### 1. Cadastro de Usuário
```
POST /api/auth/register/user
  → Valida CPF, e-mail, senha ≥ 6
  → Geocodifica endereço (Nominatim)
  → Cria user + address (is_default=1)
  → Notifica "bem_vindo"
  → Retorna { token, role: 'user', user }
```

### 2. Cadastro de Empresa
```
POST /api/auth/register/company
  → Valida CNPJ, e-mail, senha ≥ 6, materials[]
  → Geocodifica endereço
  → Cria company (is_approved=0)
  → Notifica todos admins: "nova_empresa_pendente"
  → Retorna { token, role: 'company', company }
  → Empresa vê tela "Aguardando aprovação" até admin aprovar
```

### 3. Fluxo de Coleta (Core)
```
Usuário                                    Empresa A              Empresa B
  │                                           │                      │
  ├─ POST /collections (pendente) ──────────►│                      │
  │                                           ├─ vê na lista         ├─ vê na lista
  │                                           │                      │
  │                                           ├─ PUT status: recusada│
  │  ◄─ notificação "continua disponível"    │  (some p/ A)         │
  │                                           │                      │
  │                                           │                      ├─ PUT status: aceita
  │  ◄─ "coleta aceita!" ────────────────────┼──────────────────────┤  (atômico: UPDATE
  │                                           │                      │   WHERE company_id IS NULL)
  │                                           │                      │
  │                                    agendada → em_coleta → concluida
```

**Regras de status** (`server/src/routes/collections.js`):
- `pendente → aceita` (atômico, só se `company_id IS NULL`)
- `aceita → agendada → em_coleta → concluida` (só empresa dona)
- `cancelada` (só empresa dona)
- `recusada` → coleta **continua pendente** para outras; empresa que recusou vai para `rejected_by` e deixa de ver

### 4. Notificações (Polling 15s)
- Frontend (`auth.js`) faz `GET /notifications/unread-count` a cada 15s
- Badge no sino da Navbar
- Sons: `mp3_1` (mensagem), `mp3_2` (coleta aceita)

---

## 💻 Desenvolvimento

### Scripts úteis

```bash
# Backend
cd workspace/server
npm run dev      # Node --watch (reinicia ao salvar)
npm start        # Produção (sem watch)

# Frontend
cd workspace/client
npm run dev      # Vite dev server (HMR)
npm run build    # Build produção → dist/
npm run preview  # Preview do build

# Testes E2E da API (precisa server rodando)
cd workspace/server
node test-funcional.mjs

# Limpeza de dados de teste (server PARADO)
cd workspace/server
node varredura.mjs
```

### Variáveis de ambiente (Backend)

| Variável | Obrigatória? | Descrição |
|----------|--------------|-----------|
| `PORT` | Não (padrão 3001) | Porta do servidor |
| `JWT_SECRET` | **Sim em produção** | Chave HS256 (96 chars hex recomendados) |
| `ADMIN_EMAIL` | Sim | E-mail do admin inicial |
| `ADMIN_PASSWORD` | Sim | Senha do admin (≥ 6 chars) |
| `ADMIN_NAME` | Não (padrão "Administrador") | Nome do admin |

> Gere `JWT_SECRET`: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`

### HTTPS Local (para GPS no celular)

O GPS do navegador **só funciona em `https://` ou `localhost`**. Para testar no celular via IP da rede local:

```bash
# 1. Gere certificados auto-assinados (uma vez)
cd workspace/client
mkdir -p certs
openssl req -x509 -newkey rsa:2048 -nodes -keyout certs/key.pem -out certs/cert.pem -days 365 -subj "/CN=localhost"

# 2. Inicie com HTTPS
USE_HTTPS=1 npm run dev
# Acesse: https://192.168.X.X:5173 (aceite o aviso do navegador)
```

> O `vite.config.js` já suporta `USE_HTTPS=1` e lê `certs/key.pem` + `certs/cert.pem`.

### Adicionar nova rota no backend

1. Crie `server/src/routes/nova.js` seguindo o padrão das existentes
2. Importe e registre em `server/src/index.js`:
   ```js
   import novaRoutes from './routes/nova.js';
   app.use('/api/nova', novaRoutes);
   ```
3. Adicione types no frontend (`client/src/api.js` se necessário)

### Adicionar nova página no frontend

1. Crie `client/src/pages/NovaPagina.js`
2. Adicione rota em `client/src/App.js`:
   ```js
   import NovaPagina from './pages/NovaPagina';
   <Route path="/nova" element={<RequireAuth role="user"><NovaPagina /></RequireAuth>} />
   ```
3. Adicione link no `Navbar.js` ou dashboard correspondente

---

## 🚀 Deploy

### Backend (Produção)

```bash
cd workspace/server
# 1. Defina .env de produção (JWT_SECRET forte, ADMIN_*, PORT)
# 2. Instale deps de produção
npm ci --omit=dev
# 3. Inicie (systemd, PM2, Docker, etc.)
npm start
```

**Recomendações:**
- Use **reverse proxy** (Nginx/Caddy) na frente: TLS, rate limit, logs
- SQLite em arquivo → certifique-se que o usuário do processo tem escrita em `server/data/`
- Backups periódicos do `ecopickup.sqlite`

### Frontend (Produção)

```bash
cd workspace/client
npm ci
npm run build
# Deploy da pasta dist/ em servidor estático (Nginx, Vercel, Netlify, S3+CloudFront...)
```

**Configuração do proxy reverso (exemplo Nginx):**
```nginx
server {
    listen 443 ssl;
    server_name seu-dominio.com;

    # Frontend estático
    location / {
        root /var/www/reciclaja/client/dist;
        try_files $uri $uri/ /index.html;
    }

    # API → Backend
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## 🧪 Testes

### Teste Funcional Automatizado (E2E)

```bash
cd workspace/server
node test-funcional.mjs
```

**O que testa:**
1. Infraestrutura (health, materials, stats público)
2. Autenticação (login inválido, acesso sem token)
3. Cadastro/perfil/endereços do usuário
4. Agendamento de coleta (validações, criação, dashboard)
5. Cadastro de empresa (pendente, bloqueio se não aprovada)
6. Admin: listar, aprovar, stats, usuários, notificações
7. Fluxo completo da coleta: listar, filtrar, recusar, aceitar, avançar status, transição inválida
8. Chat da coleta (empresa → usuário → empresa, validação vazio)
9. Notificações do usuário (tipos, unread-count, marcar lida, read-all)
10. Mensagens admin ↔ empresa (enviar, conversas, histórico, unread)
11. Perfil da empresa (atualizar, listar p/ usuário)
12. Limpeza (excluir empresa, excluir usuário)

> **Requisitos:** Server rodando em `localhost:3001`, `.env` com `ADMIN_EMAIL`/`ADMIN_PASSWORD` válidos.

### Limpeza de Dados de Teste

```bash
# Server DEVE estar PARADO
cd workspace/server
node varredura.mjs
```
Remove usuários/empresas com e-mail `teste-cbf-*` e todas as dependências (coletas, mensagens, notificações, endereços).

---

## 🔧 Troubleshooting

| Problema | Causa Provável | Solução |
|----------|----------------|---------|
| `JWT_SECRET não definida` | `.env` não tem `JWT_SECRET` | Copie `.env.example` → `.env` e preencha |
| `sqlite3` / `better-sqlite3` erro | Tentou usar driver nativo | Projeto usa `sql.js` (WASM), não precisa de build nativo |
| GPS não funciona no celular | HTTP não seguro | Use `USE_HTTPS=1 npm run dev` + certs auto-assinados |
| `fetch` falha no frontend | Proxy Vite não configurado | Verifique `vite.config.js` → `server.proxy['/api']` |
| Empresa não vê coletas | `is_approved = 0` | Admin deve aprovar em `/admin` |
| Erro 409 "Outra empresa acabou de aceitar" | Race condition no aceite | É esperado — apenas uma empresa ganha |
| Notificações não aparecem | Polling 15s | Aguarde ou recarregue; verifique console de rede |
| Mapa não carrega | Tiles OSM bloqueados | Verifique rede; Leaflet usa `tile.openstreetmap.org` |

### Logs úteis

```bash
# Backend
cd workspace/server
npm run dev  # Logs no console: rotas, erros, geocode, notificações

# Frontend (DevTools Console)
# - Erros de API (401, 403, 500)
# - WebSocket HMR (Vite)
# - Leaflet warnings (CSS não carregado)
```

---

## 📄 Licença

Projeto educacional / demonstração. Uso livre para estudos.

---

## 🤝 Contribuição

1. Fork o projeto
2. Crie branch: `git checkout -b feature/nova-funcionalidade`
3. Commit: `git commit -m 'feat: descrição'`
4. Push: `git push origin feature/nova-funcionalidade`
5. Abra Pull Request

### Padrões de commit (Conventional Commits)
- `feat:` nova funcionalidade
- `fix:` correção de bug
- `docs:` documentação
- `refactor:` refatoração sem mudança de comportamento
- `test:` testes
- `chore:` manutenção (deps, configs)

---

> **Última atualização:** 2026-11-13 — ReciclaJá v1.0  
> **Autor:** Mateus Martins Peres  
> **Contato:** mateusmartinsperes53@gmail.com

---

## 📚 Documentação Relacionada

| Documento | Descrição |
|-----------|-----------|
| [DOCS.md](DOCS.md) | Índice completo de documentação, comandos, fluxos, deploy |
| [texto-API.md](texto-API.md) | Referência detalhada da API REST com exemplos |
| [CHANGELOG.md](CHANGELOG.md) | Histórico de versões e mudanças |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Guia para contribuir (padrões, commits, PRs, testes) |
| [.gitignore](.gitignore) | Arquivos ignorados pelo Git |