import { isPlatformBrowser } from "@angular/common";
import { inject, Injectable, PLATFORM_ID } from "@angular/core";

import { jwtDecode } from "jwt-decode";
import { BehaviorSubject, Observable } from "rxjs";


import { LocalStorageService } from "./local-storage.service";
import { CaoVariables, ICaoJwtPayload } from "ngx-opalbytes-core";

const LEGACY_PREFIX = "app_";

@Injectable({
  providedIn: "root",
})
export class TokenService {
  private readonly localStorage = inject(LocalStorageService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly migratedKeys = new Set<string>();
  private readonly tokenChanges = new BehaviorSubject<string | null>(this.getToken());

  hasToken(): boolean {
    return !!this.getToken();
  }

  setToken(token: string): void {
    this.localStorage.set(CaoVariables.STORAGE_AUTH, token);
    this.tokenChanges.next(token);
  }

  getToken(): string | null {
    this.migrateLegacyKey(CaoVariables.STORAGE_AUTH);
    const token = this.localStorage.get<string>(CaoVariables.STORAGE_AUTH);
    if (!token) {
      return null;
    }
    return token;
  }

  getDecodedToken(): ICaoJwtPayload | null {
    const token = this.getToken();
    if (!token) {
      return null;
    }
    return jwtDecode(token);
  }

  getRole(): string | null {
    const token = this.getToken();
    if (!token) {
      return null;
    }

    try {
      const decodedToken = jwtDecode<ICaoJwtPayload>(token);

      if (decodedToken.resource_access) {
        for (const resource of Object.values(decodedToken.resource_access)) {
          if (resource?.roles && resource.roles.length > 0) {
            return resource.roles[0];
          }
        }
      }

      if (decodedToken.realm_access?.roles && decodedToken.realm_access.roles.length > 0) {
        return decodedToken.realm_access.roles[0];
      }

      return null;
    } catch (error) {
      console.error("Erro ao decodificar token:", error);
      return null;
    }
  }

  removeToken(): void {
    this.localStorage.remove(CaoVariables.STORAGE_AUTH);
    this.removeLegacyKey(CaoVariables.STORAGE_AUTH);
    this.tokenChanges.next(null);
  }

  isTokenExpired(): boolean {
    const token = this.getToken();
    if (!token) {
      return true;
    }

    try {
      const decoded = jwtDecode<ICaoJwtPayload>(token);
      if (!decoded.exp) {
        return true;
      }

      const now = Math.floor(Date.now() / 1000);
      return decoded.exp <= now;
    } catch (error) {
      console.error("Erro ao verificar expiração do token:", error);
      return true;
    }
  }

  isTokenExpiringSoon(): boolean {
    const token = this.getToken();
    if (!token) {
      return true;
    }

    try {
      const decoded = jwtDecode<ICaoJwtPayload>(token);
      if (!decoded.exp) {
        return true;
      }

      const now = Math.floor(Date.now() / 1000);
      const fiveMinutes = 5 * 60;
      return decoded.exp <= now + fiveMinutes;
    } catch (error) {
      console.error("Erro ao verificar expiração do token:", error);
      return true;
    }
  }

  getRefreshToken(): string | null {
    this.migrateLegacyKey(CaoVariables.REFRESH_TOKEN);
    return this.localStorage.get<string>(CaoVariables.REFRESH_TOKEN);
  }

  setRefreshToken(refreshToken: string): void {
    this.localStorage.set(CaoVariables.REFRESH_TOKEN, refreshToken);
  }

  removeRefreshToken(): void {
    this.localStorage.remove(CaoVariables.REFRESH_TOKEN);
    this.removeLegacyKey(CaoVariables.REFRESH_TOKEN);
  }

  hasRefreshToken(): boolean {
    return !!this.getRefreshToken();
  }

  removeAllTokens(): void {
    this.removeToken();
    this.removeRefreshToken();
    this.removeUserData();
  }

  observeToken(): Observable<string | null> {
    return this.tokenChanges.asObservable();
  }

  setUserDataFromToken(): void {
    const token = this.getToken();
    if (!token) {
      return;
    }

    try {
      const decodedToken = jwtDecode<ICaoJwtPayload>(token);
      const userData = {
        name: decodedToken.name || null,
        username: decodedToken.preferred_username || null,
        email: decodedToken.email || null,
      };

      this.localStorage.set(CaoVariables.USER, userData);
    } catch (error) {
      console.error("Erro ao extrair dados do usuário do token:", error);
    }
  }

  getUserData(): { name: string | null; username: string | null; email: string | null } | null {
    this.migrateLegacyKey(CaoVariables.USER);
    return this.localStorage.get<{ name: string | null; username: string | null; email: string | null }>(
      CaoVariables.USER
    );
  }

  removeUserData(): void {
    this.localStorage.remove(CaoVariables.USER);
    this.removeLegacyKey(CaoVariables.USER);
  }

  private migrateLegacyKey(key: string): void {
    if (this.migratedKeys.has(key)) return;
    this.migratedKeys.add(key);
    if (!isPlatformBrowser(this.platformId)) return;
    if (this.localStorage.has(key)) return;

    const legacyName = `${LEGACY_PREFIX}${key}`;
    const raw = localStorage.getItem(legacyName);
    if (!raw) return;

    try {
      const item = JSON.parse(raw) as { value: unknown };
      if (item.value !== undefined) {
        this.localStorage.set(key, item.value);
      }
      localStorage.removeItem(legacyName);
    } catch {
      localStorage.removeItem(legacyName);
    }
  }

  private removeLegacyKey(key: string): void {
    if (!isPlatformBrowser(this.platformId)) return;
    localStorage.removeItem(`${LEGACY_PREFIX}${key}`);
  }
}
