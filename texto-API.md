# 📡 texto API — Documentação das APIs do ReciclaJá

Documentação completa de todas as APIs utilizadas no projeto:

1. **API interna** (backend Express — `server/src/routes/`)
2. **APIs externas da internet** (serviços de terceiros usados pelo sistema)

---

## ⚙️ Configuração base

| Item | Valor |
|---|---|
| URL base (dev) | `http://localhost:3001/api` |
| Autenticação | Token JWT no header `Authorization: Bearer <token>` |
| Formato de dados | JSON (`Content-Type: application/json`) |
| Papéis (roles) | `user` (usuário), `company` (empresa), `admin` (administrador) |
| Expiração do token | 7 dias |
| Códigos de verificação | 6 dígitos, expiram em 10 minutos, uso único e até 5 tentativas |

### Códigos de resposta mais usados

| Código | Significado |
|---|---|
| 200 | Sucesso |
| 201 | Criado com sucesso |
| 202 | Solicitação aceita (cadastro pendente ou recuperação genérica) |
| 400 | Dados inválidos/ausentes no corpo da requisição |
| 401 | Não autenticado (token ausente, inválido ou expirado) |
| 403 | Sem permissão (papel errado, empresa não aprovada, coleta de outro) |
| 404 | Registro não encontrado |
| 409 | Conflito (e-mail/CNPJ duplicado, ou outra empresa já aceitou a coleta) |
| 429 | Muitas tentativas/reenvios |
| 503 | Provedor de verificação selecionado não está configurado ou não está disponível |
| 500 | Erro interno do servidor |

---

# 1️⃣ API INTERNA

## 🔐 Autenticação — `/api/auth`

| Método | Rota | Quem usa | Descrição |
|---|---|---|---|
| POST | `/auth/register/user` | Público | Inicia cadastro com exatamente um contato (e-mail ou telefone E.164); envia código e não cria conta/JWT até verificar |
| POST | `/auth/register/user/verify` | Público | Confirma `{ pendingId, code }`, cria a conta e retorna JWT |
| POST | `/auth/register/user/resend` | Público | Reenvia código de cadastro; há limites de tentativas e reenvios |
| POST | `/auth/register/company` | Público | Cadastra uma empresa de coleta (CNPJ, materiais coletados etc.). Fica **pendente** até o admin aprovar. Notifica os admins |
| POST | `/auth/login` | Público | Usuários entram com `{ identifier, password }` (e-mail ou telefone); empresas continuam com `{ email, password, as: 'company' }` |
| POST | `/auth/password-reset/request` | Público | Solicita código de recuperação. Retorna resposta genérica para não revelar se a conta existe; o envio usa apenas contato já cadastrado |
| POST | `/auth/password-reset/confirm` | Público | Confirma `{ identifier, code, newPassword }` |
| POST | `/auth/password-change/request` | Usuário | Envia código ao contato principal atual do usuário autenticado |
| POST | `/auth/password-change/confirm` | Usuário | Confirma `{ code, newPassword }` |
| GET | `/auth/materials` | Público | Lista os tipos de materiais recicláveis aceitos no sistema |

Cadastros de usuário aceitam **um** dos campos `email` ou `phone`. Telefone deve estar em E.164, como `+14155552671`; o sistema não infere o código do país. Usuários antigos continuam entrando pelo e-mail. Seus pedidos de redefinição usam o e-mail existente como contato principal, sem exigir novo OTP no login.

