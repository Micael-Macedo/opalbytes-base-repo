# Boas práticas .NET/C# (só cftv-API)

Resumo curado do básico de `dotnet-best-practices` (github/awesome-copilot, MIT), **adaptado ao cftv-API**. Não é a skill inteira:
o que o projeto não usa ficou de fora (seção 3). Vale a regra de sempre: **só o que a mudança introduziu ou piorou**, **só com dano
concreto**. Convenção de `<BASE>`/`<ALVO>` e regras de shell (Windows, Linux, Mac): `arquitetura-e-principios.md`, seções 1 e 2.

## 1. Sinais, detecção e severidade

Detecção: `git diff <BASE> <ALVO> -G"<padrao>" --name-only -- "<glob>"` (no dev, sem o `<ALVO>`) e depois
`git diff <BASE> <ALVO> -U0 -- "<arquivo>"` para ver as linhas. Padrões em regex estendida (`\|` na tabela = `|`; tirar a barra).

| Tema | Sinal | Padrão | Dano | Severidade |
|---|---|---|---|---|
| Async | `async void` (fora de handler de evento) | `async void` | exceção derruba o processo, sem como aguardar | importante |
| Async | bloquear em async | `\.Result([^a-zA-Z]\|$)\|\.Wait\(\)\|GetAwaiter\(\)\.GetResult` | deadlock/thread presa sob carga | importante |
| Async | endpoint/chamada de I/O novo sem `CancellationToken` | ler o método (o projeto já propaga em 43 pontos) | requisição cancelada continua gastando banco/rede | menor |
| DI | `new HttpClient(` | `new HttpClient\(` | esgota sockets; sem handler/timeout central. Usar `IHttpClientFactory` | importante |
| DI | singleton dependendo de scoped (`DbContext`, service com `DbContext`), ou `BackgroundService` usando scoped direto | `AddSingleton` e construtor do `BackgroundService` | "captive dependency": contexto compartilhado entre requisições. Usar `IServiceScopeFactory` (como o `GlpiPollingService`) | importante |
| DI | registro fora do `Infra.IoC` | ver `arquitetura-e-principios.md` | composição espalhada | menor |
| Config | segredo, senha ou URL de ambiente novos no código ou em `appsettings*.json` | `Password\|Pwd\|Secret\|ApiKey` em `CFTV.API/appsettings*.json` | vaza credencial no repositório | importante |
| Config | config nova lida com `configuration["..."]` espalhado | `GetSection\|configuration\[` | sem tipo nem validação. Preferir classe tipada + `IOptions<T>` (já em 9 pontos) | menor |
| Log | log por interpolação/concatenação, ou dado sensível | `Log(Information\|Warning\|Error\|Debug)\(\$"` ou `_logger\.[A-Za-z]+\(".*" \+` | perde o log estruturado (`{Campo}`) e pode vazar dado | menor (importante se vaza dado) |
| Log | `Console.Write*` | `Console\.Write` | fora do pipeline de log (Loki) | menor |
| Erros | `catch` vazio ou que engole a exceção | `catch *(\([^)]*\))? *\{ *\}` e leitura | falha silenciosa | importante |
| Erros | exceção usada para fluxo esperado | ler o método | o projeto converte em `ErrorOr` (`ex.ToErrorOrFailure(...)`): manter | menor |
| Recursos | `IDisposable`/stream/conexão sem `using` | ler o método | vazamento de handle/conexão | importante |
| Nulos | DTO de entrada sem validação de nulo/obrigatório | ler o DTO/service | `NullReferenceException` vira 500 | importante |
| Qualidade | método longo e incoerente, nome que não diz o domínio | ler | custo de manutenção | menor |

`DateTime.Now` x `UtcNow` e `HasMaxLength` sem validação já estão em `checklist.md`: **não duplicar**.

## 2. Adaptações ao projeto

- **`ConfigureAwait(false)`**: o guia original recomenda, mas em ASP.NET Core não há contexto de sincronização e o projeto não
  usa (0 ocorrências). **Não cobrar.**
- **Tratamento de erro**: o padrão local é `ErrorOr` + `ex.ToErrorOrFailure("Servico.Metodo")`; vale mais que "lançar exceção
  específica". O `catch (Exception` (41 ocorrências) é o padrão atual: só apontar se engolir ou se perder a causa.
- **Testes**: o projeto usa **xUnit** + Moq + FluentAssertions, não MSTest. Ver `qualidade-dos-testes.md`.

## 3. Fora do escopo (não cobrar, não é do projeto)

MSTest; Semantic Kernel/IA; localização com `ResourceManager`; Command Handler com base genérica; primary constructors; XML doc em
todo membro público; Factory pattern; padrão de namespace `{Core|Console|App|Service}.{Feature}`.

## 4. Baseline medido (snapshot 05/10/2026 na `develop`; reconferir antes de afirmar, é dívida antiga)

`async void` 0; sync-over-async 2 (`Program.cs:119` `UseOcelot().Wait()` e `LokiClient.cs:156`); `new HttpClient(` 4 (todos em
`AccessManagementService`); `Console.Write` 1; `catch` vazio de uma linha 1; `AddSingleton` 5 no código de produção (Keycloak, SignalR,
Mapper, Loki); `IServiceScopeFactory` 2; segredos já presentes em `appsettings.json` (5 linhas). Nada disso é da mudança: só vira
achado se o diff **aumentar** a contagem ou tocar a linha.
