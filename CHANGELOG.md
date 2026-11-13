# 📝 Changelog — ReciclaJá

Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Semantic Versioning](https://semver.org/lang/pt-BR/).

---

## [1.0.0] - 2026-11-13

### ✨ Adicionado
- **Sistema completo de autenticação** com JWT (roles: user, company, admin)
- **Cadastro de usuários** com CPF, endereço (geocodificação automática via Nominatim)
- **Cadastro de empresas** com CNPJ, materiais coletados, fluxo de aprovação admin
- **Agendamento de coletas** com materiais, data, período, observações
- **Fluxo de status de coleta**: pendente → aceita → agendada → em_coleta → concluída
- **Recusa de coleta** mantém disponível para outras empresas (rejected_by)
- **Aceite atômico** previne race conditions (UPDATE WHERE company_id IS NULL)
- **Dashboard empresa**: estatísticas, peso coletado, clientes, coletas por data
- **Dashboard usuário**: totais, peso, próximas coletas
- **Chat por coleta** (usuário ↔ empresa) com notificações
- **Chat admin ↔ empresa** (mensagens diretas)
- **Sistema de notificações** (polling 15s, badge, sons)
- **Mapas interativos** com Leaflet (endereço, rota empresa→coleta, mapa fullscreen empresa)
- **Geocodificação** via Nominatim (endereço ↔ lat/lng, GPS reverso)
- **Rotas OSRM** para traçar rota de carro no mapa do usuário
- **Painel Admin**: aprovar/rejeitar empresas, listar usuários, estatísticas globais
- **Estatísticas públicas** (home): empresas, coletas concluídas, peso total
- **Teste funcional E2E** automatizado (`test-funcional.mjs`)
- **Script de limpeza** de dados de teste (`varredura.mjs`)
- **HTTPS local** para GPS em dispositivos móveis (certificados auto-assinados)
- **Proxy Vite** para desenvolvimento integrado (frontend ↔ backend)

### 🔧 Técnico
- Backend: Express 4 + sql.js (SQLite WASM) + bcryptjs + jsonwebtoken
- Frontend: React 18 + Vite 6 + Tailwind 4 + React Router 6 + Leaflet
- Banco: SQLite arquivo único (`server/data/ecopickup.sqlite`)
- Migrações ad-hoc via ALTER TABLE idempotentes no `db.js`
- Variáveis de ambiente via dotenv (`.env` não versionado)

---

## [Unreleased]

### Planejado
- [ ] Recuperação de senha (e-mail / token)
- [ ] Upload de fotos/comprovantes na coleta
- [ ] Avaliação empresa/usuário após coleta concluída
- [ ] PWA (service worker, manifest, offline)
- [ ] Testes automatizados (Vitest + Playwright)
- [ ] CI/CD (GitHub Actions)
- [ ] Docker Compose para deploy simplificado
- [ ] Internacionalização (i18n)
- [ ] Modo escuro/claro
- [ ] Filtros avançados no dashboard empresa
- [ ] Exportação de relatórios (PDF/CSV)
- [ ] Webhooks para integrações externas

---

## Legenda

- **✨ Adicionado** — Novas funcionalidades
- **🔧 Alterado** — Mudanças em funcionalidades existentes
- **🐛 Corrigido** — Correções de bugs
- **🗑️ Removido** — Funcionalidades removidas
- **🔒 Segurança** — Correções de vulnerabilidades
- **📦 Dependências** — Atualizações de dependências
- **📝 Documentação** — Mudanças na documentação