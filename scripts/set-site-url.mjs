import { readFileSync, writeFileSync } from "node:fs";

const config = JSON.parse(
  readFileSync("site.config.json", "utf8")
);

const value = process.env.SITE_URL || config.siteUrl;

if (!value) {
  throw new Error("SITE_URL is required.");
}

const url = new URL(value);

if (
  url.protocol !== "https:" ||
  url.username ||
  url.password ||
  url.pathname !== "/" ||
  url.search ||
  url.hash
) {
  throw new Error(
    "SITE_URL must be an HTTPS origin, e.g. https://example.com"
  );
}

writeFileSync(
  "lib/site-deployment.ts",
  `// Generated for VPS deployment.\nexport const DEPLOYMENT_URL = ${JSON.stringify(url.origin)};\n`
);

console.log(`Building for ${url.origin}`);
