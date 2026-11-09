# lucas-cricri

Corretor de código para rodar **antes de abrir o PR**. Ele confere a sua mudança com os mesmos critérios do revisor, mostra o
que corrigir e já deixa um rascunho da descrição do PR. Assim o PR sobe limpo.

## O que ele confere

- **Camadas e Clean Architecture** (back e front) e **SOLID, KISS, DRY, YAGNI**, só no que **você** introduziu ou piorou e só
  quando há dano concreto. O que já existia vira "dívida antiga observada" (não precisa corrigir).
- **Padrões do time**: nome da branch, formato dos commits, tamanho e foco do PR.
- **Contrato entre API e front**, segurança (`[Authorize]`/policy, roles do Keycloak) e as armadilhas conhecidas de cada repo.
- **Só na API**: qualidade dos testes (cobrem a mudança de verdade? mocks enganosos? lacunas?), roda a suíte e escreve **sondas**
  descartáveis para os casos não cobertos. No front **não há testes a cobrar**: ele só verifica (nos arquivos que você alterou) com `eslint`, `stylelint` e `tsc`
  (**sem** `--fix`: ele nunca reescreve seus arquivos) e `ng build` (que pega erro de template; o `rapido` pula).
- **Boas práticas da stack**: na API (async, DI/ciclo de vida, configuração, log e erros) e no front (signals/`effect`, RxJS,
  entradas, template), em resumo curado de `dotnet-best-practices` e `angular-developer`, adaptado ao que o time já usa.

## Rápido de propósito

Meta: **front em até 3 minutos**. Em vez de ler código, a skill usa scripts (Node, o mesmo do front):
- `scripts/front-scan.mjs`: varre só as linhas que você mudou (camadas, boas práticas, símbolos sem uso, branch/commits), roda
  `eslint`/`stylelint` só nos seus arquivos e o `ng build`, separando o que é seu da dívida antiga (~6 s).
- `scripts/contrato.mjs --url=<dev ou hmg>`: compara os seus `models`/chamadas HTTP com o `swagger.json` da API. **Não lê o código do
  back** (~1,5 s).
- `scripts/probe.mjs`: uma requisição de teste quando há dúvida de resposta ou de erro. Só dev/hmg, e **POST/PUT/PATCH/DELETE só depois
  do seu "sim"**, porque podem gravar no banco do ambiente. O token fica em arquivo temporário e nunca é impresso. Para o token não
  passar pelo chat, rode no seu terminal `node scripts/probe.mjs --salvar-token` (a digitação fica oculta).

## O que ele **não** faz

- Não usa Azure DevOps (nada de token, PR ou task): você cola o que a tarefa pede, e ele só confere pelo diff.
- Não roda testes do front (não existem), não lê `node_modules` nem o código do back, e nunca faz requisição em produção.
- Não edita o seu código, não faz commit nem push, não abre PR.
- **Nunca roda a API do back localmente** com a `appsettings.json` padrão (aponta para o banco de dev compartilhado): as sondas da API rodam em memória. Requisições de teste só com o `probe.mjs` e a sua confirmação.

## Como usar

1. Faça suas alterações na branch da tarefa (pode estar commitado ou não).
2. Abra o **Claude Code** ou o **OpenCode** na raiz do repo (`cftv-API` ou `monitora-client`).
3. Rode:
   - `/lucas-cricri` (análise completa; na API roda a suíte e as sondas)
   - `/lucas-cricri rapido` (sem testes, sem sondas e sem `ng build`; só análise de código)
   - No OpenCode, se o comando não aparecer, peça: "use a skill lucas-cricri para validar minha mudança".
4. Leia o relatório: **bloqueantes**, **importantes** e **menores**, cada um com arquivo e linha, o dano e como corrigir.
5. Corrija e rode `/lucas-cricri` de novo até ficar *pode subir*. Use o rascunho da descrição ao abrir o PR.

## Windows, Linux e Mac

Funciona nos três. A skill só usa `git`, `dotnet` e `node`/`npx`, que existem nos três sistemas; ela **não** depende de `grep`,
`awk`, `sed` nem de outros utilitários Unix. No Windows:
- tenha o **Git for Windows** instalado (o Claude Code usa o Git Bash) e `dotnet`/`node` no `PATH`;
- o repo força **fim de linha LF** nos arquivos da skill (`.gitattributes`), então não há problema com CRLF.

## Requisitos

- `git` e acesso ao `origin` do repo (ele faz `git fetch origin develop`).
- `node` 18 ou mais novo (front: já exigido; API: só se for usar o `probe.mjs`).
- **cftv-API**: **SDK .NET 10** instalado (o projeto de testes é `net10.0`). Sem ele a suíte é marcada como "não executada" e o
  resto da análise segue normal.
- **monitora-client**: `node`/`npm` e `npm install` feito (para `eslint`, `stylelint`, `tsc` e `ng build`).
- Para conferir o contrato no front, é só ter acesso ao swagger do ambiente de dev/hmg (VPN, se for o caso). Não precisa do repo do back.

## Atualizar

A skill vive dentro do repo (`.claude/skills/lucas-cricri/`): um `git pull` na `develop` traz a versão nova.

## Limitações

- É um assistente: pode errar ou deixar passar algo. Ele marca o que foi **inferido e não testado**. A revisão humana continua.
- As sondas de EF usam banco em memória (não validam SQL real, constraints nem tipos de coluna).
