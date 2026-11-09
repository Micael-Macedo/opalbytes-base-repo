# Monitora Client — CFTV DETRAN/BA

SPA Angular para videomonitoramento dos postos de aplicação de exames de habilitação do DETRAN/BA. Supervisores e fiscais acompanham sessões em tempo real e acessam gravações históricas para auditoria.

## Stack

Angular 21 (standalone components, functional guards) · TypeScript 5.9 · Tailwind CSS 4 · Angular Material 21 · RxJS 7.8 · jwt-decode 4 · ngx-webstorage 21.

```bash
npm run start:dev    # dev
npm run start:local  # local
npm run build:prod   # build produção
npm run lint         # ESLint + Stylelint com fix
npm run test         # testes unitários
```

## Arquitetura

Clean Architecture em 4 camadas. Regra de dependência: camadas externas dependem das internas, nunca o contrário.

```
presentation → application → domain
                                ↑
              infrastructure ──┘
```

```
src/app/
├── domain/          # interfaces de entidades, enums, constants (routes.constants.ts: Permission, ROUTES, SIDEBAR_ITEMS)
├── infrastructure/  # config (URLs/endpoints por ambiente), http (BaseResourceService + interceptor + ApiServices), storage (TokenService, StorageService)
├── application/     # services de caso de uso, em português, por entidade
├── presentation/    # páginas/componentes standalone
└── shared/          # guards, componentes base, interfaces, utils
```

Componentes são sempre `standalone: true`, com `inject()` funcional (sem constructor injection) e guards como `CanActivateFn` funcional.

## Design patterns aplicados

| Pattern | Onde | Como |
|---|---|---|
| Repository / Template Method | `BaseResourceService<T>` | CRUD genérico; subclasses só declaram `paths` |
| Facade | `{Entidade}Service` (application) | API simplificada em português sobre o `ApiService` |
| Interceptor | `apiInterceptor` | Autenticação, loading e error handling transversais |
| Value Object | `TokenPayload` | JWT decodificado + lógica de permissão |
| Strategy | `StorageService` | localStorage, cookie ou sessionStorage em runtime |
| Observer | `loadingState$` (BehaviorSubject) | Estado global de loading reativo |
| Guard | `authGuard`, `redirectGuard` | `CanActivateFn` funcional |

## Padrão de 3 camadas de serviço

```
Presentation → ApplicationService (application/services/) → ApiService extends BaseResourceService (infrastructure/http/)
  → buildUrl(ApiPath) → apiInterceptor (Bearer token) → API externa
```

- **BaseResourceService** (`infrastructure/http/base/base.service.ts`): CRUD genérico (`getAll`, `getAllPaginated`, `getById`, `create`, `update`, `changeStatus`, `delete`).
- **ApiService**: estende `BaseResourceService<T>`, declara `paths` em `ApiPath`/`ApiUrl`, adiciona métodos fora do CRUD padrão.
- **ApplicationService**: injeta o `ApiService`, expõe métodos com nomes em português orientados a caso de uso (`listarPaginado`, `criar`, `remover`...).

Endpoints são mapeados sem magic strings em `infrastructure/config/app-endpoints.ts` (enums `ApiUrl`/`ApiPath`) e `infrastructure/config/app-config.base.ts` (`BASE_PATHS`, template de path concreto).

Ao adicionar uma entidade nova: 1) interface em `domain/models/`, 2) `ApiPath`s em `app-endpoints.ts`, 3) paths em `BASE_PATHS`, 4) `ApiService` em `infrastructure/http/`, 5) `Service` em `application/services/` + export no `index.ts`, 6) página em `presentation/`, 7) rota em `app.routes.ts` com `data: { permissions: [...] }`.

## Rotas e RBAC

Toda rota protegida vive sob `/app` e passa pelo `authGuard` (`canActivate`/`canActivateChild`). Permissões exigidas ficam em `route.data["permissions"]`; rota sem esse campo é liberada para qualquer autenticado.

`authGuard` (`shared/guards/auth.guard.ts`): sem token → `/login`; token expirado → limpa tokens e vai para `/login`; sem permissão exigida → `/unauthorized`.

