/**
 * @module infrastructure/config
 *
 * @description
 * Configurações de infraestrutura injetadas via ambiente Angular.
 * Exemplos esperados:
 *
 * - `api-config.ts` — URLs base das APIs, timeouts, versões de endpoint
 * - `environment.token.ts` — `InjectionToken<Environment>` para tipagem segura
 * - `app-settings.ts` — feature flags, configurações de paginação padrão
 *
 * @rule Nunca hardcode URLs ou secrets aqui — use `environment.ts` do Angular CLI
 *       e exponha via `InjectionToken` tipado.
 * @layer infrastructure — consumido por serviços HTTP e WebSocket.
 *
 * @example
 * import { API_CONFIG, AppSettings } from '@app/infrastructure/config';
 *
 * constructor(@Inject(API_CONFIG) private config: ApiConfig) {}
 */

export * from "./app-config.base";
export * from "./app-config";
export * from "./app-endpoints";
export { productionConfig } from "./config.prod";
export { homologationConfig } from "./config.hmg";
export { developmentConfig } from "./config.dev";
export { localConfig } from "./config.local";
