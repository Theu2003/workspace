# 🤝 Guia de Contribuição — ReciclaJá

Obrigado por querer contribuir! Este documento orienta como participar do desenvolvimento.

---

## 📋 Sumário

- [Código de Conduta](#-código-de-conduta)
- [Como Contribuir](#-como-contribuir)
- [Ambiente de Desenvolvimento](#-ambiente-de-desenvolvimento)
- [Padrões de Código](#-padrões-de-código)
- [Commits e PRs](#-commits-e-prs)
- [Testes](#-testes)
- [Reportar Bugs](#-reportar-bugs)
- [Sugerir Funcionalidades](#-sugerir-funcionalidades)

---

## 📜 Código de Conduta

Este projeto segue o [Contributor Covenant](https://www.contributor-covenant.org/pt-BR/version/2/1/code_of_conduct/). Ao participar, você concorda em manter um ambiente respeitoso e inclusivo.

---

## 🛠️ Como Contribuir

### 1. Fork e Clone
```bash
git clone https://github.com/SEU_USUARIO/workspace.git
cd workspace
```

### 2. Crie uma Branch
```bash
git checkout -b feature/nome-da-feature
# ou
git checkout -b fix/nome-do-bug
# ou
git checkout -b docs/melhoria-documentacao
```

### 3. Desenvolva
- Faça alterações focadas e pequenas
- Teste localmente (veja [Ambiente de Desenvolvimento](#-ambiente-de-desenvolvimento))
- Rode os testes se existirem

### 4. Commit
```bash
git add .
git commit -m "feat: descrição curta da mudança"
# Use Conventional Commits (veja abaixo)
```

### 5. Push e Pull Request
```bash
git push origin feature/nome-da-feature
# Abra PR no GitHub com descrição clara
```

---

## 💻 Ambiente de Desenvolvimento

### Pré-requisitos
- Node.js ≥ 18
- npm ≥ 9
- Git

### Setup
```bash
# Backend
cd workspace/server
cp .env.example .env
# Edite .env com valores de desenvolvimento
npm install
npm run dev

# Frontend (outro terminal)
cd workspace/client
npm install
npm run dev
```

### HTTPS para GPS (opcional)
```bash
cd workspace/client
mkdir -p certs
openssl req -x509 -newkey rsa:2048 -nodes -keyout certs/key.pem -out certs/cert.pem -days 365 -subj "/CN=localhost"
USE_HTTPS=1 npm run dev
```

---

## 🎨 Padrões de Código

### Backend (Node.js/Express)

```js
// Estrutura de rota padrão
import { Router } from 'express';
import { authMiddleware, requireRole } from '../auth.js';
import db from '../db.js';

const router = Router();
router.use(authMiddleware);
router.use(requireRole('user')); // ou 'company', 'admin'

router.get('/', async (req, res) => {
  try {
    // validação
    // lógica
    // resposta
  } catch (err) {
    console.error('Erro em GET /rota:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;
```

**Regras:**
- Use `async/await` para operações assíncronas
- Valide entrada cedo (retorne 400 com mensagem clara)
- Use `try/catch` em todas as rotas async
- Log de erros com `console.error` (contexto + erro)
- Respostas de erro padronizadas: `{ error: 'mensagem' }`
- Middlewares de auth/role **sempre** no topo do router

### Frontend (React)

```jsx
// Componente funcional com hooks
import { useState, useEffect } from 'react';
import { api } from '../api';
import { useAuth } from '../auth';

export default function MeuComponente() {
  const { token } = useAuth();
  const [dados, setDados] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    async function carregar() {
      try {
        setCarregando(true);
        const res = await api('/minha-rota');
        setDados(res);
      } catch (e) {
        setErro(e.message);
      } finally {
        setCarregando(false);
      }
    }
    if (token) carregar();
  }, [token]);

  if (carregando) return <div className="flex items-center justify-center h-32">Carregando...</div>;
  if (erro) return <div className="text-red-600 p-4">{erro}</div>;

  return <div>{/* JSX */}</div>;
}
```

**Regras:**
- Componentes funcionais + hooks
- Nomes em PascalCase (`MeuComponente`)
- Arquivos em PascalCase (`MeuComponente.js`)
- Use `className` do Tailwind para estilos
- Trate loading, erro e empty states
- Imports: React primeiro, depois libs, depois locais
- `api.js` para todas as chamadas HTTP (já inclui JWT + erro 401)

### Estilo (Tailwind CSS 4)
- Use utilitários Tailwind direto no `className`
- Evite CSS customizado; use `tailwind.config.js` se precisar de tokens
- Mobile-first: `md:`, `lg:`, `xl:` para breakpoints
- Cores do projeto: `green-600` (primária), `green-50` (fundo), `red-600` (erro/perigo)

### Banco de Dados (SQLite via sql.js)
- Schema em `server/src/db.js` (CREATE TABLE comentado)
- Migrações: `ALTER TABLE` idempotentes no final do `db.js`
- Use `parseMaterials()` de `helpers.js` para JSON de materiais
- `rejected_by` em collections é JSON array de company_ids

---

## 📝 Commits e PRs

### Conventional Commits

```
<tipo>(<escopo>): <descrição curta>

[corpo opcional]

[rodapé opcional]
```

**Tipos:**
| Tipo | Uso |
|------|-----|
| `feat` | Nova funcionalidade |
| `fix` | Correção de bug |
| `docs` | Documentação |
| `refactor` | Refatoração (sem mudança de comportamento) |
| `test` | Testes |
| `chore` | Manutenção (deps, configs, build) |
| `perf` | Performance |
| `style` | Formatação (sem lógica) |

**Exemplos:**
```bash
git commit -m "feat(collections): adiciona filtro por distância no dashboard empresa"
git commit -m "fix(auth): corrige validação de CNPJ com máscara"
git commit -m "docs: atualiza README com instruções de HTTPS local"
git commit -m "refactor(db): extrai helpers de notificação para módulo separado"
git commit -m "test: adiciona teste de race condition no aceite de coleta"
```

### Pull Request Template

Ao abrir PR, inclua:

```markdown
## Descrição
Breve resumo do que muda e por quê.

## Tipo de Mudança
- [ ] Bug fix
- [ ] Nova feature
- [ ] Breaking change
- [ ] Docs
- [ ] Refactor

## Testes
- [ ] Testes manuais passam
- [ ] `node test-funcional.mjs` passa (backend)
- [ ] Build frontend `npm run build` passa

## Checklist
- [ ] Código segue padrões do projeto
- [ ] Variáveis de ambiente documentadas (se novas)
- [ ] Migrações de banco idempotentes (se schema muda)
- [ ] Documentação atualizada (README, texto-API, CHANGELOG)
```

---

## 🧪 Testes

### Backend
```bash
cd workspace/server
node test-funcional.mjs
```
> Precisa do server rodando em `localhost:3001` e `.env` com admin válido.

### Frontend
```bash
cd workspace/client
npm run build  # Verifica erros de build/TypeScript
```

### Limpeza de Dados de Teste
```bash
cd workspace/server
# Server DEVE estar PARADO
node varredura.mjs
```

---

## 🐛 Reportar Bugs

Use [GitHub Issues](https://github.com/SEU_REPO/issues/new?template=bug_report.md) com:

1. **Título claro**: `[Bug] Descrição curta`
2. **Passos para reproduzir**: Lista numerada
3. **Comportamento esperado**
4. **Comportamento real**
5. **Screenshots/logs** (se aplicável)
6. **Ambiente**: OS, Node version, browser
7. **Contexto adicional**

---

## 💡 Sugerir Funcionalidades

Use [GitHub Issues](https://github.com/SEU_REPO/issues/new?template=feature_request.md) com:

1. **Problema**: Qual dor resolve?
2. **Solução proposta**: Como imagina funcionando?
3. **Alternativas consideradas**
4. **Contexto adicional**: Mockups, referências, etc.

---

## 🏷️ Labels Sugeridas para Issues/PRs

| Label | Cor | Uso |
|-------|-----|-----|
| `bug` | 🔴 Vermelho | Algo não funciona |
| `enhancement` | 🔵 Azul | Nova funcionalidade |
| `documentation` | 🟣 Roxo | Docs |
| `good first issue` | 🟢 Verde | Fácil para iniciantes |
| `help wanted` | 🟠 Laranja | Precisa de ajuda |
| `breaking change` | ⚫ Preto | Mudança que quebra API |
| `security` | 🔴 Vermelho | Vulnerabilidade |
| `backend` | 🔵 Azul | Server/Express |
| `frontend` | 🔵 Azul | Client/React |
| `database` | 🟤 Marrom | Schema/SQLite |

---

## 📞 Dúvidas?

- Abra uma [Issue](https://github.com/SEU_REPO/issues/new) com label `question`
- Consulte [README.md](README.md) e [texto-API.md](texto-API.md)
- Veja [DOCS.md](DOCS.md) para índice rápido

---

> **Obrigado por contribuir!** 🎉  
> Cada PR, issue ou sugestão melhora o projeto para todos.