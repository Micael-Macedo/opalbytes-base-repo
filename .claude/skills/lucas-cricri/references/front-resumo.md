# Front: resumo para decidir (leia só isto; o script já aplicou as detecções)

## Severidade
- **bloqueante**: `ng build` com `[ERROR]` em arquivo da mudança; quebra de contrato confirmada pelo swagger (rota inexistente, método errado,
  campo obrigatório ausente) quando o back do ambiente já está atualizado.
- **importante**: `presentation` importando `infrastructure` ou `HttpClient` na página; `domain` importando camada externa; `effect()` que
  atualiza outro signal; `subscribe` em stream que não completa sem limpeza; `subscribe` dentro de `subscribe`; campo que o front **envia** e a
  API ignora; eslint de erro em linha da mudança; fluxo que deixa estado inconsistente (ex.: associa antes de criar e não desfaz).
- **menor**: `@Input()`/constructor em componente **novo**, `::ng-deep`, método no template, warning de build em linha da mudança,
  símbolo novo sem uso, barrel sem export, commit/branch fora do padrão.

## Julgamento que o script não faz (no máximo 3 arquivos)
- **S**: componente que busca usuário, associa, cria e navega (orquestração) em vez de service de `application`. Só se houver falha parcial.
- **DRY**: mesma regra copiada e já divergente. **KISS**: abstração para um uso. Só com dano concreto.
- **Ids trocados** em payload (`programacaoId` onde a API espera o id da escala): confirme pelo swagger/`probe`, não pelo código do back.

## Não cobrar
Testes (o front não tem); lazy loading (rotas eager); migração de `@Input()` antigo; `ConfigureAwait`; Signal Forms; SSR/animações;
dívida antiga (eslint/warnings fora das linhas da mudança); qualquer coisa de `node_modules`, pipelines ou `package.json` sem mudança.
`subscribe` em chamada HTTP que completa sozinha é no máximo menor.
