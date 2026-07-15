/**
 * Post-build script: transforma dist/ no formato Vercel Build Output API v3.
 * Estrutura gerada:
 *   .vercel/output/static/     <- assets do cliente (dist/client/)
 *   .vercel/output/functions/ssr.func/  <- servidor SSR (dist/server/)
 *   .vercel/output/config.json <- roteamento
 */
import { cpSync, mkdirSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
const out = resolve(root, ".vercel/output");

if (existsSync(out)) rmSync(out, { recursive: true });

// Static assets
mkdirSync(`${out}/static`, { recursive: true });
cpSync(resolve(root, "dist/client"), `${out}/static`, { recursive: true });
console.log("✓ Static assets → .vercel/output/static/");

// SSR Edge Function
const fn = join(out, "functions/ssr.func");
mkdirSync(fn, { recursive: true });
cpSync(resolve(root, "dist/server"), fn, { recursive: true });

// Wrapper que adapta o export { default: { fetch } } do server.ts para o formato Vercel Edge
writeFileSync(
  join(fn, "entry.js"),
  `import server from "./server.js";
export default function handler(request) {
  return server.fetch(request, {}, {});
}
`
);

writeFileSync(
  join(fn, ".vc-config.json"),
  JSON.stringify({ runtime: "edge", entrypoint: "entry.js" }, null, 2)
);
console.log("✓ SSR Edge Function → .vercel/output/functions/ssr.func/");

// Routing config
writeFileSync(
  join(out, "config.json"),
  JSON.stringify(
    {
      version: 3,
      routes: [
        // Assets com hash → cache estático direto
        { src: "^/assets/(.+)$", dest: "/assets/$1" },
        // Qualquer outro arquivo com extensão estática → static/
        { src: "^/(.+\\.(?:js|css|ico|png|jpg|jpeg|svg|woff2?|ttf|json|webp|avif))$", dest: "/$1" },
        // Tudo mais → SSR
        { src: ".*", dest: "/ssr" },
      ],
    },
    null,
    2
  )
);
console.log("✓ Vercel config → .vercel/output/config.json");
console.log("\n✅ Vercel Build Output API pronto em .vercel/output/");
