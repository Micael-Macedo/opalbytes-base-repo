import { inject } from "@angular/core";
import { CanActivateFn, Router } from "@angular/router";

import { ROUTES, TokenPayload } from "@domain";
import { TokenService } from "@infrastructure";

export const authGuard: CanActivateFn = (route) => {
  const router = inject(Router);
  const tokenService = inject(TokenService);

  if (!tokenService.hasToken()) {
    return router.parseUrl(ROUTES.LOGIN.route);
  }

  if (tokenService.isTokenExpired()) {
    tokenService.removeAllTokens();
    return router.parseUrl(ROUTES.LOGIN.route);
  }

  const permissions = route.data["permissions"] as string[] | undefined;
  if (!permissions?.length) return true;

  const raw = tokenService.getDecodedToken();
  if (!raw) {
    tokenService.removeAllTokens();
    return router.parseUrl(ROUTES.LOGIN.route);
  }

  const payload = new TokenPayload(raw);
  return payload.hasAnyPermission(permissions) || router.parseUrl(ROUTES.UNAUTHORIZED.route);
};
