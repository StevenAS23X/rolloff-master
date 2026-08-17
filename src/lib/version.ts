import pkg from "../../package.json";

export const APP_VERSION = pkg.version;

// Baked in at Docker build time (see Dockerfile + deploy/auto-update.sh). Both fall back to
// something sensible for `npm run dev` / a manual `docker build` where they're never set.
export const BUILD_SHA = process.env.NEXT_PUBLIC_GIT_SHA || "dev";
export const BUILD_TIME = process.env.NEXT_PUBLIC_BUILD_TIME || null;
