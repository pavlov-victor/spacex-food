/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as auth from "../auth.js";
import type * as bootstrap from "../bootstrap.js";
import type * as catalog from "../catalog.js";
import type * as demoMenu from "../demoMenu.js";
import type * as files from "../files.js";
import type * as http from "../http.js";
import type * as jobs from "../jobs.js";
import type * as lib_access from "../lib/access.js";
import type * as lib_daytona from "../lib/daytona.js";
import type * as lib_dify from "../lib/dify.js";
import type * as lib_menuPdf from "../lib/menuPdf.js";
import type * as lib_pdfWorker from "../lib/pdfWorker.js";
import type * as menuPdf from "../menuPdf.js";
import type * as menuPdfState from "../menuPdfState.js";
import type * as organizations from "../organizations.js";
import type * as pdfImportState from "../pdfImportState.js";
import type * as storefront from "../storefront.js";
import type * as storefrontSchema from "../storefrontSchema.js";
import type * as validators from "../validators.js";
import type * as workflows from "../workflows.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  bootstrap: typeof bootstrap;
  catalog: typeof catalog;
  demoMenu: typeof demoMenu;
  files: typeof files;
  http: typeof http;
  jobs: typeof jobs;
  "lib/access": typeof lib_access;
  "lib/daytona": typeof lib_daytona;
  "lib/dify": typeof lib_dify;
  "lib/menuPdf": typeof lib_menuPdf;
  "lib/pdfWorker": typeof lib_pdfWorker;
  menuPdf: typeof menuPdf;
  menuPdfState: typeof menuPdfState;
  organizations: typeof organizations;
  pdfImportState: typeof pdfImportState;
  storefront: typeof storefront;
  storefrontSchema: typeof storefrontSchema;
  validators: typeof validators;
  workflows: typeof workflows;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
