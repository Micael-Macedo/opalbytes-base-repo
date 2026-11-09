import { BASE_HTTP_METHODS, EnvironmentEnum, ICaoAppConfig } from "ngx-opalbytes-core";
import { ApiPath, ApiUrl } from "./app-endpoints";

export const homologationConfig: ICaoAppConfig = {
    production: false,
    environment: EnvironmentEnum.homologation,
    paths: ApiPath,
    urls: {
        [ApiUrl.BOARDGAMEAPI]: "https://ominous-journey-jvjwq6j7x7cp7qp-5262.app.github.dev"
    },
    httpMethods: BASE_HTTP_METHODS
}