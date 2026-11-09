## Descrição

> O que foi feito e por que — contexto de negócio ou técnico que motivou a mudança.

## Tipo de mudança

- [ ] Nova feature
- [ ] Correção de bug
- [ ] Refatoração (sem mudança de comportamento)
- [ ] Ajuste de estilo / UI
- [ ] Configuração / infraestrutura de projeto

## Checklist

- [ ] O código segue a arquitetura em camadas do projeto (`domain → application → infrastructure → presentation`)
- [ ] Nenhum componente de `presentation/` importa diretamente de `infrastructure/`
- [ ] Novos arquivos exportados pelo barrel `index.ts` da pasta correspondente
- [ ] Sem `console.log` ou código de debug esquecido
- [ ] Sem dependências novas adicionadas sem justificativa no PR
- [ ] Acessibilidade verificada (ARIA labels, navegação por teclado, contraste)
- [ ] Responsividade verificada nos breakpoints Mobile, Tablet e Desktop

## Evidências

> Screenshots ou GIFs das telas afetadas — antes e depois, se aplicável.
> Para mudanças puramente técnicas (refatoração, config), descreva o comportamento observado.

## Testes

- [ ] Testado manualmente no fluxo principal (happy path)
- [ ] Casos de borda verificados manualmente
- [ ] Testes unitários adicionados/atualizados (se aplicável)

> Cole print da cobertura se novos testes forem incluídos.

## Notas Adicionais

> Decisões de design, trade-offs, dívidas técnicas conhecidas ou pontos de atenção para o revisor.
