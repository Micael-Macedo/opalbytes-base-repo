import { Injectable, inject } from "@angular/core";
import { Router } from "@angular/router";
import { Observable, tap } from "rxjs";

import { ROUTES } from "@domain";
import { ILoginResponse } from "@domain/models/auth";
import { AlertService } from "../alert.service";
import { AuthApiService, TokenService } from "@infrastructure";
import { StorageService } from "ngx-opalbytes-core";


@Injectable({ providedIn: "root" })
export class AuthService {
  private readonly api = inject(AuthApiService);
  private readonly tokenService = inject(TokenService);
  private readonly router = inject(Router);
  private readonly alertService = inject(AlertService);
  private readonly storageService = inject(StorageService);

  login(username: string, password: string): Observable<ILoginResponse> {
    return this.api.login(username, password).pipe(
      tap(({ access_token }) => {
      })
    );
  }

  recuperarSenha(email: string): Observable<void> {
    return this.api.recoveryPassword(email);
  }

  verificarPrimeiroAcesso(email: string): Observable<boolean> {
    return this.api.getPrimeiroAcesso(email);
  }

  enviarPrimeiroAcesso(email: string): Observable<void> {
    return this.api.primeiroAcesso(email);
  }

  logout(): void {
    this.storageService.clear();
    this.alertService.success("Logout realizado com sucesso");
    this.router.navigateByUrl(ROUTES.LOGIN.route);
  }

  isAuthenticated(): boolean {
    return this.tokenService.hasToken() && !this.tokenService.isTokenExpired();
  }
}
