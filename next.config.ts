import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // better-sqlite3 is a native module: it must be required at runtime by the
  // Node.js server rather than bundled.
  serverExternalPackages: ["better-sqlite3"],

  /*
   * `forbidden()` (experimental in Next 16.3) is how /desk answers a refused
   * session with a real 403 and the NotAdmitted screen (`app/forbidden.tsx`).
   * Next's bundled docs require this flag before forbidden() may be used.
   */
  experimental: {
    authInterrupts: true,
  },

  /*
   * Keep the file tracer out of the local data directory.
   *
   * `data/` is gitignored and never ships -- `push-release.sh` uses `git
   * archive`, so the shipping tree has no `data/` at all and the server builds
   * from that. But on a PRIMARY tree the tracer walks it on every build, and it
   * holds 2.9GB of migration backups from the 08-17/18 cutover. Two costs: the
   * walk itself, and that any unreadable file in there BREAKS THE BUILD FOR
   * EVERY THREAD -- which it did on 2026-09-07, with Turbopack returning
   * ERROR_FILE_CORRUPT on backups that read fine byte-wise.
   *
   * Measured rather than cited, because the docs say these options do not
   * affect Edge Runtime routes and the observed failure was in the generated
   * middleware endpoint. Before: 13 route traces, 260 references to
   * `data/backups`. The check is that both go to zero.
   */
  outputFileTracingExcludes: {
    "/*": ["data/**/*"],
  },
};

export default nextConfig;
