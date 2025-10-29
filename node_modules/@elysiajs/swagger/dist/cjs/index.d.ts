import { type Elysia } from 'elysia';
import type { ElysiaSwaggerConfig } from './types';
/**
 * Plugin for [elysia](https://github.com/elysiajs/elysia) that auto-generate Swagger page.
 *
 * @see https://github.com/elysiajs/elysia-swagger
 */
export declare const swagger: <Path extends string = "/swagger">({ provider, scalarVersion, scalarCDN, scalarConfig, documentation, version, excludeStaticFile, path, exclude, swaggerOptions, theme, autoDarkMode, excludeMethods }?: ElysiaSwaggerConfig<Path>) => (app: Elysia) => Elysia<"", {
    request: {};
    store: {};
    derive: {};
    resolve: {};
}, {
    type: {};
    error: {};
}, {}, {}, {}, false>;
export default swagger;
