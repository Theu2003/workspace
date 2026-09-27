// ===================================================================
// env.js — Carregamento centralizado de variáveis de ambiente
// ===================================================================
// PROBLEMA QUE ESTE ARQUIVO RESOLVE:
//   Em módulos ES, os `import` são todos resolvidos ANTES de qualquer
//   linha de código do módulo de entrada rodar. Ou seja, se o index.js
//   chama dotenv.config() no meio do arquivo, os módulos importados
//   (db.js, auth.js, etc.) já foram avaliados SEM as variáveis do .env.
//
// SOLUÇÃO:
//   Este módulo carrega o .env IMEDIATAMENTE ao ser importado (efeito
//   colateral do import) e é o PRIMEIRO import de cada ponto de entrada
//   (index.js, db.js), garantindo que process.env esteja populado antes
//   de qualquer módulo ler variáveis de ambiente.
//
// Uso:
//   import './env.js';   // ← sempre como primeiro import do arquivo
//   import db from './db.js';
// ===================================================================

import dotenv from 'dotenv';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

// Localiza a raiz do servidor (pasta onde fica o package.json)
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverRoot = path.join(__dirname, '..');

// Procura o arquivo .env na raiz do servidor
const envPath = path.join(serverRoot, '.env');

if (fs.existsSync(envPath)) {
  // Carrega o .env do disco (não sobrescreve variáveis já definidas no sistema)
  dotenv.config({ path: envPath });
} else {
  // Em desenvolvimento, avisa mas não quebra (valores padrão serão usados)
  // Em produção (NODE_ENV=production), valida na função requireEnv abaixo
  console.warn('⚠️  Arquivo .env não encontrado em server/.env');
  console.warn('   Copie .env.example para .env e preencha os valores.');
}

/**
 * requireEnv() — Lê uma variável de ambiente OBRIGATÓRIA.
 * Se não estiver definida, encerra o processo com mensagem clara.
 *
 * Use para segredos que não podem ter valor padrão (JWT_SECRET, senha do admin).
 *
 * @param {string} name - Nome da variável (ex: 'JWT_SECRET')
 * @returns {string} Valor da variável
 */
export function requireEnv(name) {
  const value = process.env[name];
  if (!value || !value.trim()) {
    console.error(`\n❌ Variável de ambiente obrigatória não definida: ${name}`);
    console.error(`   Defina-a no arquivo server/.env (veja .env.example).`);
    console.error(`   Exemplo: ${name}=seu-valor-aqui\n`);
    process.exit(1);
  }
  return value.trim();
}

/**
 * optionalEnv() — Lê uma variável de ambiente opcional com valor padrão.
 *
 * @param {string} name - Nome da variável
 * @param {string} fallback - Valor padrão caso não esteja definida
 * @returns {string} Valor da variável ou o padrão
 */
export function optionalEnv(name, fallback) {
  const value = process.env[name];
  return value && value.trim() ? value.trim() : fallback;
}
