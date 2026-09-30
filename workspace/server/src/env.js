// Titulo: env
// Autor: Mateus Martins Peres
// Finalidade: Modulo do backend responsavel por env.
import dotenv from 'dotenv';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverRoot = path.join(__dirname, '..');

const envPath = path.join(serverRoot, '.env');

if (fs.existsSync(envPath)) {

  dotenv.config({ path: envPath });
} else {

  console.warn('⚠️  Arquivo .env não encontrado em server/.env');
  console.warn('   Copie .env.example para .env e preencha os valores.');
}

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

export function optionalEnv(name, fallback) {
  const value = process.env[name];
  return value && value.trim() ? value.trim() : fallback;
}
