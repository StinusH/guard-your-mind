import { readFileSync, writeFileSync, readdirSync } from "fs";
import { join } from "path";

// Read the manifest
const manifestPath = join(process.cwd(), "dist", "manifest.json");
const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));

// Find the actual service worker file in assets
const assetsDir = join(process.cwd(), "dist", "assets");
const files = readdirSync(assetsDir);
const serviceWorkerFile = files.find(
  (f) => f.startsWith("index.ts-") && f.endsWith(".js") && f.length < 30,
);

if (serviceWorkerFile) {
  // Update manifest to point to the actual service worker
  manifest.background.service_worker = `assets/${serviceWorkerFile}`;

  // Write back the manifest
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

  console.log(`✓ Fixed service worker path: assets/${serviceWorkerFile}`);
} else {
  console.warn("⚠ Could not find service worker file");
}
