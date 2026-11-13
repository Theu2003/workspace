# 📚 Índice de Documentação — ReciclaJá

> Navegação rápida para toda a documentação do projeto.

---

## 📖 Documentos Principais

| Documento | Descrição | Link |
|-----------|-----------|------|
| **README.md** | Visão geral, arquitetura, como executar, estrutura, deploy, troubleshooting | [README.md](README.md) |
| **texto-API.md** | Documentação completa da API REST (endpoints, exemplos, códigos, fluxos) | [texto-API.md](texto-API.md) |
| **APIS_EXTERNAS.md** | Referência de todas as APIs externas (Nominatim, OSRM, OSM Tiles, Google Fonts) com links oficiais | [APIS_EXTERNAS.md](APIS_EXTERNAS.md) |

---

## 🗂️ Estrutura de Pastas (Resumo)

```
workspace/
├── README.md                 # ← COMECE AQUI
├── texto-API.md              # Referência da API
├── .gitignore                # Arquivos ignorados pelo git
├── senhaa.md                 # Credenciais locais (NÃO COMMITAR EM PRODUÇÃO)
└── workspace/
    ├── client/               # Frontend React + Vite
    │   ├── src/
    │   │   ├── components/   # Componentes reutilizáveis
    │   │   ├── pages/        # Páginas (rotas)
    │   │   ├── api.js        # Cliente HTTP + helpers
    │   │   ├── auth.js       # AuthContext (estado global)
    │   │   └── App.js        # Rotas + guards
    │   └── vite.config.js    # Config dev/proxy/HTTPS
    └── server/               # Backend Express + SQLite
        ├── src/
        │   ├── routes/       # Rotas da API (/auth, /users, /collections...)
        │   ├── db.js         # Schema + wrapper sql.js
        │   ├── auth.js       # JWT + middlewares
        │   ├── geocode.js    # Nominatim integration
        │   └── helpers.js    # Constantes + notify + parse
        ├── test-funcional.mjs # Teste E2E automatizado
        ├── varredura.mjs     # Limpeza de dados de teste
        └── .env              # Segredos (não versionado)
```

---

## 🚀 Início Rápido

```bash
# 1. Backend
cd workspace/server
cp .env.example .env        # Edite com valores reais
npm install
npm run dev                 # Porta 3001

# 2. Frontend (outro terminal)
cd workspace/client
npm install
npm run dev                 # Porta 5173 (proxy /api → 3001)

# 3. Acesse http://localhost:5173
```

---

## 🧪 Testes

| Comando | Descrição |
|---------|-----------|
| `cd workspace/server && node test-funcional.mjs` | Teste E2E completo da API (precisa server rodando) |
| `cd workspace/server && node varredura.mjs` | Limpa dados de teste `teste-cbf-*` (server PARADO) |

---

## 🔐 Credenciais Padrão (Dev)

Após primeiro `npm run dev` no server, o admin é criado automaticamente:

| Role | E-mail | Senha |
|------|--------|-------|
| Admin | Conforme `ADMIN_EMAIL` no `.env` | Conforme `ADMIN_PASSWORD` no `.env` |
| Usuário | Cadastre em `/cadastro/usuario` | — |
| Empresa | Cadastre em `/cadastro/empresa` | — (precisa aprovação admin) |

---

## 🌐 APIs Externas Utilizadas

| Serviço | Uso | Localização no Código |
|---------|-----|----------------------|
| **Nominatim (OSM)** | Geocodificação endereço ↔ lat/lng | `server/src/geocode.js`, `client/src/components/AddressFields.js` |
| **OSRM** | Rotas de carro (empresa → coleta) | `client/src/pages/MyCollections.js` |
| **OSM Tiles** | Mapa base (Leaflet) | `client/src/components/MapView.js`, `client/src/pages/CollectionMap.js` |
| **Google Fonts** | Fonte DM Sans | `client/index.html` |

> Todas gratuitas, sem chave de API. Respeite rate limits (Nominatim: 1 req/s).

---

## 📋 Fluxos Principais (Resumo)

### Cadastro Usuário
`POST /auth/register/user` → valida CPF/email/senha → geocode endereço → cria user + address default → notifica boas-vindas → retorna JWT

### Cadastro Empresa
`POST /auth/register/company` → valida CNPJ/email/senha/materials → geocode → cria company (is_approved=0) → notifica admins → retorna JWT → empresa aguarda aprovação

