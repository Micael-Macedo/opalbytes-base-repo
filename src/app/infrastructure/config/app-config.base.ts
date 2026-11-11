
import { AppPaths, HttpMethods } from "ngx-opalbytes-core";
import { HttpMethod } from "./app-endpoints";

export const BASE_PATHS: AppPaths = {
};

export const BASE_HTTP_METHODS: HttpMethods = {
  [HttpMethod.GET]: "get",
  [HttpMethod.POST]: "post",
  [HttpMethod.PUT]: "put",
  [HttpMethod.PATCH]: "patch",
  [HttpMethod.DELETE]: "delete",
};
