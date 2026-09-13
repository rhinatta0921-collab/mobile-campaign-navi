import { createReadStream } from "node:fs";
import { access } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";

const root = path.resolve("out");
const fixtureRoot = path.resolve("tests/visual/fixtures");
const contentTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".jpg", "image/jpeg"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".woff2", "font/woff2"],
]);

function safePath(rootDirectory, pathname) {
  const resolved = path.resolve(rootDirectory, `.${pathname}`);
  if (!resolved.startsWith(`${rootDirectory}${path.sep}`)) return null;
  return resolved;
}

const server = createServer(async (request, response) => {
  const requestUrl = new URL(request.url ?? "/", "http://127.0.0.1:4173");
  let pathname = decodeURIComponent(requestUrl.pathname);
  let baseDirectory = root;
  if (pathname.startsWith("/__visual_fixture__/")) {
    baseDirectory = fixtureRoot;
    pathname = pathname.replace("/__visual_fixture__", "");
  } else if (pathname === "/") {
    pathname = "/index.html";
  } else if (pathname.endsWith("/")) {
    pathname = `${pathname}index.html`;
  }
  const filePath = safePath(baseDirectory, pathname);
  if (!filePath) {
    response.writeHead(400).end("Bad request");
    return;
  }
  try {
    await access(filePath);
    response.writeHead(200, {
      "cache-control": "no-store",
      "content-type": contentTypes.get(path.extname(filePath)) ?? "application/octet-stream",
    });
    createReadStream(filePath).pipe(response);
  } catch {
    response.writeHead(404).end("Not found");
  }
});

server.listen(4173, "127.0.0.1");

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
