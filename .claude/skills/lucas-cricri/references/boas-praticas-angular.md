# Boas práticas Angular (só monitora-client)

Resumo curado do básico de `angular-developer` (angular/angular, MIT; a skill completa tem 36 referências e **não** é copiada),
**adaptado ao monitora-client** (Angular 21, standalone, signals, `inject()`). Regra de sempre: **só o que a mudança introduziu ou
piorou**, **só com dano concreto**; o front **não tem testes** e não se cobra teste. Convenção de `<BASE>`/`<ALVO>` e regras de shell
(Windows, Linux, Mac): `arquitetura-e-principios.md`, seções 1 e 2.

## 1. Sinais, detecção e severidade

Detecção: `git diff <BASE> <ALVO> -G"<padrao>" --name-only -- "src/*.ts"` (no dev, sem o `<ALVO>`) e depois
`git diff <BASE> <ALVO> -U0 -- "<arquivo>"`. Padrões em regex estendida (`\|` = `|`; tirar a barra). Itens marcados **(novo)** só
valem para **código criado pelo dev**: o repo está misto e **não se pede migração do que já existe**.

| Tema | Sinal | Padrão | Dano | Severidade |
|---|---|---|---|---|
| Reatividade | `effect()` que faz `.set()`/`.update()` em outro signal para derivar estado | `effect\(` + ler o corpo | loop e `ExpressionChangedAfterItHasBeenChecked`. Usar `computed()`/`linkedSignal()`. `effect` só para sincronizar com API imperativa (storage, canvas, log) | importante |
| RxJS | `subscribe` em **stream que não completa** (`valueChanges`, `Subject`, `interval`, `fromEvent`, eventos do router) sem `takeUntilDestroyed`/`async`/`toSignal` | `\.subscribe\(` e ler a origem | vazamento de subscrição e callback após destruir o componente | importante |
| RxJS | `subscribe` em **chamada HTTP** (completa sozinha) sem `takeUntilDestroyed` | idem | sem vazamento; só risco de o callback (ex.: navegar, abrir alerta) rodar depois de o componente fechar. Só apontar se o callback faz algo visível | menor |
| RxJS | `subscribe` dentro de `subscribe` | ler o trecho | ordem/erro difíceis; usar `switchMap`/`forkJoin` | importante |
| Entradas (novo) | `@Input()`/`@Output()` em componente novo | `@Input\(\|@Output\(` | usar `input()`/`output()`/`model()`; o projeto tem 37 arquivos antigos com decorator | menor |
| DI (novo) | injeção por construtor | `constructor\(.*(private\|public\|protected\|readonly) ` | padrão local é `inject()` (367 usos x 6) | menor |
| DI | `inject()` fora de contexto de injeção (callback, `subscribe`, `setTimeout`) | ler o trecho | erro em runtime (NG0203) | importante |
| Componente (novo) | sem `standalone`/`OnPush` | `ChangeDetectionStrategy` no arquivo novo | 39 componentes usam `OnPush`; render desnecessário | menor |
| Template | `*ngIf`/`*ngFor`, `@for` sem `track` | `\*ngIf\|\*ngFor` | já migrado (0 usos): não deixar voltar | menor |
| Template | chamada de método no `{{ }}` | `\{\{ *[a-zA-Z.]+\([^)]*\) *\}\}` | roda a cada change detection. Pré-calcular com `computed()` (já no `checklist.md`) | menor |
| Estilo | `::ng-deep`/`ViewEncapsulation.None` novo | `::ng-deep\|ViewEncapsulation\.None` | quebra o encapsulamento e vaza estilo | menor |
| Rotas | guard/resolver em classe | `implements CanActivate\|implements CanMatch\|implements Resolve` | o padrão é funcional (`CanActivateFn`, `ResolveFn`) | menor |
| Camadas | `HttpClient`/`@infrastructure` na página | ver `arquitetura-e-principios.md` | acopla a tela à API | importante |
| Formulários | Signal Forms em form **existente** | `@angular/forms/signals` | manter o tipo do form (Reactive Forms, 64 usos). Em form **novo** é só sugestão | menor |
| Build | erro (`[ERROR]`) de template/AOT ou de tipo | `npx ng build --configuration development` (passo 7 da `lucas-cricri`; ~8 s no PR 10028) | quebra o pipeline | bloqueante |
| Build | *warning* de template (NG8102, NG8107, NG8113 import sem uso) em linha da mudança | mesmo comando | código morto ou checagem inútil | menor |

## 2. Adaptações ao projeto

- **Lazy loading**: o guia original recomenda `loadComponent`/`loadChildren`, mas o projeto usa rotas eager (0 ocorrências).
  **Não cobrar.**
- **`any`** (7 usos) e `console.log` já têm regra no `checklist.md`/`PADROES.md`: não duplicar.
- **Verificação**: `tsc` **não** valida template; só `ng build` pega campo renomeado usado no `.html`.

## 3. Fora do escopo (não cobrar)

Criação de projeto (`ng new`); SSR/hydration/rendering strategies; animações; Angular Aria; Tailwind; Cypress/E2E e testes
(front sem testes); MCP do Angular; Signal Forms como obrigação; `resource`/`rxResource`/`linkedSignal` como obrigação (só ao
criar estado derivado ou assíncrono novo).

## 4. Baseline medido (snapshot 05/10/2026 na `develop`; reconferir antes de afirmar, é dívida antiga)

`@Input/@Output` em 37 arquivos x `input/output/model` em 13; `subscribe` 147 (`takeUntilDestroyed` 131; ~19 arquivos com
`subscribe` sem `takeUntilDestroyed`/`ngOnDestroy`/`async`, a maioria HTTP que completa); `effect(` 2, os dois atualizam estado
(`chamado-chat.component.ts:91`, `select.component.ts:30`); `::ng-deep` 14; chamada de método em `{{ }}` ~22; `@for` sem `track` 0;
rotas lazy 0; `ng build` limpo (0 erros) com 18 warnings antigos. Nada disso é da mudança: só vira achado se o diff **aumentar** a contagem ou criar código novo com o padrão.
