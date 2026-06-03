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

# 6. (Opcional) Crie o admin inicial. Lê SEED_ADMIN_EMAIL/SEED_ADMIN_PASSWORD do .env.
npm run db:seed

# 7. Rode o app em modo dev
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
| `npm run db:seed`    | Cria/atualiza o admin a partir de `SEED_ADMIN_*` no `.env`     |
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

| Variável              | Obrigatória | Default       | Descrição                                                             |
| --------------------- | ----------- | ------------- | --------------------------------------------------------------------- |
| `DATABASE_URL`        | sim         | —             | URL Postgres com extensão PostGIS habilitada                          |
| `NODE_ENV`            | não         | `development` | `development`, `test`, `production`                                   |
| `JWT_SECRET`          | sim         | —             | Segredo HS256 do JWT (≥ 32 chars). Gere com `openssl rand -base64 32` |
| `JWT_EXPIRES_IN`      | não         | `1h`          | Tempo de vida do token (aceita formato vercel/ms)                     |
| `SEED_ADMIN_EMAIL`    | não         | —             | E-mail do admin criado por `npm run db:seed`                          |
| `SEED_ADMIN_PASSWORD` | não         | —             | Senha do admin do seed (será hasheada com bcrypt antes de gravar)     |
| `CLUSTER_RADIUS_M`    | não         | `200`         | Raio (m) usado para agrupar relatos próximos (US06)                   |
| `CLUSTER_WINDOW_MIN`  | não         | `120`         | Janela temporal (min) para considerar relatos no mesmo cluster        |
| `CLUSTER_THRESHOLD`   | não         | `3`           | Número de `deviceId`s distintos para elevar a ocorrência              |

A validação roda no boot via `src/lib/env.ts` (Zod) — falha rápido se algo estiver faltando. No Vercel, alterar as vars `CLUSTER_*` no dashboard não exige novo build (Functions releem na próxima inicialização da instância).

## Regras de agrupamento de relatos (US06)

O domínio separa duas entidades:

- **Report** (`/api/reports`): evento bruto enviado por um usuário/dispositivo. Cada POST cria um relato e dispara a lógica de agrupamento.
- **Occurrence** (`/api/occurrences`): agregado consolidado de relatos próximos. Estado **derivado** — não há POST/PATCH público; é mantido automaticamente.

### Como funciona o agrupamento

Ao receber um `POST /api/reports`, dentro de uma transação:

1. Procura uma `Occurrence` candidata: mesmo `type`, status `PENDING`/`CONFIRMED`, com `centroid` dentro de `CLUSTER_RADIUS_M` do ponto do relato e `lastReportedAt` dentro da janela `CLUSTER_WINDOW_MIN`. Empate: a mais próxima.
2. Se **não houver candidata**, cria uma nova `Occurrence` com status `PENDING` e `centroid = ponto do relato`.
3. Se **houver candidata**, associa o relato a ela e recalcula contadores e centróide.
4. Se a ocorrência está `PENDING` e `uniqueDeviceCount >= CLUSTER_THRESHOLD`, eleva para `CONFIRMED` (`confirmedAt` é populado).

### Idempotência (`deviceId`)

O cliente pode enviar um `deviceId` (UUID gerado e persistido no `localStorage`) no body do POST. Um índice único parcial em `(occurrenceId, deviceId)` garante que **o mesmo deviceId não conta duas vezes** numa mesma ocorrência:

- Primeiro POST com aquele deviceId → cria o relato (201).
- POSTs subsequentes com o mesmo deviceId na mesma ocorrência → retorna 200 com o `report` original e `clustering.duplicateDevice: true`. Contadores não mudam.

Relatos **sem `deviceId`** são aceitos e contam em `reportCount`, mas **não** em `uniqueDeviceCount` (não desbloqueiam o threshold sozinhos — evita spam anônimo).

### Centróide

`centroidLatitude/Longitude` é a média aritmética das coordenadas dos relatos da ocorrência, recalculada a cada novo relato. Para clusters pequenos (≤ poucos km), o centróide aritmético é equivalente ao geodésico.

### Race conditions

- `pg_advisory_xact_lock` por bucket (`type` + lat/lon arredondado a 0,001°) serializa criações simultâneas na mesma vizinhança, evitando ocorrências gêmeas.
- `SELECT ... FOR UPDATE` no candidato serializa updates concorrentes na mesma ocorrência.

### Exemplos `curl`

```bash
DEV1=$(uuidgen); DEV2=$(uuidgen); DEV3=$(uuidgen)

# 3 reports distintos no mesmo lugar → CONFIRMED no 3º
for D in $DEV1 $DEV2 $DEV3; do
  curl -s localhost:3000/api/reports -H 'Content-Type: application/json' \
    -d "{\"type\":\"FLOOD\",\"latitude\":-8.0578,\"longitude\":-34.8827,\"deviceId\":\"$D\"}"
done

# Idempotência: repetir DEV1 → 200, mesmo report.id, duplicateDevice=true
curl -s localhost:3000/api/reports -H 'Content-Type: application/json' \
  -d "{\"type\":\"FLOOD\",\"latitude\":-8.0578,\"longitude\":-34.8827,\"deviceId\":\"$DEV1\"}"

# Listar ocorrências confirmadas
curl -s 'localhost:3000/api/occurrences?status=CONFIRMED'

# Rastreabilidade: relatos consolidados em uma ocorrência
OCC=$(curl -s localhost:3000/api/occurrences | jq -r '.data[0].id')
curl -s "localhost:3000/api/occurrences/$OCC/reports"
```