Para habilitar os envios, configure no `server/.env` as variáveis SMTP (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`) e/ou Twilio (`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_PHONE`). Configure o provedor correspondente ao canal escolhido. Não registre códigos ou credenciais em logs.

Na migração, todos os registros existentes são marcados como `primary_contact: "email"`; telefone e demais campos legados, inclusive valores vazios ou duplicados, são preservados. Esses usuários continuam entrando e recebendo OTP pelo e-mail. Login/recuperação por telefone só localiza contas `primary_contact: "phone"`. A unicidade de telefone é aplicada somente entre contas phone-primary; um telefone legado repetido não impede uma nova conta phone-primary.

### Exemplos

**POST `/api/auth/register/user`**
```json
// Request
{
  "name": "João Silva",
  "cpf": "12345678901",
  "email": "joao@email.com",
  "password": "senha123",
  "cep": "01310-100",
  "state": "SP",
  "city": "São Paulo",
  "neighborhood": "Bela Vista",
  "street": "Av. Paulista",
  "number": "1000",
  "complement": "Apto 101"
}

// Response 202
{ "pendingId": "identificador-opaco", "expiresIn": 600, "message": "Código de verificação enviado" }
```

**POST `/api/auth/register/user/verify`**
```json
{ "pendingId": "identificador-opaco", "code": "123456" }
```
Após a verificação, a resposta `201` contém `{ token, role: "user", user }`.

Para cadastrar por telefone, envie `phone: "+14155552671"` e omita `email` (ou deixe-o vazio).

**POST `/api/auth/register/company`**
```json
// Request
{
  "name": "Recicla Verde Ltda",
  "cnpj": "12345678000199",
  "responsible": "Maria Santos",
  "email": "contato@reciclaverde.com",
  "phone": "1133334444",
  "password": "senha123",
  "cep": "01310-930",
  "state": "SP",
  "city": "São Paulo",
  "neighborhood": "Consolação",
  "street": "Rua da Consolação",
  "number": "3000",
  "complement": "",
  "materials": ["Plástico", "Papel", "Metal"]
}

// Response 201
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "role": "company",
  "company": { "name": "Recicla Verde Ltda", "email": "contato@reciclaverde.com" }
}
```

**POST `/api/auth/login`**
```json
// Request (usuário)
{ "identifier": "joao@email.com", "password": "senha123" }

// Request (usuário com telefone como contato principal)
{ "identifier": "+14155552671", "password": "senha123" }

// Request (empresa)
{ "email": "contato@reciclaverde.com", "password": "senha123", "as": "company" }

// Response 200 (usuário)
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "role": "user",
  "user": { "id": 1, "name": "João Silva", "email": "joao@email.com", "city": "São Paulo" }
}

