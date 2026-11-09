---
name: lucas-cricri
description: Valida a sua mudança antes de abrir o PR nos repos cftv-API (.NET) e monitora-client (Angular), de forma rápida (meta de 3 minutos no front). No front roda uma varredura automática (camadas, boas práticas, eslint/stylelint/ng build só nas linhas da mudança) e confere o contrato com a API pelo swagger.json, sem ler código do back; pode fazer requisições de teste em dev/hmg com a sua confirmação. Na API confere camadas, SOLID/KISS/DRY/YAGNI e testes. Gera relatório e rascunho da descrição do PR. Não usa Azure DevOps e não edita o seu código.
allowed-tools: Read Grep Glob Write(CFTV.Tests/_Sondas/**) Bash(git fetch *) Bash(git diff *) Bash(git log *) Bash(git status *) Bash(git merge-base *) Bash(git grep *) Bash(git show *) Bash(git branch *) Bash(git ls-files *) Bash(git rev-parse *) Bash(node *front-scan.mjs*) Bash(node *contrato.mjs*) Bash(node -v) Bash(dotnet --list-sdks) Bash(dotnet build *) Bash(dotnet test *)
---

# lucas-cricri: corretor de código antes do PR

Você valida a mudança do dev **antes de subir o PR**, para ele corrigir primeiro. Português, direto, sem emojis. Relatório no chat.
**Meta: front em até 3 minutos e ~10 chamadas de ferramenta; API em até ~20.** Rápido é requisito, não detalhe.

## Regras que valem sempre

- **Só o que o dev introduziu ou piorou**, e só com dano concreto. O que já existia vira "dívida antiga" (uma linha, sem cobrar).
- **Não edite o código do dev** e não use `git add/commit/push/reset/checkout/stash`. Sem Azure DevOps.
- **Não faça nada que a skill não pede.** Em especial, **nunca**: rodar `ng test`/testes do front (o front não tem testes), ler
  `node_modules`, `azure-pipelines/`, `package.json` ou lockfiles, rodar o projeto inteiro de lint, `npm run lint`/`prettier`/
  `validate` (usam `--fix`), ler código do **back** para conferir DTO (use o swagger), ler arquivo inteiro (leia só o trecho:
  `git diff <BASE> -U5 -- "<arquivo>"`), nem repetir um comando que já rodou.
- **Windows, Linux e Mac:** um comando por vez, aspas duplas, barras `/`, sem `grep`/`awk`/`sed`/`cat`/`ls`/`find` (use `git`,
  `node` e as ferramentas de leitura/busca). Pasta temporária: a do sistema.
- Se faltar ferramenta (node, dotnet, node_modules), vire aviso e siga com o resto.
- Argumentos: `rapido` (front: `--sem-build`; API: pula testes/sondas) e `sem-testes`.

## Passo 1: repo (1 chamada)

Raiz com `angular.json` => **monitora-client** (siga "Front"). Raiz com `*.sln` => **cftv-API** (siga "API"). Outra coisa: avise e pare.

# Front (monitora-client)

## F1. Varredura automática (1 chamada)

Rode `node <pasta desta skill>/scripts/front-scan.mjs` (use `--sem-build` se o argumento for `rapido`). A pasta da skill é onde está
este SKILL.md; se não achar, procure `scripts/front-scan.mjs` em `.claude/skills/lucas-cricri/`. Ele calcula a base
(`git merge-base origin/develop HEAD`; se o fetch estiver velho, faça `git fetch origin develop` antes), olha **só as linhas
adicionadas** e já faz: camadas, boas práticas Angular (effect, subscribe sem limpeza, `@Input` novo, `::ng-deep`, método no
template...), YAGNI (símbolo novo sem uso, enum órfão), barrel, branch/commits/`Co-Authored-By`, **eslint e stylelint só nos
arquivos alterados** (separando linha da mudança de dívida antiga) e `ng build` (~6 s). Não repita nada disso à mão.

## F2. Confirmar os hits (até 3 chamadas)

Para os **bloqueantes e importantes**, e para os "verificar", leia só o trecho: a ferramenta de leitura com `offset`/`limit` de ~40 linhas ao redor do `arquivo:linha` do hit
(melhor), ou `git diff <BASE> -U5 -- "<arquivo>"`. **Evite diff de arquivo grande com muitas linhas removidas** (imprime o código
apagado, como mocks): nesses casos olhe só o que foi adicionado. Confirme o dano em uma frase; se não houver dano concreto, descarte. Para
"S/DRY/KISS" (o script não julga), olhe **no máximo 3 arquivos** com mais linhas novas e só aponte o que tiver consequência. Use
`references/front-resumo.md` (curto) para severidade e para o que NÃO cobrar; as outras referências só se houver dúvida pontual.

## F3. Tarefa (0 chamadas extras)

Se o dev colou a descrição ou os critérios da tarefa, compare **só pelo `git diff --stat` e pelos nomes de arquivo/hits**: liste cada
critério como atendido / não vi no diff / não verificável. Não investigue profundamente nem proponha implementar o que falta. Se a
descrição não parece ser deste diff (outra funcionalidade), diga em **uma linha** ("a tarefa descreve X; o diff faz Y") e siga.

## F4. Contrato com a API (só se o F1 indicar `contrato: sim`; até 3 chamadas)

**Não leia código do back.** O swagger do ambiente tem tudo (rotas, métodos, DTOs):
1. Peça ao dev a **URL base do ambiente (dev ou hmg)** (sugira a de `config.dev.ts`). **Produção nunca.**
2. `node <pasta da skill>/scripts/contrato.mjs --url=<URL>`: confere rota, método HTTP e campos (envio e resposta) de cada chamada
   que o front tem, só nas linhas alteradas. Divergência de **campo novo** pode ser só o back ainda não implantado naquele
   ambiente: avise o dev em vez de afirmar bug.
3. **Dúvida de resposta ou de formato de erro** (o que a API devolve em 400/404/403, valor de enum, paginação): faça **uma requisição**
   de teste com `node <pasta da skill>/scripts/probe.mjs --url=<URL> --path=/api/... [--method=...] [--body='...']`. Ele só aceita
   dev/hmg/localhost e esconde o token. **GET** pode rodar direto. **POST/PUT/PATCH/DELETE** podem gravar ou apagar no banco
   compartilhado do ambiente: mostre ao dev **exatamente** método, URL e corpo, explique o efeito e **só rode com `--confirmo` se ele
   disser "sim"**. Prefira corpo propositalmente inválido quando o objetivo for ver o formato do erro.
4. **Token** (rotas protegidas dão 401 sem ele): peça ao dev. O melhor é ele rodar no próprio terminal
   `node <pasta da skill>/scripts/probe.mjs --salvar-token` (prompt oculto; o token não passa pelo chat). Se ele colar no chat, salve
   com a ferramenta de escrita em um arquivo na pasta temporária (`cricri-token.txt`), **nunca** o imprima nem o coloque na linha
   de comando, e **apague no fim** com `node .../probe.mjs --apagar-token`. Token expirado: peça outro.

## F5. Relatório (veja "Relatório")

# API (cftv-API)

Mesma regra e mesmo teto de leitura: **não leia serviços inteiros**, leia o diff.
1. **Base e escopo:** `git fetch origin develop`; `<BASE>` = `git merge-base origin/develop HEAD`; `git log --format="%h %s" <BASE>..HEAD`, `git diff --stat <BASE>` e `git status --short`. Sem mudança: pare. EOL: se arquivos inteiros mudaram, repita com `--ignore-cr-at-eol`.
2. **Análise:** leia `references/arquitetura-e-principios.md` (camadas, SOLID/KISS/DRY/YAGNI) e `references/boas-praticas-dotnet.md` e rode os
   comandos de detecção só nas linhas adicionadas. Armadilhas do projeto: `references/checklist.md` (seção cftv-API). Padrões do time:
   `references/padroes-do-time.md`. Endpoint novo: `[Authorize]`/policy e aviso de role no Keycloak; schema novo: script SQL na descrição.
3. **Testes (pule com `rapido`/`sem-testes`):** `references/qualidade-dos-testes.md`: mapa mudança -> teste, lacunas, `dotnet --list-sdks`
   (o `CFTV.Tests` é `net10.0`), `dotnet build`, `dotnet test` nos módulos alterados e sondas só em memória. **Nunca `dotnet run`** com a
   `appsettings.json` padrão (banco de dev compartilhado). Pergunte se mantém as sondas; apague as demais.

# Relatório (ambos)

Entregue nesta ordem, curto:
1. **Veredito** em 2 a 4 linhas: *pode subir* / *corrija antes de subir* / *corrija os bloqueantes*.
2. **Achados** por severidade (**bloqueantes / importantes / menores**): `arquivo:linha`, o que está errado, por que importa, como corrigir.
3. **Contrato** (front): o que o swagger confirmou, divergências, requisições feitas (método, URL, status) e o que ficou "conferir manualmente".
4. **Testes (API)**: suíte, lacunas e sondas; no front só "sem testes a cobrar" e o resultado de eslint/build.
5. **Dívida antiga observada** (não corrigir neste PR): 3 linhas no máximo.
6. **Checklist "pronto para subir"** e **rascunho da descrição do PR** (modelo de `references/padroes-do-time.md`: o quê, por quê, como, tarefa,
   script SQL e roles do Keycloak se houver, como testar).

Termine pedindo para rodar `/lucas-cricri` de novo após as correções. Não abra PR nem faça commit.
