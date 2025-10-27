# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Guard Your Mind** is a Chromium Manifest V3 extension that blanks out mature (18+) Reddit content while preserving layout integrity. The extension detects and hides mature subreddits and posts in feeds without breaking navigation or causing layout jumps.

**Current Phase:** Phase 1 (Reddit coverage). Phase 2 will add Twitch support.

## Development Commands

```bash
# Development with hot reload
npm run dev

# Production build
npm run build

# Lint TypeScript files
npm run lint
npm run lint:fix

# Format code
npm run format
npm run format:fix
```

## Architecture Overview

### Extension Structure

The extension follows Manifest V3 architecture with three main components:

1. **Background Service Worker** (`src/background/index.ts`)
   - Runs persistently as a service worker
   - Handles extension lifecycle events
   - Currently minimal; used for initialization logic

2. **Content Script** (`src/content/index.ts`)
   - Injected into all `https://*.reddit.com/*` pages at `document_start`
   - Responsible for detecting and blanking mature content
   - Handles both initial page load and dynamic content (infinite scroll via MutationObserver)
   - Manages Shadow DOM filtering for search dropdown and sidebar recent pages (via `src/content/sidebarFilter.ts`)

- Tracks visited NSFW subreddits and persists them in `chrome.storage.local` so refreshes retain the blocked list
- Automatically treats posts from a small allowlist of adult domains (e.g., `redgifs.com`) as blocked content even when Reddit omits NSFW/18+ tags
- Popup allows users to manage the saved blocked-sub list manually (add/remove communities) which feeds into the same storage source
  - Detects SPA navigation to persist filtering across page changes

3. **Popup UI** (`src/popup/`)
   - Browser action popup with enable/disable toggle, blocking style dropdown, and counter preference
   - Uses vanilla HTML/CSS/TypeScript (no heavy framework)
   - Persists settings via `chrome.storage` (sync with local fallback)
4. **Shared Utilities** (`src/shared/settings.ts`)
   - Centralizes default settings, storage helpers, and subscriptions for popup/content coordination

### Build System

- **Vite** with `@crxjs/vite-plugin` for Manifest V3 bundling
- Manifest defined in `manifest.config.ts` (not raw JSON)
- TypeScript compilation with source maps in development
- Hot reload support via Vite dev mode

### Code Quality Tools

- **Husky** pre-commit hooks run `lint-staged`
- **lint-staged** runs ESLint (max 0 warnings) on `src/**/*.{ts,tsx}` and Prettier checks on all relevant files
- All code must pass linting and formatting before commit

## Key Implementation Requirements

### Content Detection Strategy

The extension detects mature content through multiple methods:

- **Subreddit-level:** Checks `data-over18`, `routeisnsfw` attributes, NSFW badges, and page titles
- **Post-level:** Detects NSFW tags, blur overlays, and data attributes on individual posts
- **Search results:** Filters NSFW indicators in search dropdown (inside Shadow DOM)
- **Recent searches:** Checks `data-faceplate-tracking-context` for `"nsfw":true`
- **Sidebar recent pages:** Tracks visited NSFW subreddits and filters them from sidebar

Implementation details:

- Uses MutationObserver for dynamic content (infinite scroll, SPA navigation)
- Shadow DOM observers for search dropdown and sidebar (reddit-search-large, reddit-recent-pages)
- Event-driven architecture (no continuous polling except 50ms intervals for Shadow DOM initialization)
- Centralized selector constants in `SELECTORS` object for easy maintenance

### Blanking Behavior

- Blocking style is configurable; options currently include:
  - `placeholder`: neutral fixed-height card that preserves layout
  - `remove`: drop the offending element entirely
  - `quotes`: swap in one of several motivational quotes
  - `blur`: blur the content in place with an overlay banner
- Must not break Reddit's native voting, comments, or navigation for unblocked content

### Storage & State

- Use `chrome.storage.sync` when available (falls back to local)
- Stored settings include: `blockingEnabled`, `blockingStyle`, `block18PlusContent`
- `ALWAYS_BLOCKED_DOMAINS` in `src/shared/settings.ts` defines hard-coded domains that are always blanked
- `subscribeToBlockedSubreddits` exposes storage updates for the manual/auto blocked list
- Persist blocked subreddit visits to `chrome.storage.local` (`getBlockedSubreddits` / `setBlockedSubreddits`) to keep sidebar filtering consistent across refreshes
- Content script subscribes to storage changes to react instantly
- No telemetry or remote logging in Phase 1

### Performance Constraints

- Avoid extensive DOM manipulation that could slow browsing
- Use debounced observers and minimize reflows
- Must stay under Chrome extension CPU limits

## Technical Constraints

- **Browser support:** Chromium-based only (Chrome, Edge, Brave) on desktop
- **Manifest V3 compliance:** Use service workers, static host permissions
- **Reddit-specific:** Content script runs on `https://*.reddit.com/*`
- **Privacy:** No telemetry, respect user privacy

## Testing Approach

- Target: Jest + JSDOM (or Vitest) for DOM interaction tests
- Focus on detection logic and blanking behavior
- Manual QA required for Reddit UI variations (old vs new design, logged-out vs logged-in)
- Aim for <1% false positive rate

## Key Files

- `manifest.config.ts` - Extension manifest definition
- `vite.config.ts` - Build configuration
- `src/background/index.ts` - Background service worker
- `src/content/index.ts` - Main content script for Reddit
- `src/popup/` - Extension popup UI
- `prd.md` - Product requirements and success metrics
- `stack.md` - Technical stack details
- `todo.md` - Current implementation status

## Important Notes

- Reddit DOM selectors may break with UI changes; use resilient selectors and modular matching logic
- Handle both old and new Reddit designs where possible
- Phase 2 will extend to Twitch; keep architecture modular for future domain support

## Current Implementation Status

### Fully Implemented Features

- ✅ Mature subreddit detection and blocking (entire page)
- ✅ Individual NSFW post detection in feeds (with placeholders)
- ✅ Search dropdown filtering (18+ section + recent NSFW searches) via Shadow DOM
- ✅ Sidebar recent pages & communities filtering (removes visited NSFW subreddits)
- ✅ SPA navigation detection (re-initializes filters on page changes)
- ✅ Persistent tracking of blocked subreddits using `chrome.storage.local`
- ✅ User-selectable handling of 18+ tagged posts and subreddits (popup toggle, enabled by default)
- ✅ Popup settings with blocking style selection and 18+ toggle, blocking always on
- ✅ Configurable blocking modes (placeholder/remove/quotes/blur)
- ✅ Production-ready code (optimized, documented, tested)

### Known Limitations

- Blocked subreddit list is stored locally; it does not sync across browser profiles/devices yet
- Blocked counter is not yet surfaced in the popup UI
- Switching blocking styles does not retroactively restore previously blanked/removed DOM (requires refresh)

### Next Steps

See `todo.md` for full roadmap. High priority items:

- Surface live blocked counter data in popup
- Tweak blocking style experiences (quote variants, blur overlay polish, optional placeholder messaging)
- Content-type specific toggles (entire subreddits vs individual posts vs search results)
- Expand automated testing coverage for detection logic
