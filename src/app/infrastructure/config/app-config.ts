import { InjectionToken } from "@angular/core";

import { productionConfig, homologationConfig, localConfig, developmentConfig } from "./index";
import { ICaoAppConfig } from "ngx-opalbytes-core";

// Token de injeção para o environment
export const ENVIRONMENT = new InjectionToken<{ name: string; buildDate: string }>("ENVIRONMENT");

// Token de injeção para a configuração do app
export const APP_CONFIG = new InjectionToken<ICaoAppConfig>("APP_CONFIG");

// Função auxiliar para obter a config baseada no environment
export function getConfigByEnvironment(envName: string): ICaoAppConfig {
  switch (envName) {
    case "prod":
      return productionConfig;
    case "hmg":
      return homologationConfig;
    case "local":
      return localConfig;
    case "dev":
    default:
      return developmentConfig;
  }
}
