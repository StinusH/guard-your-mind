# Guard Your Mind – Technical Stack Requirements

## Core Languages & Runtime

- TypeScript for content scripts, background service worker, and UI components.
- HTML/CSS for popup/options UI templates.
- Node.js (LTS) for tooling and build pipeline.

## Build & Bundling

- Vite or Webpack for bundling content scripts, service worker, and popup assets (Manifest V3 compatible).
- ts-node / esbuild for quick scripts as needed.
- npm or pnpm for package management.

## Frameworks & Libraries

- Lightweight UI library for popup/options (e.g., Preact or vanilla web components).
- DOM utility helpers (e.g., `dompurify` if sanitizing injected markup is ever required).
- State management via browser extension storage APIs (no heavy external dependency planned).

## Browser Extension Tooling

- Chrome Extensions Manifest V3 schema.
- `chrome.scripting`, `chrome.runtime`, `chrome.storage`, `chrome.action` APIs.
- WebExtension polyfill if cross-browser support is later required.

## Testing & Quality

- Jest + JSDOM (or Vitest) for unit and DOM interaction tests.
- ESLint with TypeScript support.
- Prettier for formatting consistency.
- Husky + lint-staged (optional) for pre-commit enforcement.

## Developer Experience

- Editorconfig for consistent indentation.
- Git hooks via Husky (optional).
- VS Code recommended settings/extensions for TypeScript + Chrome extension development.

## Documentation & Project Management

- Markdown tooling (e.g., `mdlint` optional) for PRD/TODO upkeep.
- Issue tracking via GitHub Projects or similar (out of scope for repo but noted).

## Future Considerations (Phase 2 Twitch Support)

- Twitch API or GraphQL schema research tools.
- Additional domain permissions for `twitch.tv`.
- Potential video overlay handling utilities if blocking streams requires it.
