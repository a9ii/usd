
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync
} from "node:fs";

import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));

process.chdir(root);

// Prevent accidentally deploying Pages Functions.
if (existsSync(resolve(root, "functions"))) {
  throw new Error(
    "Static deployment cannot contain a functions/ directory."
  );
}

// Execute Node.js scripts during build only.
function run(args) {
  const result = spawnSync(process.execPath, args, {
    cwd: root,
    stdio: "inherit",
    env: {
      ...process.env,
      DEPLOY_TARGET: "pages"
    }
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

// Generate the site's canonical domain configuration.
run(["scripts/set-site-url.mjs"]);

// Build using Next.js static export.
// Do not use Vinext or a Cloudflare Worker build.
run(["node_modules/next/dist/bin/next", "build"]);

// Next.js generates static files in out/.
const outputDir = resolve(root, "out");
const pagesDir = resolve(root, "pages-dist");

if (!existsSync(join(outputDir, "index.html"))) {
  throw new Error(
    "Static export failed: out/index.html is missing."
  );
}

// Replace any old deployment output.
rmSync(pagesDir, {
  recursive: true,
  force: true
});

mkdirSync(pagesDir, {
  recursive: true
});

// Copy only static files.
cpSync(outputDir, pagesDir, {
  recursive: true
});

// Read the public site URL.
const config = JSON.parse(
  readFileSync("site.config.json", "utf8")
);

const siteUrl = new URL(
  process.env.SITE_URL || config.siteUrl
).origin;

// Static robots.txt
writeFileSync(
  join(pagesDir, "robots.txt"),
  [
    "User-agent: *",
    "Allow: /",
    "",
    `Sitemap: ${siteUrl}/sitemap.xml`,
    ""
  ].join("\n"),
  "utf8"
);

// Static sitemap.xml
writeFileSync(
  join(pagesDir, "sitemap.xml"),
  [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    "  <url>",
    `    <loc>${siteUrl}/</loc>`,
    "  </url>",
    "</urlset>",
    ""
  ].join("\n"),
  "utf8"
);

// Never allow Worker runtime files in output.
const forbiddenFiles = [
  "_worker.js",
  "_routes.json"
];

for (const filename of forbiddenFiles) {
  const filepath = join(pagesDir, filename);

  if (existsSync(filepath)) {
    throw new Error(
      `Worker runtime file is not allowed: ${filename}`
    );
  }
}

console.log("");
console.log("Static Cloudflare Pages build completed.");
console.log("Output directory: pages-dist");
console.log("Site URL:", siteUrl);
console.log("No Cloudflare Worker generated.");
console.log("");
