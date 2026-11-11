import { BASE_PATHS, BASE_HTTP_METHODS } from "./app-config.base";
import { ApiUrl } from "./app-endpoints";

import { ICaoAppConfig } from "ngx-opalbytes-core";

export const localConfig: ICaoAppConfig = {
  production: false,
  environment: "local",
  urls: {
    [ApiUrl.MONITORA]: "https://app-apicftv-detranba-dev.azurewebsites.net/",
    [ApiUrl.HLS]: "https://cftv-detranba-dev.renova.app.br/hls/",
  },
  paths: BASE_PATHS,
  httpMethods: BASE_HTTP_METHODS,
};
