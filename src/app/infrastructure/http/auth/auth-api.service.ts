import { HttpClient, HttpParams } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import { Observable, map, retry } from "rxjs";

import { ILoginResponse } from "@domain";
import { APP_CONFIG, ApiPath, ApiUrl } from "@infrastructure";
import { ICaoAppConfig } from "ngx-opalbytes-core";

const EMAIL_SEND_RETRY_CONFIG = { count: 2, delay: 1000 };

@Injectable({ providedIn: "root" })
export class AuthApiService {
  private readonly http = inject(HttpClient);
  private readonly config = inject<ICaoAppConfig>(APP_CONFIG);

  login(username: string, password: string): Observable<ILoginResponse> {
    const base = this.config.urls[ApiUrl.MONITORA].replace(/\/$/, "");
    const url = `${base}/identity/token`;
    const body = new HttpParams().set("username", username).set("password", password);

    return this.http.post<ILoginResponse>(url, body, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "X-Skip-Auth": "true",
      },
    });
  }

  recoveryPassword(email: string): Observable<void> {
    const base = this.config.urls[ApiUrl.MONITORA].replace(/\/$/, "");
    const path = this.config.paths[ApiPath.USUARIO_RECOVERY_PASSWORD];
    const url = `${base}${path}?email=${encodeURIComponent(email)}`;
    return this.http
      .post(url, null, { headers: { "X-Skip-Alert": "true" }, responseType: "text" })
      .pipe(retry(EMAIL_SEND_RETRY_CONFIG), map(() => undefined));
  }

  getPrimeiroAcesso(email: string): Observable<boolean> {
    const base = this.config.urls[ApiUrl.MONITORA].replace(/\/$/, "");
    const path = this.config.paths[ApiPath.USUARIO_GET_PRIMEIRO_ACESSO];
    const url = `${base}${path}?email=${encodeURIComponent(email)}`;
    return this.http.get<boolean>(url);
  }

  primeiroAcesso(email: string): Observable<void> {
    const base = this.config.urls[ApiUrl.MONITORA].replace(/\/$/, "");
    const path = this.config.paths[ApiPath.USUARIO_PRIMEIRO_ACESSO];
    const url = `${base}${path}?email=${encodeURIComponent(email)}`;
    return this.http
      .post(url, null, { headers: { "X-Skip-Alert": "true" }, responseType: "text" })
      .pipe(retry(EMAIL_SEND_RETRY_CONFIG), map(() => undefined));
  }
}