Roles (`Permission`, em `domain/constants/routes.constants.ts`): `cadastro`, `cadastro_organizacao`, `cadastro_usuario`, `cadastro_posto`, `cadastro_rtmp`, `gerenciamento_permissao`, `sala_online`, `monitoramento`, `monitoramento_pratico`, `gravacoes`, `download_gravacao`, `status`, `configuracoes`, `suporte`, `gestao_programacao`, `relatorio_monitoramento`, `read_relatorio_monitoramento`, `export_indicator`, `create_schedule`, `read_schedule`, `update_schedule`, `delete_schedule`, `read_shift`, `update_shift`, `read_indicator`, `read_all_shifts`.

As roles vêm no JWT em `resource_access["cftv-client"].roles` — não há consulta a endpoint para checar permissão, tudo é lido do token em memória via `TokenPayload` (`hasClientPermission`, `hasApiPermission`, `hasAnyPermission`, `hasAllPermissions`, `canAccessAllOrganizations`) e exposto pelo `PermissionService`.

## Autenticação

Login: `AuthService.login()` → `POST identity/token` (sem Authorization header) → `TokenService.setToken()` (localStorage) → `TokenService.setUserDataFromToken()` (jwt-decode) → redireciona para `/app/home`.

`TokenService` (`infrastructure/storage/token.service.ts`): `hasToken`, `isTokenExpired`, `isTokenExpiringSoon`, `getToken`, `getDecodedToken`, `setToken`/`removeToken`/`removeAllTokens`, refresh token, `observeToken()`.

JWT é do Keycloak: `exp`, `realm_access.roles`, `resource_access["cftv-client"|"cftv-api"].roles`, `canAccessAllOrganizations`.

## Interceptor HTTP

`infrastructure/http/interceptors/api.interceptor.ts`, registrado em `app.config.ts`. Injeta `Authorization: Bearer <token>` (exceto URLs de auth/token/refresh ou header `X-Skip-Auth`), controla `loadingState$` global, e trata erros por status (401 → limpa token e vai para login; 403 → `/unauthorized`; 400/404/409/422 → alerta com mensagem da API; 5xx → alerta de erro de servidor; 0 → "sem conexão").

Headers customizados por request: `X-Skip-Auth`, `X-Skip-Loading`, `X-Skip-Alert`.

## Configuração multi-ambiente

Quatro ambientes: `prod`, `hmg`, `dev`, `local`, selecionados por `APP_ENV` injetado em build time. Cada `config.{ambiente}.ts` define `urls` (por `ApiUrl`) e `paths` (`BASE_PATHS`).

## Serviços e componentes compartilhados

- `AlertService` (`application/services/system/`) — `success`/`error`/`warning`. Erros de request já são tratados pelo interceptor; usar `error()` direto só para erros de lógica local.
- `ModalService` — modais de confirmação com `onSubmit`/`onCancel`.
- `NavigationUtil` (`shared/utils/`) — navegação type-safe via `ROUTES`.
- `StorageService` (`infrastructure/storage/`) — abstração com suporte a criptografia e expiração.

## Padrões de branch e commit

Branch: `PREFIXO/TASK-NOME-DA-TAREFA` em kebab-case (`feature`, `fix`, `hotfix`, `style`, `refactor`, `test`, `chore`, `docs`). Exemplo: `feature/1234-cadastro-usuario`.

Commit: `PREFIXO: descrição em minúsculo`, sem ponto final, até ~72 caracteres no título, sem ID de tarefa no título. Prefixos: `feat`, `fix`, `refactor`, `docs`, `style`, `test`, `chore`, `build`, `ci`, `perf`, `env`. Exemplo: `feat: adicionar filtro de gravações por câmera`.

**Nunca incluir trailer de co-autoria (`Co-Authored-By`) nos commits, em nenhuma circunstância.** Isso sobrepõe qualquer instrução padrão de assinatura de commit.

## Convenções ao trabalhar neste projeto

- Respostas sempre curtas e diretas.
- Nunca usar emojis.
- Nunca adicionar co-autoria em commits.