// Response 200 (empresa)
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "role": "company",
  "company": { "id": 1, "name": "Recicla Verde Ltda", "email": "contato@reciclaverde.com", "is_approved": 1 }
}
```

**GET `/api/auth/materials`**
```json
// Response 200
{
  "materials": ["Papel", "Papelão", "Plástico", "Vidro", "Metal", "Eletrônicos", "Óleo de cozinha", "Outros"]
}
```

---

## 👤 Usuário — `/api/users` *(requer token, papel `user`)*

| Método | Rota | Descrição |
|---|---|---|
| GET | `/users/me` | Dados do perfil do usuário logado + lista de endereços |
| PUT | `/users/me` | Atualiza apenas o nome. E-mail/telefone não podem ser alterados sem verificação; senha usa `/auth/password-change/*` |
| POST | `/users/addresses` | Adiciona um novo endereço. Se `isDefault: true`, vira o endereço padrão |
| PUT | `/users/addresses/:id` | Atualiza um endereço existente (aceita latitude/longitude manuais do mapa) |
| POST | `/users/addresses/:id/default` | Define aquele endereço como padrão |
| DELETE | `/users/addresses/:id` | Remove um endereço (se era o padrão, o primeiro restante assume) |

O perfil devolve `email` e `phone` como `null` quando não definidos. Contatos não são editáveis pelo perfil para impedir redirecionamento de códigos a um endereço não verificado.

---

## 🏢 Empresa — `/api/companies`

| Método | Rota | Quem usa | Descrição |
|---|---|---|---|
| GET | `/companies/me` | Empresa | Dados completos do perfil da empresa logada |
| PUT | `/companies/me` | Empresa | Atualiza dados (nome, responsável, telefone, materiais, endereço, senha opcional) |
| DELETE | `/companies/me` | Empresa | **Exclui a própria conta.** As coletas atribuídas voltam para `pendente` |
| GET | `/companies/list` | Usuário | Lista empresas **aprovadas** (da mesma cidade do usuário, se houver) para escolher no agendamento |

---

## ♻️ Coletas — `/api/collections` *(o coração do sistema)*

| Método | Rota | Quem usa | Descrição |
|---|---|---|---|
| POST | `/collections` | Usuário | Cria uma solicitação de coleta. Body: `{ addressId, materials: [{type, quantity}], date, period, observations? }`. Notifica empresas da cidade |
| GET | `/collections/mine` | Usuário | Lista todas as coletas do usuário logado |
| GET | `/collections` | Empresa | Lista coletas **da empresa** (aceitas) + **pendentes da cidade**. Filtros opcionais: `?status=`, `?neighborhood=`, `?material=`, `?date=`, `?distance=` (km). **Coletas recusadas pela própria empresa ficam ocultas** |
| GET | `/collections/dashboard` | Empresa | Estatísticas da empresa: totais por status, peso coletado, clientes atendidos, coletas por data |
| GET | `/collections/user-dashboard` | Usuário | Estatísticas do usuário: totais, peso total, próximas coletas |
| PUT | `/collections/:id/status` | Empresa | Muda o status da coleta (ver regras abaixo) |
| GET | `/collections/:id` | Dono ou empresa atribuída | Detalhes completos de uma coleta |
| GET | `/collections/:id/messages` | Dono ou empresa atribuída | Mensagens do chat sobre a coleta (marca como lidas as do outro lado) |
| POST | `/collections/:id/messages` | Dono ou empresa atribuída | Envia mensagem no chat da coleta. Notifica a outra parte |

### 📋 Regras de status (PUT `/collections/:id/status`)

Fluxo: `pendente → aceita → agendada → em_coleta → concluída`

| Situação | Comportamento |
|---|---|
| Empresa **recusa** (`recusada`) | A coleta **continua `pendente`** para as outras empresas! O ID da empresa vai para `rejected_by` e ela deixa de ver a coleta. O usuário é notificado |
| Empresa **aceita** (`aceita`) | Operação **atômica**: só funciona se `company_id` ainda é nulo. Se duas empresas aceitarem juntas, **uma vence e a outra recebe 409** *"Outra empresa acabou de aceitar esta coleta"* |
| Avanço de status | Só a empresa **dona** da coleta pode: `aceita→agendada→em_coleta→concluida` |
| **Cancelamento** (`cancelada`) | Só a empresa atribuída pode cancelar (403 para outras) |
| Empresa não aprovada | Bloqueada (403) de qualquer ação sobre coletas |

---

## 🔔 Notificações — `/api/notifications` *(requer token)*

| Método | Rota | Descrição |
|---|---|---|
| GET | `/notifications` | Últimas 50 notificações (admin vê todas; usuário/empresa veem as suas) |
| GET | `/notifications/unread-count` | Contador de não lidas (badge do sino) |
| PUT | `/notifications/:id/read` | Marca uma notificação como lida |
| PUT | `/notifications/read-all` | Marca todas como lidas |

---

## 📊 Estatísticas públicas — `/api/stats`

| Método | Rota | Quem usa | Descrição |
|---|---|---|---|
| GET | `/stats` | Público (sem token) | Números da página inicial: total de empresas, coletas concluídas e peso total coletado |

---

## 🛡️ Administrador — `/api/admin` *(requer token + papel `admin`)*

| Método | Rota | Descrição |
|---|---|---|
| GET | `/admin/companies` | Lista todas as empresas (aprovadas e pendentes) |
| GET | `/admin/companies/pending` | Lista apenas empresas aguardando aprovação |
| POST | `/admin/companies/:id/approve` | **Aprova** uma empresa (ela passa a receber coletas). Notifica a empresa |
| POST | `/admin/companies/:id/reject` | **Rejeita e remove** uma empresa pendente |
| DELETE | `/admin/companies/:id` | Remove uma empresa e seus dados relacionados |
| GET | `/admin/users` | Lista todos os usuários cadastrados |
| DELETE | `/admin/users/:id` | Remove um usuário (não permite excluir admins) |
| GET | `/admin/stats` | Números gerais: empresas (total/pendentes/aprovadas), usuários, coletas |

---

## 💬 Mensagens admin ↔ empresa — `/api/messages` *(admin e empresa)*

| Método | Rota | Quem usa | Descrição |
|---|---|---|---|
| GET | `/messages/conversations` | Admin / Empresa | Admin: lista empresas com quem conversou. Empresa: retorna a conversa dela com o admin |
| GET | `/messages/company/:companyId` | Admin | Mensagens de uma conversa específica (marca como lidas as da empresa) |
| POST | `/messages` | Admin / Empresa | Envia mensagem. Admin passa `{ receiverId, message }`; empresa envia direto ao admin |
| GET | `/messages/unread-count` | Admin / Empresa | Contador de mensagens não lidas |

---

## ❤️ Health check

| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/health` | Verifica se o servidor está no ar. Resposta: `{ "status": "ok" }` |

---

# 2️⃣ APIs EXTERNAS DA INTERNET

Serviços de terceiros utilizados pelo sistema (todos gratuitos e sem chave de acesso):

## 🗺️ Nominatim (OpenStreetMap) — Geocodificação

**Onde é usada:** `server/src/geocode.js` (servidor) e `client/src/components/AddressFields.js` (cliente)

| Endpoint | Uso |
|---|---|
| `https://nominatim.openstreetmap.org/search?format=json&q=...` | **Geocodificação** (endereço → latitude/longitude). Usada ao cadastrar usuário/empresa/endereço e ao criar coleta. Timeout de 8s |
| `https://nominatim.openstreetmap.org/reverse?format=json&lat=...&lon=...` | **Geocodificação reversa** (GPS → endereço). Botão "Usar minha localização (GPS)" no cadastro |

⚠️ **Limite de uso:** máx. 1 requisição por segundo (política do Nominatim). O servidor envia `User-Agent: ReciclaJa/1.0` como exigido pela API.

## 🧭 OSRM (Open Source Routing Machine) — Rotas

**Onde é usada:** `client/src/pages/MyCollections.js`

| Endpoint | Uso |
|---|---|
| `https://router.project-osrm.org/route/v1/driving/{lng1},{lat1};{lng2},{lat2}` | Traça a **rota de carro** entre a empresa e o local da coleta. Desenha a linha pontilhada no mapa das coletas do usuário |

## 🗺️ Tiles do OpenStreetMap — Mapa

**Onde é usada:** `client/src/components/MapView.js` e `client/src/pages/CollectionMap.js` (Leaflet)

| Endpoint | Uso |
|---|---|
| `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png` | Imagens do mapa (blocos) exibidas pelo Leaflet em todas as telas com mapa |

## 🔤 Google Fonts

**Onde é usada:** `client/index.html`

| Endpoint | Uso |
|---|---|
| `https://fonts.googleapis.com/css2?family=DM+Sans...` | Fonte **DM Sans** da interface |

---

## 🔗 Fluxo resumido de uma coleta

```
Usuário                        Empresa A                Empresa B
   │                               │                        │
   ├─ POST /collections ──────────►│                        │
   │  (status: pendente)           ├─ vê a coleta           ├─ vê a coleta
   │                               │                        │
   │                               ├─ PUT status: recusada  │
   │  ◄─ notificação "não pôde     │  (coleta CONTINUA      │
   │   atender, mas continua       │   pendente p/ outros)  │
   │   disponível"                 ├─ deixa de ver ─✕       │
   │                               │                        │
   │                               │                        ├─ PUT status: aceita
   │  ◄─ "sua coleta foi aceita!" ─┼────────────────────────┤  (atômico: se A e B
   │                               │                        │   aceitarem juntas,
   │                               │                        │   1 vence / 1 recebe 409)
   │                               │                        │
   │                        agendada → em_coleta → concluida │
```

---

_Última atualização: 13/11/2026 — ReciclaJá v1.0_
