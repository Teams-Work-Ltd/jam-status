import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../public");
const port = Number(process.env.PORT ?? 6174);
const types = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".svg", "image/svg+xml"],
  [".woff2", "font/woff2"],
]);

const server = createServer(async (request, response) => {
  const requested = new URL(request.url ?? "/", "http://localhost").pathname;
  const relative = requested === "/" ? "index.html" : requested.slice(1);
  const filename = path.resolve(root, relative);
  if (!filename.startsWith(`${root}${path.sep}`)) {
    response.writeHead(400).end("Bad request");
    return;
  }
  try {
    const details = await stat(filename);
    if (!details.isFile()) {
      throw new Error("Not a file");
    }
    response.writeHead(200, {
      "Cache-Control": relative.endsWith(".json") ? "no-store" : "no-cache",
      "Content-Type": types.get(path.extname(filename)) ?? "application/octet-stream",
    });
    createReadStream(filename).pipe(response);
  } catch {
    response.writeHead(404).end("Not found");
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Jam status preview: http://127.0.0.1:${port}`);
});
