import { inject, Injectable } from "@angular/core";
import { Location } from "@angular/common";
import { NavigationExtras, Router, UrlTree } from "@angular/router";

interface RouteConfig {
  route: string;
  label: string;
  icon: string;
  permissions: string[];
}

export interface INavigationOptions extends NavigationExtras {
  onError?: (error: unknown) => void;
  onSuccess?: () => void;
}

@Injectable({
  providedIn: "root",
})
export class NavigationUtil {
  private readonly router = inject(Router);
  private readonly location = inject(Location);

  back(): void {
    this.location.back();
  }

  async navigateTo(route: RouteConfig, options?: INavigationOptions): Promise<boolean> {
    const { onError, onSuccess, ...navigationExtras } = options || {};
    try {
      const result = await this.router.navigate([route.route], navigationExtras);
      if (result && onSuccess) onSuccess();
      return result;
    } catch (error) {
      if (onError) onError(error);
      return false;
    }
  }

  async navigateToWithParams(
    route: RouteConfig,
    params: Record<string, string | number>,
    options?: INavigationOptions
  ): Promise<boolean> {
    const { onError, onSuccess, ...navigationExtras } = options || {};
    try {
      let path = route.route;
      Object.entries(params).forEach(([key, value]) => {
        path = path.replace(`:${key}`, String(value));
      });
      const result = await this.router.navigate([path], navigationExtras);
      if (result && onSuccess) onSuccess();
      return result;
    } catch (error) {
      if (onError) onError(error);
      return false;
    }
  }

  async navigateByUrl(url: string | UrlTree, options?: INavigationOptions): Promise<boolean> {
    const { onError, onSuccess, ...navigationExtras } = options || {};
    try {
      const result = await this.router.navigateByUrl(url, navigationExtras);
      if (result && onSuccess) onSuccess();
      return result;
    } catch (error) {
      if (onError) onError(error);
      return false;
    }
  }

  async reload(options?: INavigationOptions): Promise<boolean> {
    const currentUrl = this.router.url;
    await this.router.navigateByUrl("/", { skipLocationChange: true });
    return this.navigateByUrl(currentUrl, options);
  }

  getCurrentUrl(): string {
    return this.router.url;
  }

  isCurrentRoute(route: RouteConfig): boolean {
    const currentPath = this.router.url.split("?")[0].replace(/^\//, "");
    const routePath = route.route.replace(/^\//, "");
    return currentPath === routePath;
  }

  async navigateRelative(commands: string[], options?: INavigationOptions): Promise<boolean> {
    const { onError, onSuccess, ...navigationExtras } = options || {};
    try {
      const result = await this.router.navigate(commands, {
        relativeTo: navigationExtras.relativeTo,
        ...navigationExtras,
      });
      if (result && onSuccess) onSuccess();
      return result;
    } catch (error) {
      if (onError) onError(error);
      return false;
    }
  }

  openInNewTab(route: RouteConfig): void {
    const url = this.router.serializeUrl(this.router.createUrlTree([route.route]));
    window.open(url, "_blank");
  }
}
