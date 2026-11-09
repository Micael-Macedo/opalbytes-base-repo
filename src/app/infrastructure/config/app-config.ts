import { InjectionToken } from "@angular/core";

import { ICaoAppConfig } from "ngx-opalbytes-core";

import { productionConfig } from "./config.prod";
import { homologationConfig } from "./config.hmg";

export const BG_APP_CONFIG = new InjectionToken<ICaoAppConfig>("")

export function getConfigByEnvironment(envName: string): ICaoAppConfig {
    switch (envName) {
        case "prod":
            return productionConfig;
        case "hmg":
            return homologationConfig;
        case "local":
        case "dev":
            return homologationConfig;
        default:
            return homologationConfig;

    }
}
