import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';

import { caoProvideCore, ICaoProvideConfig } from 'ngx-opalbytes-core';
import { getConfigByEnvironment } from '@infrastructure';

export const ENV_CONFIG = getConfigByEnvironment(APP_ENV)
const caoConfig: ICaoProvideConfig = {
  environment: {
    buildDate: "",
    name: ENV_CONFIG.environment,
    production: ENV_CONFIG.production

  },
  routes: routes
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    caoProvideCore(caoConfig, ENV_CONFIG)
  ]
};