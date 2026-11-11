import { ICaoJwtPayload } from "ngx-opalbytes-core";

export class TokenPayload {
  constructor(private readonly payload: ICaoJwtPayload) {}

  get exp(): number {
    return this.payload.exp;
  }
  get sub(): string | undefined {
    return this.payload.sub;
  }
  get name(): string | undefined {
    return this.payload.name;
  }
  get email(): string | undefined {
    return this.payload.email;
  }
  get preferredUsername(): string | undefined {
    return this.payload.preferred_username;
  }

  isExpired(): boolean {
    const now = Math.floor(Date.now() / 1000);
    return this.payload.exp <= now + 60;
  }

  hasClientPermission(permission: string): boolean {
    return !!this.payload.resource_access["cftv-client"]?.roles.includes(permission);
  }

  hasApiPermission(permission: string): boolean {
    return !!this.payload.resource_access["cftv-api"]?.roles.includes(permission);
  }

  hasAnyPermission(permissions: string[]): boolean {
    return permissions.some((p) => this.hasClientPermission(p) || this.hasApiPermission(p));
  }

  hasAllPermissions(permissions: string[]): boolean {
    return permissions.every((p) => this.hasClientPermission(p) || this.hasApiPermission(p));
  }
}
