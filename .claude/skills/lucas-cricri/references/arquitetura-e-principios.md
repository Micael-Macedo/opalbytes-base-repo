# Arquitetura em camadas e princípios (SOLID, KISS, DRY, YAGNI)

Serve para os dois repos e para quem revisa um PR ou valida a própria mudança antes de subir.
Fontes da regra: `cftv-API/README.md` (seção Arquitetura), `monitora-client/CLAUDE.md` (seção Arquitetura),
`monitora-client/PADROES.md` (checklist de PR).

## 1. Como aplicar (regras do Lucas)

**Convenção dos comandos.** `<BASE>` = ponto de comparação; `<ALVO>` = versão com as mudanças.
- Revisão de PR: `<BASE>` = `lastMergeTargetCommit` do PR; `<ALVO>` = `FETCH_HEAD`.
- Dev antes de subir: `<BASE>` = `git merge-base origin/develop HEAD`; `<ALVO>` = working tree. Nesse caso use `git diff <BASE>`
  (sem o segundo ref), `git grep ... -- '<glob>'` sem `<ALVO>` (acrescente `--untracked` para arquivos novos) e leia o
  arquivo direto no lugar de `git show <ALVO>:<arquivo>`.

- **Só o que a mudança introduz ou piora.** Comparar sempre contra a `<BASE>`, não contra o `develop` local (costuma
  estar defasado). Violação que já existe na base **não** vira achado a corrigir: anotar no relatório final como
  "dívida antiga observada".
- **Só com dano concreto.** Só apontar quando der para dizer a consequência: bug provável, regra duplicada que já
  divergiu, código sem uso, teste que fica impossível, acoplamento que trava deploy/troca. Se não souber dizer o dano,
  não aponta.
- **Evidência antes de afirmar.** Confirmar com `git grep`/`git diff` (comandos abaixo). Se for inferência, dizer
  ("pelo que entendi", "vale conferir"). Se estiver errado, retirar.
