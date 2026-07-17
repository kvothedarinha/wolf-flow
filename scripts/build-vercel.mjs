/**
 * Post-build script: transforma dist/ no formato Vercel Build Output API v3.
 * Estrutura gerada:
 *   .vercel/output/static/     <- assets do cliente (dist/client/)
 *   .vercel/output/functions/ssr.func/  <- servidor SSR (dist/server/)
 *   .vercel/output/config.json <- roteamento
 */
import { cpSync, mkdirSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { resolve, join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { nodeFileTrace } from "@vercel/nft";

const root = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
const out = resolve(root, ".vercel/output");

if (existsSync(out)) rmSync(out, { recursive: true });

// Static assets
mkdirSync(`${out}/static`, { recursive: true });
cpSync(resolve(root, "dist/client"), `${out}/static`, { recursive: true });
console.log("✓ Static assets → .vercel/output/static/");

// SSR Serverless Function
const fn = join(out, "functions/ssr.func");
mkdirSync(fn, { recursive: true });
cpSync(resolve(root, "dist/server"), fn, { recursive: true });

// Rastreia as dependências (node_modules) realmente usadas pelo bundle SSR
// (o build de SSR do Vite não inlina pacotes de node_modules — ex.: h3-v2 —
// então eles precisam ser copiados para dentro da function).
import { readdirSync } from "node:fs";
function listJsFiles(dir) {
  const entries = readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((e) => {
    const p = join(dir, e.name);
    if (e.isDirectory()) return listJsFiles(p);
    return e.name.endsWith(".js") ? [p] : [];
  });
}
const entryFiles = listJsFiles(resolve(root, "dist/server"));

const { fileList } = await nodeFileTrace(entryFiles, { base: root });
let copied = 0;
for (const relPath of fileList) {
  if (!relPath.includes("node_modules")) continue;
  const src = join(root, relPath);
  const relFromModules = relPath.slice(relPath.indexOf("node_modules"));
  const dest = join(fn, relFromModules);
  mkdirSync(dirname(dest), { recursive: true });
  cpSync(src, dest);
  copied++;
}
console.log(`✓ ${copied} arquivos de node_modules rastreados e copiados`);

// Wrapper que adapta o export { default: { fetch } } do server.ts (Web Request/Response)
// para a assinatura Node.js (req, res) que o runtime "Nodejs" da Vercel espera.
writeFileSync(
  join(fn, "entry.js"),
  `import server from "./server.js";

export default async function handler(req, res) {
  const host = req.headers.host ?? "localhost";
  const url = \`https://\${host}\${req.url}\`;
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) headers.set(key, value.join(", "));
    else headers.set(key, value);
  }

  const hasBody = req.method !== "GET" && req.method !== "HEAD";
  const request = new Request(url, {
    method: req.method,
    headers,
    body: hasBody ? req : undefined,
    duplex: hasBody ? "half" : undefined,
  });

  const response = await server.fetch(request, {}, {});
  res.statusCode = response.status;
  response.headers.forEach((value, key) => res.setHeader(key, value));
  if (response.body) {
    for await (const chunk of response.body) res.write(chunk);
  }
  res.end();
}
`
);

// Tell Node.js to treat .js files in this directory as ESM
writeFileSync(
  join(fn, "package.json"),
  JSON.stringify({ type: "module" }, null, 2)
);

writeFileSync(
  join(fn, ".vc-config.json"),
  JSON.stringify({ runtime: "nodejs22.x", handler: "entry.js", launcherType: "Nodejs" }, null, 2)
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
        {
          src: "^/(.+\\.(?:js|css|ico|png|jpg|jpeg|svg|woff2?|ttf|json|webmanifest|webp|avif))$",
          dest: "/$1",
        },
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
