// Testes de rota (integração) contra um servidor real, com banco isolado.
// Cobrem a regressão do login: a rota /api/auth/login chegou a derrubar o
// processo inteiro por causa de uma chamada com argumento faltando.
import assert from 'node:assert/strict';
import test from 'node:test';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const serverRoot = path.dirname(fileURLToPath(import.meta.url));

const ADMIN_EMAIL = 'admin@teste.local';
const ADMIN_PASSWORD = 'senha-admin-123';

function freePort() {
  return new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.once('error', reject);
    probe.listen(0, '127.0.0.1', () => {
      const { port } = probe.address();
      probe.close(() => resolve(port));
    });
  });
}

async function waitForServer({ port, child, getStderr }) {
  for (let attempt = 0; attempt < 150; attempt++) {
    if (child.exitCode !== null) {
      throw new Error(`servidor encerrou durante a inicialização:\n${getStderr()}`);
    }
    try {
      const res = await fetch(`http://127.0.0.1:${port}/api/health`);
      if (res.ok) return;
    } catch {
      // ainda subindo
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`servidor não respondeu a tempo:\n${getStderr()}`);
}

async function startServer() {
  const port = await freePort();
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pardela-test-'));

  const child = spawn(process.execPath, ['src/index.js'], {
    cwd: serverRoot,
    env: {
      ...process.env,
      PORT: String(port),
      DATA_DIR: dataDir,
      JWT_SECRET: 'segredo-de-teste-local',
      ADMIN_EMAIL,
      ADMIN_PASSWORD,
      ADMIN_NAME: 'Admin Teste'
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  let stderr = '';
  child.stderr.on('data', (chunk) => {
    stderr += chunk.toString();
  });

  const context = { child, port, dataDir, getStderr: () => stderr };
  await waitForServer(context);
  return context;
}

function stopServer({ child, dataDir }) {
  child.kill();
  fs.rmSync(dataDir, { recursive: true, force: true });
}

async function api(port, method, route, { token, body } = {}) {
  const res = await fetch(`http://127.0.0.1:${port}/api${route}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(10000)
  });
  const text = await res.text();
  let data = null;
  try {
    data = JSON.parse(text);
  } catch {
    data = null;
  }
  return { status: res.status, data };
}

async function healthIs(port) {
  const res = await fetch(`http://127.0.0.1:${port}/api/health`, { signal: AbortSignal.timeout(5000) });
  return res.status;
}

test('rotas de autenticação respondem sem derrubar o servidor', async (t) => {
  const server = await startServer();
  t.after(() => stopServer(server));
  const { port } = server;

  const health = await api(port, 'GET', '/health');
  assert.equal(health.status, 200);
  assert.deepEqual(health.data, { status: 'ok' });

  await t.test('login do admin com credenciais corretas devolve token', async () => {
    const login = await api(port, 'POST', '/auth/login', {
      body: { identifier: ADMIN_EMAIL, password: ADMIN_PASSWORD }
    });
    assert.equal(login.status, 200);
    assert.equal(login.data.role, 'admin');
    assert.ok(login.data.token);
    assert.equal(login.data.user.city, null);
  });

  await t.test('senha errada devolve 401 e mantém o servidor no ar', async () => {
    const login = await api(port, 'POST', '/auth/login', {
      body: { identifier: ADMIN_EMAIL, password: 'senha-errada' }
    });
    assert.equal(login.status, 401);
    assert.equal(login.data.error, 'E-mail ou senha incorretos');

    assert.equal(await healthIs(port), 200);
    assert.equal(server.child.exitCode, null);
  });

  await t.test('identificador inexistente devolve 401', async () => {
    const login = await api(port, 'POST', '/auth/login', {
      body: { identifier: 'ninguem@teste.local', password: 'qualquer' }
    });
    assert.equal(login.status, 401);
  });

  await t.test('cadastro e login de empresa funcionam', async () => {
    const stamp = String(Date.now()).slice(-9);
    const email = `empresa.${stamp}@teste.local`;
    const registration = await api(port, 'POST', '/auth/register/company', {
      body: {
        name: 'Empresa Teste',
        cnpj: stamp.padStart(14, '4'),
        responsible: 'Responsável Teste',
        email,
        phone: '1133334444',
        password: 'senha123',
        cep: '01310930',
        state: 'SP',
        city: 'São Paulo',
        neighborhood: 'Consolação',
        street: 'Rua da Consolação',
        number: '3000',
        materials: ['Plástico']
      }
    });
    assert.equal(registration.status, 201);
    assert.ok(registration.data.token);

    const login = await api(port, 'POST', '/auth/login', {
      body: { identifier: email, password: 'senha123', as: 'company' }
    });
    assert.equal(login.status, 200);
    assert.equal(login.data.role, 'company');
    assert.equal(login.data.company.is_approved, 0);
  });

  await t.test('requisição sem token e rota inexistente são rejeitadas', async () => {
    const noAuth = await api(port, 'GET', '/users/me');
    assert.equal(noAuth.status, 401);

    const missing = await api(port, 'GET', '/rota-que-nao-existe');
    assert.equal(missing.status, 404);
    assert.equal(missing.data.error, 'Rota não encontrada');
  });
});
