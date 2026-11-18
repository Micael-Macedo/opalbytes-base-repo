/**
 * @module shared/guards
 *
 * @description
 * Guards de rota Angular que protegem acesso a páginas. Exemplos esperados:
 *
 * - `auth.guard.ts` — redireciona para login se não autenticado
 * - `role.guard.ts` — verifica perfil de acesso (`CanActivateFn`)
 * - `unsaved-changes.guard.ts` — confirma saída de formulário com alterações pendentes
 *
 * @rule Use a forma funcional (`CanActivateFn`, `CanDeactivateFn`) do Angular 17+.
 *       Dependem de `application/services/auth` — nunca de infraestrutura diretamente.
 * @layer shared — registrado em `app.routes.ts` e feature routes.
 *
 * @example
 * import { authGuard } from '@app/shared/guards';
 *
 * { path: 'admin', canActivate: [authGuard], ... }
 */

export * from "./auth.guard";
