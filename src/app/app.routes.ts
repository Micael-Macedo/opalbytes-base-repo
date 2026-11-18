import { Routes } from '@angular/router';
import { APP_BASE_SEGMENT, ROUTES } from '@domain';

import { LoginPageComponent } from '@presentation/autenticacao/login/login-page';
import { PrimeiroAcessoPageComponent } from '@presentation/autenticacao/primeiro-acesso/primeiro-acesso-page';
import { RecuperacaoSenhaPageComponent } from '@presentation/autenticacao/recuperacao-senha/recuperacao-senha-page';
import { NotFoundPageComponent } from '@presentation/not-found/not-found-page';
import { authGuard } from '@shared';

export const routes: Routes = [
  {
    path: "",
    pathMatch: "full",
    component: LoginPageComponent,
  },

  // ─── Autenticação (sem guard) ──────────────────────────────────────────────
  { path: ROUTES.LOGIN.segment, component: LoginPageComponent },
  { path: ROUTES.RECUPERACAO_SENHA.segment, component: RecuperacaoSenhaPageComponent },
  { path: ROUTES.PRIMEIRO_ACESSO.segment, component: PrimeiroAcessoPageComponent },
  { path: ROUTES.NOT_FOUND.segment, component: NotFoundPageComponent },

  // ─── App (com guard) ───────────────────────────────────────────────────────

  {
    path: APP_BASE_SEGMENT,
    canActivate: [authGuard],
    canActivateChild: [authGuard],
    children: [
      { path: "", pathMatch: "full", redirectTo: ROUTES.HOME.segment}
    ]
  },
  { path: "**", redirectTo: ROUTES.NOT_FOUND.segment },
];
