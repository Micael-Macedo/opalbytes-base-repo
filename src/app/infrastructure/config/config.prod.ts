
import { BASE_PATHS, BASE_HTTP_METHODS } from "./app-config.base";
import { ApiUrl } from "./app-endpoints";
import { ICaoAppConfig } from "ngx-opalbytes-core";

export const productionConfig: ICaoAppConfig = {
  production: true,
  environment: "production",
  urls: {
    [ApiUrl.MONITORA]: "https://app-apicftv-detranba.azurewebsites.net/",
    [ApiUrl.HLS]: "https://cftv-detranba.renova.app.br/hls/",
  },
  paths: BASE_PATHS,
  httpMethods: BASE_HTTP_METHODS,
};
