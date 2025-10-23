import { defineManifest } from "@crxjs/vite-plugin";

export default defineManifest({
  manifest_version: 3,
  name: "Guard Your Mind",
  version: "0.1.0",
  description: "Blank out mature (18+) content on Reddit to keep your browsing experience clean.",
  host_permissions: ["https://*.reddit.com/*"],
  permissions: ["storage"],
  background: {
    service_worker: "src/background/index.ts",
    type: "module",
  },
  action: {
    default_popup: "src/popup/index.html",
  },
  content_scripts: [
    {
      matches: ["https://*.reddit.com/*"],
      js: ["src/content/index.ts"],
      run_at: "document_start",
    },
  ],
});
