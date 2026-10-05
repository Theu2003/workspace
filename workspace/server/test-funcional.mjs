// Teste funcional end-to-end da API ReciclaJá
// Exercita: health, cadastro, login, perfil, endereços, coletas,
// aprovação de empresa (admin), fluxo de status, chat, notificações, admin.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = 'http://localhost:3001/api';

// Lê credenciais do admin direto do .env (sem imprimir no output)
const envText = fs.readFileSync(path.join(__dirname, '.env'), 'utf8');
const envGet = (k) => envText.match(new RegExp(`^${k}=(.*)$`, 'm'))?.[1]?.trim();

let pass = 0, fail = 0;
const failures = [];

function check(name, cond, extra = '') {
  if (cond) {
    pass++;
    console.log(`  ✅ ${name}`);
  } else {
    fail++;
    failures.push(name + (extra ? ` — ${extra}` : ''));
    console.log(`  ❌ ${name}${extra ? ` — ${extra}` : ''}`);
  }
}

async function req(method, p, { token, body } = {}) {
  const res = await fetch(BASE + p, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: body !== undefined ? JSON.stringify(body) : undefined
  });
  let data = null;
  try { data = await res.json(); } catch { /* sem corpo */ }
  return { status: res.status, data };
}

const stamp = Date.now();
const CPF = ('' + stamp).slice(-11);
const CNPJ = ('' + stamp) + '0';
const EMAIL_U = `teste.user.${stamp}@exemplo.com`;
const EMAIL_C = `teste.empresa.${stamp}@exemplo.com`;
const CITY = 'São Paulo';
const DATE = new Date(Date.now() + 3 * 864e5).toISOString().slice(0, 10);