- **Tom de conversa, não de aula** (a redação final segue o tom da skill que estiver usando). Explicar o efeito primeiro; citar o princípio só se ajudar ("isso mistura duas
  responsabilidades..."). Nunca abrir o achado com "Viola o SRP". Perguntar quando puder haver motivo.
- **Um achado por assunto.** Vários pontos pequenos de DRY/YAGNI viram um único item em lista.
- Dívida antiga que a mudança deixou **pior** conta como "piora" e entra como achado.

## 2. Detecção: só linhas que a mudança adicionou

`<BASE>` e `<ALVO>` conforme a Convenção da seção 1.

**Compatível com Windows, Linux e Mac.** Rode **um comando por vez** (sem `&&`, `;`, `$(...)` nem `VAR=valor`), com
**aspas duplas** nos globs e padrões (valem em bash, zsh, fish, PowerShell e cmd), e use barras `/` nos caminhos. **Não dependa de
`grep`, `awk`, `sed`, `cat`, `ls` ou `find`**: no Windows nativo eles não existem. Para filtrar, use `git diff`/`git grep` e a
ferramenta de busca/leitura do assistente (ou leia a saída e procure o padrão). Cole o sha direto no comando.
No pathspec do git o `*` já atravessa pastas; para excluir uma pasta use `":(exclude)<pasta>"`.

**Sempre comparar com a `<BASE>`, nunca com um commit anterior da própria mudança.** O diff incremental de um commit
novo pode mostrar como "novo" algo que já estava na base (aconteceu: import de `"@shared"` dentro de `shared`, que o
commit só reordenou). Antes de apontar, rodar `git diff <BASE> <ALVO> -- <arquivo>` e conferir que a linha é nova
**no resultado final**.

**Fim de linha (CRLF x LF).** Se `git diff --stat` mostrar arquivos inteiros alterados sem mudança real (comum entre Windows
e Mac), repita a comparação com `--ignore-cr-at-eol` e registre o problema como achado menor (normalizar com `.gitattributes`).

Nas tabelas abaixo, o `.` no lugar de aspas (`from .@shared.;`) evita aspas dentro do argumento do shell, e `\|` é a alternância `|` de regex estendida (a barra invertida só existe por causa do markdown):
**remover a `\` ao colar o padrão**.

```text
# 1) só a lista de arquivos da camada com linha adicionada/removida que casa com o padrão (regex estendida):
git diff <BASE> <ALVO> -G"<padrao>" --name-only -- "<pasta-da-camada>/*.<ext>"
#    (no dev: sem o <ALVO>). Depois, em cada arquivo, as linhas da mudança (as que começam com "+" são as adicionadas):
git diff <BASE> <ALVO> -U0 -- "<arquivo>"
#    Não combine --stat com -U0 (imprime o patch inteiro de todos os arquivos).
# 2) as linhas que casam no alvo e na base; o que aparece só no alvo é novo:
git grep -n -E "<padrao>" <ALVO> -- "<glob>"
git grep -n -E "<padrao>" <BASE> -- "<glob>"
# 3) contagem por arquivo na base e no alvo (para "piora"):
git grep -c -E "<padrao>" <BASE> -- "<glob>"
git grep -c -E "<padrao>" <ALVO> -- "<glob>"
# 4) símbolo novo sem uso (YAGNI): procurar o nome no repo inteiro
git grep -n "<simbolo>" <ALVO> -- "src/*.ts"      # ou "*.cs"
```

## 3. cftv-API — camadas

Dependências reais (`*.csproj`): `Domain` sem referências; `Application` -> `Domain`; `Infra` -> `Application` + `Domain`;
`Infra.IoC` -> `Application` + `Infra`; `API` -> `Application`, `Domain`, `Infra`, `Infra.IoC`.

| Camada | Pertence | Não pertence |
|---|---|---|
| `CFTV.Domain` | Entities, Enums, interfaces de repositório/UoW (`IBaseRepository`, `IUnitOfWork`), modelos puros | `using` de framework web/EF/SDK, DTO, regra que depende de infraestrutura |
| `CFTV.Application` | Services, DTOs, Interfaces, UseCases, validação e regra de caso de uso, `ErrorOr` | `DbContext`/EF, SDK externo direto, tipos de HTTP (`IActionResult`), SQL |
| `CFTV.Infra` | Repositories, DbContext, `EntitiesConfiguration`, integrações externas, implementação das interfaces | regra de negócio, decisão de fluxo |
| `CFTV.Infra.IoC` | Registro de DI | lógica |
| `CFTV.API` | Controllers (chamam o service e mapeiam `ErrorOr` -> HTTP), `[Authorize]`/policy, middleware, SignalR hub | repositório/`IUnitOfWork`/`DbContext`, regra de negócio, query, mapeamento de domínio |

Sinais de violação (rodar na base e no alvo; só interessa o que subiu):

| Sinal | Pasta/glob e padrão (regex estendida, para `-G`/`git grep -E`) | Em geral é dano porque |
|---|---|---|
| `Domain` com dependência de fora | `'CFTV.Domain/*.cs'`: `^using (Microsoft\|Azure\|Keycloak\|CFTV\.(Application\|Infra))` | inverte a regra de dependência |
| `csproj` novo `ProjectReference`/`PackageReference` | `git diff <BASE> <ALVO> -- "*.csproj"` | pode ligar `Domain`/`Application` à infraestrutura |
| Controller com repositório/UoW/DbContext | `'CFTV.API/Controllers/*.cs'`: `IUnitOfWork\|IBaseRepository\|DbContext\|GetRepository<` | regra fora do service, sem teste de service |
| Controller com regra ou `try/catch` | mesmo glob: `try *\{\|\.Where\(\|\.ToList\(` | lógica duplicada entre endpoints |
| `Application` com framework/SDK concreto | `'CFTV.Application/*.cs'`: `^using (Microsoft\.AspNetCore\|Microsoft\.EntityFrameworkCore\|CFTV\.Infra\|Azure\|Keycloak)\|WindowsAzure` | service amarrado a detalhe; difícil de testar/trocar |
| Novo `IHttpContextAccessor` na `Application` | `'CFTV.Application/*.cs'`: `IHttpContextAccessor` | já existem `NomeAuthUser`/`IdAuthUser` no `BaseService`; reaproveitar |
| Entidade exposta direto no controller | `'CFTV.API/Controllers/*.cs'`: `CFTV\.Domain\.Entities` | vaza modelo de banco; campo novo vira contrato sem querer |
| Regra de negócio em Repository/Configuration | ler os arquivos novos de `'CFTV.Infra/*.cs'` | regra espalhada, fora do alcance dos testes |
| DI fora do `Infra.IoC` | `git diff <BASE> <ALVO> -U0 -G"AddScoped\|AddTransient\|AddSingleton" -- ":(exclude)CFTV.Infra.IoC"` (antes, ver onde as outras registrações vivem) | composição espalhada |

## 4. monitora-client — camadas

Regra: `presentation -> application -> domain`; `infrastructure -> domain`. Padrão de 3 serviços:
Página -> `{Entidade}Service` (application, nomes em português) -> `{Entidade}Api extends BaseResourceService` (infrastructure).
O `PADROES.md` diz: `presentation/` nunca injeta/importa `infrastructure/http`.

| Camada | Pertence | Não pertence |
|---|---|---|
| `domain/` | interfaces/models, enums, constants (`ROUTES`, `Permission`) | importar de `@shared`/`@application`/`@infrastructure`/`@presentation`, Angular/HTTP |
| `application/` | services de caso de uso e orquestração | `HttpClient` direto, componente/template, UI específica |
| `infrastructure/` | `ApiService`, `config` (`ApiPath`, `BASE_PATHS`), interceptor, storage | regra de caso de uso |
| `presentation/` | páginas/componentes standalone, estado de tela | `HttpClient`, `@infrastructure/http`, regra de negócio, montagem de DTO |
| `shared/` | guards, componentes base, utils, interfaces | depender de `@application` (sinal de camada invertida) |

Sinais de violação (diff da mudança; `<glob>` com `*` já cobre subpastas):

| Sinal | Comando | Dano |
|---|---|---|
| `presentation` importando `infrastructure` | `'src/app/presentation/*.ts'`: `@infrastructure` | página conhece URL/HTTP; difícil mockar/trocar |
| `HttpClient` fora da infra | `'src/app/presentation/*.ts'` e `'src/app/shared/*.ts'`: `HttpClient` | idem |
| `domain` importando outra camada | `'src/app/domain/*.ts'`: `from .@(shared\|application\|infrastructure\|presentation)` | domínio deixa de ser independente |
| `shared` importando `@application` | `'src/app/shared/*.ts'`: `@application` | ciclo e acoplamento |
| Barrel da própria camada dentro dela | `'src/app/shared/*.ts'`: `from .@shared.;` (idem `@domain` em `domain`) | só é dano se formar ciclo. **Já é padrão no repo** (13 arquivos de `shared`, 6 de `domain`): comentar apenas **arquivo novo** que cause ciclo comprovado, nunca import existente reordenado |
| `application` importando `@presentation` | `'src/app/application/*.ts'`: `@presentation` | serviço dependendo de tela |
| Orquestração/regra dentro do componente | ler o `.ts`: várias chamadas encadeadas (`subscribe` dentro de `subscribe`), montagem de payload de API | regra sem teste, duplicável em outra tela |

Receita "entidade nova" (`CLAUDE.md`): 1) interface em `domain/models/`, 2) `ApiPath` em `app-endpoints.ts`, 3) path em
`BASE_PATHS`, 4) `ApiService` em `infrastructure/http/`, 5) `Service` em `application/services/` + export no `index.ts`,
6) página em `presentation/`, 7) rota com `data: { permissions: [...] }`. Conferir se a mudança pulou algum passo
(`git diff --name-status <BASE> <ALVO>`). Checar também: barrel `index.ts` atualizado e sem `console.log`/`debugger`
(`PADROES.md`).

## 5. SOLID, KISS, DRY, YAGNI neste código

Para cada um: sinal no diff, e quando **apontar** ou **não apontar**.

- **S (responsabilidade única).** Sinal: método/service/componente que valida + persiste + notifica + mapeia; componente
  que decide fluxo e dispara várias chamadas HTTP; service grande que cresce. Apontar se a mistura já impede teste ou
  repete lógica. Não apontar service grande antigo que a mudança não engordou.
- **O (aberto/fechado).** Sinal: `if/switch` por tipo/enum que ganha um ramo a cada feature (ex.: `TipoRepeticao`);
  union com type guards. Apontar só se a mudança acrescenta mais um ramo no mesmo ponto e há 3 ou mais.
- **L (substituição).** Sinal: `new` em vez de `override` no `GenericController` (expõe rota sem `[Authorize]`), override
  que muda o contrato ou lança `NotImplemented`. Apontar sempre que houver efeito de segurança/rota.
- **I (segregação de interface).** Sinal: interface gorda que obriga `[NonAction] ... => base.X` ou métodos sem uso
  (baseline do `IBaseService`). Só apontar se a mudança aumenta a interface/o número de overrides vazios.
- **D (inversão de dependência).** Sinal: `new` de dependência concreta, `Application` dependendo de SDK, página
  injetando `ApiService`. Apontar quando impede teste ou troca.
- **KISS.** Sinal: abstração/generics/flag/estratégia para um único uso; método com muitos ramos; código "esperto".
  Apontar com a alternativa mais simples; não apontar preferência de estilo.
- **DRY.** Sinal: mesma regra em mais de um lugar (ex.: validação de usuário/programação em `Add`, `Update` e
  `Associar*`), principalmente se **já divergiu** (um compara `Data.Date`, outro `Data`). Apontar a partir da 3ª ocorrência
  ou quando já divergiu. **Não** pedir para unificar duplicação acidental (parecem iguais, mas mudam por motivos
  diferentes).
- **YAGNI.** Sinal: método, endpoint, enum, `ApiPath`, campo ou parâmetro sem uso; generalização antes do 2º uso; "para o
  futuro". Confirmar com `git grep '<simbolo>' <ALVO>` no repo inteiro (incluindo specs e templates `.html`).
  Exemplos reais: `criarRelatoriosParaEscala` (cópia de Finalizar, sem chamador), `RELATORIO_MONITORAMENTO_ASSOCIAR_USUARIO`
  sem path, `PROGRAMACAO_MONITORAMENTO_MES` apontando para endpoint inexistente. Só apontar se for **novo** na mudança.

## 6. Decisão e severidade

| Situação | O que fazer |
|---|---|
| Violação nova/agravada **com dano concreto** | Achado a corrigir (revisão de PR: comentário ancorado) |
| Violação nova, dano só teórico | Citar só no relatório final; não cobrar correção |
| Violação que já existe na base | Só nota "dívida antiga observada" no relatório |
| Vários pontos pequenos (DRY/YAGNI) | Um item geral em lista |

Severidade: dependência de camada invertida/nova referência de projeto = **importante** (vira **bloqueante** se quebra
teste/deploy ou abre brecha de segurança, como `new` no `GenericController`); `Controller`/componente com regra de
negócio = **importante**; DRY divergente = **importante**; YAGNI, KISS e estilo de camada sem efeito = **menor**.

## 7. Frases-modelo (tom humanizado)

- Camada (back): "Aqui o controller chama o repositório direto e monta a regra. Como os services já são o lugar onde
  testamos isso, será que vale mover para o `XxxService` e deixar o controller só traduzindo o `ErrorOr`? Assim a regra
  fica coberta pelos testes de service."
- Camada (front): "Essa página importa `@infrastructure/http` direto. O padrão do projeto é passar pelo service de
  `application`, assim a tela não conhece URL nem HTTP e dá para mockar. Dá pra ajustar?"
- S: "O `iniciarMonitoramento` busca o usuário, associa, cria relatórios e navega, tudo dentro do componente. Se uma das
  etapas falhar no meio, fica difícil de recuperar e de testar. Que tal levar essa orquestração para um service de
  `application` e deixar o componente só reagir ao resultado?"
- DRY: "A validação de usuário ativo/programação aparece aqui e no `ValidarAssociacao`, e já divergiram (uma compara
  `Data.Date`, a outra `Data`). Vale extrair para um ponto só?"
- YAGNI: "Esse método não é chamado em lugar nenhum (conferi com `git grep`), e ainda chama o endpoint de finalizar. Vale
  remover até alguém precisar."

## 8. Baseline conhecido (snapshot 05/10/2026: reconferir com `git grep` antes de afirmar)

Não tratar como se fosse da mudança, só mencionar no relatório se aparecer nos arquivos tocados.

- cftv-API: `Application` usa `IHttpContextAccessor` em 12 arquivos e referencia pacotes Keycloak/Azure/
  `Microsoft.AspNetCore.Mvc` (ex.: `UserCase`, `SecretManager`, `BaseService`); services grandes (`StatusSistemaService`
  ~390 linhas, `UserService` ~360, `ProgramacaoService` ~350, `GravacaoService` ~310, `BaseService` ~310); overrides
  `[NonAction]` herdados do `GenericController`. Controllers **não** injetam repositório/UoW (manter assim).
- monitora-client: `domain/models/auth/token-payload.model.ts` importa `@shared`; várias páginas de `presentation`
  (perfil, status, monitoramento...) importam `@infrastructure`; `application` importa `@shared`/`@presentation`
  (alert, modal, widget, dialog services); 9 arquivos de `shared` importam `@application`; 13 de 141 arquivos de
  `shared` importam o próprio barrel `@shared` e 6 de `domain` importam `@domain`; não há regra de ESLint para
  fronteiras entre camadas.
