import { HttpErrorResponse } from "@angular/common/http";

export interface IApiErrorBody {
  errors: Record<string, string[]>;
}

export type ApiError = HttpErrorResponse & { error: IApiErrorBody };

export function isApiError(error: unknown): error is ApiError {
  return (
    error instanceof HttpErrorResponse &&
    typeof error.error === "object" &&
    error.error !== null &&
    "errors" in error.error
  );
}

export function getApiErrorMessage(err: ApiError){
  return Object.values(err.error.errors).join(" ")
}
