# Rota Segura

App de segurança em desastres que ajuda usuários a encontrar rotas e pontos de apoio (abrigos, atendimento médico, distribuição de suprimentos) durante emergências. Projeto desenvolvido por um time de 4 pessoas ao longo de 3 sprints, partindo deste esqueleto.

## Stack

- **Framework:** Next.js 16 (App Router) + TypeScript strict
- **Estilização:** Tailwind CSS v4 + shadcn/ui
- **Banco:** PostgreSQL 16 com extensão PostGIS (Docker local; Neon/Supabase em prod)
- **ORM:** Prisma 6 (com `Unsupported("geography")` para colunas PostGIS)
- **Mapa:** react-leaflet + leaflet (uso em sprints futuras)
- **Validação:** Zod
- **Testes:** Vitest + @testing-library/react + jsdom
- **Linting/format:** ESLint 9 (flat config) + Prettier 3
- **Git hooks:** Husky 9 + lint-staged + commitlint (Conventional Commits)
- **CI:** GitHub Actions
- **Deploy alvo:** Vercel (não configurado ainda)

## Pré-requisitos

- **Node.js** ≥ 20 (testado em 22)
- **npm** ≥ 10
- **Docker Desktop** (para Postgres+PostGIS local)
- **Git**

## Setup local

```bash
# 1. Clone e entre no diretório
git clone <repo-url> rota-segura
cd rota-segura

# 2. Copie e ajuste as variáveis de ambiente
cp .env.example .env.local
cp .env.example .env
# (.env.local e .env ficam gitignored; valores default já funcionam com o docker-compose)

# 3. Instale as dependências (também ativa os git hooks via husky)
npm install

# 4. Suba o Postgres+PostGIS local
npm run db:up

# 5. Aplique a migration inicial (cria extensões PostGIS + tabela SupportPoint)
npm run db:migrate

# 6. Rode o app em modo dev
npm run dev
```

A aplicação fica disponível em `http://localhost:3000`. Healthcheck em `http://localhost:3000/api/health`.

> **Nota sobre `.env`:** O Prisma lê `.env` (não `.env.local`). Para conveniência, mantemos os dois arquivos — Next consome `.env.local`, Prisma consome `.env`. Ambos estão gitignored; somente `.env.example` vai pro repo.

## Scripts disponíveis

| Script               | Descrição                                                      |
| -------------------- | -------------------------------------------------------------- |
| `npm run dev`        | Inicia o servidor Next em modo desenvolvimento                 |
| `npm run build`      | Build de produção                                              |
| `npm run start`      | Roda o build de produção                                       |
| `npm run lint`       | ESLint via Next                                                |
| `npm run typecheck`  | TypeScript em modo `--noEmit`                                  |
| `npm run test`       | Roda Vitest uma vez                                            |
| `npm run test:watch` | Vitest em modo watch                                           |
| `npm run format`     | Prettier em todo o projeto                                     |
| `npm run db:up`      | Sobe Postgres+PostGIS via docker compose                       |
| `npm run db:down`    | Derruba os containers (volume preservado)                      |
| `npm run db:migrate` | `prisma migrate dev` (gera + aplica migrations)                |
| `npm run db:reset`   | Reseta o banco (apaga dados, reaplica migrations) — **só dev** |
| `npm run db:studio`  | Abre Prisma Studio para inspecionar dados                      |

## Estrutura de pastas

```
.
├── .github/workflows/ci.yml     # pipeline GitHub Actions
├── .husky/                      # hooks git (pre-commit, commit-msg)
├── docker/docker-compose.yml    # Postgres 16 + PostGIS 3.4
├── prisma/
│   ├── schema.prisma            # SupportPoint + extensões PostGIS
│   └── migrations/              # versionadas no git
├── src/
│   ├── app/
│   │   ├── api/health/route.ts  # GET healthcheck (db + status)
│   │   ├── layout.tsx
│   │   ├── page.tsx             # placeholder com link pro mapa
│   │   └── globals.css          # Tailwind v4 + tokens shadcn
│   ├── components/ui/           # componentes shadcn (button já adicionado)
│   ├── lib/
│   │   ├── db.ts                # Prisma singleton
│   │   ├── env.ts               # validação de env vars com Zod
│   │   └── utils.ts             # cn() helper
│   └── types/
└── tests/
    ├── setup.ts
    └── api/health.test.ts
```

## Convenção de branches

- `master` — protegida, só recebe merge via PR após CI verde
- `feat/<scope>` — nova funcionalidade (ex: `feat/map-routes`)
- `fix/<scope>` — bugfix (ex: `fix/health-timeout`)
- `chore/<scope>` — infra, deps, configs (ex: `chore/upgrade-prisma`)
- `docs/<scope>` — apenas docs

## Convenção de commits — Conventional Commits

Validado automaticamente pelo `commitlint` no hook `commit-msg`. Formato:

```
<type>(<scope>): <subject>
```

`type` deve ser um de: `feat`, `fix`, `chore`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `revert`.

Exemplos:

```bash
git commit -m "feat(api): add nearby support points endpoint"
git commit -m "fix(map): clamp zoom level to leaflet bounds"
```

Para mudanças com breaking change, adicionar `!`:

```bash
git commit -m "feat(api)!: rename SupportPoint.type to category"
```

## Pull Requests

Antes de abrir o PR:

1. `git rebase master` na sua branch
2. Rode localmente: `npm run lint && npm run typecheck && npm run test && npm run build` — tudo verde
3. Push: `git push -u origin <sua-branch>`

Checklist mínimo do PR:

- [ ] Título segue Conventional Commits
- [ ] Descrição explica **o que** e **por quê**
- [ ] Inclui testes para novo comportamento (quando aplicável)
- [ ] CI passou
- [ ] Sem `console.log` ou TODOs órfãos no diff
- [ ] Migration nova foi committada (se mexeu no `schema.prisma`)
- [ ] README atualizado se mudou setup/scripts/env vars

## Variáveis de ambiente

Veja [.env.example](.env.example) para a lista canônica.

| Variável       | Obrigatória | Descrição                                     |
| -------------- | ----------- | --------------------------------------------- |
| `DATABASE_URL` | sim         | URL Postgres com extensão PostGIS habilitada  |
| `NODE_ENV`     | não         | `development` (default), `test`, `production` |

A validação roda no boot via `src/lib/env.ts` (Zod) — falha rápido se algo estiver faltando.

## Próximas sprints

- **Sprint 1:** Modelagem completa de `SupportPoint`, seeds, endpoint de busca por raio (PostGIS `ST_DWithin`)
- **Sprint 2:** UI do mapa com `react-leaflet`, marker clustering, rota até o ponto mais próximo
- **Sprint 3:** Autenticação (NextAuth ou similar), envio de localização do usuário, alertas em tempo real