## API: Autenticação

### `POST /api/auth/login`

Autentica um administrador previamente provisionado e emite um JWT (HS256, expiração padrão de 1h) em um **cookie `httpOnly`**.

**Request:**

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "admin@rotasegura.local",
  "password": "ChangeMe!123"
}
```

**Response 200:**

Define o cookie `httpOnly` `token` (via `Set-Cookie`) e devolve no corpo apenas os dados públicos do usuário — o token **não** trafega no JSON:

```http
HTTP/1.1 200 OK
Set-Cookie: token=eyJhbGciOiJIUzI1NiIs...; Path=/; HttpOnly; SameSite=Lax
Content-Type: application/json
```

```json
{
  "user": { "id": "ck...", "email": "admin@rotasegura.local", "role": "ADMIN" }
}
```

O cookie `token` (nome exportado como `AUTH_COOKIE` em [`src/lib/auth/jwt.ts`](src/lib/auth/jwt.ts)) carrega o JWT com as claims `sub` (id do usuário), `email`, `role`, `iat` e `exp`. Como é `httpOnly`, não é acessível por JavaScript (mitiga roubo por XSS); em produção também recebe a flag `Secure`. Verifique-o nas rotas protegidas com `verifyAuthToken`.

**Erros:**

| Status | Quando                                                                          |
| ------ | ------------------------------------------------------------------------------- |
| 400    | Payload inválido (campo faltando, email malformado, JSON inválido)              |
| 401    | E-mail inexistente **ou** senha incorreta (mensagem genérica em ambos os casos) |
| 403    | `role !== "ADMIN"` (mensagem genérica, não diferencia de credenciais inválidas) |
| 429    | Mais de 5 tentativas no mesmo IP em 1 minuto (cabeçalho `Retry-After` enviado)  |

**Provisionar o admin:** `npm run db:seed` lê `SEED_ADMIN_EMAIL` e `SEED_ADMIN_PASSWORD` do `.env`, hasheia a senha com bcrypt (custo 12) e faz `upsert`.

### Telas e proteção de rotas

- `/login` — formulário de login (email + senha com `<label>`, validação client-side de campos vazios e feedback de erro/sucesso). No sucesso, redireciona para `/admin`.
- `/admin` — painel administrativo com abas **Dashboard** e **Gestão de Locais** (placeholders para sprints futuras).
- **Proteção:** [`src/middleware.ts`](src/middleware.ts) intercepta `/admin/:path*` e, sem o cookie `token` de um usuário `ADMIN` válido, redireciona para `/login`. A verificação do JWT usa `jose` (compatível com edge).

> ⚠️ O rate limiter atual é **in-memory** (Map no processo). Funciona em dev e em deploys single-instance, mas não compartilha estado entre lambdas serverless. Para Vercel/multi-instância, migrar para Upstash Redis (`@upstash/ratelimit`).

**Follow-ups conhecidos (não bloqueiam a US02):**

- Rate limit hoje só pega IP. Um atacante com botnet/proxies residenciais pode brute-forçar um e-mail específico sem bater o limite. Adicionar bucket `login-email:${email}` com janela maior quando entrar mais carga.
- Token é entregue em cookie `httpOnly` + `SameSite=Lax` (+ `Secure` em prod). Ainda **sem CSRF token** — com `SameSite=Lax` o risco em POST cross-site é baixo, mas avaliar um token CSRF quando o painel admin expuser formulários de mutação. O cookie hoje é de sessão (sem `Max-Age`); o JWT expira em 1h de qualquer forma.
- `bcryptjs` é puro-JS (~250ms/hash custo 12). Como o handler força `runtime = "nodejs"`, daria pra usar `bcrypt` nativo (~50ms). Pra login admin a latência não importa; o JS puro simplifica deploy. Avaliar troca se a auth virar gargalo.
- `getClientIp` assume proxy confiável (Vercel/Cloudflare) reescrevendo `x-vercel-forwarded-for`/`x-forwarded-for`. Sem proxy, o header é forjável e o rate limit por IP perde garantia.

## Próximas sprints

- **Sprint 1:** Modelagem completa de `SupportPoint`, seeds, endpoint de busca por raio (PostGIS `ST_DWithin`)
- **Sprint 2:** UI do mapa com `react-leaflet`, marker clustering, rota até o ponto mais próximo
- **Sprint 3:** Autenticação (NextAuth ou similar), envio de localização do usuário, alertas em tempo real
