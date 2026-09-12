/**
 * Build version shown in Settings and Diagnostics: the latest git tag
 * (e.g. v0.1.4), or 'dev' for untagged local builds. Baked at build time
 * via vite.config.ts `define`; CI checks out full history so tags resolve.
 */
export const APP_VERSION: string =
  (import.meta.env.VITE_APP_VERSION as string | undefined) ?? 'dev';
