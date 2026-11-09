# Padrões do time (branch, commit, PR)

Fonte: `PADROES.md` de cada repo (`cftv-API/PADROES.md`, `monitora-client/PADROES.md`) e `monitora-client/CLAUDE.md`.
Se o `PADROES.md` do repo atual estiver diferente deste resumo, **vale o do repo**.

## Branch

Formato `PREFIXO/TASK-NOME-DA-TAREFA` em kebab-case, com o id numérico da tarefa.
Prefixos: `feature`, `fix`, `hotfix`, `style`, `refactor`, `test`, `chore`, `docs`.
Exemplos: `feature/1234-cadastro-usuario`, `fix/91011-token-expirado-no-guard`.
Branches protegidas (sem esse formato): `main`, `develop`, `hmg`. Renomear: `git branch -m <novo-nome>`.

Como checar: rode `git branch --show-current` e confira se o nome casa com a regex
`^(feature|fix|hotfix|style|refactor|test|chore|docs)/[0-9]+-[a-z0-9-]+$` (a conferência é sua; não precisa de `grep`).

## Commit

Formato `PREFIXO: descrição` (descrição em **minúsculo**, sem ponto final, até ~72 caracteres no título, diz **o que** e não
**como**, **sem id de tarefa no título**).
Prefixos: `feat`, `fix`, `refactor`, `docs`, `style`, `test`, `chore`, `build`, `ci`, `perf`, `env`.
Incorreto: `feat: Adicionar Câmera` (maiúscula), `fix: corrigiu o bug.` (ponto final), `update: ...` (prefixo inválido),
`fixed login` (sem prefixo).

Como checar: rode `git log --format="%h %s" <BASE>..HEAD` e confira cada linha contra
`^(chore|feat|fix|refactor|docs|perf|style|test|build|ci|env): [^A-Z].*[^.]$` e o tamanho do título.
**monitora-client:** não pode haver trailer `Co-Authored-By`: rode `git log -i --grep="co-authored-by" --format="%h %s" <BASE>..HEAD`
(sem saída = ok).

## Pull request

- Título curto e objetivo. Um assunto por PR; PR pequeno.
- **cftv-API** (`PADROES.md`, "Modelo sugerido"): *O que foi feito*, *Por que*, *Como foi feito*, *Pull Requests relacionados*,
  *Desenvolvedores envolvidos*, *Tarefas relacionadas* (`#número`), evidências se necessário.
- **monitora-client** (`azure-pipelines/pull_request_template.md`): `## Descrição` (o que e por quê; motivação, restrição,
  decisão de design; não resumir o diff), `## Tipo de mudança`, `## Checklist`, `## Evidências` (screenshot/GIF antes e depois
  para UI), `## Testes`, `## Notas Adicionais`.
- Checklist do front (`PADROES.md`): `presentation/` não importa `infrastructure/`; barrel `index.ts` atualizado quando criou
  service/componente; sem `console.log`/`console.error`/`debugger`; dependência nova no `package.json` justificada;
  acessibilidade (`aria-label` em ícones, teclado, contraste 4.5:1); responsividade (mobile < 768px, tablet 768-1024px,
  desktop > 1024px).
- **Schema do banco é manual no cftv-API**: o script SQL (com default para linhas existentes) e a ordem de execução vão na
  **descrição do PR**.
- **Roles/policies novas do Keycloak**: avisar na descrição para criar a role em cada ambiente (dev, hmg, prod).
