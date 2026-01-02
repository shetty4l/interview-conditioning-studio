// Dev-only static file server for web/
// Usage: bun scripts/serve.ts

import { resolve, join } from "path";

const PORT = 8000;
const WEB_DIR = resolve(import.meta.dir, "../web");

const server = Bun.serve({
  port: PORT,

  async fetch(req) {
    const url = new URL(req.url);
    let pathname = url.pathname;

    // Default to index.html for root
    if (pathname === "/") {
      pathname = "/index.html";
    }

    const filePath = join(WEB_DIR, pathname);

    // Security: prevent directory traversal
    if (!filePath.startsWith(WEB_DIR)) {
      return new Response("Forbidden", { status: 403 });
    }

    const file = Bun.file(filePath);

    // Check if file exists
    if (await file.exists()) {
      return new Response(file);
    }

    // 404 for missing files
    return new Response("Not Found", { status: 404 });
  },
});

console.log(`Serving web/ at http://localhost:${server.port}`);
console.log(`Press Ctrl+C to stop`);
