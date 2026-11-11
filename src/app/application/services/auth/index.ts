/**
 * @module application/services/auth
 *
 * @description
 * Serviços de aplicação responsáveis pelos casos de uso de autenticação
 * e autorização. Orquestram a porta `IAuthPort` (domínio) com o estado
 * de sessão. Exemplos esperados:
 *
 * - `auth.service.ts` — login(), logout(), isAuthenticated()
 * - `permissao.service.ts` — hasRole(), canActivate() para guards
 * - `session.service.ts` — ciclo de vida da sessão do usuário
 *
 * @rule Dependem de `IAuthPort` (domain/ports/auth) e `AuthState` (application/state).
 *       Nunca fazem HTTP diretamente — delegam ao adapter em infrastructure/auth.
 * @layer application — consumido por guards (shared/guards) e facades.
 *
 * @example
 * import { AuthService } from '@app/application/services/auth';
 *
 * const auth = inject(AuthService);
 * auth.login({ email, senha }).subscribe(() => router.navigate(['/home']));
 */

export * from "./auth.service";
