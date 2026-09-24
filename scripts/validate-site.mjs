import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const publicDirectory = path.join(root, "public");

for (const filename of ["app.js", "incidents.json", "index.html", "inter.woff2", "jam-favicon.svg", "status.json", "styles.css"]) {
  await access(path.join(publicDirectory, filename));
}

const html = await readFile(path.join(publicDirectory, "index.html"), "utf8");
assert.match(html, /<title>Jam service status<\/title>/);
assert.match(html, /id="jam-status"/);
assert.match(html, /id="workos-status"/);
assert.match(html, /id="cloudflare-status"/);
assert.doesNotMatch(html, /<script(?![^>]*src=)/);

const javascript = await readFile(path.join(publicDirectory, "app.js"), "utf8");
assert.match(javascript, /status\.workos\.com\/api\/v2\/summary\.json/);
assert.match(javascript, /www\.cloudflarestatus\.com\/api\/v2\/summary\.json/);
assert.doesNotMatch(javascript, /innerHTML/);

console.log("Static site validation passed.");
