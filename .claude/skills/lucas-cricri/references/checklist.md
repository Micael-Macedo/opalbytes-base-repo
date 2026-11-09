# Checklist de análise

## Sempre
- A mudança cumpre o que a **tarefa** pede (na revisão de PR, o que está na task; para o dev, o que ele descreveu)? Falta
  algo? Tem algo fora do escopo? (Mudança com 3 assuntos → sugerir dividir.)
- Contrato entre repos: se mudou endpoint/DTO/payload do SignalR na API, o front (`monitora-client`) ainda funciona?
  Se mudou o front, a API aceita o que ele envia? **Conferir pelo `swagger.json` do ambiente (dev/hmg)**: a skill `lucas-cricri`
  tem `scripts/contrato.mjs --url=<ambiente>`, que compara rota, método e campos sem ler o código do back (já aconteceu de o front
  mandar filtros ou campos que a API ignorava silenciosamente). Só ler o controller se o swagger não bastar (ex.: regra de negócio).
- Mudança que quebra consumidor (campo renomeado/removido, formato de resposta, significado de enum) → avisar.
- Testes (**só cftv-API**; o front não tem testes e não se cobra teste nele): seguir `qualidade-dos-testes.md`. O que mudou
  de comportamento tem teste? Os testes existentes estão fixando comportamento errado?
- Segurança: endpoint novo tem `[Authorize]`/policy? Quem pode chamar? Dá para um usuário agir em nome de outro?
- Dado mockado: se foi combinado ignorar mocks (a API ainda não existe), não apontar mock.
- Esse ponto já foi apontado antes (PR anterior ou rodada anterior) e voltou? Registrar que persiste.
- Boas práticas da stack: `boas-praticas-dotnet.md` (cftv-API: async, DI/ciclo de vida, config, log, erros) ou
  `boas-praticas-angular.md` (monitora-client: signals/effect, RxJS, entradas, template, build). Só o que a mudança introduz.
- Camadas (Clean Architecture) e princípios (SOLID, KISS, DRY, YAGNI): seguir `arquitetura-e-principios.md`
  (etapa 1.3b). Só o que a mudança introduz ou piora, e só com dano concreto.

## cftv-API (.NET / EF Core / Keycloak / SignalR)
Armadilhas conhecidas deste código (confirmadas lendo o repo):
- `BaseEntity.Ativo` **nasce `true`** — não apontar "falta Ativo = true".
- DI: `IBaseService<,,>` → `BaseService<,,>` **genérico** (não o service derivado). Overrides em `XxxService` **não rodam**
  quando o controller usa `baseService`. Por isso controllers chamam o service específico.
- `GenericController`: métodos herdados são `virtual` e **sem atributo de rota**. O padrão do projeto é marcar os que não
  se usam com `[NonAction] public override ... => base.X(...)`. Usar `new` em vez de `override` deixa o da base exposto
  em `POST api/<controller>` sem `[Authorize]` (sem fallback policy em produção; só nas factories de teste).
- `GetByPredicate(predicate, bool? ignoreQueryFilter, includes...)`: o `true` é **IgnoreQueryFilters** → traz registros
  `Ativo = false` (soft-deleted), inclusive nos `Include`.
- Query filter `HasQueryFilter(e => e.Ativo)` em várias entidades (Posto, ProgramacaoPosto, ProgramacaoData, Programacao...).
- Schema é **manual**: não há `Migrations/` nem `.sql` no repo; o script vem na **descrição do PR** ou na **descrição da
  task** (conferir os dois ANTES de dizer que falta — na task 19077 o `ALTER TABLE` estava na task, não no PR).
  Coluna nova sem script em nenhum dos dois → "Invalid column name" no deploy. Cobrar script (com default p/ linhas
  existentes) e ordem de execução; se estiver só na task, pedir para linkar/copiar na descrição do PR. Para o dev: o
  script de schema vai sempre na descrição do PR.
- Roles/policies novas: o `KeycloakConfiguration` só tem as policies listadas. Policy usada e não registrada → 500
  (`AuthorizationPolicy named 'X' was not found`). **Sempre avisar para criar a role no Keycloak de cada ambiente**
  ("atenção ao criar as roles"). O aviso é obrigatório sempre que aparecer policy/role nova.
- Datas: misturar `DateTime.Now` e `DateTime.UtcNow` na mesma tabela é recorrente; padronizar.
- Tamanhos de coluna no EF (`HasMaxLength`) sem validação no DTO → erro 500 por truncamento.
- Enums com `JsonStringEnumConverter` aceitam número fora da faixa → validar `Enum.IsDefined`.
- Paginação/filtro em memória (`GetByPredicate` + `.ToList()` + `Skip/Take`) → não escala; mover para o banco.
- N+1 em loop de `GetByPredicate`.
- Resposta de erro: tudo vira `BadRequest`; `NotFound` deveria ser 404 (mapear `ErrorType`).
- `VerifyAcessInPost` (BaseService) não trata posto nulo → NRE; roda 3 queries por posto.
- Mapper: `AutoMapperHelper` — campo novo no DTO de resultado sem `Include` da navegação sai `null`.
- Testes: pasta `CFTV.Tests/` (xUnit + Moq + FluentAssertions; `ApiWebApplicationFactory` para testes de endpoint). Ver
  `qualidade-dos-testes.md`.

## monitora-client (Angular + signals; sem testes a cobrar)
- `data-table`: se a tabela recebe só `columns`/`items`, falta paginação/loading/`pageChange`.
- Requisições sem `switchMap` → respostas fora de ordem ao trocar aba/página.
- `catchError` sem feedback ao usuário (usar `AlertService`).
- Chamada de método no template (rodando a cada change detection) → pré-calcular.
- Parâmetros enviados que a API **não** aceita (conferir no `swagger.json`, não no código do back).
- Estado entre telas via cookie (`path: "/"` vai em toda requisição) → preferir router state/query param/service.
- `any` onde já existe tipo; imports relativos fora do alias (`@shared`, `@domain`, `@application`, `@infrastructure`).
- Fronteiras entre camadas (domain/shared/presentation importando o que não deve): ver `arquitetura-e-principios.md`.
- Mistura de idiomas e PascalCase em campo privado (padrão do time: escolher um idioma, camelCase).
- Enum mudou de valor/nome → `grep` por outros usos (usar `git grep` no clone; a busca do Azure DevOps costuma falhar).
- Datas sem ano, campo de data diferente entre telas.
