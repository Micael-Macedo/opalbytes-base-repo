import { BASE_HTTP_METHODS, EnvironmentEnum, ICaoAppConfig } from "ngx-opalbytes-core";
import { ApiPath, ApiUrl } from "./app-endpoints";

export const productionConfig: ICaoAppConfig = {
    production: true,
    environment: EnvironmentEnum.production,
    paths: ApiPath,
    urls: {
        [ApiUrl.BOARDGAMEAPI]: "https://ominous-journey-jvjwq6j7x7cp7qp.github.dev"
    },
    httpMethods: BASE_HTTP_METHODS
}