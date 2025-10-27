import { CONFIG } from "./config";

export function log(...args: unknown[]): void {
  if (CONFIG.debugMode) {
    console.log("[Guard Your Mind]", ...args);
  }
}
