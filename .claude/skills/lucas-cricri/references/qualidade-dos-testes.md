# Qualidade dos testes e execução (só cftv-API)

Serve para quem revisa um PR e para o dev que valida a própria mudança. **Só a API**: o `monitora-client` não tem testes a
cobrar (estratégia do time: integração/E2E, `projeto.md`); no front só se roda lint/`tsc`/build.

Convenção de `<BASE>` e `<ALVO>` e regras de shell (**Windows, Linux e Mac**: um comando por vez, aspas duplas, sem depender de
`grep`/`awk`/`sed`): ver `arquitetura-e-principios.md`, seções 1 e 2.

## 1. O que avaliar (análise estática)

1. **Mapa mudança -> teste.** Listar cada comportamento que mudou (`git diff <BASE> <ALVO>` em `CFTV.Application`,
   `CFTV.API`, `CFTV.Domain`, `CFTV.Infra`) e apontar o teste que o cobre. Sem teste = lacuna. Testes que só foram
   renomeados (ex.: troca de nome de campo) **não** contam como cobertura de comportamento novo.
2. **Casos do mundo real** para cada comportamento novo: nulo/vazio; registro inexistente; **inativo/soft-delete**
   (`Ativo = false`); duplicado; usuário sem permissão (403) ou que não é o dono; entrada inválida (400); não encontrado
   (404); chamada repetida (idempotência); lista vazia; datas de borda (hoje, passado, `Date` x `DateTime`).
3. **Mutantes que sobrevivem.** Raciocinar: "se eu remover/trocar isto, algum teste falha?" Candidatos: `Commit`/
   `SaveChangesAsync`/`UpdateAsync`, um filtro do `Where`, a ordenação, o conteúdo do retorno (`resultado.Value` nunca
   lido), um `if` de validação. Se nada falha, o teste só confere estado em memória ou só o caminho feliz.
4. **Mock que contradiz o comportamento real.** Exemplos do projeto: `GetById` mockado devolvendo `Ativo = false`, mas o
   repositório real aplica `HasQueryFilter(e => e.Ativo)` e devolveria `null` (o ramo testado nunca executa em produção);
   helper de mock que ignora o predicado (`ReturnsAsync(lista)` sem filtrar), escondendo erro de filtro; `Include` que o
   mock ignora. Conferir `BaseRepository`/`EntitiesConfiguration` antes de aceitar o cenário.
5. **TDD pelo histórico** (`git log <BASE>..<ALVO> --stat`): o teste veio antes ou junto da implementação? Commits de feature
   sem nenhum teste são sinal de teste escrito depois. É indício, não prova (pode ter sido TDD local e commit junto).
6. **Qualidade do teste**: nomes que dizem o comportamento; um motivo de falha por teste; asserts no resultado e nos
   efeitos (chamadas ao repositório/UoW), não só em `IsError`.

## 2. Como executar

Passo a passo. Qualquer falha de ambiente vira aviso no relatório ("não executado: motivo"), nunca interrompe a análise
estática.

1. **SDK**: `dotnet --list-sdks`. `CFTV.Api` é `net8.0` e `CFTV.Tests` é `net10.0`: é preciso o SDK .NET 10 (que também compila o
   `net8.0`). Sem ele, não executar e registrar "suíte não executada: falta SDK .NET 10".
2. **Build e suíte**: `dotnet build CFTV.sln` e `dotnet test CFTV.Tests`. Primeiro os módulos alterados
   (`--filter "FullyQualifiedName~<Modulo>"`), depois a suíte inteira. Registrar: passou/falhou, quantos, e os nomes dos que
   falharam (com a mensagem curta).
3. **Sondas** (testes descartáveis) para os casos do item 1.2 que a suíte não cobre. Cada sonda tem um objetivo claro
   ("programação cancelada deve devolver 404"), roda e responde: falhou = achado (bug ou lacuna), passou = sugestão de teste
   permanente.

### Onde escrever as sondas

- **Contrato HTTP, autorização, validação, mapeamento de erro** (400/403/404): sondas com `ApiWebApplicationFactory`
  (`CFTV.Tests/Support/ApiWebApplicationFactory.cs`: `WebApplicationFactory<Program>`, ambiente `Testing`, `TestAuthHandler`,
  `CreateClientWith<TService>(mock)`) em `CFTV.Tests/_Sondas/`. A pasta **não é versionada**: não commitar e apagar ao final
  (salvo se o dev pedir para manter como teste real; nesse caso mover para a pasta do módulo e seguir o padrão dos testes).
- **Comportamento de EF** (query filters, `Include`, defaults, relacionamentos): projeto temporário **fora do repo**
  (pasta temporária do sistema operacional; pegue o caminho pela ferramenta de arquivos e não fixe `/tmp`) referenciando `CFTV.Infra`/`CFTV.Application`/`CFTV.Domain`, com
  `Microsoft.EntityFrameworkCore.InMemory`, criando `ApplicationDbContext` por `DbContextOptions`. **Não alterar os `csproj`
  do repo.** Limitações do InMemory a declarar no relatório: não valida FK/constraints/tipos de coluna nem SQL real, e as
  configurações com `HasColumnType`/`HasDefaultValueSql` de SQL Server não são exercitadas (SQLite tende a falhar por isso).
- Reaproveitar `TestMapperFactory` e os builders de `CFTV.Tests/Builders`.

### Regras de segurança (obrigatórias)

- **Nunca** `dotnet run` com o `appsettings.json` padrão: ele aponta para o **Azure SQL de dev compartilhado** e para o
  Keycloak de hmg. Rodar a API de verdade significaria escrever em banco compartilhado.
- "Rodar a API" = em memória, via `WebApplicationFactory` (serviços mockados) ou EF InMemory. API real só com
  `ConnectionStrings__DefaultConnection` apontando para banco **local** e com confirmação explícita do usuário.
- Nunca apontar sonda ou teste para dev/hmg/prod. Não imprimir nem copiar segredos de `appsettings` para o relatório.
- Sondas só escrevem em `CFTV.Tests/_Sondas/` ou na pasta temporária do sistema; não editar código de produção nem testes existentes.

## 3. Como relatar

- **Suíte**: passou / falhou (quais) / não executada (motivo).
- **Cobertura da mudança**: tabela "comportamento -> teste que cobre" (ou "sem teste").
- **Lacunas**: o que faltou testar, em ordem de risco.
- **Sondas**: cada uma com objetivo, resultado e o que fazer (corrigir o código, ou adicionar teste permanente).
- **Mocks enganosos** e **mutantes que sobrevivem**, com o trecho/arquivo.
- **TDD**: observação curta pelo histórico, marcada como indício.