async function main() {
  console.log('\n════════ 1. Infraestrutura ════════');
  {
    const h = await req('GET', '/health');
    check('GET /api/health → 200 {status:ok}', h.status === 200 && h.data?.status === 'ok');

    const m = await req('GET', '/auth/materials');
    check('GET /api/auth/materials → lista de materiais', m.status === 200 && Array.isArray(m.data?.materials) && m.data.materials.length >= 8, `status=${m.status}`);

    const s = await req('GET', '/stats');
    check('GET /api/stats → estatísticas públicas', s.status === 200 && typeof s.data === 'object', `status=${s.status}`);
  }

  console.log('\n════════ 2. Autenticação / validações ════════');
  {
    const bad = await req('POST', '/auth/login', { body: { email: 'naoexiste@x.com', password: 'errada' } });
    check('Login com credenciais inválidas → 401', bad.status === 401, `status=${bad.status}`);

    const noAuth = await req('GET', '/users/me');
    check('Acesso sem token → 401', noAuth.status === 401, `status=${noAuth.status}`);
  }

  console.log('\n════════ 3. Cadastro e perfil do usuário ════════');
  let userToken, userId;
  {
    const reg = await req('POST', '/auth/register/user', {
      body: {
        name: 'Usuário Teste', cpf: CPF, email: EMAIL_U, phone: '11999990000', password: 'senha123',
        cep: '01310-100', state: 'SP', city: CITY, neighborhood: 'Bela Vista', street: 'Av. Paulista', number: '1000'
      }
    });
    check('Cadastro de usuário → 201 + token', reg.status === 201 && !!reg.data?.token, `status=${reg.status} erro=${reg.data?.error}`);
    userToken = reg.data?.token;
    userId = reg.data?.user?.id;

    const dup = await req('POST', '/auth/register/user', {
      body: {
        name: 'Outro', cpf: CPF, email: EMAIL_U, phone: '1', password: 'senha123',
        cep: '1', state: 'SP', city: CITY, neighborhood: 'b', street: 'c', number: '1'
      }
    });
    check('Cadastro duplicado (CPF/e-mail) → 409', dup.status === 409, `status=${dup.status}`);

    const login = await req('POST', '/auth/login', { body: { email: EMAIL_U, password: 'senha123' } });
    check('Login do usuário → 200 role=user', login.status === 200 && login.data?.role === 'user', `status=${login.status}`);
    check('Login retorna cidade do endereço padrão', login.data?.user?.city === CITY, `city=${login.data?.user?.city}`);

    const me = await req('GET', '/users/me', { token: userToken });
    check('GET /users/me → perfil + endereço criado', me.status === 200 && me.data?.addresses?.length >= 1, `status=${me.status}`);
    const addrId = me.data?.addresses?.[0]?.id;

    const upd = await req('PUT', '/users/me', { token: userToken, body: { name: 'Usuário Teste Editado', phone: '11888887777' } });
    check('PUT /users/me → perfil atualizado', upd.status === 200, `status=${upd.status}`);

    const addr2 = await req('POST', '/users/addresses', {
      token: userToken,
      body: { label: 'Trabalho', cep: '01310930', state: 'SP', city: CITY, neighborhood: 'Consolação', street: 'Rua da Consolação', number: '2000' }
    });
    check('POST /users/addresses → novo endereço', addr2.status === 201 && !!addr2.data?.id, `status=${addr2.status}`);

    const def = await req('POST', `/users/addresses/${addr2.data.id}/default`, { token: userToken });
    check('Definir endereço padrão → 200', def.status === 200, `status=${def.status}`);

    const edit = await req('PUT', `/users/addresses/${addr2.data.id}`, {
      token: userToken,
      body: { label: 'Trabalho 2', cep: '01310930', state: 'SP', city: CITY, neighborhood: 'Consolação', street: 'Rua da Consolação', number: '2100', complement: 'Sala 5' }
    });
    check('Editar endereço → 200', edit.status === 200, `status=${edit.status}`);

    const del = await req('DELETE', `/users/addresses/${addr2.data.id}`, { token: userToken });
    check('Remover endereço → 200', del.status === 200, `status=${del.status}`);

    // volta endereço principal como padrão para agendar coleta
    await req('POST', `/users/addresses/${addrId}/default`, { token: userToken });
    globalThis.__addrId = addrId;
  }

  console.log('\n════════ 4. Agendamento de coleta (usuário) ════════');
  let collectionId, rejectColId;
  {
    const inv = await req('POST', '/collections', { token: userToken, body: { addressId: globalThis.__addrId, materials: [], date: DATE, period: 'manhã' } });
    check('Coleta sem materiais → 400', inv.status === 400, `status=${inv.status}`);

    const ok = await req('POST', '/collections', {
      token: userToken,
      body: {
        addressId: globalThis.__addrId,
        materials: [{ type: 'Plástico', quantity: 3 }, { type: 'Papel', quantity: 2 }],
        date: DATE, period: 'manhã', observations: 'Teste automatizado — portão azul'
      }
    });
    check('Agendar coleta → 201', ok.status === 201 && !!ok.data?.collection?.id, `status=${ok.status} erro=${ok.data?.error}`);
    collectionId = ok.data?.collection?.id;
    check('Coleta criada com status "pendente"', ok.data?.collection?.status === 'pendente', `status=${ok.data?.collection?.status}`);

    const mine = await req('GET', '/collections/mine', { token: userToken });
    check('GET /collections/mine lista a coleta', mine.status === 200 && mine.data?.collections?.some((c) => c.id === collectionId), `status=${mine.status}`);

    const dash = await req('GET', '/collections/user-dashboard', { token: userToken });
    check('GET /collections/user-dashboard → 200', dash.status === 200, `status=${dash.status}`);

    const second = await req('POST', '/collections', {
      token: userToken,
      body: { addressId: globalThis.__addrId, materials: [{ type: 'Metal', quantity: 1 }], date: DATE, period: 'tarde' }
    });
    rejectColId = second.data?.collection?.id;
    check('Segunda coleta criada (para teste de recusa)', second.status === 201, `status=${second.status}`);
  }

  console.log('\n════════ 5. Cadastro de empresa (pendente) ════════');
  let companyToken, companyId;
  {
    const reg = await req('POST', '/auth/register/company', {
      body: {
        name: 'Empresa Teste Verde', cnpj: CNPJ, responsible: 'Responsável Teste', email: EMAIL_C,
        phone: '1133334444', password: 'senha123',
        cep: '01310930', state: 'SP', city: CITY, neighborhood: 'Consolação', street: 'Rua da Consolação', number: '3000',
        materials: ['Plástico', 'Metal']
      }
    });
    check('Cadastro de empresa → 201 + token', reg.status === 201 && reg.data?.role === 'company', `status=${reg.status} erro=${reg.data?.error}`);
    companyToken = reg.data?.token;

    const login = await req('POST', '/auth/login', { body: { email: EMAIL_C, password: 'senha123', as: 'company' } });
    check('Login da empresa → 200 (is_approved=false)', login.status === 200 && login.data?.company?.is_approved === 0, `status=${login.status}`);

    const blocked = await req('GET', '/collections', { token: companyToken });
    check('Empresa não aprovada listando coletas → 403', blocked.status === 403, `status=${blocked.status}`);
  }

  console.log('\n════════ 6. Painel admin: aprovação e gestão ════════');
  let adminToken;
  {
    const login = await req('POST', '/auth/login', { body: { email: envGet('ADMIN_EMAIL'), password: envGet('ADMIN_PASSWORD') } });
    check('Login do admin → 200 role=admin', login.status === 200 && login.data?.role === 'admin', `status=${login.status} erro=${login.data?.error}`);
    adminToken = login.data?.token;

    const forbidden = await req('GET', '/admin/companies', { token: userToken });
    check('Usuário comum acessando /admin → 403', forbidden.status === 403, `status=${forbidden.status}`);

    const list = await req('GET', '/admin/companies', { token: adminToken });
    const found = list.data?.companies?.find((c) => c.email === EMAIL_C);
    check('GET /admin/companies → empresa pendente aparece', list.status === 200 && !!found, `status=${list.status}`);
    companyId = found?.id;

    const pending = await req('GET', '/admin/companies/pending', { token: adminToken });
    check('GET /admin/companies/pending inclui a empresa', pending.status === 200 && pending.data?.companies?.some((c) => c.email === EMAIL_C), `status=${pending.status}`);

    const appr = await req('POST', `/admin/companies/${companyId}/approve`, { token: adminToken });
    check('Aprovar empresa → 200', appr.status === 200, `status=${appr.status} erro=${appr.data?.error}`);

    const stats = await req('GET', '/admin/stats', { token: adminToken });
    check('GET /admin/stats → 200', stats.status === 200, `status=${stats.status}`);

    const users = await req('GET', '/admin/users', { token: adminToken });
    check('GET /admin/users → 200', users.status === 200 && Array.isArray(users.data?.users), `status=${users.status}`);

    const notifAdmin = await req('GET', '/notifications', { token: adminToken });
    check('Admin recebe notificação de nova empresa', notifAdmin.status === 200 && notifAdmin.data?.notifications?.some((n) => n.type === 'nova_empresa_pendente'), `status=${notifAdmin.status}`);
  }

  console.log('\n════════ 7. Fluxo completo da coleta (empresa) ════════');
  {
    const list = await req('GET', '/collections', { token: companyToken });
    check('Empresa aprovada lista coletas pendentes da cidade', list.status === 200 && list.data?.collections?.some((c) => c.id === collectionId), `status=${list.status} total=${list.data?.collections?.length}`);

    const dash = await req('GET', '/collections/dashboard', { token: companyToken });
    check('GET /collections/dashboard (empresa) → 200', dash.status === 200, `status=${dash.status}`);

    const filter = await req('GET', `/collections?date=${DATE}&material=Plástico`, { token: companyToken });
    check('Filtros de data/material funcionam', filter.status === 200 && filter.data?.collections?.some((c) => c.id === collectionId), `status=${filter.status}`);

    const reject = await req('PUT', `/collections/${rejectColId}/status`, { token: companyToken, body: { status: 'recusada' } });
    check('Empresa recusa coleta → 200', reject.status === 200, `status=${reject.status} erro=${reject.data?.error}`);

    const afterReject = await req('GET', '/collections', { token: companyToken });
    check('Coleta recusada some da lista da empresa', afterReject.status === 200 && !afterReject.data?.collections?.some((c) => c.id === rejectColId), `status=${afterReject.status}`);

    const accept = await req('PUT', `/collections/${collectionId}/status`, { token: companyToken, body: { status: 'aceita' } });
    check('Empresa aceita coleta → 200', accept.status === 200, `status=${accept.status} erro=${accept.data?.error}`);

    const sched = await req('PUT', `/collections/${collectionId}/status`, { token: companyToken, body: { status: 'agendada' } });
    check('Status → agendada', sched.status === 200, `status=${sched.status} erro=${sched.data?.error}`);

    const collecting = await req('PUT', `/collections/${collectionId}/status`, { token: companyToken, body: { status: 'em_coleta' } });
    check('Status → em_coleta', collecting.status === 200, `status=${collecting.status}`);

    const done = await req('PUT', `/collections/${collectionId}/status`, { token: companyToken, body: { status: 'concluida' } });
    check('Status → concluida', done.status === 200, `status=${done.status}`);

    const invalid = await req('PUT', `/collections/${collectionId}/status`, { token: companyToken, body: { status: 'agendada' } });
    check('Transição inválida (concluída→agendada) → 400', invalid.status === 400, `status=${invalid.status}`);
  }

  console.log('\n════════ 8. Chat da coleta (usuário ↔ empresa) ════════');
  {
    const send = await req('POST', `/collections/${collectionId}/messages`, { token: companyToken, body: { message: 'Olá! Passamos amanhã entre 9h e 11h.' } });
    check('Empresa envia mensagem na coleta', send.status === 200 || send.status === 201, `status=${send.status}`);

    const userView = await req('GET', `/collections/${collectionId}/messages`, { token: userToken });
    check('Usuário lê mensagens da coleta', userView.status === 200 && userView.data?.messages?.length >= 1, `status=${userView.status}`);

    const reply = await req('POST', `/collections/${collectionId}/messages`, { token: userToken, body: { message: 'Perfeito, obrigado!' } });
    check('Usuário responde na coleta', reply.status === 200 || reply.status === 201, `status=${reply.status}`);

    const empty = await req('POST', `/collections/${collectionId}/messages`, { token: userToken, body: { message: '   ' } });
    check('Mensagem vazia → 400', empty.status === 400, `status=${empty.status}`);
  }

  console.log('\n════════ 9. Notificações do usuário ════════');
  {
    const list = await req('GET', '/notifications', { token: userToken });
    const types = list.data?.notifications?.map((n) => n.type) || [];
    check('Usuário recebeu boas-vindas', list.status === 200 && types.includes('bem_vindo'), `status=${list.status}`);
    check('Usuário recebeu "coleta aceita"', types.includes('coleta_aceita'), `tipos=${types.join(',')}`);
    check('Usuário recebeu "coleta concluída"', types.includes('coleta_concluida'), '');
    check('Usuário foi avisado da recusa da outra coleta', types.includes('coleta_recusada_empresa'), '');

    const unread = await req('GET', '/notifications/unread-count', { token: userToken });
    check('Contador de não lidas > 0', unread.status === 200 && unread.data?.count > 0, `count=${unread.data?.count}`);

    const firstUnread = list.data.notifications.find((n) => n.is_read === 0);
    if (firstUnread) {
      const r = await req('PUT', `/notifications/${firstUnread.id}/read`, { token: userToken });
      check('Marcar notificação como lida → 200', r.status === 200, `status=${r.status}`);
    }
    const all = await req('PUT', '/notifications/read-all', { token: userToken });
    check('Marcar todas como lidas → 200', all.status === 200, `status=${all.status}`);

    const after = await req('GET', '/notifications/unread-count', { token: userToken });
    check('Contador zera após leitura', after.data?.count === 0, `count=${after.data?.count}`);
  }

  console.log('\n════════ 10. Mensagens diretas admin ↔ empresa ════════');
  {
    const send = await req('POST', '/messages', { token: adminToken, body: { receiverId: companyId, message: 'Bem-vinda à plataforma!' } });
    check('Admin envia mensagem para empresa', send.status === 200 || send.status === 201, `status=${send.status}`);

    const convAdmin = await req('GET', '/messages/conversations', { token: adminToken });
    check('Admin vê conversas', convAdmin.status === 200 && Array.isArray(convAdmin.data?.conversations), `status=${convAdmin.status}`);

    const thread = await req('GET', `/messages/company/${companyId}`, { token: adminToken });
    check('Admin lê histórico com a empresa', thread.status === 200 && thread.data?.messages?.length >= 1, `status=${thread.status} msgs=${thread.data?.messages?.length}`);

    const convCo = await req('GET', '/messages/conversations', { token: companyToken });
    check('Empresa vê conversa com admin', convCo.status === 200, `status=${convCo.status}`);

    const unread = await req('GET', '/messages/unread-count', { token: companyToken });
    check('Empresa tem mensagem não lida do admin', unread.status === 200 && unread.data?.count >= 1, `count=${unread.data?.count}`);
  }

  console.log('\n════════ 11. Perfil da empresa ════════');
  {
    const me = await req('GET', '/companies/me', { token: companyToken });
    check('GET /companies/me → dados da empresa', me.status === 200 && me.data?.company?.email === EMAIL_C, `status=${me.status}`);

    const upd = await req('PUT', '/companies/me', {
      token: companyToken,
      body: {
        name: 'Empresa Teste Verde Editada', responsible: 'Resp. Editado', phone: '1133334444',
        materials: ['Plástico', 'Vidro'],
        cep: '01310930', state: 'SP', city: CITY, neighborhood: 'Consolação', street: 'Rua da Consolação', number: '3000', complement: ''
      }
    });
    check('PUT /companies/me → perfil atualizado', upd.status === 200, `status=${upd.status}`);

    const listForUser = await req('GET', '/companies/list', { token: userToken });
    check('Usuário vê empresas aprovadas da sua cidade', listForUser.status === 200 && listForUser.data?.companies?.some((c) => c.name === 'Empresa Teste Verde Editada'), `status=${listForUser.status} total=${listForUser.data?.companies?.length}`);
  }

  console.log('\n════════ 12. Limpeza dos dados de teste ════════');
  {
    const delCo = await req('DELETE', '/companies/me', { token: companyToken });
    check('Empresa exclui a própria conta → 200', delCo.status === 200, `status=${delCo.status} erro=${delCo.data?.error}`);

    const loginDead = await req('POST', '/auth/login', { body: { email: EMAIL_C, password: 'senha123', as: 'company' } });
    check('Login da empresa excluída → 401', loginDead.status === 401, `status=${loginDead.status}`);

    const delUser = await req('DELETE', `/admin/users/${userId}`, { token: adminToken });
    check('Admin exclui usuário de teste', delUser.status === 200, `status=${delUser.status} erro=${delUser.data?.error}`);
  }

  console.log('\n────────────────────────────────────────');
  console.log(`RESULTADO: ${pass} passaram, ${fail} falharam`);
  if (failures.length) {
    console.log('\nFalhas:');
    failures.forEach((f) => console.log('  • ' + f));
  }
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error('ERRO FATAL no teste:', e.message);
  process.exit(1);
});
