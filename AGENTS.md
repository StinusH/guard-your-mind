# Repository Guidelines

## Project Structure & Modules

- **`src/background`**: Service worker entry that coordinates lifecycle events and listens for settings updates.
- **`src/content`**: Core detection logic that blanks mature Reddit content; toggle `debugMode` here when troubleshooting. Reads live preferences via `subscribeToSettings`.
- **`src/content/sidebarFilter.ts`**: Encapsulates the sidebar “Recent” filtering logic with a reusable controller that manages Shadow DOM observers and placeholder application.
- **`src/popup`**: Extension UI assets (`index.html`, `main.ts`, `style.css`) bundled by Vite. Hosts the enable toggle, blocking-style dropdown, and counter preference.
- **`src/shared`**: Shared TypeScript utilities (e.g., `settings.ts`) that define `BlockingStyle`, defaults, and chrome.storage helpers used by popup/content modules.
- **`scripts/fix-manifest.js`**: Post-build helper that adjusts the Chromium manifest; keep it in sync with `manifest.config.ts`.
- **`dist/`**: Generated build output; never edit by hand.

## Build, Test & Development Commands

- `npm run dev`: Launches Vite in watch mode for rapid extension builds while you iterate.
- `npm run build`: Produces the production bundle and runs the manifest fixer; use before loading in Chrome.
- `npm run preview`: Serves the built popup for quick UI checks.
- `npm run lint` / `npm run lint:fix`: Runs ESLint across `src/**/*.{ts,tsx}` and optionally applies safe fixes.
- `npm run format` / `npm run format:fix`: Verifies or rewrites formatting via Prettier on code, configs, and docs.

## Extension Settings & Storage

- Persist user preferences through the helpers in `src/shared/settings.ts` (`getSettings`, `setSettings`, `subscribeToSettings`).
- Stored properties: `blockingEnabled`, `blockingStyle` (`placeholder | remove | quotes | blur`), `showBlockedCounter`, and `block18PlusContent`.
- Content script should react to `blockingStyle` changes by adjusting blanking behavior (blur, quotes, remove) rather than duplicating state.
- Visited NSFW subreddits are persisted via `getBlockedSubreddits` / `setBlockedSubreddits`, which write to `chrome.storage.local` so the blocked list survives refreshes.
- When adding new preferences, extend the shared type and ensure backwards compatibility with older stored keys.

## Coding Style & Naming Conventions

- **Language**: TypeScript with ES modules; keep exports explicit.
- **Formatting**: 2-space indentation, double quotes, trailing commas where Prettier expects them.
- **Naming**: CamelCase for functions and variables, PascalCase for components or classes, kebab-case for files unless exporting a React component. Reuse existing enums/types (`BlockingStyle`) rather than hard-coding strings.
- **Linting**: Resolve ESLint warnings before opening a PR; lint-staged enforces this on commit.

## Testing Guidelines

- **Automation**: No unit test suite yet; rely on manual browser verification (see `TESTING.md`).
- **Scenarios**: Validate NSFW detection on subreddit feeds, mixed feeds, dynamic content, and both old/new Reddit skins after `npm run build`. Exercise each blocking style (placeholder/remove/quotes/blur) while testing.
- **Debugging**: Toggle `debugMode` in `src/content/index.ts` to surface console logs while investigating.

## Commit & Pull Request Guidelines

- **Commits**: Follow conventional prefixing observed in history (`feat:`, `fix:`) and keep messages imperative and scoped.
- **Branches**: Prefer topic branches named `feature/` or `fix/` plus a concise summary.
- **Pull Requests**: Provide context, reproduction steps, and screenshots or console captures where UI changes are involved. Reference related issues and note any manual test coverage performed.

## Release & Packaging Notes

- Build fresh assets with `npm run build` before packaging.
- Load the `dist/` folder via `chrome://extensions` → “Load unpacked” for validation.
- Bump version metadata in `manifest.config.ts` and re-run the build when shipping updates.