### Fluxo de Coleta
```
Usuário: POST /collections (pendente)
    ↓
Empresas da cidade recebem notificação
    ↓
Empresa A: PUT /collections/:id/status {status: "recusada"} → coleta continua pendente p/ outras
Empresa B: PUT /collections/:id/status {status: "aceita"} → atômico (company_id era null)
    ↓
Empresa B (dona): agendada → em_coleta → concluida
    ↓
Usuário notificado a cada etapa
```

### Notificações (Polling 15s)
Frontend: `GET /notifications/unread-count` a cada 15s → badge no sino → sons mp3_1 (msg) / mp3_2 (coleta aceita)

---

## 🛠️ Comandos de Desenvolvimento

### Backend
```bash
cd workspace/server
npm run dev      # --watch (reinicia ao salvar)
npm start        # Produção
```

### Frontend
```bash
cd workspace/client
npm run dev      # Vite + HMR + proxy /api
npm run build    # Build produção → dist/
npm run preview  # Preview do build
```

### HTTPS Local (GPS no celular)
```bash
cd workspace/client
mkdir -p certs
openssl req -x509 -newkey rsa:2048 -nodes -keyout certs/key.pem -out certs/cert.pem -days 365 -subj "/CN=localhost"
USE_HTTPS=1 npm run dev
# Acesse https://SEU_IP_LOCAL:5173
```

---

## 📦 Deploy Checklist

### Backend
- [ ] `.env` de produção com `JWT_SECRET` forte (96 chars hex)
- [ ] `npm ci --omit=dev`
- [ ] Reverse proxy (Nginx/Caddy) com TLS
- [ ] Permissão de escrita em `server/data/`
- [ ] Backup periódico do `ecopickup.sqlite`
- [ ] Process manager (PM2, systemd, Docker)

### Frontend
- [ ] `npm run build`
- [ ] Deploy `dist/` em servidor estático (Nginx, Vercel, Netlify, S3+CloudFront)
- [ ] Configurar proxy `/api` → backend no reverse proxy

---

## 🐛 Troubleshooting Rápido

| Sintoma | Verifique |
|---------|-----------|
| `JWT_SECRET não definida` | `.env` existe? `JWT_SECRET` preenchido? |
| GPS não funciona no celular | Usando `https://` ou `localhost`? `USE_HTTPS=1`? |
| Empresa não vê coletas | `is_approved = 1`? Admin aprovou? |
| Erro 409 ao aceitar coleta | Race condition normal — outra empresa aceitou primeiro |
| Mapa não carrega | Rede permite `tile.openstreetmap.org`? Leaflet CSS carregado? |
| Proxy `/api` falha | `vite.config.js` → `server.proxy['/api']` aponta para `localhost:3001`? |

---

## 📝 Padrões do Projeto

### Commits (Conventional Commits)
```
feat: nova funcionalidade
fix: correção de bug
docs: documentação
refactor: refatoração sem mudança de comportamento
test: testes
chore: manutenção (deps, configs)
```

### Estrutura de Rotas Backend
```js
// server/src/routes/nova.js
import { Router } from 'express';
import { authMiddleware, requireRole } from '../auth.js';
import db from '../db.js';

const router = Router();
router.use(authMiddleware);           // Sempre primeiro
router.use(requireRole('user'));      // Ou 'company', 'admin'

router.get('/', (req, res) => { ... });
router.post('/', (req, res) => { ... });

export default router;
```

### Adicionar Página Frontend
```js
// client/src/pages/NovaPagina.js
export default function NovaPagina() { return <div>...</div>; }

// client/src/App.js
import NovaPagina from './pages/NovaPagina';
<Route path="/nova" element={<RequireAuth role="user"><NovaPagina /></RequireAuth>} />
```

---

## 🔗 Links Úteis

- [Node.js](https://nodejs.org/) ≥ 18
- [Vite](https://vitejs.dev/)
- [React Router](https://reactrouter.com/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Leaflet](https://leafletjs.com/)
- [Express](https://expressjs.com/)
- [sql.js](https://github.com/sql-js/sql.js)
- [Nominatim Usage Policy](https://operations.osmfoundation.org/policies/nominatim/)
- [OSRM](http://project-osrm.org/)

---

> **Última atualização:** 13/11/2026 — ReciclaJá v1.0  
> **Autor:** Mateus Martins Peres