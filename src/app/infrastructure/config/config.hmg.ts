
import { ICaoAppConfig } from "ngx-opalbytes-core";
import { BASE_PATHS, BASE_HTTP_METHODS } from "./app-config.base";
import { ApiUrl } from "./app-endpoints";

export const homologationConfig: ICaoAppConfig = {
  production: false,
  environment: "homologation",
  urls: {
    [ApiUrl.MONITORA]: "https://app-apicftv-detranba-hmg.azurewebsites.net/",
    [ApiUrl.HLS]: "https://cftv-detranba-dev.renova.app.br/hls/",
  },
  paths: BASE_PATHS,
  httpMethods: BASE_HTTP_METHODS,
};
