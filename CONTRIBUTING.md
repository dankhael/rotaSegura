# Como contribuir no rotaSegura

Fluxo curto para o time (4 pessoas). Se algo aqui atrapalhar mais do que ajudar, abra uma issue e a gente ajusta.

## Regra de ouro

`master` é protegida. Ninguém faz push direto. Toda mudança entra por **Pull Request com pelo menos 1 aprovação** e CI verde.

## 1. Criar branch

A partir de `master` atualizada:

```bash
git checkout master
git pull --ff-only
git checkout -b feat/nome-curto-da-feature
```

Convenção de nome:

- `feat/...` — nova funcionalidade
- `fix/...` — correção de bug
- `chore/...` — build, deps, configs
- `docs/...` — documentação
- `refactor/...` — refatoração sem mudança de comportamento

## 2. Commits

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(rota): adiciona cálculo de rota segura por horário
fix(auth): corrige redirect após logout
chore(deps): bump next para 16.0.2
```

Um commit = uma ideia. Se um commit precisa de "e", provavelmente são dois commits.

## 3. Abrir a Pull Request

```bash
git push -u origin feat/nome-curto-da-feature
gh pr create --base master --fill
```

Ou pelo site do GitHub. O template é preenchido automaticamente — responda todas as seções.

A PR vai:

1. Disparar a CI (`lint + typecheck + test + build`).
2. Pedir review de todo mundo do `CODEOWNERS` (menos você).
3. Receber um comentário com a URL de **preview do Vercel** quando a CI passar.

## 4. Review

**Como autor:**

- Mantenha PRs pequenas — alvo: < 400 linhas alteradas. PRs grandes demoram para revisar e acumulam conflito.
- Responda a cada comentário (👍, "feito no commit X", ou contraponto).
- Se a CI quebrar, conserte antes de pedir review de novo.

**Como revisor:**

- Aprove se: o código segue o [CLAUDE.md](./CLAUDE.md), os testes cobrem o caso novo, e o preview do Vercel funciona.
- Use **Request changes** para bloquear (precisa de mudança antes do merge).
- Use **Comment** para sugestões opcionais.
- Não aprove a própria PR. Não aprove sem abrir o preview.

## 5. Merge

Só é possível quando:

- ✅ 1 aprovação de um CODEOWNER
- ✅ CI verde (`lint + typecheck + test + build`)
- ✅ Branch atualizada com `master`
- ✅ Todas as conversas resolvidas

Use **Squash and merge** por padrão (histórico de `master` fica linear). O título do squash deve seguir Conventional Commits — ele vai virar a mensagem do commit em `master`.

Após o merge, delete a branch (o GitHub oferece o botão).

## 6. Depois do merge

- Push em `master` dispara deploy de **produção** automaticamente via [.github/workflows/deploy.yml](.github/workflows/deploy.yml).
- Se algo quebrar em produção, faça **revert pela UI do GitHub** (cria uma PR de revert). Não force-push em `master`.

## Setup local

```bash
npm ci
cp .env.example .env   # se existir; senão peça as vars no chat do time
npx prisma migrate dev
npm run dev
```

Antes de abrir PR, rode o que a CI roda:

```bash
npm run lint && npm run typecheck && npm run test && npm run build
```
